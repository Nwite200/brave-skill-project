import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserManager } from "@/components/admin/UserManager";

export const metadata: Metadata = { title: "Students · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const admin = await requireAdminPage();
  const [students, courses] = await Promise.all([
    db.user.findMany({
      where: { role: "STUDENT" },
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
      role="STUDENT"
      canChangeRoles={admin.role === "MASTER_ADMIN"}
      courses={courses}
      users={students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        role: s.role,
        status: s.status,
        headline: s.headline,
        createdAt: s.createdAt.toISOString(),
        lastLoginAt: s.lastLoginAt?.toISOString() || null,
        enrollments: s._count.enrollments,
        certificates: s._count.certificates,
      }))}
    />
  );
}
