import crypto from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, rateLimit, clientIp, fail } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";
import { sendMail, emailShell } from "@/lib/mail";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const limited = await rateLimit(`forgot:${ip}`, 5, 900);
  if (!limited.allowed) return fail("Too many requests. Try again later.", 429);

  const { email } = await parseJson(req, forgotPasswordSchema);
  const user = await db.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await sendMail({
      to: user.email,
      subject: "Reset your Brave Skill password",
      html: emailShell(
        "Reset your password",
        `<p>Hi ${user.name.split(" ")[0]},</p><p>We received a request to reset your password. This link expires in 60 minutes.</p><p>If you did not request this, you can safely ignore this email.</p>`,
        { label: "Reset password", url: `${env.siteUrl}/reset-password?token=${token}` },
      ),
    }).catch(() => {});
  }

  return json({
    ok: true,
    message: "If an account matches that email, a reset link has been sent.",
  });
});
