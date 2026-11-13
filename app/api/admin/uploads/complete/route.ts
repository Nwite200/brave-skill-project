import { NextRequest } from "next/server";
import { z } from "zod";
import { json, route, fail } from "@/lib/api";
import { requireStaff, isAdmin } from "@/lib/auth";
import { registerAsset } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  key: z.string().min(3).max(300),
  kind: z.enum(["VIDEO", "PDF", "IMAGE", "APK"]),
  originalName: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(120),
  sizeBytes: z.coerce.number().int().positive(),
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireStaff();
  const data = schema.parse(await req.json().catch(() => ({})));
  if (data.kind === "APK" && !isAdmin(user.role)) return fail("Only administrators can upload app builds.", 403);

  const asset = await registerAsset({ ...data, uploadedById: user.id });
  await audit({
    actorId: user.id,
    action: "asset.registered",
    entity: "Asset",
    entityId: asset.id,
    meta: { kind: asset.kind, size: asset.sizeBytes, storage: "r2" },
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
    },
  }, 201);
});
