import { NextRequest } from "next/server";
import { json, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = route(async (_req: NextRequest) => {
  await requireAdmin();
  const since = new Date(Date.now() - 7 * 86400000);
  const [conversations, messages, escalations, tickets, openTickets, intents, recent] = await Promise.all([
    db.agentConversation.count(),
    db.agentMessage.count(),
    db.agentConversation.count({ where: { escalated: true } }),
    db.supportTicket.count(),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.agentMessage.groupBy({ by: ["intent"], where: { role: "ASSISTANT", intent: { not: null } }, _count: true, orderBy: { _count: { intent: "desc" } }, take: 8 }),
    db.agentConversation.count({ where: { createdAt: { gte: since } } }),
  ]);

  return json({
    ok: true,
    totals: { conversations, messages, escalations, tickets, openTickets, last7Days: recent },
    intents: intents.map((row) => ({ intent: row.intent, count: row._count })),
    containmentRate: conversations ? Math.round(((conversations - escalations) / conversations) * 100) : 100,
  });
});
