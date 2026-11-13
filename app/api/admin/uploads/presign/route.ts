import { NextRequest } from "next/server";
import { z } from "zod";
import { json, route, fail } from "@/lib/api";
import { requireStaff, isAdmin } from "@/lib/auth";
import { isR2Configured, r2KeyFor, r2PresignPut } from "@/lib/r2";
import { ALLOWED_MIME, MAX_SIZES } from "@/lib/storage";

export const runtime = "nodejs";

const schema = z.object({
  filename: z.string().min(1).max(200),
  kind: z.enum(["VIDEO", "PDF", "IMAGE", "APK"]),
  mimeType: z.string().max(120),
  sizeBytes: z.coerce.number().int().positive(),
});

/** Direct-to-R2 upload for files larger than the Worker request limit. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireStaff();
  const data = schema.parse(await req.json().catch(() => ({})));
  if (data.kind === "APK" && !isAdmin(user.role)) return fail("Only administrators can upload app builds.", 403);
  if (!isR2Configured()) return fail("Direct uploads require R2 storage to be configured.", 501);
  if (data.sizeBytes > MAX_SIZES[data.kind]) {
    return fail(`File is too large. Maximum is ${Math.round(MAX_SIZES[data.kind] / 1024 / 1024)}MB.`, 413);
  }
  if (!ALLOWED_MIME[data.kind].includes(data.mimeType)) return fail("Unsupported file type.", 415);

  const folder =
    data.kind === "VIDEO" ? "videos" : data.kind === "PDF" ? "pdfs" : data.kind === "IMAGE" ? "images" : "apk";
  const key = r2KeyFor(folder, data.filename);
  const presigned = await r2PresignPut(key, data.mimeType, 900);

  return json({ ok: true, ...presigned });
});
