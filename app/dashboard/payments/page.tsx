import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Download, Receipt, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatNaira, statusTone } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { course: { select: { title: true, slug: true } } },
  });

  const paid = orders.filter((o) => o.status === "PAID");
  const totalPaid = paid.reduce((sum, o) => sum + o.amountKobo, 0);

  return (
    <div className="mx-auto max-w-[1000px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-white">Payment history</h1>
        <p className="mt-1 text-[12px] text-[#8492A6]">Your orders, receipts and refund records.</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total paid", value: formatNaira(totalPaid), icon: CreditCard },
          { label: "Completed payments", value: String(paid.length), icon: Receipt },
          { label: "Secured by", value: "Paystack", icon: ShieldCheck },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <item.icon size={14} className="text-[#873BFF]" />
            <p className="num mt-2 text-[18px] font-semibold text-white">{item.value}</p>
            <p className="text-[9.5px] uppercase tracking-[0.14em] text-[#6F7C90]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Course</th>
              <th>Reference</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th className="text-right">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/courses/${order.course.slug}`} className="font-medium text-white hover:text-[#C9B8FF]">{order.course.title}</Link>
                </td>
                <td className="num text-[11px] text-[#8492A6]">{order.reference}</td>
                <td className="text-[11px]">{formatDate(order.paidAt || order.createdAt)}</td>
                <td className="num text-white">{formatNaira(order.amountKobo)}</td>
                <td>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] ${statusTone[order.status] || "border-white/10 text-[#8492A6]"}`}>
                    {order.status}
                  </span>
                </td>
                <td className="text-right">
                  {order.status === "PAID" ? (
                    <a href={`/api/payments/receipt/${order.id}`} className="inline-flex items-center gap-1 text-[10.5px] text-[#C9B8FF] hover:text-white"><Download size={11} /> PDF</a>
                  ) : order.status === "REFUNDED" ? (
                    <span className="text-[10px] text-[#6F7C90]">{formatDate(order.refundedAt)}</span>
                  ) : (
                    <span className="text-[10px] text-[#5F6B7E]">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr><td colSpan={6} className="py-10 text-center text-[12px] text-[#6F7C90]">No payments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-[#5F6B7E]">
        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-[#10C99A]" />
        Payments are processed by Paystack and verified on our server before access is granted. If a payment is missing, contact support with the transaction reference.
      </p>
    </div>
  );
}
