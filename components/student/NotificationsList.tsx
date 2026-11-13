"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CheckCheck, CreditCard, GraduationCap, Megaphone, Sparkles } from "lucide-react";
import { timeAgo } from "@/lib/format";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const ICONS: Record<string, React.ElementType> = {
  PAYMENT: CreditCard,
  COURSE: Sparkles,
  CERTIFICATE: GraduationCap,
  ANNOUNCEMENT: Megaphone,
  SYSTEM: Bell,
};

export function NotificationsList({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [marking, setMarking] = useState(false);

  const markOne = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await fetch("/api/me/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
  };

  const markAll = async () => {
    setMarking(true);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    await fetch("/api/me/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    setMarking(false);
    router.refresh();
  };

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-white">Notifications</h1>
          <p className="mt-1 text-[12px] text-[#8492A6]">{unread ? `${unread} unread` : "You are all caught up."}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} disabled={marking} className="btn btn-ghost btn-sm h-9"><CheckCheck size={12} /> Mark all as read</button>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {items.map((notification) => {
          const Icon = ICONS[notification.type] || Bell;
          return (
            <div key={notification.id} className={`rounded-xl border p-4 transition ${notification.readAt ? "border-white/[0.06] bg-white/[0.015]" : "border-[#873BFF]/20 bg-[#873BFF]/[0.05]"}`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${notification.readAt ? "bg-white/[0.04] text-[#6F7C90]" : "bg-[#873BFF]/15 text-[#C9B8FF]"}`}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12.5px] font-medium text-white">{notification.title}</p>
                    {!notification.readAt && <span className="h-1.5 w-1.5 rounded-full bg-[#20D9E8]" />}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#8B98AD]">{notification.body}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[9.5px] text-[#5F6B7E]">{timeAgo(notification.createdAt)}</span>
                    {notification.link && (
                      <Link href={notification.link} className="text-[10px] text-[#C9B8FF] hover:text-white">Open →</Link>
                    )}
                    {!notification.readAt && (
                      <button onClick={() => markOne(notification.id)} className="text-[10px] text-[#6F7C90] hover:text-white">Mark read</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!items.length && (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <Bell size={20} className="mx-auto text-[#4F5B6E]" />
            <p className="mt-3 text-[13px] text-[#8492A6]">No notifications yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
