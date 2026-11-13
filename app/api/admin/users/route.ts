import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, parseJson, route, fail, getPagination } from "@/lib/api";
import { requireAdmin, requireRole, isAdmin } from "@/lib/auth";
import { adminUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const { skip, take } = getPagination(req, 25);
  const role = req.nextUrl.searchParams.get("role");
  const search = req.nextUrl.searchParams.get("q") || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const where = {
    ...(role ? { role: role as never } : {}),
    ...(status === "suspended" ? { status: "SUSPENDED" as const } : status === "active" ? { status: "ACTIVE" as const } : {}),
    ...(search
      ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] }
      : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true, name: true, email: true, phone: true, role: true, status: true,
        headline: true, createdAt: true, lastLoginAt: true,
        _count: { select: { enrollments: true, certificates: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return json({ ok: true, users, total });
});

export const POST = route(async (req: NextRequest) => {
  const actor = await requireRole("MASTER_ADMIN", "ADMIN");
  const data = await parseJson(req, adminUserSchema);

  if (!data.password || data.password.length < 8) return fail("Provide a temporary password of at least 8 characters.", 422);
  if (data.role === "MASTER_ADMIN" && actor.role !== "MASTER_ADMIN") {
    return fail("Only a master administrator can create another master administrator.", 403);
  }

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) return fail("A user with this email already exists.", 409);

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      role: data.role,
      headline: data.headline || null,
      expertise: data.expertise || null,
      passwordHash: await hashPassword(data.password),
    },
    select: { id: true, name: true, email: true, role: true },
  });

  await audit({ actorId: actor.id, action: "user.created", entity: "User", entityId: user.id, meta: { role: data.role } });
  return json({ ok: true, user }, 201);
});
