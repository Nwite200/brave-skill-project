import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { settingsSchema } from "@/lib/validation";
import { setSettings, getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async () => {
  await requireAdmin();
  return json({ ok: true, settings: await getSettings() });
});

export const PATCH = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const data = settingsSchema.parse(await req.json().catch(() => ({})));
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.length > 80) continue;
    entries[key] = String(value).slice(0, 4000);
  }
  await setSettings(entries);
  await audit({ actorId: admin.id, action: "settings.updated", entity: "SiteSetting", meta: { keys: Object.keys(entries) } });
  return json({ ok: true, settings: await getSettings() });
});
