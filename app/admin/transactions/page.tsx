import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatNaira } from "@/lib/format";
import { RefundButton } from "@/components/admin/RefundButton";

export const metadata: Metadata = { title: "Transactions · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  const orders = await db.order.findMany({
    where: {
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.q
        ? {
            OR: [
              { reference: { contains: params.q, mode: "insensitive" } },
              { user: { email: { contains: params.q, mode: "insensitive" } } },
              { user: { name: { contains: params.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } },
  });

  const totals = await db.order.groupBy({ by: ["status"], _sum: { amountKobo: true }, _count: true });

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Commerce / transactions</p>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Transactions</h1>
          <p className="mt-1 text-[11.5px] text-[#8492A6]">Every order, payment and refund. Access is granted only after server verification.</p>
        </div>
        <Link href="/admin/reports" className="btn btn-ghost btn-sm h-8">Export CSV</Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {["PAID", "PENDING", "REFUNDED", "FAILED"].map((status) => {
          const row = totals.find((t) => t.status === status);
          return (
            <div key={status} className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-3.5">
              <p className="text-[8.5px] uppercase tracking-[0.16em] text-[#6F7C90]">{status}</p>
              <p className="num mt-1 text-[16px] font-semibold text-white">{formatNaira(row?._sum.amountKobo || 0, { compact: true })}</p>
              <p className="text-[9px] text-[#5F6B7E]">{row?._count || 0} orders</p>
            </div>
          );
        })}
      </div>

      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={params.q} placeholder="Reference, student name or email" className="field h-9 flex-1 min-w-[220px] text-[11px]" />
        <select name="status" defaultValue={params.status || ""} className="field h-9 w-auto min-w-[140px] text-[11px]">
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <button className="btn btn-ghost btn-sm h-9">Filter</button>
      </form>

      <div className="mt-4 table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Student</th>
              <th>Course</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Gateway</th>
              <th>Created</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="font-mono text-[10px] text-[#C2CCDD]">{order.reference}</td>
                <td>
                  <p className="text-[11px] text-white">{order.user.name}</p>
                  <p className="text-[9px] text-[#5F6B7E]">{order.user.email}</p>
                </td>
                <td className="max-w-[220px] truncate text-[11px]">{order.course.title}</td>
                <td className="num text-white">{formatNaira(order.amountKobo)}</td>
                <td>
                  <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8.5px] uppercase ${
                    order.status === "PAID" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                      : order.status === "PENDING" ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
                        : order.status === "REFUNDED" ? "border-slate-400/20 bg-slate-500/10 text-slate-300"
                          : "border-rose-400/20 bg-rose-500/10 text-rose-300"
                  }`}>{order.status}</span>
                </td>
                <td className="text-[10px] text-[#8492A6]">{order.gateway}</td>
                <td className="text-[10px] text-[#6F7C90]">{formatDate(order.createdAt, true)}</td>
                <td className="text-right">
                  {order.status === "PAID" ? <RefundButton orderId={order.id} amountLabel={formatNaira(order.amountKobo)} /> : <span className="text-[9px] text-[#3F4A5C]">—</span>}
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={8} className="py-12 text-center text-[11px] text-[#6F7C90]">No transactions found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
