import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, fail, route } from "@/lib/api";

export const runtime = "nodejs";

export const GET = route(async (_req: NextRequest, ctx) => {
  const { serial } = await ctx.params;
  const certificate = await db.certificate.findUnique({
    where: { serial: serial.toUpperCase() },
    include: { user: { select: { name: true } }, course: { select: { title: true } } },
  });

  if (!certificate) return fail("No certificate matches that serial number.", 404);

  return json({
    ok: true,
    valid: !certificate.revokedAt,
    serial: certificate.serial,
    recipientName: certificate.recipientName,
    courseTitle: certificate.courseTitle,
    issuedAt: certificate.issuedAt,
    revokedAt: certificate.revokedAt,
    status: certificate.revokedAt ? "REVOKED" : "VALID",
    hash: certificate.hash,
    verifyUrl: `/verify?serial=${certificate.serial}`,
  });
});
