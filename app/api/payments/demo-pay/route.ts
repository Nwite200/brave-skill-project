import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { json, parseJson, route, fail, clientIp, rateLimit } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { fulfillOrder } from "@/lib/payments";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Local/test checkout used ONLY when Paystack keys are absent and
 * ALLOW_DEMO_PAYMENTS=true. In production the guard below always rejects.
 */
export const POST = route(async (req: NextRequest) => {
  if (!env.demoPaymentsEnabled) {
    return fail("Test checkout is disabled on this deployment.", 403);
  }
  const user = await requireUser();
  const limited = await rateLimit(`demo-pay:${user.id}`, 20, 300);
  if (!limited.allowed) return fail("Too many attempts.", 429);

  const { reference } = await parseJson(req, z.object({ reference: z.string().min(4) }));
  const order = await db.order.findUnique({ where: { reference } });
  if (!order || order.userId !== user.id) return fail("Payment record not found.", 404);
  if (order.status === "PAID") return json({ ok: true, status: "PAID", redirect: `/checkout/success?reference=${reference}` });
  if (order.status === "REFUNDED") return fail("This order was refunded.", 409);

  await fulfillOrder(order.id, { gatewayReference: `DEMO-${reference}`, ip: clientIp(req) });
  await audit({
    actorId: user.id,
    action: "payment.demo_fulfilled",
    entity: "Order",
    entityId: order.id,
    meta: { reference, amountKobo: order.amountKobo, warning: "demo mode" },
    ip: clientIp(req),
  });

  return json({ ok: true, status: "PAID", redirect: `/checkout/success?reference=${reference}` });
});
