import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const status = req.nextUrl.searchParams.get("status");
  const tickets = await db.supportTicket.findMany({
    where: status ? { status: status as never } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { user: { select: { name: true } } },
  });
  return json({ ok: true, tickets });
});
