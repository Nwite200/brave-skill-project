import "server-only";

import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { retrieveKnowledge, snippetsToContext, searchCoursesForAgent } from "@/lib/agent/knowledge";
import { answerLocally, type LocalAgentContext } from "@/lib/agent/local";
import { AGENT_SYSTEM_PROMPT, generateWithGemini, generateWithOpenAI, llmProvider } from "@/lib/agent/llm";
import { generateWithCloudflareAI, getCloudflareAI } from "@/lib/agent/cloudflare";
import type { SessionUser } from "@/lib/auth";

export type AgentRunInput = {
  message: string;
  user: SessionUser | null;
  conversationId?: string | null;
  channel?: string;
};

export type AgentRunResult = {
  ok: true;
  conversationId: string;
  reply: string;
  intent: string;
  suggestions: string[];
  toolsUsed: string[];
  ticketReference?: string;
  escalated: boolean;
  provider: string;
};

const privateIntent = /(my |check my|status|paid|enrolled|enrolment|enrollment|progress|transaction|reference|receipt|refund|locked|access|account)/i;

function parseContext(raw: string | null): LocalAgentContext {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as LocalAgentContext;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function defaultSuggestions(message: string) {
  if (/(price|cost|how much)/i.test(message)) return ["What does it include?", "How do I enrol?", "Do you have a discount code?"];
  if (/(pay|payment|refund)/i.test(message)) return ["Check my payment status", "How do refunds work?", "Talk to a human"];
  if (/(certificate)/i.test(message)) return ["Check my certificate", "How do I pass the exam?", "Talk to a human"];
  if (/(android|app|apk)/i.test(message)) return ["How do I install it?", "Is it on Google Play?", "Talk to a human"];
  return ["Browse courses", "Check course prices", "Talk to a human"];
}

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  const settings = await getSettings();
  if (settings["ai.enabled"] !== "true") {
    throw new Error("The AI assistant is currently unavailable.");
  }
  if (!input.user && settings["ai.allowAnonymous"] !== "true") {
    return {
      ok: true,
      conversationId: input.conversationId || "",
      reply: "Please sign in to use the Brave AI Assistant. Once you are signed in, I can help with your courses, payments and progress.",
      intent: "auth_required",
      suggestions: ["How do I sign in?", "Contact support"],
      toolsUsed: [],
      escalated: false,
      provider: "policy",
    };
  }

  let conversation = input.conversationId
    ? await db.agentConversation.findUnique({ where: { id: input.conversationId } })
    : null;

  if (conversation?.userId && conversation.userId !== input.user?.id) {
    conversation = null;
  }

  if (!conversation) {
    conversation = await db.agentConversation.create({
      data: {
        userId: input.user?.id,
        channel: input.channel || "WEB",
        title: input.message.slice(0, 70),
      },
    });
  } else if (input.user && !conversation.userId) {
    conversation = await db.agentConversation.update({
      where: { id: conversation.id },
      data: { userId: input.user.id, title: conversation.title || input.message.slice(0, 70) },
    });
  }

  const history = await db.agentMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { role: true, content: true },
  });

  await db.agentMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: input.message.slice(0, 4000) },
  });

  const context = parseContext(conversation.context);
  const cloudflareAi = await getCloudflareAI();
  const provider: "cloudflare" | "openai" | "gemini" | "local" = cloudflareAi
    ? "cloudflare"
    : llmProvider();
  const needsDeterministicAnswer =
    privateIntent.test(input.message) || /(price|cost|how much|fee|discount|coupon|promo|refund)/i.test(input.message);
  let result: {
    reply: string;
    intent: string;
    suggestions: string[];
    toolsUsed: string[];
    ticketReference?: string;
    escalated: boolean;
    context: LocalAgentContext;
    provider: string;
  };

  const local = () =>
    answerLocally({
      message: input.message,
      user: input.user,
      context,
      history,
      conversationId: conversation!.id,
      settings,
    }).then((answer) => ({ ...answer, escalated: Boolean(answer.escalated), provider: "local" }));

  try {
    if (provider === "local" || (provider === "cloudflare" && needsDeterministicAnswer)) {
      result = await local();
    } else if (provider === "gemini" && privateIntent.test(input.message)) {
      // Private account data is resolved locally so it is never sent to a
      // provider without tool scoping.
      result = await local();
    } else if (provider === "cloudflare") {
      const snippets = await retrieveKnowledge(input.message, 5);
      const courses = await searchCoursesForAgent({});
      const courseFacts = courses
        .map((course: { title: string; category: string; level: string; priceLabel: string; duration: string; lessons: number }) => `- ${course.title} (${course.category}, ${course.level}): ${course.priceLabel}, ${course.duration}, ${course.lessons} lessons.`)
        .join("\n");
      const system = `${AGENT_SYSTEM_PROMPT}

Academy facts verified from the live catalogue:
${courseFacts || "The catalogue is temporarily empty."}

Approved knowledge excerpts:
${snippetsToContext(snippets) || "No matching documents were retrieved."}

Configuration:
- Assistant name: ${settings["ai.name"]}
- Tone: ${settings["ai.tone"]}
- Additional instructions: ${settings["ai.instructions"]}
- Student context: ${input.user ? `${input.user.name.split(" ")[0]} is signed in.` : "Anonymous visitor."}
- Website: https://academy.emyphilltech.com.ng

This reasoning runs on Cloudflare Workers AI at no external API cost. If a question requires payment status, enrolment status, progress or certificate records, the platform handles it locally; do not guess.`;

      const cloudResult = await generateWithCloudflareAI({
        ai: cloudflareAi,
        system,
        history,
        message: input.message,
      });
      result = {
        reply: cloudResult.reply,
        intent: "ai",
        suggestions: defaultSuggestions(input.message),
        toolsUsed: ["cloudflare_workers_ai"],
        escalated: false,
        context: { ...context, lastIntent: "ai" },
        provider: cloudResult.provider,
      };
    } else {
      const snippets = await retrieveKnowledge(input.message, 5);
      const system = `${AGENT_SYSTEM_PROMPT}

Academy configuration:
- Assistant name: ${settings["ai.name"]}
- Tone: ${settings["ai.tone"]}
- Additional instructions: ${settings["ai.instructions"]}
- Escalation email: ${settings["ai.escalationEmail"]}
- Student context: ${input.user ? `${input.user.name.split(" ")[0]} is signed in (${input.user.role.toLowerCase()}).` : "Anonymous visitor, not signed in."}
- Website: https://academy.emyphilltech.com.ng

Approved knowledge excerpts for this turn (use only if relevant; live tools override these for prices and status):
${snippetsToContext(snippets) || "No matching documents were retrieved."}`;

      const llmResult =
        provider === "openai"
          ? await generateWithOpenAI({
              system,
              history,
              message: input.message,
              toolContext: { user: input.user, conversationId: conversation.id },
            })
          : await generateWithGemini({ system, history, message: input.message });

      const ticket = llmResult.toolsUsed.includes("create_support_ticket")
        ? await db.supportTicket.findFirst({ where: { conversationId: conversation.id }, orderBy: { createdAt: "desc" } })
        : null;

      result = {
        reply: llmResult.reply,
        intent: "llm",
        suggestions: defaultSuggestions(input.message),
        toolsUsed: llmResult.toolsUsed,
        ticketReference: ticket?.reference,
        escalated: Boolean(ticket),
        context: { ...context, lastIntent: "llm" },
        provider: llmResult.provider,
      };
    }
  } catch (error) {
    console.error("[agent] provider failed, using local composer", error);
    result = await local();
  }

  await db.agentMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: result.reply.slice(0, 8000),
      intent: result.intent,
      toolName: result.toolsUsed.length ? result.toolsUsed.join(",").slice(0, 200) : null,
      toolPayload: result.toolsUsed.length ? JSON.stringify({ tools: result.toolsUsed, provider: result.provider }).slice(0, 2000) : null,
    },
  });

  await db.agentConversation.update({
    where: { id: conversation.id },
    data: {
      messageCount: { increment: 2 },
      lastMessageAt: new Date(),
      context: JSON.stringify({ ...result.context, provider: result.provider }).slice(0, 4000),
      escalated: result.escalated ? true : undefined,
      title: conversation.title || input.message.slice(0, 70),
    },
  });

  return {
    ok: true,
    conversationId: conversation.id,
    reply: result.reply,
    intent: result.intent,
    suggestions: result.suggestions.slice(0, 4),
    toolsUsed: result.toolsUsed,
    ticketReference: result.ticketReference,
    escalated: result.escalated,
    provider: result.provider,
  };
}
