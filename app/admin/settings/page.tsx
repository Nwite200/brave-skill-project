import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Database, HardDrive, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, isPaystackConfigured } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { StaffRoleEditor } from "@/components/admin/StaffRoleEditor";
import { ROLE_LABEL } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Settings · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await requireAdminPage();
  const [settings, staff] = await Promise.all([
    getSettings(),
    db.user.findMany({
      where: { role: { in: ["MASTER_ADMIN", "ADMIN", "INSTRUCTOR"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true },
    }),
  ]);

  const checks = [
    {
      label: "Database",
      value: "PostgreSQL connected",
      ok: true,
      icon: Database,
      detail: "Prisma connection is live. Run prisma migrate deploy on release.",
    },
    {
      label: "Payments",
      value: isPaystackConfigured() ? "Paystack live keys detected" : env.demoPaymentsEnabled ? "Test checkout (no keys)" : "Not configured",
      ok: isPaystackConfigured(),
      icon: ShieldCheck,
      detail: isPaystackConfigured()
        ? "Webhooks must point to /api/payments/webhook with the same secret key."
        : "Add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY, set ALLOW_DEMO_PAYMENTS=false.",
    },
    {
      label: "Media storage",
      value: env.storageDir,
      ok: true,
      icon: HardDrive,
      detail: "Private directory. Videos and PDFs are served only after entitlement checks.",
    },
    {
      label: "Email (SMTP)",
      value: process.env.SMTP_HOST ? process.env.SMTP_HOST : "Not configured (console logging)",
      ok: Boolean(process.env.SMTP_HOST),
      icon: Mail,
      detail: "Transactional email falls back to server logs when SMTP is absent.",
    },
  ];

  return (
    <div className="mx-auto max-w-[1100px] space-y-7">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">System / settings</p>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Settings & access</h1>
        <p className="mt-1 text-[11.5px] text-[#8492A6]">Configuration, staff roles and deployment health.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
            <div className="flex items-start justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-[#C9C2FF]"><check.icon size={14} /></span>
              <span className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] uppercase ${check.ok ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-amber-400/20 bg-amber-500/10 text-amber-300"}`}>
                {check.ok ? <CheckCircle2 size={8} /> : <ShieldAlert size={8} />} {check.ok ? "OK" : "Action"}
              </span>
            </div>
            <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-[#6F7C90]">{check.label}</p>
            <p className="mt-0.5 text-[11px] text-white">{check.value}</p>
            <p className="mt-1 text-[9px] leading-relaxed text-[#5F6B7E]">{check.detail}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-white">Academy identity</h2>
        <SettingsForm
          settings={settings}
          groups={[
            {
              title: "Identity",
              fields: [
                { key: "site.name", label: "Brand name" },
                { key: "site.subtitle", label: "Subtitle" },
                { key: "site.legalName", label: "Legal company", full: true },
                { key: "site.slogan", label: "Slogan", full: true },
              ],
            },
          ]}
        />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-white">Staff & permissions</h2>
            <p className="mt-0.5 text-[10px] text-[#7C8AA3]">Master administrators manage roles. Administrators manage content, students, payments and certificates. Instructors manage only their own courses.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last sign in</th></tr></thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="text-white">{member.name}</td>
                  <td className="text-[10.5px] text-[#A2AFC2]">{member.email}</td>
                  <td>
                    <StaffRoleEditor userId={member.id} role={member.role} canEdit={admin.role === "MASTER_ADMIN" && member.id !== admin.id} />
                  </td>
                  <td><span className={member.status === "ACTIVE" ? "text-emerald-300" : "text-rose-300"}>{member.status}</span></td>
                  <td className="text-[10px] text-[#6F7C90]">{member.lastLoginAt ? formatDate(member.lastLoginAt, true) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[9px] text-[#5F6B7E]">Your role: {ROLE_LABEL[admin.role]} · Account created {formatDate(new Date())}</p>
      </section>

      <section className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
        <h2 className="text-[12px] font-semibold text-white">Ownership & compliance</h2>
        <p className="mt-1.5 max-w-[720px] text-[10.5px] leading-relaxed text-[#8492A6]">
          Brave Skill is owned and operated by <strong className="text-white">Emyphill-Tech Global Solutions Limited</strong>. The company controls the domain and DNS, hosting, database, source repository, Paystack account, Google Play developer account and app signing keys.
          Never share the production <code className="rounded bg-black/30 px-1">.env</code> or signing keystore outside authorised company custody.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
          <Link href="/admin/audit-logs" className="text-[#C9B8FF] hover:text-white">Audit logs →</Link>
          <Link href="/admin/reports" className="text-[#8492A6] hover:text-white">Export data</Link>
          <Link href="/privacy" className="text-[#8492A6] hover:text-white">Privacy policy</Link>
        </div>
      </section>
    </div>
  );
}
