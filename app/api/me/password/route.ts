import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireUser, hashPassword, verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { passwordChangeSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const data = await parseJson(req, passwordChangeSchema);

  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(data.currentPassword, record.passwordHash))) {
    return fail("Your current password is incorrect.", 401);
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(data.newPassword), tokenVersion: { increment: 1 } },
  });

  const token = await createSessionToken(updated);
  await setSessionCookie(token);
  await audit({ actorId: user.id, action: "profile.password_changed", entity: "User", entityId: user.id });

  return json({ ok: true, message: "Password updated." });
});
