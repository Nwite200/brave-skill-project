"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Search, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/about", label: "About" },
  { href: "/testimonials", label: "Success Stories" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({
  user,
  announcement,
}: {
  user: SessionUser | null;
  announcement?: { text: string; link?: string } | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <>
      {announcement?.text ? (
        <div className="relative z-50 border-b border-white/[0.06] bg-[#0A0B13]">
          <div className="container-bs flex items-center justify-center gap-2 py-2 text-center text-[11.5px] text-[#B7A8E8]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#20D9E8] shadow-[0_0_10px_#20D9E8]" />
            {announcement.link ? (
              <Link href={announcement.link} className="hover:text-white">
                {announcement.text}
              </Link>
            ) : (
              <span>{announcement.text}</span>
            )}
          </div>
        </div>
      ) : null}

      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/[0.07] bg-[#050509]/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="container-bs flex h-[72px] items-center justify-between gap-6">
          <Logo size={38} showTagline />

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition ${
                    active ? "text-white" : "text-[#9AA6BA] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/courses"
              aria-label="Search courses"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#9AA6BA] transition hover:bg-white/5 hover:text-white"
            >
              <Search size={17} />
            </Link>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenu((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-[12.5px] font-medium text-white transition hover:border-white/20"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[11px] font-bold">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-[100px] truncate">{user.name.split(" ")[0]}</span>
                  <ChevronDown size={13} className="text-[#8492A6]" />
                </button>
                {menu && (
                  <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0C0E19] p-2 shadow-2xl">
                    <div className="px-3 py-2">
                      <p className="truncate text-[13px] font-medium text-white">{user.name}</p>
                      <p className="truncate text-[11px] text-[#8492A6]">{user.email}</p>
                    </div>
                    <div className="my-1 h-px bg-white/[0.07]" />
                    <Link href={user.role === "STUDENT" ? "/dashboard" : "/admin"} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-[#C2CCDD] hover:bg-white/5">
                      <LayoutDashboard size={15} /> {user.role === "STUDENT" ? "My dashboard" : "Admin console"}
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-[#C2CCDD] hover:bg-white/5">
                      <User size={15} /> Account settings
                    </Link>
                    <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] text-[#C2CCDD] hover:bg-white/5">
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="px-3 text-[13px] font-medium text-[#C2CCDD] transition hover:text-white">
                  Log in
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm h-10 px-5">
                  Start learning
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-white/[0.07] bg-[#07080F] px-5 py-4 md:hidden">
            <nav className="flex flex-col">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="border-b border-white/[0.05] py-3 text-[14px] text-[#C2CCDD]">
                  {item.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link href="/dashboard" className="py-3 text-[14px] text-white">My dashboard</Link>
                  <button onClick={signOut} className="py-3 text-left text-[14px] text-[#FF8FA3]">Sign out</button>
                </>
              ) : (
                <div className="mt-4 flex flex-col gap-2.5">
                  <Link href="/login" className="btn btn-ghost w-full">Log in</Link>
                  <Link href="/register" className="btn btn-primary w-full">Start learning</Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
