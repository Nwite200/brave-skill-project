import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const PATCH = route(async (req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const data = z.object({ status: z.enum(["NEW", "READ", "RESOLVED"]) }).parse(await req.json().catch(() => ({})));
  const message = await db.contactMessage.update({ where: { id }, data: { status: data.status } });
  await audit({ actorId: admin.id, action: "contact_message.updated", entity: "ContactMessage", entityId: id, meta: { status: data.status } });
  return json({ ok: true, message });
});

export const DELETE = route(async (req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message) return fail("Message not found.", 404);
  await db.contactMessage.delete({ where: { id } });
  await audit({ actorId: admin.id, action: "contact_message.deleted", entity: "ContactMessage", entityId: id });
  return json({ ok: true });
});
