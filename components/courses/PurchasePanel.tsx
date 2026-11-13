"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowRight, BadgeCheck, Loader2, Lock, PlayCircle, Tag, X } from "lucide-react";
import { formatNaira } from "@/lib/format";

export function PurchasePanel({
  course,
  enrolled,
  isStaffUser,
  isAuthenticated,
  redirectPath,
}: {
  course: { id: string; slug: string; title: string; priceKobo: number; compareAtKobo: number; lessonCount: number; certificateEnabled: boolean };
  enrolled: boolean;
  isStaffUser: boolean;
  isAuthenticated: boolean;
  redirectPath: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discountKobo: number; totalKobo: number; label: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  const applyCoupon = async () => {
    if (!code.trim()) return;
    setCouponLoading(true);
    setError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, courseId: course.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "That code could not be applied.");
        setApplied(null);
      } else {
        setApplied({ code: data.code, discountKobo: data.discountKobo, totalKobo: data.totalKobo, label: data.discountLabel });
      }
    } catch {
      setError("Network error while checking the code.");
    } finally {
      setCouponLoading(false);
    }
  };

  const enroll = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(redirectPath)}`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, couponCode: applied?.code || "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to start checkout.");
        setLoading(false);
        return;
      }
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      router.push(data.redirect || `/checkout/success`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (enrolled) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-300">
          <BadgeCheck size={16} /> You are enrolled
        </div>
        <p className="mt-1.5 text-[11.5px] text-[#93A1B6]">Your access is active. Continue from where you left off.</p>
        <Link href={`/dashboard/courses/${course.id}`} className="btn btn-primary mt-4 w-full">
          Continue learning <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  if (isStaffUser) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-center">
        <p className="text-[12px] text-[#93A1B6]">Staff preview mode. Enrolment is not required.</p>
        <Link href="/admin/courses" className="btn btn-ghost btn-sm mt-3">Manage courses</Link>
      </div>
    );
  }

  const price = applied ? applied.totalKobo : course.priceKobo;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0B0E18]">
      <div className="border-b border-white/[0.07] p-5">
        <div className="flex items-end justify-between">
          <div>
            {course.priceKobo === 0 ? (
              <p className="text-[26px] font-semibold text-[#10C99A]">Free</p>
            ) : (
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="num text-[28px] font-semibold tracking-[-0.03em] text-white">{formatNaira(price)}</p>
                {course.compareAtKobo > course.priceKobo && (
                  <p className="num ml-1 text-[11px] text-[#5F6B7E] line-through">{formatNaira(course.compareAtKobo)}</p>
                )}
              </div>
            )}
            <p className="mt-1 text-[10.5px] text-[#7C8AA3]">One-time payment · lifetime access</p>
          </div>
          {course.priceKobo > 0 && (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[9.5px] font-medium text-emerald-300">
              Paystack secured
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-[11px] text-rose-200">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {course.priceKobo > 0 && (
          <div className="mb-4">
            <label htmlFor="coupon" className="label">Discount code</label>
            {applied ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[11.5px] text-emerald-200">
                  <Tag size={13} /> {applied.code} · {applied.label}
                </span>
                <button type="button" onClick={() => { setApplied(null); setCode(""); }} aria-label="Remove discount" className="text-emerald-300/70 hover:text-white">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input id="coupon" className="field h-10 text-[12px]" placeholder="e.g. BRAVE20" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                <button type="button" onClick={applyCoupon} disabled={couponLoading} className="btn btn-ghost btn-sm h-10 shrink-0">
                  {couponLoading ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
          </div>
        )}

        <button type="button" onClick={enroll} disabled={loading} className="btn btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : course.priceKobo === 0 || price === 0 ? "Enrol for free" : <>Enrol now <ArrowRight size={15} /></>}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-[#6F7C90]">
          <Lock size={10} /> Secure server-verified payment. Access unlocks instantly.
        </p>

        <div className="mt-5 space-y-2.5 border-t border-white/[0.07] pt-4">
          {[
            `${course.lessonCount} lessons across structured modules`,
            "Video lessons, PDF guides and quizzes",
            "Android app access with the same account",
            course.certificateEnabled ? "Verifiable certificate on completion" : "Certificate not included",
          ].map((item) => (
            <p key={item} className="flex items-start gap-2 text-[11px] text-[#93A1B6]">
              <span className="mt-0.5 text-[#10C99A]">✓</span> {item}
            </p>
          ))}
        </div>

        {!isAuthenticated && (
          <p className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-center text-[10.5px] text-[#7C8AA3]">
            You will be asked to sign in before payment.
          </p>
        )}
      </div>
    </div>
  );
}

export function LockedLesson({ title, duration }: { title: string; duration: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3.5 py-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <Lock size={13} className="shrink-0 text-[#4B5668]" />
        <span className="truncate text-[12px] text-[#7C8AA3]">{title}</span>
      </span>
      <span className="text-[10px] text-[#4B5668]">{duration}</span>
    </div>
  );
}

export function PreviewLessonLink({ moduleIndex, lessonIndex }: { moduleIndex: number; lessonIndex: number }) {
  return (
    <span className="flex items-center gap-2 text-[10px] text-[#C9B8FF]">
      <PlayCircle size={12} /> Preview · module {moduleIndex + 1}.{lessonIndex + 1}
    </span>
  );
}
