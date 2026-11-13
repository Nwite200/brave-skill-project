import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail, clientIp } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { env, isPaystackConfigured } from "@/lib/env";
import { verifyTransaction } from "@/lib/paystack";
import { fulfillOrder } from "@/lib/payments";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser();
  const reference = req.nextUrl.searchParams.get("reference") || "";
  if (!reference) return fail("Missing payment reference.", 400);

  const order = await db.order.findUnique({ where: { reference }, include: { course: true } });
  if (!order) return fail("Payment record not found.", 404);
  if (order.userId !== user.id && !["ADMIN", "MASTER_ADMIN"].includes(user.role)) {
    return fail("You cannot view this payment.", 403);
  }

  if (order.status !== "PAID" && isPaystackConfigured()) {
    const verification = await verifyTransaction(reference);
    const txn = verification.data;
    if (!verification.status || !txn) {
      return json({ ok: false, status: order.status, message: verification.message });
    }
    if (txn.status === "success") {
      if (txn.amount < order.amountKobo) {
        await audit({
          actorId: user.id,
          action: "payment.amount_mismatch",
          entity: "Order",
          entityId: order.id,
          meta: { expected: order.amountKobo, received: txn.amount },
          ip: clientIp(req),
        });
        return fail("The amount received does not match this order. Support has been notified.", 409);
      }
      await fulfillOrder(order.id, { gatewayReference: String(txn.id), ip: clientIp(req) });
    } else if (txn.status === "failed") {
      await db.order.update({ where: { id: order.id }, data: { status: "FAILED", failureReason: txn.gateway_response } });
    }
  }

  const fresh = await db.order.findUnique({ where: { id: order.id }, include: { course: true } });
  return json({
    ok: true,
    status: fresh?.status,
    reference,
    courseId: fresh?.courseId,
    courseTitle: fresh?.course.title,
    demoMode: env.demoPaymentsEnabled,
  });
});
