import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

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
  const receiptNumber = order.receiptNumber ?? `RCPT-${order.reference.replace("BS-", "")}`;
  const enrollmentId = crypto.randomUUID();
  const { env: cloudflareEnv } = getCloudflareContext();
  const d1 = (cloudflareEnv as unknown as { DB: D1Database }).DB;
  if (!d1) throw new HttpError("Cloudflare D1 binding is unavailable.", 503);

  // D1's batch API executes this group atomically. Prisma's D1 adapter does not
  // provide ACID transactions, so payment fulfilment uses D1 batch directly.
  const batch = await d1.batch([
    d1.prepare(`UPDATE "Order"
      SET "status" = 'PAID', "paidAt" = ?, "gatewayReference" = ?,
          "receiptNumber" = ?, "ipAddress" = ?
      WHERE "id" = ? AND "status" = 'PENDING'`)
      .bind(now.toISOString(), options?.gatewayReference ?? order.gatewayReference,
        receiptNumber, options?.ip ?? order.ipAddress, order.id),
    d1.prepare(`INSERT INTO "Enrollment"
      ("id", "userId", "courseId", "status", "pricePaidKobo", "source", "orderId", "lastAccessedAt")
      SELECT ?, ?, ?, 'ACTIVE', ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM "Order" WHERE "id" = ? AND "paidAt" = ?)
      ON CONFLICT ("userId", "courseId") DO UPDATE SET
        "status" = 'ACTIVE', "pricePaidKobo" = excluded."pricePaidKobo",
        "source" = excluded."source", "orderId" = excluded."orderId",
        "lastAccessedAt" = excluded."lastAccessedAt'`)
      .bind(enrollmentId, order.userId, order.courseId, order.amountKobo, order.gateway,
        order.id, now.toISOString(), order.id, now.toISOString()),
    ...(order.couponId ? [d1.prepare(`UPDATE "Coupon" SET "uses" = "uses" + 1
      WHERE "id" = ? AND EXISTS (SELECT 1 FROM "Order" WHERE "id" = ? AND "paidAt" = ?)`)
      .bind(order.couponId, order.id, now.toISOString())] : []),
    d1.prepare(`INSERT INTO "Notification" ("id", "userId", "title", "body", "type", "link", "createdAt")
      SELECT ?, ?, ?, ?, 'PAYMENT', ?, ?
      WHERE EXISTS (SELECT 1 FROM "Order" WHERE "id" = ? AND "paidAt" = ?)`)
      .bind(crypto.randomUUID(), order.userId, "Payment confirmed — course unlocked",
        `${order.course.title} is now available in your learning portal. Receipt ${order.reference}.`,
        `/dashboard/courses/${order.courseId}`, now.toISOString(), order.id, now.toISOString()),
  ]);
  const changed = Number(batch[0]?.meta?.changes ?? 0);
  const result = { alreadyPaid: changed === 0 };
  if (result.alreadyPaid) {
    const current = await db.order.findUnique({ where: { id: order.id } });
    if (current?.status === "PAID") return { order: current, alreadyPaid: true };
    throw new HttpError("Order could not be fulfilled because its status changed.", 409);
  }

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

  const { env: cloudflareEnv } = getCloudflareContext();
  const d1 = (cloudflareEnv as unknown as { DB: D1Database }).DB;
  if (!d1) throw new HttpError("Cloudflare D1 binding is unavailable.", 503);
  const refundedAt = now.toISOString();

  // Keep refund status, access revocation, certificate revocation and notice in
  // one D1 batch so a partial refund transition cannot leave access enabled.
  const batch = await d1.batch([
    d1.prepare(`UPDATE "Order" SET "status" = 'REFUNDED', "refundedAt" = ?,
      "refundAmountKobo" = ?, "refundReason" = ?, "refundedById" = ?
      WHERE "id" = ? AND "status" = 'PAID'`)
      .bind(refundedAt, amount, input.reason, input.adminId, order.id),
    d1.prepare(`UPDATE "Enrollment" SET "status" = 'REVOKED'
      WHERE "userId" = ? AND "courseId" = ?
      AND EXISTS (SELECT 1 FROM "Order" WHERE "id" = ? AND "refundedAt" = ?)`)
      .bind(order.userId, order.courseId, order.id, refundedAt),
    d1.prepare(`UPDATE "Certificate" SET "revokedAt" = ?, "revokeReason" = 'Course refunded'
      WHERE "userId" = ? AND "courseId" = ? AND "revokedAt" IS NULL
      AND EXISTS (SELECT 1 FROM "Order" WHERE "id" = ? AND "refundedAt" = ?)`)
      .bind(refundedAt, order.userId, order.courseId, order.id, refundedAt),
    d1.prepare(`INSERT INTO "Notification" ("id", "userId", "title", "body", "type", "link", "createdAt")
      SELECT ?, ?, 'Refund processed', ?, 'PAYMENT', '/dashboard/payments', ?
      WHERE EXISTS (SELECT 1 FROM "Order" WHERE "id" = ? AND "refundedAt" = ?)`)
      .bind(crypto.randomUUID(), order.userId,
        `A refund of ${formatNaira(amount)} was processed for ${order.course.title}. Access has been updated.`,
        refundedAt, order.id, refundedAt),
  ]);
  if (Number(batch[0]?.meta?.changes ?? 0) === 0) {
    throw new HttpError("This order was already refunded or its status changed.", 409);
  }

  await audit({
    actorId: input.adminId,
    action: "payment.refunded",
    entity: "Order",
    entityId: order.id,
    meta: { amount, reason: input.reason },
  });

  return { amount };
}
