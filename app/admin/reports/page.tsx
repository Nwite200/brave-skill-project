import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReportExports } from "@/components/admin/ReportExports";
import { formatNaira, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Reports · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdminPage();
  const [revenue, students, enrollments, certificates] = await Promise.all([
    db.order.aggregate({ where: { status: "PAID" }, _sum: { amountKobo: true } }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.enrollment.count(),
    db.certificate.count({ where: { revokedAt: null } }),
  ]);

  return (
    <div className="mx-auto max-w-[1180px]">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">System / reports</p>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Reports & exports</h1>
        <p className="mt-1 text-[11.5px] text-[#8492A6]">Download operational data for accounting, compliance or analysis. Exports are logged.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          { label: "All-time revenue", value: formatNaira(revenue._sum.amountKobo || 0) },
          { label: "Students", value: formatNumber(students) },
          { label: "Enrolments", value: formatNumber(enrollments) },
          { label: "Active certificates", value: formatNumber(certificates) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
            <p className="text-[8.5px] uppercase tracking-[0.16em] text-[#6F7C90]">{stat.label}</p>
            <p className="num mt-1.5 text-[18px] font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <ReportExports />
      </div>

      <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 text-[9.5px] leading-relaxed text-[#6F7C90]">
        Recommended monthly routine: export revenue and students on the 1st, store the CSVs in the company’s secure drive, and take a database backup using <code className="rounded bg-black/30 px-1">npm run db:backup</code>. See the deployment documentation for the full backup and recovery procedure.
      </div>
    </div>
  );
}
