import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CreditCard,
  GraduationCap,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireStaffPage, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatNaira, formatNumber, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Admin dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireStaffPage();
  const admin = isAdmin(user.role);

  const courseWhere = admin ? {} : { instructorId: user.id };
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [students, courses, enrollments, certificates, paidAll, paidThisMonth, paidLastMonth, pendingOrders] = await Promise.all([
    admin ? db.user.count({ where: { role: "STUDENT" } }) : Promise.resolve(0),
    db.course.count({ where: courseWhere }),
    db.enrollment.count({ where: admin ? {} : { course: { instructorId: user.id } } }),
    db.certificate.count({ where: admin ? { revokedAt: null } : { revokedAt: null, course: { instructorId: user.id } } }),
    db.order.aggregate({ where: { status: "PAID", ...(admin ? {} : { course: { instructorId: user.id } }) }, _sum: { amountKobo: true }, _count: true }),
    db.order.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart }, ...(admin ? {} : { course: { instructorId: user.id } }) }, _sum: { amountKobo: true } }),
    db.order.aggregate({ where: { status: "PAID", paidAt: { gte: lastMonthStart, lt: monthStart }, ...(admin ? {} : { course: { instructorId: user.id } }) }, _sum: { amountKobo: true } }),
    db.order.count({ where: { status: "PENDING", ...(admin ? {} : { course: { instructorId: user.id } }) } }),
  ]);

  const revenue = paidAll._sum.amountKobo || 0;
  const thisMonth = paidThisMonth._sum.amountKobo || 0;
  const lastMonth = paidLastMonth._sum.amountKobo || 0;
  const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0;

  const monthly = await db.order.findMany({
    where: { status: "PAID", paidAt: { gte: sixMonthsAgo }, ...(admin ? {} : { course: { instructorId: user.id } }) },
    select: { amountKobo: true, paidAt: true },
  });
  const buckets = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const total = monthly
      .filter((o) => o.paidAt && o.paidAt.getFullYear() === d.getFullYear() && o.paidAt.getMonth() === d.getMonth())
      .reduce((sum, o) => sum + o.amountKobo, 0);
    return { label: d.toLocaleString("en", { month: "short" }), total };
  });
  const maxMonthly = Math.max(...buckets.map((b) => b.total), 1);

  const [recentOrders, recentStudents, topCourses, unreadMessages] = await Promise.all([
    admin
      ? db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { name: true } }, course: { select: { title: true } } } })
      : db.order.findMany({ where: { course: { instructorId: user.id } }, orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { name: true } }, course: { select: { title: true } } } }),
    db.user.findMany({ where: { role: "STUDENT" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true, status: true } }),
    db.course.findMany({
      where: courseWhere,
      orderBy: { enrollments: { _count: "desc" } },
      take: 4,
      include: { _count: { select: { enrollments: true } } },
    }),
    db.contactMessage.count({ where: { status: "NEW" } }),
  ]);

  const stats = [
    { label: "Total revenue", value: formatNaira(revenue), sub: `${paidAll._count} paid orders`, icon: Wallet, tint: "#10C99A" },
    { label: "Students", value: formatNumber(students), sub: admin ? "registered learners" : "academy-wide", icon: Users, tint: "#20D9E8" },
    { label: "Enrolments", value: formatNumber(enrollments), sub: "course access granted", icon: BookOpen, tint: "#873BFF" },
    { label: "Certificates", value: formatNumber(certificates), sub: "active credentials", icon: GraduationCap, tint: "#1677FF" },
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#455063]">Console / overview</p>
          <h1 className="mt-1.5 text-[23px] font-semibold tracking-[-0.03em] text-white">Academy control centre</h1>
          <p className="mt-1 text-[11.5px] text-[#8492A6]">
            Signed in as {user.name} · {user.role === "MASTER_ADMIN" ? "master administrator" : user.role.toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {admin && <Link href="/admin/courses/new" className="btn btn-primary btn-sm h-9">New course</Link>}
          <Link href="/admin/reports" className="btn btn-ghost btn-sm h-9">Export reports</Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
            <div className="absolute right-0 top-0 h-16 w-16 rounded-full opacity-[0.13] blur-2xl" style={{ background: stat.tint }} />
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#6F7C90]">{stat.label}</p>
              <stat.icon size={13} style={{ color: stat.tint }} />
            </div>
            <p className="num mt-2.5 text-[24px] font-semibold tracking-[-0.03em] text-white">{stat.value}</p>
            <p className="mt-0.5 text-[9.5px] text-[#5F6B7E]">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Revenue · last 6 months</p>
              <p className="num mt-1 text-[26px] font-semibold tracking-[-0.03em] text-white">{formatNaira(thisMonth)}</p>
              <p className={`mt-1 flex items-center gap-1 text-[10px] ${growth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                <TrendingUp size={11} /> {growth >= 0 ? "+" : ""}{growth}% vs last month
              </p>
            </div>
            <span className="chip border-emerald-400/20 bg-emerald-500/5 text-[8.5px] text-emerald-300">NGN · Paystack verified</span>
          </div>

          <div className="mt-6 flex items-end gap-3">
            {buckets.map((bucket) => (
              <div key={bucket.label} className="group flex flex-1 flex-col items-center gap-2">
                <span className="num text-[8px] text-[#5F6B7E] opacity-0 transition group-hover:opacity-100">{formatNaira(bucket.total, { compact: true })}</span>
                <div className="flex h-[128px] w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-[#873BFF]/25 to-[#873BFF] transition-all duration-500 group-hover:to-[#20D9E8]"
                    style={{ height: `${Math.max(4, (bucket.total / maxMonthly) * 128)}px` }}
                  />
                </div>
                <span className="text-[8.5px] text-[#5F6B7E]">{bucket.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.06] pt-3 text-[9.5px] text-[#6F7C90]">
            <span>All-time <span className="num text-white">{formatNaira(revenue)}</span></span>
            <span>Pending orders <span className="num text-amber-300">{pendingOrders}</span></span>
            <span>New enquiries <span className="num text-[#20D9E8]">{unreadMessages}</span></span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Recent transactions</p>
            <Link href="/admin/transactions" className="text-[9px] text-[#C9B8FF] hover:text-white">All →</Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-2.5">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${order.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : order.status === "PENDING" ? "bg-amber-500/10 text-amber-400" : "bg-white/[0.04] text-[#6F7C90]"}`}>
                  <CreditCard size={11} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] text-white">{order.course.title}</p>
                  <p className="truncate text-[8.5px] text-[#5F6B7E]">{order.user.name} · {timeAgo(order.createdAt)}</p>
                </div>
                <span className="num shrink-0 text-[9.5px] text-[#C2CCDD]">{formatNaira(order.amountKobo, { compact: true })}</span>
              </div>
            ))}
            {!recentOrders.length && <p className="text-[10px] text-[#5F6B7E]">No transactions yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Top programmes</p>
            <Link href="/admin/courses" className="text-[9px] text-[#C9B8FF] hover:text-white">Manage →</Link>
          </div>
          <div className="mt-3 space-y-3">
            {topCourses.map((course, i) => (
              <div key={course.id} className="flex items-center gap-2.5">
                <span className="num text-[9px] text-[#455063]">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] text-[#D6DFEC]">{course.title}</p>
                  <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" style={{ width: `${Math.min(100, (course._count.enrollments / Math.max(1, topCourses[0]?._count.enrollments || 1)) * 100)}%` }} />
                  </div>
                </div>
                <span className="num shrink-0 text-[9px] text-[#8492A6]">{course._count.enrollments}</span>
              </div>
            ))}
            {!topCourses.length && <p className="text-[10px] text-[#5F6B7E]">No courses yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">New students</p>
            <Link href="/admin/students" className="text-[9px] text-[#C9B8FF] hover:text-white">All →</Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {recentStudents.map((student) => (
              <div key={student.id} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[8px] font-semibold">{student.name.slice(0, 1)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] text-white">{student.name}</p>
                  <p className="truncate text-[8.5px] text-[#5F6B7E]">{student.email}</p>
                </div>
                <span className="shrink-0 text-[8px] text-[#455063]">{timeAgo(student.createdAt)}</span>
              </div>
            ))}
            {!recentStudents.length && <p className="text-[10px] text-[#5F6B7E]">No students yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Quick actions</p>
          <div className="mt-3 grid gap-2">
            {[
              { href: "/admin/courses/new", label: "Create a course", admin: true },
              { href: "/admin/announcements", label: "Publish an announcement" },
              { href: "/admin/coupons", label: "Create a discount code", admin: true },
              { href: "/admin/website", label: "Update website content", admin: true },
              { href: "/admin/reports", label: "Download reports", admin: true },
            ].filter((action) => action.admin !== false || admin).map((action) => (
              <Link key={action.href} href={action.href} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.015] px-3 py-2 text-[10px] text-[#C2CCDD] transition hover:border-white/15 hover:text-white">
                {action.label} <ArrowUpRight size={11} className="text-[#455063]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
