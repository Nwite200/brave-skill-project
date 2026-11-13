import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async () => {
  await requireAdmin();
  const docs = await db.agentKnowledge.findMany({ orderBy: { updatedAt: "desc" } });
  return json({ ok: true, documents: docs });
});

const schema = z.object({
  title: z.string().trim().min(3).max(180),
  category: z.string().trim().min(2).max(60),
  content: z.string().trim().min(20).max(40000),
  isPublished: z.boolean().optional(),
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const data = await parseJson(req, schema);
  const document = await db.agentKnowledge.create({ data: { ...data, isPublished: data.isPublished ?? true } });
  await audit({ actorId: admin.id, action: "agent.knowledge_created", entity: "AgentKnowledge", entityId: document.id });
  return json({ ok: true, document }, 201);
});
