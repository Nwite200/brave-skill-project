import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, rateLimit, clientIp, fail } from "@/lib/api";
import { contactSchema } from "@/lib/validation";
import { getSessionUser } from "@/lib/auth";
import { sendMail, emailShell } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const limited = await rateLimit(`contact:${ip}`, 6, 900);
  if (!limited.allowed) return fail("Too many messages. Please try again later.", 429);

  const data = await parseJson(req, contactSchema);
  const [user, settings] = await Promise.all([getSessionUser(), getSettings()]);

  const message = await db.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
      userId: user?.id,
    },
  });

  await sendMail({
    to: settings["site.email"],
    subject: `New enquiry: ${data.subject}`,
    html: emailShell(
      "New contact message",
      `<p><strong>${data.name}</strong> (${data.email}${data.phone ? `, ${data.phone}` : ""}) wrote:</p><p style="white-space:pre-wrap">${data.message.replace(/</g, "&lt;")}</p>`,
      { label: "Open admin inbox", url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/settings#messages` },
    ),
  }).catch(() => {});

  return json({ ok: true, id: message.id, message: "Thanks — your message has been received. We usually reply within one business day." }, 201);
});
