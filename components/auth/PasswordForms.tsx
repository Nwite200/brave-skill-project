"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Unable to send the reset link.");
      else setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
          <CheckCircle2 size={22} />
        </span>
        <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.03em] text-white">Check your inbox</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8492A6]">
          If an account matches <span className="text-white">{email}</span>, a password reset link is on its way. The link expires in 60 minutes.
        </p>
        <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-[#7C8AA3]">
          Delivery tip: when SMTP is not configured on a local install, the link is printed to the server console instead of being emailed.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className="btn btn-ghost btn-sm h-10">Back to sign in</Link>
          <button type="button" onClick={() => setSent(false)} className="btn btn-primary btn-sm h-10">Send again</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white">Reset your password</h1>
      <p className="mt-2 text-[13px] text-[#8492A6]">Enter the email on your account and we will send a secure reset link.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-3 text-[12px] text-rose-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input id="email" type="email" required className="field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
        </button>
      </form>
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-[12px] text-[#8492A6] hover:text-white">
        <ArrowLeft size={13} /> Back to sign in
      </Link>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to reset your password.");
        setLoading(false);
        return;
      }
      router.replace("/login?reset=1");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div>
        <h1 className="text-[26px] font-semibold text-white">Invalid reset link</h1>
        <p className="mt-2 text-[13px] text-[#8492A6]">This link is missing its token. Request a new password reset email.</p>
        <Link href="/forgot-password" className="btn btn-primary mt-6">Request a new link</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white">Choose a new password</h1>
      <p className="mt-2 text-[13px] text-[#8492A6]">Use at least 8 characters with a letter and a number.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-3 text-[12px] text-rose-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div>
          <label htmlFor="password" className="label">New password</label>
          <input id="password" type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <input id="confirm" type="password" required className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Update password"}
        </button>
      </form>
    </div>
  );
}
