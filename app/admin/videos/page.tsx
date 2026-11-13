import type { Metadata } from "next";
import { requireStaffPage, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { VideoLibrary } from "@/components/admin/VideoLibrary";

export const metadata: Metadata = { title: "Video library · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const user = await requireStaffPage();
  const admin = isAdmin(user.role);

  const [assets, lessons] = await Promise.all([
    db.asset.findMany({
      where: {
        kind: "VIDEO",
        ...(admin ? {} : { videoLessons: { some: { module: { course: { instructorId: user.id } } } } }),
      },
      orderBy: { createdAt: "desc" },
      include: { videoLessons: { include: { module: { include: { course: { select: { title: true } } } } } } },
      take: 200,
    }),
    db.lesson.findMany({
      where: { isPublished: true, ...(admin ? {} : { module: { course: { instructorId: user.id } } }) },
      orderBy: [{ module: { course: { title: "asc" } } }, { module: { position: "asc" } }, { position: "asc" }],
      include: { module: { include: { course: { select: { title: true } } } } },
      take: 500,
    }),
  ]);

  return (
    <VideoLibrary
      videos={assets.map((asset) => ({
        id: asset.id,
        provider: asset.provider,
        externalId: asset.externalId,
        name: asset.originalName,
        status: asset.status,
        sizeBytes: asset.sizeBytes,
        durationSec: asset.durationSec,
        createdAt: asset.createdAt.toISOString(),
        lessons: asset.videoLessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          course: lesson.module.course.title,
        })),
      }))}
      lessons={lessons.map((lesson) => ({
        id: lesson.id,
        label: `${lesson.module.course.title} · ${lesson.module.title} · ${lesson.title}`,
      }))}
    />
  );
}
