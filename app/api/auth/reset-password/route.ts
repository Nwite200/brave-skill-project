import crypto from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, rateLimit, clientIp, fail } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const limited = await rateLimit(`reset:${ip}`, 8, 900);
  if (!limited.allowed) return fail("Too many attempts. Try again later.", 429);

  const data = await parseJson(req, resetPasswordSchema);
  const tokenHash = crypto.createHash("sha256").update(data.token).digest("hex");
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail("This reset link is invalid or has expired. Request a new one.", 400);
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(data.password), tokenVersion: { increment: 1 } },
    }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await audit({ actorId: record.userId, action: "auth.password_reset", entity: "User", entityId: record.userId, ip });

  return json({ ok: true, redirect: "/login" });
});
