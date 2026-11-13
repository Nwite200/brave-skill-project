import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Download, TrendingUp, Wallet } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatNaira, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Revenue · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  await requireAdminPage();
  const now = new Date();
  const start12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [paidOrders, refunded, paidCount, monthlyRaw, byCourse, byCategory, topStudents, todayRevenue, weekRevenue, monthRevenue, failedOrders] = await Promise.all([
    db.order.aggregate({ where: { status: "PAID" }, _sum: { amountKobo: true } }),
    db.order.aggregate({ where: { status: "REFUNDED" }, _sum: { amountKobo: true, refundAmountKobo: true }, _count: true }),
    db.order.count({ where: { status: "PAID" } }),
    db.order.findMany({ where: { status: "PAID", paidAt: { gte: start12 } }, select: { amountKobo: true, paidAt: true } }),
    db.course.findMany({ include: { _count: { select: { enrollments: true } }, orders: { where: { status: "PAID" }, select: { amountKobo: true } } } }),
    db.category.findMany({ include: { courses: { select: { orders: { where: { status: "PAID" }, select: { amountKobo: true } } } } } }),
    db.user.findMany({
      where: { role: "STUDENT" },
      include: { orders: { where: { status: "PAID" }, select: { amountKobo: true } } },
      take: 200,
    }),
    db.order.aggregate({ where: { status: "PAID", paidAt: { gte: todayStart } }, _sum: { amountKobo: true }, _count: true }),
    db.order.aggregate({ where: { status: "PAID", paidAt: { gte: weekStart } }, _sum: { amountKobo: true }, _count: true }),
    db.order.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amountKobo: true }, _count: true }),
    db.order.findMany({
      where: { status: { in: ["FAILED", "PENDING"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true } }, course: { select: { title: true } } },
    }),
  ]);

  const gross = paidOrders._sum.amountKobo || 0;
  const refundedAmount = refunded._sum.refundAmountKobo || refunded._sum.amountKobo || 0;
  const net = gross - refundedAmount;
  const aov = paidCount ? Math.round(gross / paidCount) : 0;

  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const total = monthlyRaw
      .filter((o) => o.paidAt && o.paidAt.getFullYear() === d.getFullYear() && o.paidAt.getMonth() === d.getMonth())
      .reduce((s, o) => s + o.amountKobo, 0);
    return { label: d.toLocaleString("en", { month: "short" }), total, year: d.getFullYear() };
  });
  const max = Math.max(...months.map((m) => m.total), 1);
  const thisMonth = months[11]?.total || 0;
  const lastMonth = months[10]?.total || 0;
  const growth = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

  const courseRevenue = byCourse
    .map((c) => ({ title: c.title, revenue: c.orders.reduce((s, o) => s + o.amountKobo, 0), enrollments: c._count.enrollments }))
    .filter((c) => c.revenue > 0 || c.enrollments > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const categoryRevenue = byCategory
    .map((c) => ({ name: c.name, revenue: c.courses.flatMap((course) => course.orders).reduce((s, o) => s + o.amountKobo, 0) }))
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
  const categoryTotal = categoryRevenue.reduce((s, c) => s + c.revenue, 0) || 1;

  const studentSpend = topStudents
    .map((s) => ({ name: s.name, email: s.email, spend: s.orders.reduce((sum, o) => sum + o.amountKobo, 0), orders: s.orders.length }))
    .filter((s) => s.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-[1220px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Commerce / revenue</p>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Revenue</h1>
          <p className="mt-1 text-[11.5px] text-[#8492A6]">Verified Paystack settlements, refunds and course performance.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/api/admin/reports/export?type=revenue" className="btn btn-ghost btn-sm h-8"><Download size={12} /> Export revenue</Link>
          <Link href="/admin/transactions" className="btn btn-primary btn-sm h-8">Transactions</Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Today", value: formatNaira(todayRevenue._sum.amountKobo || 0), sub: `${todayRevenue._count} paid orders`, tint: "#20D9E8" },
          { label: "This week", value: formatNaira(weekRevenue._sum.amountKobo || 0), sub: `${weekRevenue._count} paid orders`, tint: "#873BFF" },
          { label: "This month", value: formatNaira(monthRevenue._sum.amountKobo || 0), sub: `${monthRevenue._count} paid orders`, tint: "#10C99A" },
          { label: "All-time gross", value: formatNaira(gross), sub: `${formatNumber(paidCount)} paid orders`, tint: "#FBBF24" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[8.5px] uppercase tracking-[0.16em] text-[#6F7C90]">{stat.label}</p>
              <Wallet size={12} style={{ color: stat.tint }} />
            </div>
            <p className="num mt-2 text-[21px] font-semibold text-white">{stat.value}</p>
            <p className="mt-0.5 text-[9px] text-[#5F6B7E]">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Refunds", value: formatNaira(refundedAmount), sub: `${refunded._count} refunded orders` },
          { label: "Net revenue", value: formatNaira(net), sub: "gross minus refunds" },
          { label: "Average order", value: formatNaira(aov), sub: "per paid enrolment" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-3.5">
            <p className="text-[8.5px] uppercase tracking-[0.16em] text-[#6F7C90]">{stat.label}</p>
            <p className="num mt-1 text-[16px] font-semibold text-white">{stat.value}</p>
            <p className="text-[9px] text-[#5F6B7E]">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Monthly revenue · 12 months</p>
              <p className="num mt-1 text-[22px] font-semibold text-white">{formatNaira(thisMonth)}</p>
            </div>
            <span className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] ${growth >= 0 ? "border-emerald-400/20 text-emerald-300" : "border-rose-400/20 text-rose-300"}`}>
              {growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {growth}%
            </span>
          </div>
          <div className="mt-6 flex h-[180px] items-end gap-1.5">
            {months.map((month, i) => (
              <div key={`${month.label}-${i}`} className="group flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t transition-all group-hover:opacity-80 ${i === 11 ? "bg-gradient-to-t from-[#20D9E8]/30 to-[#20D9E8]" : "bg-gradient-to-t from-[#873BFF]/20 to-[#873BFF]/80"}`}
                    style={{ height: `${Math.max(3, (month.total / max) * 100)}%` }}
                    title={formatNaira(month.total)}
                  />
                </div>
                <span className="text-[8px] text-[#5F6B7E]">{month.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Revenue by track</p>
          <div className="mt-4 space-y-3">
            {categoryRevenue.map((category) => (
              <div key={category.name}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#C2CCDD]">{category.name}</span>
                  <span className="num text-white">{formatNaira(category.revenue, { compact: true })}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" style={{ width: `${(category.revenue / categoryTotal) * 100}%` }} />
                </div>
              </div>
            ))}
            {!categoryRevenue.length && <p className="text-[10px] text-[#5F6B7E]">No revenue recorded yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5 lg:col-span-2">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Course performance</p>
          <div className="mt-3 table-wrap border-0">
            <table className="data min-w-[520px]">
              <thead><tr><th>Course</th><th>Enrolments</th><th>Revenue</th><th>Avg / student</th></tr></thead>
              <tbody>
                {courseRevenue.map((course) => (
                  <tr key={course.title}>
                    <td className="max-w-[220px] truncate text-[11px] text-white">{course.title}</td>
                    <td className="num">{course.enrollments}</td>
                    <td className="num text-white">{formatNaira(course.revenue)}</td>
                    <td className="num">{formatNaira(course.enrollments ? Math.round(course.revenue / course.enrollments) : 0)}</td>
                  </tr>
                ))}
                {!courseRevenue.length && <tr><td colSpan={4} className="py-8 text-center text-[10px] text-[#6F7C90]">No data.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Top students by spend</p>
          <div className="mt-3 space-y-2.5">
            {studentSpend.map((student) => (
              <div key={student.email} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[8px] font-semibold">{student.name.slice(0, 1)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] text-white">{student.name}</p>
                  <p className="truncate text-[8.5px] text-[#5F6B7E]">{student.orders} payments</p>
                </div>
                <span className="num text-[9.5px] text-[#C2CCDD]">{formatNaira(student.spend, { compact: true })}</span>
              </div>
            ))}
            {!studentSpend.length && <p className="text-[10px] text-[#5F6B7E]">No paid students yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
        <div className="flex items-center justify-between">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Failed & pending transactions</p>
          <Link href="/admin/transactions" className="text-[9px] text-[#C9B8FF] hover:text-white">All transactions →</Link>
        </div>
        <div className="mt-3 table-wrap border-0">
          <table className="data min-w-[520px]">
            <thead><tr><th>Student</th><th>Course</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead>
            <tbody>
              {failedOrders.map((order) => (
                <tr key={order.id}>
                  <td className="text-[10.5px] text-white">{order.user.name}</td>
                  <td className="max-w-[220px] truncate text-[10.5px]">{order.course.title}</td>
                  <td className="num text-[10.5px]">{formatNaira(order.amountKobo)}</td>
                  <td><span className={order.status === "FAILED" ? "text-[9px] text-rose-300" : "text-[9px] text-amber-300"}>{order.status}</span></td>
                  <td className="num text-[9px] text-[#6F7C90]">{order.reference}</td>
                </tr>
              ))}
              {!failedOrders.length && <tr><td colSpan={5} className="py-6 text-center text-[10px] text-[#6F7C90]">No failed or pending transactions.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
