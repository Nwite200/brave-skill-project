import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { CertificateManager } from "@/components/admin/CertificateManager";

export const metadata: Metadata = { title: "Certificates · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  await requireAdminPage();
  const [certificates, students, courses] = await Promise.all([
    db.certificate.findMany({
      orderBy: { issuedAt: "desc" },
      include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } },
      take: 300,
    }),
    db.user.findMany({ where: { role: "STUDENT", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <CertificateManager
      students={students}
      courses={courses}
      certificates={certificates.map((c) => ({
        id: c.id,
        serial: c.serial,
        recipientName: c.recipientName,
        email: c.user.email,
        courseTitle: c.course.title,
        issuedAt: c.issuedAt.toISOString(),
        revokedAt: c.revokedAt?.toISOString() || null,
      }))}
    />
  );
}
