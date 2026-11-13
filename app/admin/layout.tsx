import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await requireStaff();
  } catch {
    redirect("/login?next=/admin");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
