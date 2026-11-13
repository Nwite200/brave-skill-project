import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { json, parseJson, route, fail, enforceRateLimit } from "@/lib/api";
import { getSessionUser, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async (_req: NextRequest, ctx) => {
  const { slug } = await ctx.params;
  const course = await db.course.findFirst({ where: { slug, isPublished: true }, select: { id: true } });
  if (!course) return fail("Course not found.", 404);
  const reviews = await db.review.findMany({
    where: { courseId: course.id, isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { name: true } } },
  });
  const aggregate = await db.review.aggregate({ where: { courseId: course.id, isPublished: true }, _avg: { rating: true }, _count: true });
  return json({
    ok: true,
    average: Number((aggregate._avg.rating || 0).toFixed(1)),
    count: aggregate._count,
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      name: review.user.name,
      createdAt: review.createdAt,
    })),
  });
});

const schema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().min(5).max(2000),
});

export const POST = route(async (req: NextRequest, ctx) => {
  await enforceRateLimit(req, "review", 5, 3600);
  const user = await requireUser();
  const { slug } = await ctx.params;
  const data = await parseJson(req, schema);
  const course = await db.course.findFirst({ where: { slug, isPublished: true }, select: { id: true } });
  if (!course) return fail("Course not found.", 404);
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (!enrollment || enrollment.status === "REVOKED") {
    return fail("Only enrolled students can review this programme.", 403);
  }
  const review = await db.review.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    update: { rating: data.rating, title: data.title || null, body: data.body, isPublished: true },
    create: { userId: user.id, courseId: course.id, rating: data.rating, title: data.title || null, body: data.body },
  });
  await audit({ actorId: user.id, action: "review.submitted", entity: "Review", entityId: review.id, meta: { rating: data.rating } });
  return json({ ok: true, review }, 201);
});
