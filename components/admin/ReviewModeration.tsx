"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Star, Trash2 } from "lucide-react";

type Review = { id: string; rating: number; title: string | null; body: string; isPublished: boolean; name: string; email: string; course: string; courseSlug: string; createdAt: string };

export function ReviewModeration({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [items, setItems] = useState(reviews);
  const [busy, setBusy] = useState<string | null>(null);

  const update = async (review: Review, isPublished: boolean) => {
    setBusy(review.id);
    await fetch(`/api/admin/reviews/${review.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished }) });
    setItems((prev) => prev.map((item) => (item.id === review.id ? { ...item, isPublished } : item)));
    setBusy(null);
    router.refresh();
  };

  const remove = async (review: Review) => {
    if (!confirm("Delete this review permanently?")) return;
    setBusy(review.id);
    await fetch(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((item) => item.id !== review.id));
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="mt-4 space-y-2">
      {items.map((review) => (
        <div key={review.id} className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex">{[1,2,3,4,5].map((n) => <Star key={n} size={10} className={n <= review.rating ? "fill-[#FBBF24] text-[#FBBF24]" : "text-[#3F4A5C]"} />)}</div>
                <span className={`text-[8px] uppercase ${review.isPublished ? "text-emerald-300" : "text-amber-300"}`}>{review.isPublished ? "Published" : "Hidden"}</span>
              </div>
              <p className="mt-1 text-[11px] text-white">{review.course}</p>
              <p className="text-[9px] text-[#6F7C90]">{review.name} · {review.email} · {review.createdAt}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => update(review, !review.isPublished)} disabled={busy === review.id} className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-[#C2CCDD] hover:text-white">
                {review.isPublished ? "Hide" : "Publish"}
              </button>
              <button onClick={() => remove(review)} disabled={busy === review.id} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:text-rose-300"><Trash2 size={10} /></button>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[#9AA6BA]">{review.body}</p>
        </div>
      ))}
      {!items.length && <p className="rounded-xl border border-dashed border-white/10 py-10 text-center text-[11px] text-[#6F7C90]">No reviews yet.</p>}
    </div>
  );
}
