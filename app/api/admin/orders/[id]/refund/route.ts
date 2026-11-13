import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { refundSchema } from "@/lib/validation";
import { refundOrder } from "@/lib/payments";
import { refundTransaction } from "@/lib/paystack";
import { isPaystackConfigured } from "@/lib/env";
import { toKobo } from "@/lib/format";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const data = refundSchema.parse(await req.json().catch(() => ({})));

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return fail("Order not found.", 404);
  if (order.status !== "PAID") return fail("Only paid orders can be refunded.", 409);

  const amount = data.amountNaira ? toKobo(data.amountNaira) : order.amountKobo;

  if (isPaystackConfigured() && order.gatewayReference) {
    await refundTransaction({
      transactionReference: order.reference,
      amountKobo: amount,
      reason: data.reason,
    });
  }

  const result = await refundOrder({
    orderId: order.id,
    adminId: admin.id,
    reason: data.reason,
    amountKobo: amount,
  });

  return json({ ok: true, refundedKobo: result.amount });
});
