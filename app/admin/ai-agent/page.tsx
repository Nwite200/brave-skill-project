import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { AgentConsole } from "@/components/admin/AgentConsole";

export const metadata: Metadata = { title: "AI assistant · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAgentPage() {
  await requireAdminPage();
  const since = new Date(Date.now() - 7 * 86400000);

  const [settings, documents, tickets, conversations, totals, intents, last7Days] = await Promise.all([
    getSettings(),
    db.agentKnowledge.findMany({ orderBy: { updatedAt: "desc" } }),
    db.supportTicket.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 150,
      include: { user: { select: { name: true } } },
    }),
    db.agentConversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 150,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { messages: true, tickets: true } },
      },
    }),
    Promise.all([
      db.agentConversation.count(),
      db.agentMessage.count(),
      db.agentConversation.count({ where: { escalated: true } }),
      db.supportTicket.count(),
      db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]),
    db.agentMessage.groupBy({
      by: ["intent"],
      where: { role: "ASSISTANT", intent: { not: null } },
      _count: true,
      orderBy: { _count: { intent: "desc" } },
      take: 8,
    }),
    db.agentConversation.count({ where: { createdAt: { gte: since } } }),
  ]);

  const [conversationCount, messageCount, escalations, ticketCount, openTickets] = totals;

  return (
    <AgentConsole
      settings={Object.fromEntries(Object.entries(settings).filter(([key]) => key.startsWith("ai.")))}
      documents={documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        content: doc.content,
        isPublished: doc.isPublished,
        updatedAt: doc.updatedAt.toISOString(),
      }))}
      tickets={tickets.map((ticket) => ({
        id: ticket.id,
        reference: ticket.reference,
        name: ticket.name,
        email: ticket.email,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        adminNote: ticket.adminNote,
        user: ticket.user ? { name: ticket.user.name } : null,
      }))}
      conversations={conversations.map((conversation) => ({
        id: conversation.id,
        userId: conversation.userId,
        channel: conversation.channel,
        title: conversation.title,
        messageCount: conversation.messageCount,
        escalated: conversation.escalated,
        resolved: conversation.resolved,
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        user: conversation.user,
        _count: conversation._count,
      }))}
      analytics={{
        totals: {
          conversations: conversationCount,
          messages: messageCount,
          escalations,
          tickets: ticketCount,
          openTickets,
          last7Days,
        },
        intents: intents.map((row) => ({ intent: row.intent, count: row._count })),
        containmentRate: conversationCount ? Math.round(((conversationCount - escalations) / conversationCount) * 100) : 100,
      }}
    />
  );
}
