import "server-only";

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import type { AssetKind } from "@prisma/client";

const MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".apk": "application/vnd.android.package-archive",
};

export const MAX_SIZES: Record<AssetKind, number> = {
  VIDEO: 1024 * 1024 * 1024, // 1 GB
  PDF: 100 * 1024 * 1024, // 100 MB
  IMAGE: 8 * 1024 * 1024,
  APK: 300 * 1024 * 1024,
  OTHER: 100 * 1024 * 1024,
};

export const ALLOWED_MIME: Record<AssetKind, string[]> = {
  VIDEO: ["video/mp4", "video/webm", "video/x-m4v", "application/octet-stream"],
  PDF: ["application/pdf", "application/octet-stream"],
  IMAGE: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  APK: ["application/vnd.android.package-archive", "application/octet-stream"],
  OTHER: ["application/octet-stream", "application/zip"],
};

export const storageRoot = () => path.resolve(process.cwd(), env.storageDir);

export function safeKey(key: string) {
  const normalized = key.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.startsWith("/")) {
    throw new HttpError("Invalid storage key.", 400);
  }
  return normalized;
}

export function assetPath(key: string) {
  const root = storageRoot();
  const full = path.resolve(root, safeKey(key));
  if (!full.startsWith(root + path.sep)) throw new HttpError("Invalid storage key.", 400);
  return full;
}

export async function ensureStorage() {
  const dirs = ["videos", "pdfs", "images", "apk", "misc"];
  await Promise.all(dirs.map((d) => fs.mkdir(path.join(storageRoot(), d), { recursive: true })));
}

export async function saveAsset(input: {
  file: File;
  kind: AssetKind;
  uploadedById?: string;
  folder?: string;
}) {
  const { file, kind } = input;
  if (file.size <= 0) throw new HttpError("The uploaded file is empty.", 400);
  if (file.size > MAX_SIZES[kind]) {
    throw new HttpError(`File is too large. Maximum is ${Math.round(MAX_SIZES[kind] / 1024 / 1024)}MB.`, 413);
  }
  const ext = path.extname(file.name).toLowerCase();
  const mime = file.type || MIME_BY_EXT[ext] || "application/octet-stream";
  if (!ALLOWED_MIME[kind].includes(mime)) {
    throw new HttpError(`Unsupported file type for ${kind.toLowerCase()}: ${mime || ext}`, 415);
  }
  const allowedExt = kind === "VIDEO" ? [".mp4", ".webm", ".m4v"] : kind === "PDF" ? [".pdf"] : kind === "IMAGE" ? [".png", ".jpg", ".jpeg", ".webp", ".svg"] : kind === "APK" ? [".apk"] : [".zip", ".pdf", ".bin"];
  if (!allowedExt.includes(ext)) {
    throw new HttpError(`Unsupported file extension: ${ext || "(none)"}`, 415);
  }

  await ensureStorage();
  const folder = input.folder || (kind === "VIDEO" ? "videos" : kind === "PDF" ? "pdfs" : kind === "IMAGE" ? "images" : kind === "APK" ? "apk" : "misc");
  const key = `${folder}/${crypto.randomUUID()}${ext}`;
  const full = assetPath(key);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(full, buffer);

  const asset = await db.asset.create({
    data: {
      kind,
      storageKey: key,
      originalName: file.name.slice(0, 180),
      mimeType: mime,
      sizeBytes: file.size,
      uploadedById: input.uploadedById,
    },
  });
  return asset;
}

export async function deleteAsset(assetId: string) {
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return;
  try {
    await fs.unlink(assetPath(asset.storageKey));
  } catch {
    /* already gone */
  }
  await db.asset.delete({ where: { id: asset.id } }).catch(() => {});
}

export async function readAssetBuffer(assetId: string) {
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new HttpError("File not found.", 404);
  const buffer = await fs.readFile(assetPath(asset.storageKey));
  return { asset, buffer };
}

export async function assetStat(assetId: string) {
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new HttpError("File not found.", 404);
  const stat = await fs.stat(assetPath(asset.storageKey)).catch(() => null);
  if (!stat) throw new HttpError("File is missing from storage.", 404);
  return { asset, stat };
}

/** Streams a file with HTTP Range support (required by mobile Safari / Android ExoPlayer). */
export async function streamAsset(
  assetId: string,
  rangeHeader: string | null,
): Promise<Response> {
  const { asset, stat } = await assetStat(assetId);
  const full = assetPath(asset.storageKey);
  const total = stat.size;
  const type = asset.mimeType;

  if (rangeHeader) {
    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
      if (start >= total || end < start) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
      }
      const chunksize = end - start + 1;
      const handle = await fs.open(full, "r");
      const stream = handle.createReadStream({ start, end });
      return new Response(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": type,
          "Content-Length": String(chunksize),
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-store",
        },
      });
    }
  }

  const buffer = await fs.readFile(full);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Content-Disposition": `inline; filename="${asset.originalName.replace(/["\\]/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
