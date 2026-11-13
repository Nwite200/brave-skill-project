import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";

export const DEFAULT_SETTINGS: Record<string, string> = {
  "site.name": "Brave Skill",
  "site.legalName": "Emyphill-Tech Global Solutions Limited",
  "site.subtitle": "Skill Acquisition Academy",
  "site.slogan": "Learn. Practice. Build.",
  "site.email": "support@academy.emyphilltech.com.ng",
  "site.phone": "+234 800 000 0000",
  "site.whatsapp": "2348000000000",
  "site.address": "Nigeria",
  "site.instagram": "https://instagram.com/braveskill",
  "site.facebook": "https://facebook.com/braveskill",
  "site.youtube": "https://youtube.com/@braveskill",
  "site.tiktok": "https://tiktok.com/@braveskill",
  "site.linkedin": "https://linkedin.com/company/braveskill",
  "hero.eyebrow": "Practical skills. Real opportunities.",
  "hero.title": "Learn Practical Skills. Build Your Future.",
  "hero.subtitle":
    "Hands-on training in solar, security, electrical, networking and access control — taught by working professionals, built for the real Nigerian market.",
  "stats.students": "4,800",
  "stats.courses": "5",
  "stats.certificates": "3,200",
  "stats.instructors": "12",
  "app.version": "1.1.0",
  "app.size": "—",
  "app.url": "",
  "app.requires": "Android 8.0 and above",
  "app.notes": "Full offline-friendly lesson player, quizzes, certificates and payment history.",
  "announcement.bar": "",
  "announcement.link": "",
  "ai.enabled": "true",
  "ai.name": "Brave AI Assistant",
  "ai.greeting":
    "Hello, I'm Brave AI, the learning assistant for Brave Skill Academy. I can help with courses, pricing, enrolment, payments, certificates or the Android app. What can I help you with?",
  "ai.tone": "warm-professional",
  "ai.instructions":
    "Speak like a knowledgeable academy advisor. Be concise, warm and accurate. Never invent prices, policies or payment statuses. Never request passwords, PINs or OTPs. Escalate to a human when unsure.",
  "ai.voice": "auto",
  "ai.voiceRate": "0.98",
  "ai.voicePitch": "1.0",
  "ai.model": "",
  "ai.escalationEmail": "support@academy.emyphilltech.com.ng",
  "ai.allowAnonymous": "true",
  "ai.widgetPosition": "right",
};

export const getSettings = cache(async (): Promise<Record<string, string>> => {
  try {
    const rows = await db.siteSetting.findMany();
    const map = { ...DEFAULT_SETTINGS };
    for (const row of rows) map[row.key] = row.value;
    return map;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
});

export async function getSetting(key: string, fallback = "") {
  const settings = await getSettings();
  return settings[key] ?? fallback;
}

export async function setSettings(entries: Record<string, string>) {
  const keys = Object.keys(entries);
  await db.$transaction(
    keys.map((key) =>
      db.siteSetting.upsert({
        where: { key },
        update: { value: entries[key] ?? "" },
        create: { key, value: entries[key] ?? "" },
      }),
    ),
  );
}
