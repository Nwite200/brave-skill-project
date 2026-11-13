import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentVerifier } from "@/components/checkout/PaymentVerifier";

export const metadata: Metadata = { title: "Confirming payment" };

export default function CheckoutCallbackPage() {
  return (
    <section className="py-20">
      <div className="container-bs max-w-[560px]">
        <Suspense fallback={<div className="rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-8 text-center text-[12px] text-[#7C8AA3]">Preparing verification…</div>}>
          <PaymentVerifier />
        </Suspense>
        <p className="mt-6 text-center text-[10.5px] text-[#5F6B7E]">
          Paid but still locked? Your webhook will unlock access automatically. Contact support if this persists after 10 minutes.
        </p>
      </div>
    </section>
  );
}
