"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type VerifyState = {
  status?: string;
  courseId?: string;
  courseTitle?: string;
  message?: string;
};

export function PaymentVerifier() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get("reference") || "";
  const [state, setState] = useState<VerifyState | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");

  const verify = useCallback(async () => {
    if (!reference) {
      setError("This payment link is missing its reference.");
      return;
    }
    try {
      const res = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "We could not verify this payment.");
        return;
      }
      setState(data);
      if (data.status === "PAID") {
        router.replace(`/checkout/success?reference=${encodeURIComponent(reference)}`);
      }
    } catch {
      setError("Network error while verifying your payment.");
    } finally {
      setAttempts((n) => n + 1);
    }
  }, [reference, router]);

  useEffect(() => {
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state || state.status === "PAID" || attempts > 5 || error) return;
    const timer = setTimeout(verify, 3000);
    return () => clearTimeout(timer);
  }, [state, attempts, error, verify]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-center">
        <AlertCircle size={24} className="mx-auto text-rose-300" />
        <p className="mt-3 text-[14px] font-medium text-white">Payment verification failed</p>
        <p className="mt-1.5 text-[12px] text-rose-200/80">{error}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={verify} className="btn btn-ghost btn-sm">Try again</button>
          <Link href="/contact" className="btn btn-primary btn-sm">Contact support</Link>
        </div>
      </div>
    );
  }

  if (state?.status === "PAID") {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-6 text-center">
        <CheckCircle2 size={26} className="mx-auto text-emerald-300" />
        <p className="mt-3 text-[14px] font-medium text-white">Payment confirmed</p>
        <p className="mt-1 text-[12px] text-[#93A1B6]">Taking you to your course…</p>
      </div>
    );
  }

  if (state?.status === "FAILED") {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-center">
        <AlertCircle size={24} className="mx-auto text-rose-300" />
        <p className="mt-3 text-[14px] font-medium text-white">Payment was not completed</p>
        <p className="mt-1.5 text-[12px] text-rose-200/80">No access has been granted. You can try checkout again from the course page.</p>
        <Link href="/courses" className="btn btn-ghost btn-sm mt-5">Back to courses</Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-8 text-center">
      <Loader2 size={26} className="mx-auto animate-spin text-[#C9B8FF]" />
      <p className="mt-4 text-[14px] font-medium text-white">Verifying your payment</p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#7C8AA3]">
        We are confirming the transaction with Paystack on our server. This usually takes a few seconds — please keep this page open.
      </p>
      {attempts > 2 && <p className="mt-3 text-[10.5px] text-[#5F6B7E]">Still waiting… attempt {attempts} of 6</p>}
      {attempts > 5 && (
        <div className="mt-4">
          <p className="text-[11px] text-amber-200/80">This is taking longer than usual. If you were debited, your access will be unlocked automatically by our webhook.</p>
          <Link href="/dashboard" className="btn btn-ghost btn-sm mt-3">Go to dashboard</Link>
        </div>
      )}
    </div>
  );
}
