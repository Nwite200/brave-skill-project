import "server-only";

import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { audit, notify } from "@/lib/audit";
import { sendMail, emailShell } from "@/lib/mail";
import { env } from "@/lib/env";
import { formatNaira } from "@/lib/format";
import type { Coupon, Course } from "@prisma/client";

export function discountFor(course: Pick<Course, "priceKobo">, coupon: Coupon | null) {
  if (!coupon) return 0;
  let discount =
    coupon.type === "PERCENT"
      ? Math.round((course.priceKobo * Math.min(100, Math.max(0, coupon.percentOff))) / 100)
      : Math.max(0, coupon.amountOffKobo);
  discount = Math.min(discount, course.priceKobo);
  return discount;
}

export async function validateCoupon(input: { code: string; courseId: string; amountKobo: number }) {
  const code = input.code.trim().toUpperCase();
  if (!code) return { coupon: null, discountKobo: 0 };
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) throw new HttpError("This discount code is not valid.", 422);
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw new HttpError("This discount code is not active yet.", 422);
  if (coupon.expiresAt && coupon.expiresAt < now) throw new HttpError("This discount code has expired.", 422);
  if (coupon.maxUses > 0 && coupon.uses >= coupon.maxUses) throw new HttpError("This discount code has been fully redeemed.", 422);
  if (coupon.courseId && coupon.courseId !== input.courseId) throw new HttpError("This code does not apply to this course.", 422);
  if (coupon.minAmountKobo > 0 && input.amountKobo < coupon.minAmountKobo) {
    throw new HttpError(`This code requires a minimum order of ${formatNaira(coupon.minAmountKobo)}.`, 422);
  }
  const discountKobo = discountFor({ priceKobo: input.amountKobo }, coupon);
  return { coupon, discountKobo };
}

/**
 * Marks an order paid and grants access. Safe to call multiple times (webhook
 * retries, callback verification, admin reconciliation): access is only ever
 * granted by this server-side transition, never by the browser.
 */
export async function fulfillOrder(orderId: string, options?: { gatewayReference?: string; ip?: string }) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { course: true, user: true, coupon: true },
  });
  if (!order) throw new HttpError("Order not found.", 404);
  if (order.status === "PAID") {
    return { order, alreadyPaid: true };
  }
  if (order.status === "REFUNDED") throw new HttpError("This order was refunded.", 409);

  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: {
        status: "PAID",
        paidAt: now,
        gatewayReference: options?.gatewayReference ?? order.gatewayReference,
        receiptNumber: order.receiptNumber ?? `RCPT-${order.reference.replace("BS-", "")}`,
        ipAddress: options?.ip ?? order.ipAddress,
      },
    });
    if (updated.count === 0) return { alreadyPaid: true as const };

    const existing = await tx.enrollment.findUnique({
      where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
    });

    let enrollmentId: string;
    if (existing) {
      const revived = await tx.enrollment.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", pricePaidKobo: order.amountKobo, orderId: order.id },
      });
      enrollmentId = revived.id;
    } else {
      const created = await tx.enrollment.create({
        data: {
          userId: order.userId,
          courseId: order.courseId,
          pricePaidKobo: order.amountKobo,
          source: order.gateway,
          orderId: order.id,
          lastAccessedAt: now,
        },
      });
      enrollmentId = created.id;
    }

    if (order.couponId) {
      await tx.coupon.update({ where: { id: order.couponId }, data: { uses: { increment: 1 } } });
    }

    await tx.notification.create({
      data: {
        userId: order.userId,
        type: "PAYMENT",
        title: "Payment confirmed — course unlocked",
        body: `${order.course.title} is now available in your learning portal. Receipt ${order.reference}.`,
        link: `/dashboard/courses/${order.courseId}`,
      },
    });

    return { alreadyPaid: false as const, enrollmentId };
  });

  if (!result.alreadyPaid) {
    await audit({
      actorId: order.userId,
      action: "payment.fulfilled",
      entity: "Order",
      entityId: order.id,
      meta: { reference: order.reference, amountKobo: order.amountKobo, courseId: order.courseId },
      ip: options?.ip,
    });
    await sendMail({
      to: order.user.email,
      subject: `Payment confirmed — ${order.course.title}`,
      html: emailShell(
        "Your course is unlocked",
        `<p>Hi ${order.user.name.split(" ")[0]},</p>
         <p>We received your payment of <strong>${formatNaira(order.amountKobo)}</strong> for <strong>${order.course.title}</strong>.</p>
         <p>Receipt reference: <strong>${order.reference}</strong></p>
         <p>You can start learning right away from your dashboard.</p>`,
        { label: "Start learning", url: `${env.siteUrl}/dashboard/courses/${order.courseId}` },
      ),
    }).catch(() => {});
  }

  const fresh = await db.order.findUnique({ where: { id: order.id } });
  return { order: fresh!, alreadyPaid: result.alreadyPaid };
}

export async function grantFreeCourse(input: {
  userId: string;
  courseId: string;
  source?: "FREE" | "ADMIN";
  grantedById?: string;
}) {
  const course = await db.course.findUnique({ where: { id: input.courseId } });
  if (!course) throw new HttpError("Course not found.", 404);
  const now = new Date();
  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
  });
  if (existing) {
    if (existing.status === "REVOKED") {
      await db.enrollment.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
    }
    return existing;
  }
  const enrollment = await db.enrollment.create({
    data: {
      userId: input.userId,
      courseId: input.courseId,
      pricePaidKobo: 0,
      source: input.source ?? "FREE",
    },
  });
  await audit({
    actorId: input.grantedById ?? input.userId,
    action: "enrollment.granted",
    entity: "Enrollment",
    entityId: enrollment.id,
    meta: { userId: input.userId, courseId: input.courseId, source: input.source ?? "FREE" },
  });
  await notify({
    userId: input.userId,
    type: "COURSE",
    title: "Course unlocked",
    body: `${course.title} has been added to your learning portal.`,
    link: `/dashboard/courses/${course.id}`,
  });
  return enrollment;
}

export async function refundOrder(input: {
  orderId: string;
  adminId: string;
  reason: string;
  amountKobo?: number;
}) {
  const order = await db.order.findUnique({ where: { id: input.orderId }, include: { course: true } });
  if (!order) throw new HttpError("Order not found.", 404);
  if (order.status !== "PAID") throw new HttpError("Only paid orders can be refunded.", 409);

  const amount = Math.min(input.amountKobo ?? order.amountKobo, order.amountKobo);
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "REFUNDED",
        refundedAt: now,
        refundAmountKobo: amount,
        refundReason: input.reason,
        refundedById: input.adminId,
      },
    });
    await tx.enrollment.updateMany({
      where: { userId: order.userId, courseId: order.courseId },
      data: { status: "REVOKED" },
    });
    await tx.certificate.updateMany({
      where: { userId: order.userId, courseId: order.courseId, revokedAt: null },
      data: { revokedAt: now, revokeReason: "Course refunded" },
    });
    await tx.notification.create({
      data: {
        userId: order.userId,
        type: "PAYMENT",
        title: "Refund processed",
        body: `A refund of ${formatNaira(amount)} was processed for ${order.course.title}. Access has been updated.`,
        link: "/dashboard/payments",
      },
    });
  });

  await audit({
    actorId: input.adminId,
    action: "payment.refunded",
    entity: "Order",
    entityId: order.id,
    meta: { amount, reason: input.reason },
  });

  return { amount };
}
