import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SupportCenter } from "@/components/student/SupportCenter";

export const metadata: Metadata = { title: "Support" };
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await requireUser();
  const tickets = await db.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <SupportCenter
      tickets={tickets.map((ticket) => ({
        id: ticket.id,
        reference: ticket.reference,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
      }))}
    />
  );
}
