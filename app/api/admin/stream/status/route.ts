import { json, route } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { isStreamConfigured, isStreamSigningConfigured } from "@/lib/stream";

export const runtime = "nodejs";

export const GET = route(async () => {
  await requireStaff();
  return json({
    ok: true,
    configured: isStreamConfigured(),
    signedPlayback: isStreamSigningConfigured(),
    message: isStreamConfigured()
      ? "Cloudflare Stream is connected. Uploads are enabled."
      : "Cloudflare Stream is not connected. Videos continue to use private local/R2 storage. Add the Stream credentials only after the owner approves the service.",
  });
});
