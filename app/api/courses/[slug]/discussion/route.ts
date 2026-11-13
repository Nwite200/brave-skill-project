import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { json, parseJson, route, fail, enforceRateLimit } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

async function enrollment(userId: string, courseId: string) {
  return db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
}

export const GET = route(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { slug } = await ctx.params;
  const found = await db.course.findFirst({ where: { OR: [{ slug }, { id: slug }] }, select: { id: true } });
  const courseId = found?.id;
  if (!courseId) return fail("Course not found.", 404);
  if (!(await enrollment(user.id, courseId))) return fail("Enrolment required.", 403);
  const threads = await db.discussionThread.findMany({
    where: { courseId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: { user: { select: { name: true } }, _count: { select: { posts: true } } },
  });
  return json({ ok: true, threads });
});

const schema = z.object({ title: z.string().trim().min(3).max(160), body: z.string().trim().min(5).max(4000) });

export const POST = route(async (req: NextRequest, ctx) => {
  await enforceRateLimit(req, "discussion", 10, 600);
  const user = await requireUser();
  const { slug } = await ctx.params;
  const found = await db.course.findFirst({ where: { OR: [{ slug }, { id: slug }] }, select: { id: true } });
  const courseId = found?.id;
  if (!courseId) return fail("Course not found.", 404);
  if (!(await enrollment(user.id, courseId))) return fail("Enrolment required.", 403);
  const data = await parseJson(req, schema);
  const thread = await db.discussionThread.create({
    data: { courseId, userId: user.id, title: data.title, body: data.body },
    include: { user: { select: { name: true } }, _count: { select: { posts: true } } },
  });
  return json({ ok: true, thread }, 201);
});
