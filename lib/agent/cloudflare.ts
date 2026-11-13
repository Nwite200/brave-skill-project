import "server-only";

/**
 * FREE AI REASONING — Cloudflare Workers AI.
 *
 * Workers AI includes a free daily allocation and needs no external API key.
 * The binding is declared in wrangler.jsonc (`"ai": { "binding": "AI" }`).
 * Outside Cloudflare (local dev, VPS) the academy's built-in grounded engine is
 * used instead, so the assistant never requires a paid provider.
 */

export async function getCloudflareAI(): Promise<any | null> {
  if (process.env.CF_WORKER !== "1") return null;
  try {
    const mod = await import("@opennextjs/cloudflare");
    const getContext = (mod as any).getCloudflareContext as
      | ((options?: { async?: boolean }) => any)
      | undefined;
    if (!getContext) return null;
    let context: any;
    try {
      context = getContext();
    } catch {
      context = await getContext({ async: true });
    }
    return context?.env?.AI ?? null;
  } catch {
    return null;
  }
}

export async function generateWithCloudflareAI(input: {
  system: string;
  history: { role: string; content: string }[];
  message: string;
  ai: any;
}): Promise<{ reply: string; provider: string }> {
  const model = process.env.AGENT_CF_MODEL || "@cf/meta/llama-3.1-8b-instruct";
  const messages = [
    { role: "system", content: input.system },
    ...input.history
      .filter((item) => item.role === "USER" || item.role === "ASSISTANT")
      .slice(-10)
      .map((item) => ({ role: item.role === "USER" ? "user" : "assistant", content: item.content.slice(0, 1200) })),
    { role: "user", content: input.message },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await input.ai.run(model, {
      messages,
      max_tokens: 480,
      temperature: 0.35,
      // Workers AI free models don't all support function calling, so the agent
      // injects verified live data into the prompt and keeps price/payment
      // questions on the deterministic local path.
    });
    const text = typeof response === "string" ? response : response?.response || "";
    if (!text || !String(text).trim()) throw new Error("Workers AI returned an empty answer.");
    return { reply: String(text).trim(), provider: "cloudflare-free" };
  } finally {
    clearTimeout(timer);
  }
}
