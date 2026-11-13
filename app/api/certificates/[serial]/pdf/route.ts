import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail, route } from "@/lib/api";
import { renderCertificatePdf } from "@/lib/certificates";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest, ctx) => {
  const { serial } = await ctx.params;
  const certificate = await db.certificate.findUnique({ where: { serial: serial.toUpperCase() } });
  if (!certificate) return fail("Certificate not found.", 404);
  if (certificate.revokedAt) return fail("This certificate has been revoked and can no longer be downloaded.", 410);

  const pdf = await renderCertificatePdf({
    recipientName: certificate.recipientName,
    courseTitle: certificate.courseTitle,
    serial: certificate.serial,
    issuedAt: certificate.issuedAt,
    verificationHash: certificate.hash,
  });

  await audit({ action: "certificate.downloaded", entity: "Certificate", entityId: certificate.id, ip: clientIp(req) });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Brave-Skill-Certificate-${certificate.serial}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
});
