import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, fail } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { CONTENT_RESOURCES, assertCanManageContent } from "@/lib/admin-content";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

type AnyDb = Record<string, { create: (args: unknown) => Promise<unknown>; findMany: (args: unknown) => Promise<unknown> }>;

export const POST = route(async (req: NextRequest, ctx) => {
  const user = await requireStaff();
  const { resource } = await ctx.params;
  const config = CONTENT_RESOURCES[resource];
  if (!config) return fail("Unknown resource.", 404);

  const raw = await req.json().catch(() => null);
  if (!raw) return fail("Invalid JSON body.", 400);
  const data = config.schema.parse(raw) as Record<string, unknown>;

  await assertCanManageContent(user, resource, data);

  const transformed = config.transform ? config.transform(data, user) : data;
  for (const key of Object.keys(transformed)) {
    if (transformed[key] === undefined) delete transformed[key];
  }

  try {
    const record = await (db as unknown as AnyDb)[config.model].create({ data: transformed });

    if (resource === "announcements" && (record as { isPublished?: boolean }).isPublished) {
      const announcement = record as { id: string; title: string; body: string; audience: string; courseId: string | null };
      const recipients =
        announcement.audience === "COURSE" && announcement.courseId
          ? await db.enrollment.findMany({
              where: { courseId: announcement.courseId, status: { not: "REVOKED" } },
              select: { userId: true },
            })
          : await db.user.findMany({
              where: {
                status: "ACTIVE",
                ...(announcement.audience === "STUDENTS" ? { role: "STUDENT" as const } : {}),
              },
              select: { id: true },
            });
      const userIds = recipients.map((r) => ("userId" in r ? r.userId : r.id));
      if (userIds.length) {
        await db.notification.createMany({
          data: userIds.map((userId) => ({
            userId,
            type: "ANNOUNCEMENT" as const,
            title: announcement.title,
            body: announcement.body.slice(0, 500),
            link: "/dashboard/notifications",
          })),
        });
      }
    }

    const id = (record as { id?: string })?.id;
    await audit({ actorId: user.id, action: `${resource}.created`, entity: resource, entityId: id });
    return json({ ok: true, record }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create record.";
    if (message.includes("Unique constraint")) return fail("A record with that unique value already exists.", 409);
    throw error;
  }
});
