import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { json, parseJson, route, rateLimit, clientIp, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { env, isPaystackConfigured } from "@/lib/env";
import { validateCoupon, fulfillOrder } from "@/lib/payments";
import { initializeTransaction, newReference } from "@/lib/paystack";

export const runtime = "nodejs";

const schema = z.object({
  courseId: z.string().min(1),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const ip = clientIp(req);
  const limited = await rateLimit(`checkout:${user.id}`, 10, 300);
  if (!limited.allowed) return fail("Too many checkout attempts. Please wait a moment.", 429);

  const data = await parseJson(req, schema);
  const course = await db.course.findFirst({ where: { id: data.courseId, isPublished: true } });
  if (!course) return fail("This course is not available.", 404);

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (existing && existing.status !== "REVOKED") {
    return json({ ok: true, alreadyEnrolled: true, redirect: `/dashboard/courses/${course.id}` });
  }

  const { coupon, discountKobo } = await validateCoupon({
    code: data.couponCode || "",
    courseId: course.id,
    amountKobo: course.priceKobo,
  });
  const amountKobo = Math.max(0, course.priceKobo - discountKobo);

  const order = await db.order.create({
    data: {
      reference: newReference(),
      userId: user.id,
      courseId: course.id,
      subtotalKobo: course.priceKobo,
      discountKobo,
      amountKobo,
      couponId: coupon?.id,
      gateway: amountKobo === 0 ? "FREE" : "PAYSTACK",
      status: "PENDING",
      ipAddress: ip,
    },
  });

  if (amountKobo === 0) {
    await fulfillOrder(order.id, { ip });
    return json({ ok: true, free: true, redirect: `/checkout/success?reference=${order.reference}` });
  }

  if (!isPaystackConfigured()) {
    if (!env.demoPaymentsEnabled) {
      return fail("Payments are temporarily unavailable. Please contact support.", 503);
    }
    return json({
      ok: true,
      demo: true,
      reference: order.reference,
      redirect: `/checkout/demo?reference=${order.reference}`,
    });
  }

  const callbackUrl = `${env.siteUrl}/checkout/callback?reference=${order.reference}`;
  const result = await initializeTransaction({
    email: user.email,
    amountKobo,
    reference: order.reference,
    callbackUrl,
    metadata: {
      orderId: order.id,
      userId: user.id,
      courseId: course.id,
      courseTitle: course.title,
      coupon: coupon?.code || null,
    },
  });

  if (!result.status || !result.data) {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED", failureReason: result.message } });
    return fail(result.message || "Could not start payment.", 502);
  }

  await db.order.update({
    where: { id: order.id },
    data: { gatewayReference: result.data.access_code || result.data.reference },
  });

  return json({ ok: true, authorizationUrl: result.data.authorization_url, reference: order.reference });
});
