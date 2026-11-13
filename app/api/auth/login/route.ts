import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, rateLimit, clientIp, fail } from "@/lib/api";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const safeNext = (next: string | undefined, fallback: string) => {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
};

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const data = await parseJson(req, loginSchema);

  const [ipLimit, emailLimit] = await Promise.all([
    rateLimit(`login-ip:${ip}`, 12, 600),
    rateLimit(`login-email:${data.email}`, 6, 600),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return fail("Too many sign-in attempts. Please wait a few minutes and try again.", 429);
  }

  const user = await db.user.findUnique({ where: { email: data.email } });
  if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
    await audit({ action: "auth.login_failed", entity: "User", meta: { email: data.email }, ip, userAgent: req.headers.get("user-agent") });
    return fail("Incorrect email or password.", 401);
  }
  if (user.status === "SUSPENDED") {
    return fail("This account has been suspended. Contact support for help.", 403);
  }

  const token = await createSessionToken(user);
  await setSessionCookie(token);
  await Promise.all([
    db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    audit({ actorId: user.id, action: "auth.login", entity: "User", entityId: user.id, ip, userAgent: req.headers.get("user-agent") }),
  ]);

  const fallback = user.role === "STUDENT" ? "/dashboard" : "/admin";
  return json({ ok: true, redirect: safeNext(data.next, fallback), role: user.role });
});
