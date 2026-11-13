import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route, enforceRateLimit, fail } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { runAgent } from "@/lib/agent";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().trim().min(1, "Type a question to continue").max(2000),
  conversationId: z.string().max(40).optional().nullable(),
  channel: z.enum(["WEB", "ANDROID", "ADMIN"]).optional(),
});

export const POST = route(async (req: NextRequest) => {
  await enforceRateLimit(req, "agent-chat", 30, 60);
  const settings = await getSettings();
  if (settings["ai.enabled"] !== "true") return fail("The Brave AI Assistant is temporarily unavailable. Please contact support.", 503);

  const data = await parseJson(req, schema);
  const user = await getSessionUser();

  const result = await runAgent({
    message: data.message,
    conversationId: data.conversationId || null,
    user,
    channel: data.channel || "WEB",
  });

  return json(result);
});
