import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail } from "@/lib/api";
import { assetStat, assetPath } from "@/lib/storage";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const release = await db.apkRelease.findFirst({
    where: { isActive: true },
    orderBy: [{ versionCode: "desc" }, { releasedAt: "desc" }],
    include: { asset: true },
  });

  if (!release) return fail("No Android build is available yet. Please check back soon.", 404);

  await db.apkRelease.update({ where: { id: release.id }, data: { downloads: { increment: 1 } } }).catch(() => {});

  if (release.downloadUrl) return Response.redirect(release.downloadUrl, 302);

  if (release.asset) {
    const { stat } = await assetStat(release.asset.id);
    const full = assetPath(release.asset.storageKey);
    const buffer = await fs.readFile(full);
    const filename = `Brave-Skill-${release.version}.apk`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "-")}"`,
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return fail("The Android build file is not attached to this release.", 404);
}

export const HEAD = GET;
