import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getSettings, setSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async () => {
  await requireAdmin();
  const settings = await getSettings();
  return json({ ok: true, settings: Object.fromEntries(Object.entries(settings).filter(([key]) => key.startsWith("ai."))) });
});

const schema = z.record(z.string().startsWith("ai."), z.string().max(4000));

export const PATCH = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const data = await parseJson(req, schema);
  await setSettings(data);
  await audit({ actorId: admin.id, action: "agent.settings_updated", entity: "AgentSetting", meta: { keys: Object.keys(data) } });
  const settings = await getSettings();
  return json({ ok: true, settings: Object.fromEntries(Object.entries(settings).filter(([key]) => key.startsWith("ai."))) });
});
