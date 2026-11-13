"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm({ next, demo }: { next?: string; demo?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to sign in.");
        setLoading(false);
        return;
      }
      router.replace(data.redirect || "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const fillDemo = (kind: "student" | "admin") => {
    setEmail(kind === "student" ? "student@braveskill.ng" : "admin@braveskill.ng");
    setPassword("BraveSkill#2026");
  };

  return (
    <div>
      <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-white">Welcome back</h1>
      <p className="mt-2 text-[13px] text-[#8492A6]">
        Sign in to continue your learning. New here?{" "}
        <Link href="/register" className="font-medium text-[#C9B8FF] hover:text-white">Create an account</Link>
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-3 text-[12px] text-rose-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input id="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">Password</label>
            <Link href="/forgot-password" className="mb-1.5 text-[11px] text-[#8492A6] hover:text-white">Forgot password?</Link>
          </div>
          <div className="relative">
            <input id="password" type={show ? "text" : "password"} required autoComplete="current-password" className="field pr-12" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-white">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary mt-2 w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <>Sign in <ArrowRight size={15} /></>}
        </button>
      </form>

      {demo && (
        <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6F7C90]">Local demo accounts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => fillDemo("student")} className="rounded-full border border-white/10 px-3 py-1 text-[10.5px] text-[#C2CCDD] hover:border-white/25">Student</button>
            <button type="button" onClick={() => fillDemo("admin")} className="rounded-full border border-white/10 px-3 py-1 text-[10.5px] text-[#C2CCDD] hover:border-white/25">Administrator</button>
          </div>
          <p className="mt-2 text-[10px] text-[#5F6B7E]">Password: BraveSkill#2026</p>
        </div>
      )}

      <p className="mt-6 text-center text-[12px] text-[#6F7C90]">
        Prefer the app?{" "}
        <Link href="/download" className="text-[#C9B8FF] hover:text-white">Download for Android</Link>
      </p>
    </div>
  );
}
