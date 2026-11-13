import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { json, parseJson, route, fail, enforceRateLimit } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

async function canAccess(userId: string, threadId: string) {
  const thread = await db.discussionThread.findUnique({ where: { id: threadId } });
  if (!thread) return null;
  const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: thread.courseId } } });
  return enrollment ? thread : null;
}

export const GET = route(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { threadId } = await ctx.params;
  if (!(await canAccess(user.id, threadId))) return fail("Thread not found.", 404);
  const posts = await db.discussionPost.findMany({ where: { threadId }, orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } });
  return json({ ok: true, posts });
});

const schema = z.object({ body: z.string().trim().min(2).max(3000) });

export const POST = route(async (req: NextRequest, ctx) => {
  await enforceRateLimit(req, "discussion-post", 20, 600);
  const user = await requireUser();
  const { threadId } = await ctx.params;
  const thread = await canAccess(user.id, threadId);
  if (!thread) return fail("Thread not found.", 404);
  if (thread.isLocked) return fail("This discussion is locked.", 409);
  const data = await parseJson(req, schema);
  const post = await db.discussionPost.create({ data: { threadId, userId: user.id, body: data.body }, include: { user: { select: { name: true } } } });
  return json({ ok: true, post }, 201);
});
