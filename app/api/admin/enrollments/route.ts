import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { grantFreeCourse } from "@/lib/payments";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const data = schema.parse(await req.json().catch(() => ({})));

  const [user, course] = await Promise.all([
    db.user.findUnique({ where: { id: data.userId } }),
    db.course.findUnique({ where: { id: data.courseId } }),
  ]);
  if (!user) return fail("Student not found.", 404);
  if (!course) return fail("Course not found.", 404);

  const enrollment = await grantFreeCourse({
    userId: user.id,
    courseId: course.id,
    source: "ADMIN",
    grantedById: admin.id,
  });

  await audit({ actorId: admin.id, action: "enrollment.manually_granted", entity: "Enrollment", entityId: enrollment.id, meta: { userId: user.id, courseId: course.id } });
  return json({ ok: true, enrollment }, 201);
});

export const DELETE = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const enrollmentId = req.nextUrl.searchParams.get("id");
  if (!enrollmentId) return fail("Enrollment id is required.", 400);
  const enrollment = await db.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) return fail("Enrollment not found.", 404);
  await db.enrollment.update({ where: { id: enrollmentId }, data: { status: "REVOKED" } });
  await audit({ actorId: admin.id, action: "enrollment.revoked", entity: "Enrollment", entityId: enrollmentId });
  return json({ ok: true });
});
