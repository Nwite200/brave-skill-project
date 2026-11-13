import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireStaff, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ assetId: z.string().min(1), lessonId: z.string().min(1) });

/** Replace a lesson's video with an asset already in the library. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireStaff();
  const data = await parseJson(req, schema);
  const [asset, lesson] = await Promise.all([
    db.asset.findUnique({ where: { id: data.assetId } }),
    db.lesson.findUnique({ where: { id: data.lessonId }, include: { module: { select: { courseId: true } } } }),
  ]);
  if (!asset || asset.kind !== "VIDEO") return fail("Video asset not found.", 404);
  if (!lesson) return fail("Lesson not found.", 404);

  if (!isAdmin(user.role)) {
    const course = await db.course.findUnique({ where: { id: lesson.module.courseId }, select: { instructorId: true } });
    if (!course || course.instructorId !== user.id) return fail("You can only edit your own courses.", 403);
  }

  await db.lesson.update({ where: { id: lesson.id }, data: { videoAssetId: asset.id, videoUrl: null, type: "VIDEO" } });
  await audit({ actorId: user.id, action: "lesson.video_replaced", entity: "Lesson", entityId: lesson.id, meta: { assetId: asset.id } });
  return json({ ok: true });
});
