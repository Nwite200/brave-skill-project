import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NotificationsList } from "@/components/student/NotificationsList";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <NotificationsList
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        link: n.link,
        readAt: n.readAt?.toISOString() || null,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
