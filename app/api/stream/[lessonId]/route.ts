import { NextRequest } from "next/server";
import { json, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonAccess } from "@/lib/progression";
import { isStreamSigningConfigured, signStreamToken, streamIframeUrl } from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { lessonId } = await ctx.params;

  const access = await lessonAccess(user, lessonId);
  if (!access.allowed || !access.lesson) {
    return fail(
      access.reason === "module_locked"
        ? "Complete the previous module and pass its required quiz to unlock this lesson."
        : "You need access to this course to play this lesson.",
      403,
    );
  }

  const asset = await db.asset.findFirst({
    where: { id: access.lesson.videoAssetId || "__none__" },
  });
  if (!asset || asset.provider !== "cloudflare-stream" || !asset.externalId) {
    return json({ ok: true, provider: "file", url: asset ? `/api/media/${asset.id}` : null });
  }
  if (!isStreamSigningConfigured()) {
    return fail("Signed Stream playback is not configured. Contact the academy administrator.", 503);
  }

  const token = await signStreamToken(asset.externalId, 3600);
  return json({
    ok: true,
    provider: "cloudflare-stream",
    uid: asset.externalId,
    token,
    iframeUrl: streamIframeUrl(asset.externalId, token),
    watermark: user.email,
  });
});
