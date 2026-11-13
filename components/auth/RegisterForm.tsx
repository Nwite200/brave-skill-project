"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react";

const rules = [
  { test: (v: string) => v.length >= 8, label: "At least 8 characters" },
  { test: (v: string) => /[A-Za-z]/.test(v), label: "One letter" },
  { test: (v: string) => /[0-9]/.test(v), label: "One number" },
];

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", referralCode: "" });
  const [show, setShow] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setForm((prev) => ({ ...prev, referralCode: ref.toUpperCase() }));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!accepted) {
      setError("Please accept the terms and privacy policy to continue.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, acceptTerms: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to create your account.");
        setLoading(false);
        return;
      }
      router.replace("/dashboard?welcome=1");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-white">Create your account</h1>
      <p className="mt-2 text-[13px] text-[#8492A6]">
        Start learning in minutes. Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#C9B8FF] hover:text-white">Sign in</Link>
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-3 text-[12px] text-rose-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" required autoComplete="name" className="field" placeholder="Adaeze Okafor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="label">Email address</label>
            <input id="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label htmlFor="phone" className="label">Phone <span className="text-[#5F6B7E]">(optional)</span></label>
            <input id="phone" type="tel" autoComplete="tel" className="field" placeholder="+234 800 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>

        <div>
          <label htmlFor="referral" className="label">Referral code <span className="text-[#5F6B7E]">(optional)</span></label>
          <input id="referral" className="field" placeholder="From a friend" value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })} />
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input id="password" type={show ? "text" : "password"} required autoComplete="new-password" className="field pr-12" placeholder="Create a strong password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-white">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {rules.map((rule) => {
              const ok = rule.test(form.password);
              return (
                <span key={rule.label} className={`inline-flex items-center gap-1 text-[10px] ${ok ? "text-[#10C99A]" : "text-[#5F6B7E]"}`}>
                  <Check size={10} /> {rule.label}
                </span>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-[11.5px] leading-relaxed text-[#8492A6]">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 appearance-none rounded border border-white/20 bg-white/[0.03] checked:border-[#873BFF] checked:bg-[#873BFF] checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223%22><path d=%22M20 6 9 17l-5-5%22/></svg>')] bg-[length:12px] bg-center bg-no-repeat" />
          <span>
            I agree to the <Link href="/terms" className="text-[#C9B8FF] hover:text-white">Terms &amp; Conditions</Link> and{" "}
            <Link href="/privacy" className="text-[#C9B8FF] hover:text-white">Privacy Policy</Link>.
          </span>
        </label>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create account <ArrowRight size={15} /></>}
        </button>
        <p className="text-center text-[10px] text-[#5F6B7E]">Free to join. You only pay when you enrol in a paid course.</p>
      </form>
    </div>
  );
}
