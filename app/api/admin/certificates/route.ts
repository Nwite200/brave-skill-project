import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { issueCertificate } from "@/lib/certificates";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const data = z.object({ userId: z.string().min(1), courseId: z.string().min(1) }).parse(await req.json().catch(() => ({})));

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: data.userId, courseId: data.courseId } },
  });
  if (!enrollment) return fail("The student must be enrolled before a certificate can be issued.", 409);
  if (enrollment.status === "REVOKED") return fail("This enrolment has been revoked.", 409);

  const certificate = await issueCertificate({
    userId: data.userId,
    courseId: data.courseId,
    enrollmentId: enrollment.id,
  });

  await audit({ actorId: admin.id, action: "certificate.issued_manually", entity: "Certificate", entityId: certificate.id, meta: { serial: certificate.serial } });
  return json({ ok: true, certificate }, 201);
});

export const PATCH = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const data = z
    .object({ id: z.string().min(1), revoked: z.boolean(), reason: z.string().max(300).optional() })
    .parse(await req.json().catch(() => ({})));

  const certificate = await db.certificate.update({
    where: { id: data.id },
    data: {
      revokedAt: data.revoked ? new Date() : null,
      revokeReason: data.revoked ? data.reason || "Revoked by administrator" : null,
    },
  });

  await audit({ actorId: admin.id, action: data.revoked ? "certificate.revoked" : "certificate.restored", entity: "Certificate", entityId: data.id });
  return json({ ok: true, certificate });
});
