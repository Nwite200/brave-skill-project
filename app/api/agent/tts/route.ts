import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, parseJson, route, enforceRateLimit } from "@/lib/api";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  text: z.string().trim().min(1).max(900),
  voice: z.string().max(40).optional(),
});

/** Natural server-side speech. When no provider key exists the widget uses the
 * browser's speech synthesiser instead, so voice always remains available. */
export const POST = route(async (req: NextRequest) => {
  await enforceRateLimit(req, "agent-tts", 20, 60);
  if (!process.env.OPENAI_API_KEY) {
    return fail("Server voice is not configured. The browser voice will be used.", 501);
  }
  const data = await parseJson(req, schema);
  const settings = await getSettings();
  const requested = data.voice || settings["ai.voice"] || "auto";
  const voice = requested === "auto" ? "alloy" : requested;

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AGENT_TTS_MODEL || "gpt-4o-mini-tts",
      voice,
      input: data.text,
      instructions: "Warm, clear, professional academy advisor. Natural pacing, Nigerian English friendly.",
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    console.error("[agent:tts]", response.status, await response.text().catch(() => ""));
    return fail("Voice generation failed. Falling back to the browser voice.", 502);
  }

  return new Response(response.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" },
  });
});
