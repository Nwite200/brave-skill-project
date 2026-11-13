"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Star } from "lucide-react";

type Review = { id: string; rating: number; title: string | null; body: string; name: string; createdAt: string };

export function CourseReviews({
  slug,
  average,
  count,
  reviews,
  enrolled,
}: {
  slug: string;
  average: number;
  count: number;
  reviews: Review[];
  enrolled: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/courses/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your review.");
      setSuccess("Thank you — your review is published.");
      setBody("");
      setShowForm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-12 border-t border-white/[0.06] pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-white">Student reviews</h2>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={13} className={index < Math.round(average) ? "fill-[#FBBF24] text-[#FBBF24]" : "text-[#3F4A5C]"} />
              ))}
            </div>
            <span className="text-[11.5px] text-[#9AA6BA]">{average || "—"} from {count} {count === 1 ? "review" : "reviews"}</span>
          </div>
        </div>
        {enrolled && (
          <button onClick={() => setShowForm((value) => !value)} className="btn btn-ghost btn-sm h-9">
            {showForm ? "Close" : "Write a review"}
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">{error}</p>}
      {success && <p className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">{success}</p>}

      {showForm && enrolled && (
        <form onSubmit={submit} className="mt-4 rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-5">
          <p className="text-[11.5px] font-medium text-white">Your rating</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`}>
                <Star size={22} className={value <= rating ? "fill-[#FBBF24] text-[#FBBF24]" : "text-[#3F4A5C]"} />
              </button>
            ))}
          </div>
          <textarea
            className="field mt-4 text-[12px]"
            rows={4}
            required
            minLength={5}
            placeholder="What did you learn? Was the practical work useful?"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <button type="submit" disabled={busy} className="btn btn-primary btn-sm mt-3 h-9">
            {busy ? <Loader2 size={12} className="animate-spin" /> : "Publish review"}
          </button>
        </form>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-0.5">
                {Array.from({ length: review.rating }).map((_, index) => <Star key={index} size={10} className="fill-[#FBBF24] text-[#FBBF24]" />)}
              </div>
              <span className="text-[8.5px] text-[#5F6B7E]">Verified student</span>
            </div>
            {review.title && <p className="mt-2 text-[11.5px] font-medium text-white">{review.title}</p>}
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#9AA6BA]">{review.body}</p>
            <p className="mt-2 text-[9px] text-[#6F7C90]">{review.name}</p>
          </div>
        ))}
        {!reviews.length && (
          <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-[11px] text-[#6F7C90] sm:col-span-2">
            No reviews yet. Enrolled students can share their experience after starting the programme.
          </p>
        )}
      </div>
    </section>
  );
}
