import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Audit logs · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  const logs = await db.auditLog.findMany({
    where: params.q
      ? {
          OR: [
            { action: { contains: params.q, mode: "insensitive" } },
            { entity: { contains: params.q, mode: "insensitive" } },
            { actor: { name: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 250,
    include: { actor: { select: { name: true, email: true, role: true } } },
  });

  return (
    <div className="mx-auto max-w-[1220px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">System / audit</p>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Audit logs</h1>
          <p className="mt-1 text-[11.5px] text-[#8492A6]">Immutable record of administrative and security events. Latest 250 entries.</p>
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={params.q} placeholder="Filter action, entity or actor" className="field h-8 w-[230px] text-[10.5px]" />
          <button className="btn btn-ghost btn-sm h-8">Search</button>
        </form>
      </div>

      <div className="mt-4 table-wrap">
        <table className="data">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>IP</th><th>Metadata</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-[9.5px] text-[#6F7C90]">{formatDate(log.createdAt, true)}</td>
                <td>
                  <p className="text-[10.5px] text-white">{log.actor?.name || "System"}</p>
                  <p className="text-[8.5px] text-[#5F6B7E]">{log.actor?.role.replace("_", " ").toLowerCase() || "automated"}</p>
                </td>
                <td><span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-[#C9B8FF]">{log.action}</span></td>
                <td className="text-[10px] text-[#8492A6]">
                  {log.entity}
                  {log.entityId && <span className="ml-1 font-mono text-[8.5px] text-[#455063]">{log.entityId.slice(0, 8)}</span>}
                </td>
                <td className="font-mono text-[9px] text-[#5F6B7E]">{log.ip || "—"}</td>
                <td className="max-w-[280px] truncate text-[9px] text-[#6F7C90]" title={log.meta || ""}>{log.meta || "—"}</td>
              </tr>
            ))}
            {!logs.length && <tr><td colSpan={6} className="py-12 text-center text-[11px] text-[#6F7C90]">No matching audit events.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[9px] text-[#5F6B7E]">
        Audit entries are written for logins, payments, refunds, course changes, permission changes, certificate actions, report exports and contact-message handling.{" "}
        <Link href="/admin/reports" className="text-[#C9B8FF] hover:text-white">Export operational data →</Link>
      </p>
    </div>
  );
}
