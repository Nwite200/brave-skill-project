import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserManager } from "@/components/admin/UserManager";

export const metadata: Metadata = { title: "Instructors · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminInstructorsPage() {
  const admin = await requireAdminPage();
  const [instructors, courses] = await Promise.all([
    db.user.findMany({
      where: { role: "INSTRUCTOR" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, phone: true, role: true, status: true, headline: true,
        createdAt: true, lastLoginAt: true,
        _count: { select: { enrollments: true, certificates: true } },
      },
    }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <UserManager
      role="INSTRUCTOR"
      canChangeRoles={admin.role === "MASTER_ADMIN"}
      courses={courses}
      users={instructors.map((i) => ({
        id: i.id,
        name: i.name,
        email: i.email,
        phone: i.phone,
        role: i.role,
        status: i.status,
        headline: i.headline,
        createdAt: i.createdAt.toISOString(),
        lastLoginAt: i.lastLoginAt?.toISOString() || null,
        enrollments: i._count.enrollments,
        certificates: i._count.certificates,
      }))}
    />
  );
}
