import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser();
  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true, headline: true, bio: true, avatarUrl: true, createdAt: true },
  });
  return json({ ok: true, user: profile });
});

export const PATCH = route(async (req: NextRequest) => {
  const user = await requireUser();
  const data = await parseJson(req, profileSchema);
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      phone: data.phone || null,
      headline: data.headline || null,
      bio: data.bio || null,
    },
    select: { id: true, name: true, email: true, phone: true, headline: true, bio: true },
  });
  await audit({ actorId: user.id, action: "profile.updated", entity: "User", entityId: user.id });
  return json({ ok: true, user: updated });
});
