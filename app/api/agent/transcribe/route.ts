import { NextRequest } from "next/server";
import { fail, route, enforceRateLimit } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Optional server transcription for clients without Web Speech support. */
export const POST = route(async (req: NextRequest) => {
  await enforceRateLimit(req, "agent-stt", 20, 60);
  if (!process.env.OPENAI_API_KEY) return fail("Server transcription is not configured.", 501);

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Expected multipart audio.", 400);
  const file = form.get("audio");
  if (!(file instanceof File)) return fail("No audio file was uploaded.", 400);
  if (file.size > 25 * 1024 * 1024) return fail("Audio is too large. Maximum is 25MB.", 413);

  const upstream = new FormData();
  upstream.append("file", file, file.name || "voice.webm");
  upstream.append("model", process.env.AGENT_STT_MODEL || "whisper-1");
  upstream.append("language", "en");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: upstream,
  });
  if (!response.ok) return fail("Transcription failed.", 502);
  const data = (await response.json()) as { text?: string };
  return new Response(JSON.stringify({ ok: true, text: data.text || "" }), {
    headers: { "Content-Type": "application/json" },
  });
});
