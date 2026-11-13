import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail } from "@/lib/api";
import { getSessionUser, isStaff } from "@/lib/auth";
import { streamAsset } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) return fail("File not found.", 404);

  if (asset.kind === "IMAGE") {
    return streamAsset(id, null);
  }

  const user = await getSessionUser();
  if (!user) return fail("Sign in to access this file.", 401);

  if (isStaff(user.role)) {
    return streamAsset(asset.id, req.headers.get("range"));
  }

  const lesson = await db.lesson.findFirst({
    where: { OR: [{ videoAssetId: id }, { pdfAssetId: id }], isPublished: true },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson) return fail("This file is not available.", 403);

  if (!lesson.isPreview) {
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: lesson.module.courseId } },
    });
    if (!enrollment || enrollment.status === "REVOKED") {
      return fail("You need to be enrolled in this course to view this file.", 403);
    }
  }

  return streamAsset(asset.id, req.headers.get("range"));
}
