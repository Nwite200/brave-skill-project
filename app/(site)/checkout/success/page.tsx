import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Download, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { formatDate, formatNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Payment successful" };
export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!reference) notFound();

  const order = await db.order.findUnique({
    where: { reference },
    include: { course: true, user: true },
  });
  if (!order || (order.userId !== user.id && !["ADMIN", "MASTER_ADMIN"].includes(user.role))) notFound();

  const paid = order.status === "PAID";

  return (
    <section className="relative py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#10C99A]/[0.09] blur-[110px]" />
      </div>
      <div className="container-bs relative max-w-[620px]">
        <div className="overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#0B0E18]">
          <div className="relative border-b border-white/[0.07] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
              <BadgeCheck size={26} />
            </div>
            <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.03em] text-white">
              {paid ? "You're in." : "Payment pending"}
            </h1>
            <p className="mx-auto mt-2 max-w-[380px] text-[12.5px] leading-relaxed text-[#93A1B6]">
              {paid
                ? "Payment confirmed and your course is unlocked. Your receipt is ready and a confirmation email is on its way."
                : "We have not received final confirmation from the payment provider yet. Access unlocks automatically once verified."}
            </p>
          </div>

          <div className="space-y-3 p-6 text-[12px]">
            <div className="flex justify-between gap-4"><span className="text-[#6F7C90]">Course</span><span className="text-right text-white">{order.course.title}</span></div>
            <div className="flex justify-between gap-4"><span className="text-[#6F7C90]">Reference</span><span className="num text-[#C2CCDD]">{order.reference}</span></div>
            <div className="flex justify-between gap-4"><span className="text-[#6F7C90]">Amount</span><span className="num text-white">{formatNaira(order.amountKobo)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-[#6F7C90]">Date</span><span className="text-[#C2CCDD]">{formatDate(order.paidAt)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-[#6F7C90]">Status</span><span className={paid ? "text-emerald-300" : "text-amber-300"}>{order.status}</span></div>
          </div>

          <div className="grid gap-3 border-t border-white/[0.07] bg-white/[0.015] p-6 sm:grid-cols-2">
            {paid ? (
              <>
                <Link href={`/dashboard/courses/${order.courseId}`} className="btn btn-primary">
                  Start learning <ArrowRight size={15} />
                </Link>
                <a href={`/api/payments/receipt/${order.id}`} className="btn btn-ghost">
                  <Download size={14} /> Receipt (PDF)
                </a>
              </>
            ) : (
              <Link href="/dashboard" className="btn btn-primary sm:col-span-2">Go to dashboard</Link>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10.5px] text-[#5F6B7E]">
          <span className="flex items-center gap-1.5"><Mail size={11} /> Receipt emailed to {order.user.email}</span>
          <Link href="/courses" className="hover:text-white">Browse more courses →</Link>
        </div>
      </div>
    </section>
  );
}
