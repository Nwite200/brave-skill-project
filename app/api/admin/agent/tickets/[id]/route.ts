import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedTo: z.string().max(160).optional().nullable(),
  adminNote: z.string().max(3000).optional().nullable(),
});

export const PATCH = route(async (req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const data = await parseJson(req, schema);
  const ticket = await db.supportTicket.update({ where: { id }, data });
  await audit({ actorId: admin.id, action: "agent.ticket_updated", entity: "SupportTicket", entityId: id, meta: data });
  return json({ ok: true, ticket });
});
