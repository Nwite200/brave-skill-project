import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ isPublished: z.boolean() });

export const PATCH = route(async (req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const data = await parseJson(req, schema);
  const review = await db.review.update({ where: { id }, data });
  await audit({ actorId: admin.id, action: "review.moderated", entity: "Review", entityId: id, meta: data });
  return json({ ok: true, review });
});

export const DELETE = route(async (_req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const review = await db.review.findUnique({ where: { id } });
  if (!review) return fail("Review not found.", 404);
  await db.review.delete({ where: { id } });
  await audit({ actorId: admin.id, action: "review.deleted", entity: "Review", entityId: id });
  return json({ ok: true });
});
