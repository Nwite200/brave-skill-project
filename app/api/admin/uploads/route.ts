import { NextRequest } from "next/server";
import { json, route, fail } from "@/lib/api";
import { requireStaff, isAdmin } from "@/lib/auth";
import { saveAsset, MAX_SIZES } from "@/lib/storage";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { AssetKind } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: AssetKind[] = ["VIDEO", "PDF", "IMAGE", "APK"];

export const POST = route(async (req: NextRequest) => {
  const user = await requireStaff();
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Expected multipart form data.", 400);

  const file = form.get("file");
  const kindRaw = String(form.get("kind") || "").toUpperCase();
  if (!(file instanceof File)) return fail("No file was uploaded.", 400);
  if (!KINDS.includes(kindRaw as AssetKind)) return fail("Invalid asset kind.", 422);
  if (kindRaw === "APK" && !isAdmin(user.role)) return fail("Only administrators can upload app builds.", 403);

  const asset = await saveAsset({
    file,
    kind: kindRaw as AssetKind,
    uploadedById: user.id,
  });

  await audit({
    actorId: user.id,
    action: "asset.uploaded",
    entity: "Asset",
    entityId: asset.id,
    meta: { kind: asset.kind, size: asset.sizeBytes, name: asset.originalName },
  });

  return json({
    ok: true,
    asset: {
      id: asset.id,
      kind: asset.kind,
      name: asset.originalName,
      size: asset.sizeBytes,
      mime: asset.mimeType,
      url: asset.kind === "IMAGE" ? `/api/media/${asset.id}` : undefined,
      maxSize: MAX_SIZES[asset.kind],
    },
  }, 201);
});

export const GET = route(async () => {
  const user = await requireStaff();
  const assets = await db.asset.findMany({
    where: isAdmin(user.role) ? {} : { uploadedById: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, kind: true, originalName: true, sizeBytes: true, mimeType: true, createdAt: true },
  });
  return json({ ok: true, assets });
});
