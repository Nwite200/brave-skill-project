import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/format";
import crypto from "crypto";

export const runtime = "nodejs";

export const GET = route(async (_req: NextRequest) => {
  const user = await requireUser();
  let record = await db.user.findUnique({ where: { id: user.id }, select: { referralCode: true, name: true } });
  if (!record?.referralCode) {
    const base = slugify(record?.name || "brave").toUpperCase().slice(0, 12) || "BRAVE";
    let code = `${base}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    while (await db.user.findUnique({ where: { referralCode: code } })) {
      code = `${base}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    }
    await db.user.update({ where: { id: user.id }, data: { referralCode: code } });
    record = { ...record!, referralCode: code };
  }
  const referred = await db.user.count({ where: { referredById: user.id } });
  return json({
    ok: true,
    code: record.referralCode,
    referred,
    link: `${process.env.NEXT_PUBLIC_SITE_URL || "https://academy.emyphilltech.com.ng"}/register?ref=${record.referralCode}`,
  });
});
