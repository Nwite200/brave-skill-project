import { NextRequest } from "next/server";
import { json, route } from "@/lib/api";
import { clearSessionCookie, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const user = await getSessionUser();
  await clearSessionCookie();
  if (user) {
    await audit({ actorId: user.id, action: "auth.logout", entity: "User", entityId: user.id });
  }
  return json({ ok: true });
});
