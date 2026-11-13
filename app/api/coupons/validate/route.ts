import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { json, parseJson, route, fail, rateLimit, clientIp } from "@/lib/api";
import { validateCoupon } from "@/lib/payments";
import { formatNaira } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const limited = await rateLimit(`coupon:${clientIp(req)}`, 30, 300);
  if (!limited.allowed) return fail("Too many attempts. Please wait a moment.", 429);

  const data = await parseJson(
    req,
    z.object({ code: z.string().trim().min(2).max(40), courseId: z.string().min(1) }),
  );
  const course = await db.course.findFirst({ where: { id: data.courseId, isPublished: true } });
  if (!course) return fail("Course not found.", 404);

  const user = await getSessionUser();
  const { coupon, discountKobo } = await validateCoupon({
    code: data.code,
    courseId: course.id,
    amountKobo: course.priceKobo,
  });

  return json({
    ok: true,
    code: coupon?.code,
    description: coupon?.description,
    discountKobo,
    totalKobo: Math.max(0, course.priceKobo - discountKobo),
    discountLabel:
      coupon?.type === "PERCENT" ? `${coupon.percentOff}% off` : `−${formatNaira(discountKobo)}`,
    authenticated: Boolean(user),
  });
});
