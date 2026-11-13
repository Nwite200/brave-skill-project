import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = (await req.json().catch(() => ({}))) as { id?: string; all?: boolean };

  if (body.all) {
    await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return json({ ok: true });
  }

  if (!body.id) return fail("Notification id is required.", 400);
  const notification = await db.notification.findUnique({ where: { id: body.id } });
  if (!notification || notification.userId !== user.id) return fail("Notification not found.", 404);
  await db.notification.update({ where: { id: body.id }, data: { readAt: new Date() } });
  return json({ ok: true });
});
