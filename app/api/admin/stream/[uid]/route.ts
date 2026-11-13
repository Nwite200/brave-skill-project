import { NextRequest } from "next/server";
import { json, route, fail } from "@/lib/api";
import { requireStaff, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteStreamVideo, isStreamConfigured } from "@/lib/stream";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const DELETE = route(async (req: NextRequest, ctx) => {
  const user = await requireStaff();
  if (!isStreamConfigured()) return fail("Cloudflare Stream is not enabled.", 501);
  const { uid } = await ctx.params;

  const asset = await db.asset.findFirst({
    where: { provider: "cloudflare-stream", externalId: uid },
    include: { videoLessons: { include: { module: { select: { courseId: true } } } } },
  });
  if (!asset) return fail("Video not found.", 404);

  if (!isAdmin(user.role)) {
    const owned = await db.course.findMany({ where: { instructorId: user.id }, select: { id: true } });
    const ownedIds = new Set(owned.map((course) => course.id));
    if (asset.videoLessons.some((lesson) => !ownedIds.has(lesson.module.courseId))) {
      return fail("You can only delete videos used in your own courses.", 403);
    }
  }

  await deleteStreamVideo(uid);
  await db.lesson.updateMany({ where: { videoAssetId: asset.id }, data: { videoAssetId: null } });
  await db.asset.delete({ where: { id: asset.id } });
  await audit({ actorId: user.id, action: "stream.video_deleted", entity: "Asset", entityId: asset.id, meta: { uid } });
  return json({ ok: true });
});
