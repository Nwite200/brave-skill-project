"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function CoursePublishToggle({
  courseId,
  isPublished,
  isFeatured,
  canPublish,
}: {
  courseId: string;
  isPublished: boolean;
  isFeatured: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState({ isPublished, isFeatured });
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (key: "isPublished" | "isFeatured") => {
    if (!canPublish) return;
    setBusy(key);
    const next = { ...state, [key]: !state[key] };
    setState(next);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) setState(state);
      else router.refresh();
    } catch {
      setState(state);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => toggle("isPublished")}
        disabled={!canPublish || busy === "isPublished"}
        className={`rounded-full border px-2 py-0.5 text-[8.5px] font-medium uppercase tracking-[0.06em] transition ${
          state.isPublished ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" : "border-amber-400/25 bg-amber-500/10 text-amber-300"
        } ${!canPublish ? "opacity-60" : "hover:brightness-125"}`}
        title={canPublish ? "Toggle published" : "Only administrators can publish"}
      >
        {busy === "isPublished" ? <Loader2 size={9} className="animate-spin" /> : state.isPublished ? "Live" : "Draft"}
      </button>
      <button
        onClick={() => toggle("isFeatured")}
        disabled={!canPublish || busy === "isFeatured"}
        className={`rounded-full border px-2 py-0.5 text-[8.5px] font-medium uppercase tracking-[0.06em] transition ${
          state.isFeatured ? "border-[#873BFF]/30 bg-[#873BFF]/15 text-[#C9B8FF]" : "border-white/10 text-[#6F7C90]"
        } ${!canPublish ? "opacity-60" : "hover:brightness-125"}`}
        title="Toggle featured"
      >
        Featured
      </button>
    </div>
  );
}
