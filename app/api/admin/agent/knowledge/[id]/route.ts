import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().trim().min(3).max(180).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  content: z.string().trim().min(20).max(40000).optional(),
  isPublished: z.boolean().optional(),
});

export const PATCH = route(async (req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const data = await parseJson(req, schema);
  const document = await db.agentKnowledge.update({ where: { id }, data });
  await audit({ actorId: admin.id, action: "agent.knowledge_updated", entity: "AgentKnowledge", entityId: id });
  return json({ ok: true, document });
});

export const DELETE = route(async (_req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  await db.agentKnowledge.delete({ where: { id } });
  await audit({ actorId: admin.id, action: "agent.knowledge_deleted", entity: "AgentKnowledge", entityId: id });
  return json({ ok: true });
});
