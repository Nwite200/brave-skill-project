import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { ReviewModeration } from "@/components/admin/ReviewModeration";

export const metadata: Metadata = { title: "Reviews · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireAdminPage();
  const reviews = await db.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true } }, course: { select: { title: true, slug: true } } },
  });
  return (
    <div className="mx-auto max-w-[1100px]">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Academy / reviews</p>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Course reviews</h1>
        <p className="mt-1 text-[11.5px] text-[#8492A6]">{reviews.length} reviews · publish or hide feedback without deleting the record.</p>
      </div>
      <ReviewModeration
        reviews={reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          title: review.title,
          body: review.body,
          isPublished: review.isPublished,
          name: review.user.name,
          email: review.user.email,
          course: review.course.title,
          courseSlug: review.course.slug,
          createdAt: formatDate(review.createdAt, true),
        }))}
      />
    </div>
  );
}
