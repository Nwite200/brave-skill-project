"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Lock, User } from "lucide-react";

export function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; phone: string | null; headline: string | null; bio: string | null };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial.name,
    phone: initial.phone || "",
    headline: initial.headline || "",
    bio: initial.bio || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Could not save your profile.");
      else {
        setMessage("Profile updated.");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#873BFF]/12 text-[#C9B8FF]"><User size={13} /></span>
        <h2 className="text-[13.5px] font-semibold text-white">Profile details</h2>
      </div>

      {message && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"><CheckCircle2 size={12} /> {message}</p>}
      {error && <p className="mt-4 flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"><AlertCircle size={12} /> {error}</p>}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" required className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input id="email" className="field opacity-60" value={initial.email} disabled />
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone number</label>
          <input id="phone" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 800 000 0000" />
        </div>
        <div>
          <label htmlFor="headline" className="label">Headline</label>
          <input id="headline" className="field" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Solar technician in training" />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="bio" className="label">About you <span className="text-[#5F6B7E]">(optional)</span></label>
        <textarea id="bio" rows={3} className="field" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A short introduction shown on your profile." />
      </div>
      <button type="submit" disabled={saving} className="btn btn-primary btn-sm mt-4 h-9">
        {saving ? <Loader2 size={13} className="animate-spin" /> : "Save changes"}
      </button>
      <p className="mt-3 text-[9.5px] text-[#5F6B7E]">Email changes require support verification.</p>
    </form>
  );
}

export function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (form.newPassword !== form.confirm) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Could not change your password.");
      else {
        setMessage("Password updated. Other sessions have been signed out.");
        setForm({ currentPassword: "", newPassword: "", confirm: "" });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#20D9E8]/12 text-[#7FE9F2]"><Lock size={13} /></span>
        <h2 className="text-[13.5px] font-semibold text-white">Password & security</h2>
      </div>

      {message && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"><CheckCircle2 size={12} /> {message}</p>}
      {error && <p className="mt-4 flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"><AlertCircle size={12} /> {error}</p>}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="current" className="label">Current password</label>
          <input id="current" type="password" required className="field" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new" className="label">New password</label>
            <input id="new" type="password" required className="field" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirm new password</label>
            <input id="confirm" type="password" required className="field" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn btn-ghost btn-sm mt-4 h-9">
        {saving ? <Loader2 size={13} className="animate-spin" /> : "Update password"}
      </button>
    </form>
  );
}
