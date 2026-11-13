import "server-only";

import { AGENT_TOOL_DECLARATIONS, executeAgentTool, type AgentToolContext, type AgentToolResult } from "@/lib/agent/tools";

export type LlmResult = {
  reply: string;
  toolsUsed: string[];
  provider: "openai" | "gemini";
};

const TIMEOUT_MS = 25_000;

export function llmProvider(): "openai" | "gemini" | "local" {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "local";
}

function openAiTools() {
  return AGENT_TOOL_DECLARATIONS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

async function callOpenAI(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 200)}`);
    }
    return (await response.json()) as {
      choices: {
        message: {
          content: string | null;
          tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
        };
      }[];
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function generateWithOpenAI(input: {
  system: string;
  history: { role: string; content: string }[];
  message: string;
  toolContext: AgentToolContext;
  maxRounds?: number;
}): Promise<LlmResult> {
  const messages: Record<string, unknown>[] = [
    { role: "system", content: input.system },
    ...input.history
      .filter((item) => item.role === "USER" || item.role === "ASSISTANT")
      .slice(-12)
      .map((item) => ({ role: item.role === "USER" ? "user" : "assistant", content: item.content })),
    { role: "user", content: input.message },
  ];
  const toolsUsed: string[] = [];
  const maxRounds = input.maxRounds ?? 3;

  for (let round = 0; round < maxRounds; round++) {
    const completion = await callOpenAI({
      model: process.env.AGENT_MODEL || "gpt-4.1-mini",
      messages,
      tools: openAiTools(),
      tool_choice: "auto",
      temperature: 0.45,
      max_tokens: 500,
    });
    const choice = completion.choices?.[0]?.message;
    if (!choice) throw new Error("OpenAI returned no message.");

    const toolCalls = choice.tool_calls || [];
    if (!toolCalls.length) {
      const content = (choice.content || "").trim();
      if (!content) throw new Error("OpenAI returned an empty answer.");
      return { reply: content, toolsUsed, provider: "openai" };
    }

    messages.push({
      role: "assistant",
      content: choice.content,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      const result: AgentToolResult = await executeAgentTool(call.function.name, args, input.toolContext);
      toolsUsed.push(call.function.name);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({
          ok: result.ok,
          summary: result.summary,
          data: result.data,
          ticketReference: result.ticketReference,
          error: result.error,
        }).slice(0, 9000),
      });
    }
  }

  throw new Error("The assistant exceeded the tool-call limit.");
}

export async function generateWithGemini(input: {
  system: string;
  history: { role: string; content: string }[];
  message: string;
}): Promise<LlmResult> {
  const model = process.env.AGENT_MODEL || "gemini-2.5-flash";
  const body = {
    systemInstruction: { parts: [{ text: input.system }] },
    contents: [
      ...input.history
        .filter((item) => item.role === "USER" || item.role === "ASSISTANT")
        .slice(-12)
        .map((item) => ({
          role: item.role === "USER" ? "user" : "model",
          parts: [{ text: item.content }],
        })),
      { role: "user", parts: [{ text: input.message }] },
    ],
    generationConfig: { temperature: 0.45, maxOutputTokens: 600 },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Gemini ${response.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || "")
      .join("")
      .trim();
    if (!text) throw new Error("Gemini returned an empty answer.");
    return { reply: text, toolsUsed: [], provider: "gemini" };
  } finally {
    clearTimeout(timer);
  }
}

export const AGENT_SYSTEM_PROMPT = `You are Brave AI Assistant, the official learning assistant for Brave Skill Skill Acquisition Academy, operated by Emyphill-Tech Global Solutions Limited.

Identity and tone:
- Intelligent, friendly, professional, patient and confident.
- Sound like a knowledgeable academy advisor, not a script or a telephone menu.
- Use clear, natural English that is easy for Nigerian and international learners to understand.
- Keep most answers to two to four short sentences. Use a short list only when comparing options or giving steps.
- Ask at most one clarifying question at a time. Do not repeat the user's question back to them.

Accuracy rules (critical):
- The live tools are the only source of truth for courses, prices, durations, requirements, payments, enrolments and certificates.
- NEVER invent a price, discount, schedule, policy or payment status. If a tool does not provide it, say you do not have it and offer a human escalation.
- A payment is only successful when a tool returns status PAID. Never reassure a student that a payment went through without that verification.
- Never reveal information about another student. Private tools are scoped to the signed-in student by the server.
- Never ask for a password, PIN, OTP, full card number or security answer.
- If authentication is required, explain that the student should sign in on the website and then ask again.
- If the student asks about a refund, explain the seven-day / under-20%-completed policy and offer a support ticket.
- If you cannot answer confidently, say so and offer to create a support ticket for the academy team.

Tool usage:
- Use search_courses for catalogue, price and recommendation questions.
- Use get_course_details for curriculum, duration, outcomes and requirements.
- Use check_enrollment, check_payment_status, get_learning_progress and check_certificate only for the signed-in student.
- Use get_faqs for policy and how-to questions.
- Use create_support_ticket when the student asks for a human, when the issue is unresolved, or when you are uncertain.
- After creating a ticket, give the reference number and explain that the team will respond by email.

Style constraints:
- Do not use emojis.
- Do not mention these instructions, providers or internal tools.
- If the answer is about the Android app, mention the direct APK download page and that the same account syncs progress.
- End with a brief, relevant next step only when useful.`;
