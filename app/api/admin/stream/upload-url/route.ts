import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { createStreamDirectUpload, isStreamConfigured } from "@/lib/stream";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  sizeBytes: z.coerce.number().int().positive().max(30 * 1024 * 1024 * 1024),
  maxDurationSeconds: z.coerce.number().int().min(60).max(60 * 60 * 8).optional(),
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireStaff();
  if (!isStreamConfigured()) {
    return fail("Cloudflare Stream is not enabled. Ask the owner to approve and configure it, or upload to private storage instead.", 501);
  }
  const data = await parseJson(req, schema);
  const upload = await createStreamDirectUpload({
    name: data.name,
    maxDurationSeconds: data.maxDurationSeconds,
  });
  await audit({ actorId: user.id, action: "stream.upload_started", entity: "StreamVideo", entityId: upload.uid, meta: { name: data.name } });
  return json({ ok: true, ...upload });
});
