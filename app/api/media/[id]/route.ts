import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail } from "@/lib/api";
import { getSessionUser, isStaff } from "@/lib/auth";
import { streamAsset } from "@/lib/storage";
import { lessonAccess } from "@/lib/progression";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) return fail("File not found.", 404);

  if (asset.provider === "cloudflare-stream") {
    return fail("This video is delivered through signed Cloudflare Stream playback, not a file download.", 409);
  }

  if (asset.kind === "IMAGE") {
    return streamAsset(id, null);
  }

  const user = await getSessionUser();
  if (!user) return fail("Sign in to access this file.", 401);

  if (isStaff(user.role)) {
    return streamAsset(asset.id, req.headers.get("range"));
  }

  // Video and PDF URLs must carry the lesson context so the entitlement check is
  // for the exact lesson, not for any other lesson that happens to reuse the asset.
  if (isStaff(user.role)) {
    return streamAsset(asset.id, req.headers.get("range"));
  }

  const lessonId = req.nextUrl.searchParams.get("lessonId");
  if (!lessonId) return fail("Lesson context is required for this file.", 400);

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, isPublished: true, OR: [{ videoAssetId: id }, { pdfAssetId: id }] },
    select: { id: true },
  });
  if (!lesson) return fail("This file does not belong to that lesson.", 403);

  const access = await lessonAccess(user, lesson.id);
  if (!access.allowed) {
    const message =
      access.reason === "module_locked"
        ? "Complete the previous module and pass its required quiz to unlock this lesson."
        : "You need to be enrolled in this course to view this file.";
    return fail(message, 403);
  }

  return streamAsset(asset.id, req.headers.get("range"));
}
