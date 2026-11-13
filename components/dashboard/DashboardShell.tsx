"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  ChevronRight,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/courses", label: "My courses", icon: BookOpen },
  { href: "/dashboard/assessments", label: "Quizzes & exams", icon: Sparkles },
  { href: "/dashboard/certificates", label: "Certificates", icon: GraduationCap },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  user,
  unread,
  children,
}: {
  user: SessionUser;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  const isLearning = /^\/dashboard\/courses\/[^/]+$/.test(pathname);

  return (
    <div className="min-h-screen bg-[#050509]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-white/[0.06] bg-[#07080F] lg:flex">
        <div className="flex h-[72px] items-center px-5">
          <Logo size={34} showTagline />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#4F5B6E]">Learning</p>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="admin-link" data-active={active(item.href, item.exact)}>
              <item.icon size={15} />
              <span>{item.label}</span>
              {item.href === "/dashboard/notifications" && unread > 0 && (
                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[#873BFF] px-1 text-[9px] font-semibold text-white">{unread}</span>
              )}
            </Link>
          ))}

          <div className="my-4 h-px bg-white/[0.06]" />
          <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#4F5B6E]">Discover</p>
          <Link href="/courses" className="admin-link"><Search size={15} /><span>Browse catalogue</span></Link>
          <Link href="/download" className="admin-link"><Sparkles size={15} /><span>Android app</span></Link>
          <Link href="/contact" className="admin-link"><Settings size={15} /><span>Help & support</span></Link>
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <Link href="/dashboard/courses" className="mb-3 block rounded-xl border border-[#873BFF]/25 bg-gradient-to-br from-[#873BFF]/15 to-transparent p-3">
            <p className="text-[10.5px] font-medium text-white">Keep the streak alive</p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-[#8B98AD]">A short lesson today beats a long one someday.</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[9px] text-[#C9B8FF]">Continue learning <ChevronRight size={10} /></span>
          </Link>
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[11px] font-semibold">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-white">{user.name}</p>
              <p className="truncate text-[9px] text-[#6F7C90]">Student</p>
            </div>
            <button onClick={signOut} aria-label="Sign out" className="text-[#6F7C90] transition hover:text-white"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-white/[0.08] bg-[#07080F] p-4">
            <div className="flex items-center justify-between">
              <Logo size={32} showTagline />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-[#8492A6]"><X size={18} /></button>
            </div>
            <nav className="mt-6 space-y-0.5">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="admin-link" data-active={active(item.href, item.exact)}>
                  <item.icon size={15} /><span>{item.label}</span>
                </Link>
              ))}
              <div className="my-3 h-px bg-white/[0.06]" />
              <Link href="/courses" className="admin-link"><Search size={15} /><span>Browse catalogue</span></Link>
              <button onClick={signOut} className="admin-link w-full"><LogOut size={15} /><span>Sign out</span></button>
            </nav>
          </aside>
        </div>
      )}

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-30 flex h-[62px] items-center gap-3 border-b border-white/[0.06] bg-[#050509]/85 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white lg:hidden">
            <Menu size={17} />
          </button>

          <div className="hidden items-center gap-1.5 text-[11px] text-[#5F6B7E] sm:flex">
            <span>Student</span>
            <ChevronRight size={11} />
            <span className="text-[#A2AFC2]">
              {NAV.find((n) => active(n.href, n.exact))?.label || "Learning"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <form action="/courses" className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 md:flex">
              <Search size={13} className="text-[#5F6B7E]" />
              <input
                name="q"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses"
                aria-label="Search courses"
                className="w-[150px] bg-transparent text-[11px] text-white outline-none placeholder:text-[#4F5B6E]"
              />
            </form>
            <Link href="/dashboard/notifications" aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] text-[#9AA6BA] transition hover:text-white">
              <Bell size={15} />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#20D9E8] shadow-[0_0_6px_#20D9E8]" />}
            </Link>
            <Link href="/dashboard/settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[10px] font-semibold">
              {user.name.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>

        <div className={isLearning ? "" : "px-4 py-6 sm:px-6 lg:px-8 lg:py-8"}>{children}</div>
      </div>
    </div>
  );
}
