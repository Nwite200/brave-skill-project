import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { json, parseJson, route, enforceRateLimit } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser();
  const tickets = await db.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return json({ ok: true, tickets });
});

const schema = z.object({
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
});

export const POST = route(async (req: NextRequest) => {
  await enforceRateLimit(req, "support-ticket", 5, 3600);
  const user = await requireUser();
  const data = await parseJson(req, schema);
  const reference = `BS-TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const ticket = await db.supportTicket.create({
    data: {
      reference,
      userId: user.id,
      name: user.name,
      email: user.email,
      subject: data.subject,
      message: data.message,
      priority: data.priority || "NORMAL",
    },
  });
  await audit({ actorId: user.id, action: "support.ticket_created", entity: "SupportTicket", entityId: ticket.id, meta: { reference } });
  return json({ ok: true, ticket }, 201);
});
