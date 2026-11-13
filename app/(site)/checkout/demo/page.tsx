import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatNaira } from "@/lib/format";
import { DemoPayButton } from "@/components/checkout/DemoPayButton";

export const metadata: Metadata = { title: "Test checkout" };
export const dynamic = "force-dynamic";

export default async function DemoCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  if (!env.demoPaymentsEnabled) notFound();
  const { reference } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/demo?reference=${reference || ""}`)}`);
  if (!reference) notFound();

  const order = await db.order.findUnique({ where: { reference }, include: { course: true } });
  if (!order || order.userId !== user.id) notFound();

  return (
    <section className="relative py-16">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="container-bs relative max-w-[640px]">
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />
          <div>
            <p className="text-[12.5px] font-medium text-amber-200">Test checkout — no real money moves</p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-200/70">
              Paystack keys are not configured on this deployment, so the platform is using its guarded local checkout.
              Add <code className="rounded bg-black/30 px-1">PAYSTACK_SECRET_KEY</code> and{" "}
              <code className="rounded bg-black/30 px-1">PAYSTACK_PUBLIC_KEY</code> and set{" "}
              <code className="rounded bg-black/30 px-1">ALLOW_DEMO_PAYMENTS=false</code> for live payments.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0B0E18]">
          <div className="border-b border-white/[0.07] p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6F7C90]">Order summary</p>
            <h1 className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-white">{order.course.title}</h1>
            <p className="mt-1 text-[11px] text-[#7C8AA3]">Reference {order.reference}</p>
          </div>

          <div className="space-y-3 p-6 text-[12.5px]">
            <div className="flex justify-between text-[#9AA6BA]"><span>Course price</span><span className="num">{formatNaira(order.subtotalKobo)}</span></div>
            {order.discountKobo > 0 && (
              <div className="flex justify-between text-[#10C99A]"><span>Discount</span><span className="num">−{formatNaira(order.discountKobo)}</span></div>
            )}
            <div className="flex justify-between border-t border-white/[0.07] pt-3 text-[15px] font-semibold text-white">
              <span>Total</span><span className="num">{formatNaira(order.amountKobo)}</span>
            </div>
            <p className="flex items-center gap-1.5 pt-1 text-[10px] text-[#6F7C90]"><ShieldCheck size={11} /> Fulfilment runs only on the server after verified payment.</p>
          </div>

          <div className="border-t border-white/[0.07] bg-white/[0.015] p-6">
            <DemoPayButton reference={order.reference} />
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#5F6B7E]">
              <Lock size={10} /> In live mode this screen is replaced by Paystack.
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-[#6F7C90]">
          Changed your mind? <Link href={`/courses/${order.course.slug}`} className="text-[#C9B8FF] hover:text-white">Back to course</Link>
        </p>
      </div>
    </section>
  );
}
