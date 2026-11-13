import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login?next=/dashboard");
  }
  if (user.role !== "STUDENT") redirect("/admin");

  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });

  return (
    <DashboardShell user={user} unread={unread}>
      {children}
    </DashboardShell>
  );
}
