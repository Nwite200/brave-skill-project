import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { csvResponse, fail, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { formatDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const type = req.nextUrl.searchParams.get("type") || "revenue";
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const dateFilter = {
    ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
  };
  const hasRange = Boolean(from || to);

  let rows: (string | number | null | undefined)[][] = [];
  let filename = "brave-skill-report.csv";

  if (type === "revenue") {
    const orders = await db.order.findMany({
      where: { status: { in: ["PAID", "REFUNDED"] }, ...(hasRange ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } },
    });
    rows = [
      ["Reference", "Student", "Email", "Course", "Subtotal (NGN)", "Discount (NGN)", "Amount (NGN)", "Status", "Gateway", "Paid at", "Refunded at"],
      ...orders.map((o) => [
        o.reference, o.user.name, o.user.email, o.course.title,
        (o.subtotalKobo / 100).toFixed(2), (o.discountKobo / 100).toFixed(2), (o.amountKobo / 100).toFixed(2),
        o.status, o.gateway, formatDate(o.paidAt, true), formatDate(o.refundedAt, true),
      ]),
    ];
    filename = "brave-skill-revenue.csv";
  } else if (type === "students") {
    const users = await db.user.findMany({
      where: { role: "STUDENT", ...(hasRange ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { enrollments: true, certificates: true } } },
    });
    rows = [
      ["Name", "Email", "Phone", "Status", "Enrolments", "Certificates", "Joined", "Last sign in"],
      ...users.map((u) => [u.name, u.email, u.phone, u.status, u._count.enrollments, u._count.certificates, formatDate(u.createdAt), formatDate(u.lastLoginAt, true)]),
    ];
    filename = "brave-skill-students.csv";
  } else if (type === "enrollments") {
    const enrollments = await db.enrollment.findMany({
      where: hasRange ? { enrolledAt: dateFilter } : {},
      orderBy: { enrolledAt: "desc" },
      include: { user: { select: { name: true, email: true } }, course: { select: { title: true } }, _count: { select: { progress: true } } },
    });
    rows = [
      ["Student", "Email", "Course", "Status", "Price paid (NGN)", "Lessons recorded", "Enrolled at", "Completed at"],
      ...enrollments.map((e) => [e.user.name, e.user.email, e.course.title, e.status, (e.pricePaidKobo / 100).toFixed(2), e._count.progress, formatDate(e.enrolledAt), formatDate(e.completedAt)]),
    ];
    filename = "brave-skill-enrollments.csv";
  } else if (type === "certificates") {
    const certificates = await db.certificate.findMany({
      where: hasRange ? { issuedAt: dateFilter } : {},
      orderBy: { issuedAt: "desc" },
      include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } },
    });
    rows = [
      ["Serial", "Recipient", "Email", "Course", "Issued at", "Status", "Revoked at"],
      ...certificates.map((c) => [c.serial, c.recipientName, c.user.email, c.course.title, formatDate(c.issuedAt), c.revokedAt ? "REVOKED" : "VALID", formatDate(c.revokedAt)]),
    ];
    filename = "brave-skill-certificates.csv";
  } else if (type === "courses") {
    const courses = await db.course.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true } }, _count: { select: { enrollments: true, modules: true, certificates: true } } },
    });
    rows = [
      ["Title", "Category", "Level", "Price (NGN)", "Published", "Featured", "Modules", "Enrolments", "Certificates", "Created"],
      ...courses.map((c) => [c.title, c.category.name, c.level, (c.priceKobo / 100).toFixed(2), c.isPublished ? "Yes" : "No", c.isFeatured ? "Yes" : "No", c._count.modules, c._count.enrollments, c._count.certificates, formatDate(c.createdAt)]),
    ];
    filename = "brave-skill-courses.csv";
  } else {
    return fail("Unknown report type.", 400);
  }

  await audit({ actorId: admin.id, action: "report.exported", entity: "Report", meta: { type, from, to, rows: rows.length - 1 } });
  return csvResponse(`${filename.replace(".csv", "")}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
});
