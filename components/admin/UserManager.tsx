"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Plus, Search, ShieldOff, UserPlus, X } from "lucide-react";
import { formatDate } from "@/lib/format";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  headline: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  enrollments: number;
  certificates: number;
};

export function UserManager({
  users,
  courses,
  role,
  canChangeRoles,
}: {
  users: UserRow[];
  courses: { id: string; title: string }[];
  role: "STUDENT" | "INSTRUCTOR";
  canChangeRoles: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState({ name: "", email: "", phone: "", password: "", headline: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [enrollTarget, setEnrollTarget] = useState<UserRow | null>(null);
  const [courseId, setCourseId] = useState(courses[0]?.id || "");

  const filtered = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()));

  const patchUser = async (id: string, body: Record<string, unknown>, message: string) => {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      setSuccess(message);
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create");
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...create, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the account.");
      setCreate({ name: "", email: "", phone: "", password: "", headline: "" });
      setCreateOpen(false);
      setSuccess("Account created.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the account.");
    } finally {
      setBusy(null);
    }
  };

  const enroll = async () => {
    if (!enrollTarget || !courseId) return;
    setBusy("enroll");
    setError("");
    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: enrollTarget.id, courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not grant access.");
      setEnrollTarget(null);
      setSuccess("Course access granted.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not grant access.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">{role === "STUDENT" ? "People / students" : "People / instructors"}</p>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">{role === "STUDENT" ? "Students" : "Instructors"}</h1>
          <p className="mt-1 text-[11.5px] text-[#8492A6]">{users.length} {role === "STUDENT" ? "learners" : "faculty members"} · manage access, passwords and status.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5">
            <Search size={12} className="text-[#5F6B7E]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="w-[170px] bg-transparent text-[10.5px] text-white outline-none placeholder:text-[#3F4A5C]" />
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm h-8"><Plus size={12} /> New {role === "STUDENT" ? "student" : "instructor"}</button>
        </div>
      </div>

      {error && <p className="mt-4 flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"><AlertCircle size={12} /> {error}</p>}
      {success && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"><CheckCircle2 size={12} /> {success}</p>}

      <div className="mt-4 table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              {role === "STUDENT" && <th>Courses</th>}
              {role === "STUDENT" && <th>Certs</th>}
              <th>Joined</th>
              <th>Last seen</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((person) => (
              <tr key={person.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[8.5px] font-semibold">{person.name.slice(0, 1)}</span>
                    <div>
                      <p className="font-medium text-white">{person.name}</p>
                      {person.headline && <p className="text-[9px] text-[#5F6B7E]">{person.headline}</p>}
                    </div>
                  </div>
                </td>
                <td className="text-[11px] text-[#A2AFC2]">{person.email}</td>
                <td>
                  <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8.5px] uppercase ${person.status === "ACTIVE" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-rose-400/20 bg-rose-500/10 text-rose-300"}`}>{person.status}</span>
                </td>
                {role === "STUDENT" && <td className="num">{person.enrollments}</td>}
                {role === "STUDENT" && <td className="num">{person.certificates}</td>}
                <td className="text-[10px] text-[#6F7C90]">{formatDate(person.createdAt)}</td>
                <td className="text-[10px] text-[#6F7C90]">{person.lastLoginAt ? formatDate(person.lastLoginAt, true) : "—"}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    {role === "STUDENT" && (
                      <button onClick={() => { setEnrollTarget(person); setCourseId(courses[0]?.id || ""); }} title="Grant course access" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:border-[#873BFF]/40 hover:text-[#C9B8FF]"><UserPlus size={11} /></button>
                    )}
                    <button onClick={() => { setResetTarget(person); setNewPassword(""); }} title="Reset password" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:border-amber-400/40 hover:text-amber-300"><KeyRound size={11} /></button>
                    <button
                      onClick={() => patchUser(person.id, { status: person.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }, person.status === "ACTIVE" ? "Account suspended." : "Account reactivated.")}
                      title={person.status === "ACTIVE" ? "Suspend" : "Activate"}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:border-rose-400/40 hover:text-rose-300"
                    >
                      {busy === person.id ? <Loader2 size={11} className="animate-spin" /> : <ShieldOff size={11} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={8} className="py-10 text-center text-[11px] text-[#6F7C90]">No records match.</td></tr>}
          </tbody>
        </table>
      </div>

      {role === "INSTRUCTOR" && canChangeRoles && (
        <p className="mt-3 text-[9.5px] text-[#5F6B7E]">Need an administrator? Promote a user from the Settings page (master administrator only).</p>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={createUser} className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-white">New {role === "STUDENT" ? "student" : "instructor"}</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-[#6F7C90] hover:text-white"><X size={15} /></button>
            </div>
            {error && <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-2 text-[10.5px] text-rose-200">{error}</p>}
            <div className="mt-4 grid gap-3">
              <div><label className="label">Full name</label><input required className="field h-10 text-[12px]" value={create.name} onChange={(e) => setCreate({ ...create, name: e.target.value })} /></div>
              <div><label className="label">Email</label><input required type="email" className="field h-10 text-[12px]" value={create.email} onChange={(e) => setCreate({ ...create, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Phone</label><input className="field h-10 text-[12px]" value={create.phone} onChange={(e) => setCreate({ ...create, phone: e.target.value })} /></div>
                <div><label className="label">Temp password</label><input required minLength={8} className="field h-10 text-[12px]" value={create.password} onChange={(e) => setCreate({ ...create, password: e.target.value })} /></div>
              </div>
              {role === "INSTRUCTOR" && <div><label className="label">Headline</label><input className="field h-10 text-[12px]" placeholder="Solar engineer · 10 years" value={create.headline} onChange={(e) => setCreate({ ...create, headline: e.target.value })} /></div>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button type="submit" disabled={busy === "create"} className="btn btn-primary btn-sm h-9">{busy === "create" ? <Loader2 size={12} className="animate-spin" /> : "Create account"}</button>
            </div>
          </form>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <h2 className="text-[13px] font-semibold text-white">Reset password</h2>
            <p className="mt-1 text-[10.5px] text-[#8492A6]">Set a temporary password for {resetTarget.name}. Their existing sessions will be signed out.</p>
            <input className="field mt-4 h-10 text-[12px]" placeholder="New temporary password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setResetTarget(null)} className="btn btn-ghost btn-sm h-9 flex-1">Cancel</button>
              <button
                onClick={async () => {
                  if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
                  await patchUser(resetTarget.id, { temporaryPassword: newPassword }, "Password reset.");
                  setResetTarget(null);
                }}
                disabled={busy === resetTarget.id}
                className="btn btn-primary btn-sm h-9 flex-1"
              >
                {busy === resetTarget.id ? <Loader2 size={12} className="animate-spin" /> : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {enrollTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <h2 className="text-[13px] font-semibold text-white">Grant course access</h2>
            <p className="mt-1 text-[10.5px] text-[#8492A6]">Manually enrol {enrollTarget.name}. No payment is recorded.</p>
            <select className="field mt-4 h-10 text-[12px]" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEnrollTarget(null)} className="btn btn-ghost btn-sm h-9 flex-1">Cancel</button>
              <button onClick={enroll} disabled={busy === "enroll"} className="btn btn-primary btn-sm h-9 flex-1">{busy === "enroll" ? <Loader2 size={12} className="animate-spin" /> : "Grant access"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
