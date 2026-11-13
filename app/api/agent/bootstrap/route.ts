import { NextRequest } from "next/server";
import { json, route } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { llmProvider } from "@/lib/agent/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: NextRequest) => {
  const [settings, user] = await Promise.all([getSettings(), getSessionUser()]);
  const enabled = settings["ai.enabled"] === "true";
  return json({
    ok: true,
    enabled,
    name: settings["ai.name"],
    greeting: settings["ai.greeting"],
    tone: settings["ai.tone"],
    voice: {
      name: settings["ai.voice"],
      rate: Number(settings["ai.voiceRate"] || 0.98),
      pitch: Number(settings["ai.voicePitch"] || 1),
      lang: "en-NG",
    },
    allowAnonymous: settings["ai.allowAnonymous"] === "true",
    widgetPosition: settings["ai.widgetPosition"] || "right",
    user: user ? { name: user.name, email: user.email } : null,
    serverVoice: Boolean(process.env.OPENAI_API_KEY),
    provider: llmProvider() === "local" ? "knowledge-engine" : "language-model",
    suggestions: [
      "What courses do you offer?",
      "How much is the solar course?",
      "How do I enrol?",
      "Check my learning progress",
    ],
  });
});
