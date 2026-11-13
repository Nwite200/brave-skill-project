import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const conversationId = req.nextUrl.searchParams.get("id");
  if (conversationId) {
    const conversation = await db.agentConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true } },
        tickets: { select: { reference: true, status: true } },
      },
    });
    return json({ ok: true, conversation });
  }
  const conversations = await db.agentConversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 150,
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { messages: true, tickets: true } },
    },
  });
  return json({ ok: true, conversations });
});

const schema = z.object({ resolved: z.boolean() });

export const PATCH = route(async (req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const data = await parseJson(req, schema);
  const conversation = await db.agentConversation.update({ where: { id }, data: { resolved: data.resolved } });
  await audit({ actorId: admin.id, action: "agent.conversation_updated", entity: "AgentConversation", entityId: id, meta: data });
  return json({ ok: true, conversation });
});
