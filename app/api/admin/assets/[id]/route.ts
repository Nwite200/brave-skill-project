import { NextRequest } from "next/server";
import { route, json, fail } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteAsset } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const DELETE = route(async (_req: NextRequest, ctx) => {
  const user = await requireStaff();
  const { id } = await ctx.params;
  const asset = await db.asset.findUnique({
    where: { id },
    include: { videoLessons: { include: { module: { select: { courseId: true } } } } },
  });
  if (!asset) return fail("Video not found.", 404);

  if (user.role === "INSTRUCTOR") {
    const owned = new Set((await db.course.findMany({ where: { instructorId: user.id }, select: { id: true } })).map((c) => c.id));
    if (asset.videoLessons.some((lesson) => !owned.has(lesson.module.courseId))) {
      return fail("You can only delete videos used in your own courses.", 403);
    }
  }

  await db.lesson.updateMany({ where: { videoAssetId: asset.id }, data: { videoAssetId: null } });
  await deleteAsset(asset.id);
  await audit({ actorId: user.id, action: "video.deleted", entity: "Asset", entityId: asset.id, meta: { provider: asset.provider } });
  return json({ ok: true });
});
