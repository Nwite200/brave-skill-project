import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireStaff, isAdmin } from "@/lib/auth";
import { courseSchema } from "@/lib/validation";
import { slugify, toKobo } from "@/lib/format";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

async function loadCourse(user: { id: string; role: string }, id: string) {
  const course = await db.course.findUnique({ where: { id } });
  if (!course) return null;
  if (!isAdmin(user.role as never) && course.instructorId !== user.id) return null;
  return course;
}

export const PATCH = route(async (req: NextRequest, ctx) => {
  const user = await requireStaff();
  const { id } = await ctx.params;
  const existing = await loadCourse(user, id);
  if (!existing) return fail("Course not found.", 404);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("Invalid JSON body.", 400);

  // Lightweight action-style updates (publish toggle, feature toggle).
  if (Object.keys(body).length <= 2 && ("isPublished" in body || "isFeatured" in body)) {
    if (!isAdmin(user.role)) return fail("Only administrators can publish courses.", 403);
    const data: Record<string, unknown> = {};
    if (typeof body.isPublished === "boolean") {
      data.isPublished = body.isPublished;
      data.publishedAt = body.isPublished ? new Date() : null;
    }
    if (typeof body.isFeatured === "boolean") data.isFeatured = body.isFeatured;
    const course = await db.course.update({ where: { id }, data });
    await audit({ actorId: user.id, action: "course.publish_updated", entity: "Course", entityId: id, meta: data });
    return json({ ok: true, course });
  }

  const data = courseSchema.parse(body);
  if (!isAdmin(user.role)) {
    data.isPublished = existing.isPublished;
    data.isFeatured = existing.isFeatured;
  }

  let slug = existing.slug;
  if (data.slug && slugify(data.slug) !== existing.slug) {
    const base = slugify(data.slug);
    slug = base;
    let n = 1;
    while (await db.course.findFirst({ where: { slug, id: { not: id } } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
  }

  const course = await db.course.update({
    where: { id },
    data: {
      title: data.title,
      slug,
      subtitle: data.subtitle || null,
      summary: data.summary,
      description: data.description,
      outcomes: data.outcomes || "",
      requirements: data.requirements || "",
      categoryId: data.categoryId,
      instructorId: isAdmin(user.role) ? data.instructorId || existing.instructorId : existing.instructorId,
      level: data.level,
      priceKobo: toKobo(data.priceNaira),
      compareAtKobo: toKobo(data.compareAtNaira || 0),
      thumbnailUrl: data.thumbnailUrl || null,
      promoVideoUrl: data.promoVideoUrl || null,
      durationLabel: data.durationLabel || "",
      certificateEnabled: data.certificateEnabled ?? existing.certificateEnabled,
      examRequired: data.examRequired ?? existing.examRequired,
      passMark: data.passMark ?? existing.passMark,
      ...(isAdmin(user.role)
        ? {
            isPublished: Boolean(data.isPublished),
            isFeatured: Boolean(data.isFeatured),
            publishedAt: data.isPublished ? existing.publishedAt ?? new Date() : null,
          }
        : {}),
    },
  });

  await audit({ actorId: user.id, action: "course.updated", entity: "Course", entityId: id });
  return json({ ok: true, course });
});

export const DELETE = route(async (req: NextRequest, ctx) => {
  const user = await requireStaff();
  if (!isAdmin(user.role)) return fail("Only administrators can delete courses.", 403);
  const { id } = await ctx.params;

  const enrollments = await db.enrollment.count({ where: { courseId: id } });
  if (enrollments > 0) {
    return fail("This course has enrolled students. Unpublish it instead of deleting.", 409);
  }
  await db.course.delete({ where: { id } });
  await audit({ actorId: user.id, action: "course.deleted", entity: "Course", entityId: id });
  return json({ ok: true });
});
