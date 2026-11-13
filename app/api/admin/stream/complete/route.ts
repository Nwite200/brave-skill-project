import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireStaff, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStreamVideo, isStreamConfigured } from "@/lib/stream";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  uid: z.string().trim().min(6).max(80),
  originalName: z.string().trim().min(1).max(200),
  sizeBytes: z.coerce.number().int().min(0).default(0),
  lessonId: z.string().optional().or(z.literal("")),
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireStaff();
  if (!isStreamConfigured()) return fail("Cloudflare Stream is not enabled.", 501);
  const data = await parseJson(req, schema);

  const video = await getStreamVideo(data.uid);
  const status = String((video.status as { state?: string } | undefined)?.state || "processing");
  const duration = Number(video.duration || 0);
  const thumbnail = (video.thumbnail as string) || null;

  let asset = await db.asset.findFirst({ where: { provider: "cloudflare-stream", externalId: data.uid } });
  if (!asset) {
    asset = await db.asset.create({
      data: {
        kind: "VIDEO",
        provider: "cloudflare-stream",
        externalId: data.uid,
        playbackId: data.uid,
        status,
        storageKey: `stream:${data.uid}`,
        originalName: data.originalName,
        mimeType: "video/mp4",
        sizeBytes: data.sizeBytes,
        durationSec: Math.round(duration),
        uploadedById: user.id,
      },
    });
  }

  if (data.lessonId) {
    const lesson = await db.lesson.findUnique({
      where: { id: data.lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) return fail("Lesson not found.", 404);
    if (!isAdmin(user.role)) {
      const course = await db.course.findUnique({ where: { id: lesson.module.courseId }, select: { instructorId: true } });
      if (!course || course.instructorId !== user.id) return fail("You can only attach videos to your own courses.", 403);
    }
    await db.lesson.update({
      where: { id: lesson.id },
      data: { videoAssetId: asset.id, videoUrl: null, type: "VIDEO" },
    });
  }

  await audit({
    actorId: user.id,
    action: "stream.upload_completed",
    entity: "Asset",
    entityId: asset.id,
    meta: { uid: data.uid, status, lessonId: data.lessonId || null, thumbnail },
  });

  return json({
    ok: true,
    asset: {
      id: asset.id,
      provider: asset.provider,
      externalId: asset.externalId,
      status: asset.status,
      name: asset.originalName,
      durationSec: asset.durationSec,
      thumbnail,
    },
  }, 201);
});
