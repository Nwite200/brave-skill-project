import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShieldCheck, Smartphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, maskEmail } from "@/lib/format";
import { ProfileForm, PasswordForm } from "@/components/student/SettingsForms";
import { ReferralCard } from "@/components/student/ReferralCard";

export const metadata: Metadata = { title: "Account settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, phone: true, headline: true, bio: true, createdAt: true, lastLoginAt: true, emailVerified: true },
  });

  return (
    <div className="mx-auto max-w-[900px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-white">Account settings</h1>
        <p className="mt-1 text-[12px] text-[#8492A6]">Manage your profile, password and app access.</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Member since</p>
          <p className="mt-1 text-[12.5px] text-white">{formatDate(profile?.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Last sign in</p>
          <p className="mt-1 text-[12.5px] text-white">{profile?.lastLoginAt ? formatDate(profile.lastLoginAt, true) : "—"}</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Email status</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-white">
            {profile?.emailVerified ? <><ShieldCheck size={12} className="text-emerald-400" /> Verified</> : <><ShieldCheck size={12} className="text-amber-400" /> {maskEmail(profile?.email || "")}</>}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <ProfileForm
          initial={{
            name: profile?.name || user.name,
            email: profile?.email || user.email,
            phone: profile?.phone || null,
            headline: profile?.headline || null,
            bio: profile?.bio || null,
          }}
        />
        <PasswordForm />
        <ReferralCard />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#0B0E18] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#873BFF]/12 text-[#C9B8FF]"><Smartphone size={15} /></span>
            <div>
              <p className="text-[12.5px] font-medium text-white">Brave Skill for Android</p>
              <p className="text-[10.5px] text-[#6F7C90]">Same account, same progress — on your phone.</p>
            </div>
          </div>
          <Link href="/download" className="btn btn-ghost btn-sm h-9"><Download size={12} /> Download app</Link>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5">
          <p className="text-[11.5px] font-medium text-white">Data & privacy</p>
          <p className="mt-1 max-w-[560px] text-[10.5px] leading-relaxed text-[#7C8AA3]">
            You can request an export or deletion of your account data by contacting support. Payment records and issued
            certificates may be retained where required for legal and verification purposes.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[10.5px]">
            <Link href="/contact" className="text-[#C9B8FF] hover:text-white">Request data export →</Link>
            <Link href="/privacy" className="text-[#8492A6] hover:text-white">Privacy policy</Link>
            <Link href="/terms" className="text-[#8492A6] hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
