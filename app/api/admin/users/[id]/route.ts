import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireRole, requireAdmin, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  role: z.enum(["MASTER_ADMIN", "ADMIN", "INSTRUCTOR", "STUDENT"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  headline: z.string().trim().max(120).nullable().optional(),
  expertise: z.string().trim().max(240).nullable().optional(),
  temporaryPassword: z.string().min(8).max(72).optional(),
});

export const PATCH = route(async (req: NextRequest, ctx) => {
  const actor = await requireAdmin();
  const { id } = await ctx.params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return fail("User not found.", 404);

  const data = patchSchema.parse(await req.json().catch(() => ({})));

  if (data.role && actor.role !== "MASTER_ADMIN") {
    return fail("Only a master administrator can change roles.", 403);
  }
  if (target.role === "MASTER_ADMIN" && actor.role !== "MASTER_ADMIN") {
    return fail("You cannot modify a master administrator.", 403);
  }
  if (data.status === "SUSPENDED" && target.id === actor.id) {
    return fail("You cannot suspend your own account.", 409);
  }

  const update: Record<string, unknown> = { ...data };
  delete update.temporaryPassword;
  if (data.temporaryPassword) {
    update.passwordHash = await hashPassword(data.temporaryPassword);
    update.tokenVersion = { increment: 1 };
  }
  if (data.status) update.status = data.status;
  if (data.role && target.id === actor.id) return fail("You cannot change your own role.", 409);

  const user = await db.user.update({
    where: { id },
    data: update,
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  await audit({
    actorId: actor.id,
    action: "user.updated",
    entity: "User",
    entityId: id,
    meta: { fields: Object.keys(data), role: data.role, status: data.status, passwordReset: Boolean(data.temporaryPassword) },
  });

  return json({ ok: true, user });
});

export const GET = route(async (_req: NextRequest, ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, status: true, headline: true, bio: true,
      createdAt: true, lastLoginAt: true,
      enrollments: { include: { course: { select: { title: true } } }, orderBy: { enrolledAt: "desc" } },
      orders: { include: { course: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      certificates: { include: { course: { select: { title: true } } } },
    },
  });
  if (!user) return fail("User not found.", 404);
  return json({ ok: true, user });
});
