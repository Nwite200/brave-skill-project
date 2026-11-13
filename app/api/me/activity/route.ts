import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: NextRequest) => {
  const user = await requireUser();
  const [certificates, orders, notifications] = await Promise.all([
    db.certificate.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { issuedAt: "desc" },
      include: { course: { select: { title: true } } },
    }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { course: { select: { title: true } } },
    }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return json({
    ok: true,
    certificates: certificates.map((c) => ({
      id: c.id,
      serial: c.serial,
      courseTitle: c.courseTitle,
      issuedAt: c.issuedAt,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      reference: o.reference,
      courseTitle: o.course.title,
      amountKobo: o.amountKobo,
      status: o.status,
      paidAt: o.paidAt,
      createdAt: o.createdAt,
      receiptNumber: o.receiptNumber,
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      link: n.link,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
  });
});
