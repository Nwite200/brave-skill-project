import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, fail, getPagination } from "@/lib/api";
import { requireStaff, isAdmin } from "@/lib/auth";
import { courseSchema } from "@/lib/validation";
import { slugify, toKobo } from "@/lib/format";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const uniqueSlug = async (base: string, ignoreId?: string) => {
  let slug = base || "course";
  let attempt = 1;
  while (true) {
    const existing = await db.course.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
};

export const GET = route(async (req: NextRequest) => {
  const user = await requireStaff();
  const { skip, take, page, pageSize } = getPagination(req, 20);
  const search = req.nextUrl.searchParams.get("q") || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const where = {
    ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" as const } }, { slug: { contains: search, mode: "insensitive" as const } }] } : {}),
    ...(status === "published" ? { isPublished: true } : status === "draft" ? { isPublished: false } : {}),
    ...(!isAdmin(user.role) ? { instructorId: user.id } : {}),
  };

  const [rows, total] = await Promise.all([
    db.course.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        category: { select: { name: true } },
        instructor: { select: { name: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
    }),
    db.course.count({ where }),
  ]);

  return json({ ok: true, courses: rows, total, page, pageSize });
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireStaff();
  const data = await parseJson(req, courseSchema);
  if (!isAdmin(user.role) && data.isPublished) {
    return fail("Instructors cannot publish courses. Submit for review instead.", 403);
  }

  const category = await db.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return fail("Choose a valid category.", 422);

  const slug = await uniqueSlug(data.slug ? slugify(data.slug) : slugify(data.title));
  const course = await db.course.create({
    data: {
      title: data.title,
      slug,
      subtitle: data.subtitle || null,
      summary: data.summary,
      description: data.description,
      outcomes: data.outcomes || "",
      requirements: data.requirements || "",
      categoryId: data.categoryId,
      instructorId: isAdmin(user.role) ? data.instructorId || null : user.id,
      level: data.level,
      priceKobo: toKobo(data.priceNaira),
      compareAtKobo: toKobo(data.compareAtNaira || 0),
      thumbnailUrl: data.thumbnailUrl || null,
      promoVideoUrl: data.promoVideoUrl || null,
      durationLabel: data.durationLabel || "",
      certificateEnabled: data.certificateEnabled ?? true,
      examRequired: data.examRequired ?? true,
      passMark: data.passMark ?? 60,
      isPublished: isAdmin(user.role) ? Boolean(data.isPublished) : false,
      isFeatured: isAdmin(user.role) ? Boolean(data.isFeatured) : false,
      publishedAt: isAdmin(user.role) && data.isPublished ? new Date() : null,
    },
  });

  await audit({ actorId: user.id, action: "course.created", entity: "Course", entityId: course.id, meta: { title: course.title } });
  return json({ ok: true, course }, 201);
});
