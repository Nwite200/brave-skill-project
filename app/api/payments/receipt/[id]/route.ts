import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { route, fail, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { renderReceiptPdf } from "@/lib/certificates";

export const runtime = "nodejs";

export const GET = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const order = await db.order.findUnique({
    where: { id },
    include: { course: true, user: true },
  });
  if (!order) return fail("Receipt not found.", 404);
  if (order.userId !== user.id && !["ADMIN", "MASTER_ADMIN"].includes(user.role)) {
    return fail("You cannot access this receipt.", 403);
  }
  if (order.status !== "PAID" && order.status !== "REFUNDED") return fail("Receipt is only available for completed payments.", 409);

  const pdf = await renderReceiptPdf({
    reference: order.reference,
    receiptNumber: order.receiptNumber,
    amountKobo: order.amountKobo,
    discountKobo: order.discountKobo,
    subtotalKobo: order.subtotalKobo,
    paidAt: order.paidAt,
    courseTitle: order.course.title,
    studentName: order.user.name,
    studentEmail: order.user.email,
    gateway: order.gateway,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Brave-Skill-Receipt-${order.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
