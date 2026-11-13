"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BadgePercent,
  Bell,
  BookOpen,
  ClipboardList,
  ExternalLink,
  FileBarChart,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  Presentation,
  Search,
  Settings,
  ShieldAlert,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import type { SessionUser } from "@/lib/auth";

type NavItem = { href: string; label: string; icon: React.ElementType; roles?: string[]; exact?: boolean };
const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, roles: ["MASTER_ADMIN", "ADMIN", "INSTRUCTOR"] }],
  },
  {
    title: "Academy",
    items: [
      { href: "/admin/courses", label: "Courses", icon: BookOpen, roles: ["MASTER_ADMIN", "ADMIN", "INSTRUCTOR"] },
      { href: "/admin/categories", label: "Categories", icon: Layers, roles: ["MASTER_ADMIN", "ADMIN"] },
      { href: "/admin/modules", label: "Modules", icon: Presentation, roles: ["MASTER_ADMIN", "ADMIN", "INSTRUCTOR"] },
      { href: "/admin/lessons", label: "Lessons", icon: FileText, roles: ["MASTER_ADMIN", "ADMIN", "INSTRUCTOR"] },
      { href: "/admin/examinations", label: "Examinations", icon: ListChecks, roles: ["MASTER_ADMIN", "ADMIN", "INSTRUCTOR"] },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/students", label: "Students", icon: Users, roles: ["MASTER_ADMIN", "ADMIN"] },
      { href: "/admin/instructors", label: "Instructors", icon: GraduationCap, roles: ["MASTER_ADMIN", "ADMIN"] },
    ],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/transactions", label: "Transactions", icon: Wallet, roles: ["MASTER_ADMIN", "ADMIN"] },
      { href: "/admin/revenue", label: "Revenue", icon: Activity, roles: ["MASTER_ADMIN", "ADMIN"] },
      { href: "/admin/coupons", label: "Discount codes", icon: BadgePercent, roles: ["MASTER_ADMIN", "ADMIN"] },
      { href: "/admin/certificates", label: "Certificates", icon: Award, roles: ["MASTER_ADMIN", "ADMIN"] },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone, roles: ["MASTER_ADMIN", "ADMIN"] },
      { href: "/admin/website", label: "Website", icon: ClipboardList, roles: ["MASTER_ADMIN", "ADMIN"] },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart, roles: ["MASTER_ADMIN", "ADMIN"] },
      { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["MASTER_ADMIN", "ADMIN"] },
      { href: "/admin/audit-logs", label: "Audit logs", icon: ShieldAlert, roles: ["MASTER_ADMIN", "ADMIN"] },
    ],
  },
];

function Award(props: { size?: number }) {
  return <GraduationCap {...props} />;
}

export function AdminShell({
  user,
  children,
  unread = 0,
}: {
  user: SessionUser;
  children: React.ReactNode;
  unread?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => setOpen(false), [pathname]);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const active = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[#050509]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-white/[0.06] bg-[#07080F] lg:flex">
        <div className="flex h-[68px] items-center justify-between px-5">
          <Logo size={33} showTagline />
          <span className="rounded border border-[#873BFF]/30 bg-[#873BFF]/10 px-1.5 py-0.5 text-[7.5px] font-semibold tracking-[0.14em] text-[#C9B8FF]">CONSOLE</span>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-2 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#455063]">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className="admin-link" data-active={active(item)}>
                    <item.icon size={14} />
                    <span>{item.label}</span>
                    {item.label === "Certificates" && unread > 0 && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#20D9E8]" />}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 rounded-xl border border-[#873BFF]/20 bg-gradient-to-br from-[#873BFF]/10 to-transparent p-3">
            <p className="text-[9.5px] font-medium text-white">Brave Skill operations</p>
            <p className="mt-1 text-[8.5px] leading-relaxed text-[#7C8AA3]">All payments are verified server-side. Refunds are recorded in the audit log.</p>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[10px] font-semibold">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10.5px] font-medium text-white">{user.name}</p>
              <p className="truncate text-[8.5px] text-[#6F7C90]">{user.role.replace("_", " ").toLowerCase()}</p>
            </div>
            <button onClick={signOut} aria-label="Sign out" className="text-[#6F7C90] hover:text-white"><LogOut size={13} /></button>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[270px] overflow-y-auto border-r border-white/[0.08] bg-[#07080F] p-3">
            <div className="flex items-center justify-between px-1 pb-3">
              <Logo size={30} showTagline />
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-[#8492A6]"><X size={18} /></button>
            </div>
            {groups.map((group) => (
              <div key={group.title} className="mt-3">
                <p className="mb-1 px-2 text-[8.5px] uppercase tracking-[0.2em] text-[#455063]">{group.title}</p>
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className="admin-link" data-active={active(item)}>
                    <item.icon size={14} /><span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
            <button onClick={signOut} className="admin-link mt-4 w-full"><LogOut size={14} /><span>Sign out</span></button>
          </aside>
        </div>
      )}

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-white/[0.06] bg-[#050509]/90 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white lg:hidden"><Menu size={16} /></button>

          <div className="hidden items-center gap-1.5 font-mono text-[10px] text-[#4F5B6E] sm:flex">
            <span className="text-[#20D9E8]">bs</span>
            <span>/</span>
            <span className="text-[#A2AFC2]">{pathname.replace("/admin", "").replace(/^\//, "") || "dashboard"}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <form action="/admin/courses" className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 md:flex">
              <Search size={12} className="text-[#5F6B7E]" />
              <input name="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search admin…" aria-label="Search admin" className="w-[130px] bg-transparent text-[10.5px] text-white outline-none placeholder:text-[#3F4A5C]" />
            </form>
            <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[10px] text-[#9AA6BA] hover:text-white sm:flex">
              <ExternalLink size={11} /> View site
            </Link>
            <Link href="/admin/website#messages" className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-[#9AA6BA] hover:text-white">
              <Bell size={14} />
            </Link>
            <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[8.5px] font-medium text-emerald-300 sm:block">SYSTEM ONLINE</span>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
