import "server-only";

import { env } from "@/lib/env";

/**
 * HTTP email delivery (works on Cloudflare Workers and Node).
 * Set RESEND_API_KEY in production. Without it, messages are logged so local
 * development and staging remain fully testable.
 */
export async function sendMail(input: { to: string; subject: string; html: string; text?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[mail:dev] to=${input.to} subject="${input.subject}"`);
    return { delivered: false, reason: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || process.env.SMTP_FROM || "Brave Skill <no-reply@academy.emyphilltech.com.ng>",
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!response.ok) {
      console.error("[mail] provider rejected the message", response.status, await response.text().catch(() => ""));
      return { delivered: false, reason: "Provider rejected the message" };
    }
    return { delivered: true };
  } catch (error) {
    console.error("[mail] delivery failed", error);
    return { delivered: false, reason: "Delivery failed" };
  }
}

export const emailShell = (title: string, body: string, cta?: { label: string; url: string }) => `
<div style="background:#050509;padding:40px 16px;font-family:Inter,Arial,sans-serif;color:#e8eef9">
  <div style="max-width:560px;margin:0 auto;background:#0d101b;border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden">
    <div style="padding:22px 26px;border-bottom:1px solid rgba(255,255,255,.07);font-weight:700;letter-spacing:.14em;font-size:13px;color:#fff">
      BRAVE <span style="color:#20d9e8">SKILL</span>
    </div>
    <div style="padding:28px 26px">
      <h1 style="font-size:21px;margin:0 0 14px;color:#fff">${title}</h1>
      <div style="font-size:14px;line-height:1.7;color:#9fadc2">${body}</div>
      ${
        cta
          ? `<div style="margin-top:26px"><a href="${cta.url}" style="display:inline-block;background:linear-gradient(100deg,#873bff,#1677ff);color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:600;font-size:14px">${cta.label}</a></div>`
          : ""
      }
    </div>
    <div style="padding:18px 26px;border-top:1px solid rgba(255,255,255,.07);font-size:11px;color:#64748b;line-height:1.6">
      Brave Skill Skill Acquisition Academy — an Emyphill-Tech Global Solutions Limited platform.<br/>
      ${env.siteUrl}
    </div>
  </div>
</div>`;
