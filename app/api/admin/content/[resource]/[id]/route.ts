import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { CONTENT_RESOURCES } from "@/lib/admin-content";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

type AnyDb = Record<string, {
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
}>;

async function existingCourseId(resource: string, id: string) {
  const config = CONTENT_RESOURCES[resource];
  if (!config) return null;
  const record = await (db as unknown as AnyDb)[config.model].findUnique({ where: { id } });
  if (!record) return null;
  if (resource === "modules") return String(record.courseId);
  if (resource === "lessons") {
    const mod = await db.module.findUnique({ where: { id: String(record.moduleId) }, select: { courseId: true } });
    return mod?.courseId ?? null;
  }
  if (resource === "quizzes") return String(record.courseId);
  if (resource === "questions") {
    const quiz = await db.quiz.findUnique({ where: { id: String(record.quizId) }, select: { courseId: true } });
    return quiz?.courseId ?? null;
  }
  return null;
}

export const PATCH = route(async (req: NextRequest, ctx) => {
  const user = await requireStaff();
  const { resource, id } = await ctx.params;
  const config = CONTENT_RESOURCES[resource];
  if (!config) return fail("Unknown resource.", 404);

  const raw = await req.json().catch(() => null);
  if (!raw) return fail("Invalid JSON body.", 400);
  const data = config.schema.parse(raw) as Record<string, unknown>;

  if (user.role === "INSTRUCTOR") {
    const courseId = await existingCourseId(resource, id);
    if (!courseId) return fail("Record not found.", 404);
    const owned = await db.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
    if (!owned || owned.instructorId !== user.id) return fail("You can only manage your own courses.", 403);
  }

  const transformed = config.transform ? config.transform(data, user) : data;
  const updateData = { ...transformed };
  if (resource === "coupons") delete updateData.createdById;
  if (resource === "announcements") delete updateData.createdById;
  delete updateData.id;
  delete updateData.createdAt;
  for (const key of Object.keys(updateData)) {
    if (updateData[key] === undefined) delete updateData[key];
  }

  const record = await (db as unknown as AnyDb)[config.model].update({ where: { id }, data: updateData });
  await audit({ actorId: user.id, action: `${resource}.updated`, entity: resource, entityId: id });
  return json({ ok: true, record });
});

export const DELETE = route(async (req: NextRequest, ctx) => {
  const user = await requireStaff();
  const { resource, id } = await ctx.params;
  const config = CONTENT_RESOURCES[resource];
  if (!config) return fail("Unknown resource.", 404);

  if (user.role === "INSTRUCTOR") {
    const courseId = await existingCourseId(resource, id);
    if (!courseId) return fail("Record not found.", 404);
    const owned = await db.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
    if (!owned || owned.instructorId !== user.id) return fail("You can only manage your own courses.", 403);
  }

  await (db as unknown as AnyDb)[config.model].delete({ where: { id } });
  await audit({ actorId: user.id, action: `${resource}.deleted`, entity: resource, entityId: id });
  return json({ ok: true });
});
