import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, rateLimit, clientIp, fail } from "@/lib/api";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { audit, notify } from "@/lib/audit";
import { sendMail, emailShell } from "@/lib/mail";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const limited = await rateLimit(`register:${ip}`, 6, 600);
  if (!limited.allowed) return fail("Too many registration attempts. Try again later.", 429);

  const data = await parseJson(req, registerSchema);

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) return fail("An account with this email already exists. Try signing in instead.", 409);

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      passwordHash: await hashPassword(data.password),
      role: "STUDENT",
    },
  });

  const token = await createSessionToken(user);
  await setSessionCookie(token);

  await Promise.all([
    db.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "Welcome to Brave Skill",
        body: "Your account is ready. Browse the catalogue and enrol in your first programme.",
        link: "/courses",
      },
    }),
    audit({ actorId: user.id, action: "auth.register", entity: "User", entityId: user.id, ip, userAgent: req.headers.get("user-agent") }),
    sendMail({
      to: user.email,
      subject: "Welcome to Brave Skill",
      html: emailShell(
        "Welcome to Brave Skill",
        `<p>Hi ${user.name.split(" ")[0]},</p><p>Your account has been created. Practical, hands-on training is now one click away.</p><p>Slogan to live by: <strong>Learn. Practice. Build.</strong></p>`,
        { label: "Explore courses", url: `${env.siteUrl}/courses` },
      ),
    }).catch(() => {}),
  ]);

  return json({ ok: true, redirect: "/dashboard", user: { id: user.id, name: user.name, role: user.role } }, 201);
});
