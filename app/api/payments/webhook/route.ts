import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, fail, clientIp } from "@/lib/api";
import { env, isPaystackConfigured } from "@/lib/env";
import { verifyWebhookSignature } from "@/lib/paystack";
import { fulfillOrder } from "@/lib/payments";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaystackEvent = {
  event: string;
  data: {
    id: number | string;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paid_at?: string;
    customer?: { email?: string };
    metadata?: { orderId?: string };
  };
};

export async function POST(req: NextRequest) {
  if (!isPaystackConfigured()) return fail("Webhook not configured.", 503);

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(raw, signature)) {
    await audit({ action: "payment.webhook_invalid_signature", entity: "Webhook", meta: { ip: clientIp(req) }, ip: clientIp(req) });
    return fail("Invalid signature.", 401);
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw) as PaystackEvent;
  } catch {
    return fail("Invalid payload.", 400);
  }

  const eventId = String(event.data?.id ?? `${event.event}:${event.data?.reference}`);
  const existing = await db.webhookEvent.findUnique({
    where: { provider_eventId: { provider: "paystack", eventId } },
  });
  if (existing?.processedAt) return json({ ok: true, duplicate: true });

  const record =
    existing ??
    (await db.webhookEvent.create({
      data: { provider: "paystack", eventId, eventType: event.event, payload: raw.slice(0, 50000) },
    }));

  try {
    if (event.event === "charge.success" && event.data?.reference) {
      const order = await db.order.findUnique({ where: { reference: event.data.reference } });
      if (order && event.data.currency === "NGN" && event.data.amount >= order.amountKobo) {
        // Re-verify with Paystack before granting access; never trust the payload alone.
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(event.data.reference)}`, {
          headers: { Authorization: `Bearer ${env.paystackSecret}` },
          cache: "no-store",
        }).then((r) => r.json() as Promise<{ status: boolean; data?: { status: string; amount: number } }>);

        if (response.status && response.data?.status === "success" && response.data.amount >= order.amountKobo) {
          await fulfillOrder(order.id, { gatewayReference: String(event.data.id) });
          await audit({ action: "payment.webhook_fulfilled", entity: "Order", entityId: order.id, meta: { reference: order.reference }, ip: clientIp(req) });
        }
      }
    } else if (event.event === "refund.processed" && event.data?.reference) {
      await db.order.updateMany({
        where: { reference: event.data.reference, status: "PAID" },
        data: { status: "REFUNDED", refundedAt: new Date(), refundReason: "Processed by Paystack" },
      });
      await audit({ action: "payment.refund_webhook", entity: "Order", meta: { reference: event.data.reference } });
    }

    await db.webhookEvent.update({ where: { id: record.id }, data: { processedAt: new Date() } });
  } catch (error) {
    console.error("[paystack:webhook]", error);
    // Returning 500 lets Paystack retry. The event stays unprocessed for replay.
    return fail("Webhook processing failed.", 500);
  }

  return json({ ok: true });
}
