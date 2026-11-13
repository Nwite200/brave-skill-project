import "server-only";

import crypto from "crypto";
import { env, isPaystackConfigured } from "@/lib/env";
import { HttpError } from "@/lib/api";

const BASE = "https://api.paystack.co";

type PaystackInitResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "reversed";
    reference: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    channel: string;
    gateway_response: string;
    customer: { email: string };
    authorization?: { authorization_code?: string; card_type?: string; bank?: string; last4?: string };
  };
};

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isPaystackConfigured()) throw new HttpError("Paystack is not configured.", 503);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.paystackSecret}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    console.error("[paystack]", path, res.status, data);
    throw new HttpError(data?.message || "Payment provider error.", 502);
  }
  return data;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
  channels?: string[];
}) {
  return paystackFetch<PaystackInitResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      currency: "NGN",
      channels: input.channels ?? ["card", "bank", "ussd", "bank_transfer"],
      metadata: input.metadata,
    }),
  });
}

export async function verifyTransaction(reference: string) {
  return paystackFetch<PaystackVerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export async function refundTransaction(input: {
  transactionReference: string;
  amountKobo?: number;
  reason?: string;
}) {
  return paystackFetch<{ status: boolean; message: string; data?: unknown }>("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: input.transactionReference,
      ...(input.amountKobo ? { amount: input.amountKobo } : {}),
      ...(input.reason ? { customer_note: input.reason, merchant_note: input.reason } : {}),
    }),
  });
}

/** Constant-time validation of the `x-paystack-signature` header. */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !env.paystackSecret) return false;
  const expected = crypto.createHmac("sha512", env.paystackSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function newReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `BS-${stamp}-${rand}`;
}
