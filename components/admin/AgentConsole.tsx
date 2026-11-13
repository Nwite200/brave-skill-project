"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import {
  Bot,
  CheckCircle2,
  CircleDot,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Settings2,
  Ticket,
  Trash2,
  X,
} from "lucide-react";

type Settings = Record<string, string>;

type KnowledgeDoc = {
  id: string;
  title: string;
  category: string;
  content: string;
  isPublished: boolean;
  updatedAt: string;
};

type TicketRow = {
  id: string;
  reference: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  adminNote: string | null;
  user: { name: string } | null;
};

type ConversationRow = {
  id: string;
  userId: string | null;
  channel: string;
  title: string | null;
  messageCount: number;
  escalated: boolean;
  resolved: boolean;
  lastMessageAt: string;
  user: { name: string; email: string } | null;
  _count: { messages: number; tickets: number };
};

type MessageRow = { id: string; role: string; content: string; intent: string | null; createdAt: string };

export function AgentConsole({
  settings: initialSettings,
  documents: initialDocuments,
  tickets: initialTickets,
  conversations,
  analytics,
}: {
  settings: Settings;
  documents: KnowledgeDoc[];
  tickets: TicketRow[];
  conversations: ConversationRow[];
  analytics: {
    totals: { conversations: number; messages: number; escalations: number; tickets: number; openTickets: number; last7Days: number };
    intents: { intent: string | null; count: number }[];
    containmentRate: number;
  };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "settings" | "knowledge" | "conversations" | "tickets">("overview");
  const [settings, setSettings] = useState(initialSettings);
  const [documents, setDocuments] = useState(initialDocuments);
  const [tickets, setTickets] = useState(initialTickets);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [docModal, setDocModal] = useState<{ open: boolean; doc?: KnowledgeDoc; title: string; category: string; content: string; isPublished: boolean }>({
    open: false,
    title: "",
    category: "General",
    content: "",
    isPublished: true,
  });
  const [activeConversation, setActiveConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [noteTarget, setNoteTarget] = useState<TicketRow | null>(null);
  const [note, setNote] = useState("");

  const enabled = settings["ai.enabled"] === "true";
  const set = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));
  const flash = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const saveSettings = async () => {
    setBusy("settings");
    setError("");
    try {
      const response = await fetch("/api/admin/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save settings.");
      setSettings(data.settings);
      flash("Assistant settings saved.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setBusy(null);
    }
  };

  const toggleEnabled = async () => {
    const next = enabled ? "false" : "true";
    setSettings((prev) => ({ ...prev, "ai.enabled": next }));
    setBusy("toggle");
    try {
      await fetch("/api/admin/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "ai.enabled": next }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const saveDocument = async () => {
    setBusy("doc");
    setError("");
    try {
      const payload = {
        title: docModal.title,
        category: docModal.category,
        content: docModal.content,
        isPublished: docModal.isPublished,
      };
      const response = await fetch(`/api/admin/agent/knowledge${docModal.doc ? `/${docModal.doc.id}` : ""}`, {
        method: docModal.doc ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the document.");
      setDocuments((prev) =>
        docModal.doc ? prev.map((doc) => (doc.id === docModal.doc!.id ? data.document : doc)) : [data.document, ...prev],
      );
      setDocModal({ open: false, title: "", category: "General", content: "", isPublished: true });
      flash("Knowledge document saved. The assistant can use it immediately.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the document.");
    } finally {
      setBusy(null);
    }
  };

  const deleteDocument = async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/admin/agent/knowledge/${id}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const openConversation = async (conversation: ConversationRow) => {
    setActiveConversation(conversation);
    setLoadingConversation(true);
    try {
      const response = await fetch(`/api/admin/agent/conversations/${conversation.id}`);
      const data = await response.json();
      setMessages(data.conversation?.messages || []);
    } finally {
      setLoadingConversation(false);
    }
  };

  const updateTicket = async (ticket: TicketRow, body: Record<string, unknown>) => {
    setBusy(ticket.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/agent/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the ticket.");
      setTickets((prev) => prev.map((item) => (item.id === ticket.id ? { ...item, ...data.ticket } : item)));
      flash("Ticket updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the ticket.");
    } finally {
      setBusy(null);
    }
  };

  const intents = useMemo(() => analytics.intents.filter((i) => i.intent), [analytics.intents]);
  const maxIntent = Math.max(...intents.map((i) => i.count), 1);

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Platform / AI assistant</p>
          <h1 className="mt-1.5 flex items-center gap-2 text-[22px] font-semibold tracking-[-0.03em] text-white">
            <Bot size={20} className="text-[#C9B8FF]" /> Brave AI Assistant
          </h1>
          <p className="mt-1 text-[11.5px] text-[#8492A6]">
            Voice and text agent grounded in live courses, payments, progress and approved knowledge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-medium ${enabled ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" : "border-amber-400/25 bg-amber-500/10 text-amber-300"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-amber-400"}`} />
            {enabled ? "LIVE ON WEBSITE" : "DISABLED"}
          </span>
          <button onClick={toggleEnabled} disabled={busy === "toggle"} className="btn btn-ghost btn-sm h-8">
            {busy === "toggle" ? <Loader2 size={12} className="animate-spin" /> : enabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`mt-4 rounded-lg border px-3 py-2 text-[11px] ${error ? "border-rose-400/20 bg-rose-500/10 text-rose-200" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"}`}>
          {error || success}
        </div>
      )}

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-white/[0.07]">
        {(["overview", "settings", "knowledge", "conversations", "tickets"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative whitespace-nowrap px-3 py-2 text-[11px] capitalize transition ${tab === key ? "text-white" : "text-[#6F7C90] hover:text-[#C2CCDD]"}`}
          >
            {key}
            {tab === key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#873BFF]" />}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Conversations", value: analytics.totals.conversations, icon: MessageSquare },
              { label: "Messages", value: analytics.totals.messages, icon: MessageSquare },
              { label: "Escalations", value: analytics.totals.escalations, icon: Ticket },
              { label: "Open tickets", value: analytics.totals.openTickets, icon: Ticket },
              { label: "Containment", value: `${analytics.containmentRate}%`, icon: CheckCircle2 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[8.5px] uppercase tracking-[0.16em] text-[#6F7C90]">{stat.label}</p>
                  <stat.icon size={12} className="text-[#873BFF]" />
                </div>
                <p className="num mt-2 text-[21px] font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Conversation intents</p>
              <div className="mt-4 space-y-3">
                {intents.map((intent) => (
                  <div key={intent.intent}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="capitalize text-[#C2CCDD]">{(intent.intent || "other").replace(/_/g, " ")}</span>
                      <span className="num text-[#8492A6]">{intent.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" style={{ width: `${(intent.count / maxIntent) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {!intents.length && <p className="text-[10px] text-[#5F6B7E]">No conversations yet. The widget is ready on the website.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Recent conversations</p>
              <div className="mt-3 space-y-2">
                {conversations.slice(0, 6).map((conversation) => (
                  <button key={conversation.id} onClick={() => { setTab("conversations"); openConversation(conversation); }} className="flex w-full items-center gap-2 rounded-lg border border-white/[0.05] px-2.5 py-2 text-left hover:border-white/15">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#873BFF]/15 text-[9px] text-[#C9B8FF]">
                      {(conversation.user?.name || "A").slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10.5px] text-white">{conversation.title || "Conversation"}</span>
                      <span className="block text-[8.5px] text-[#5F6B7E]">{conversation.user?.email || "Anonymous"} · {conversation.messageCount} messages</span>
                    </span>
                    <span className="text-[8px] text-[#455063]">{formatDate(conversation.lastMessageAt)}</span>
                  </button>
                ))}
                {!conversations.length && <p className="text-[10px] text-[#5F6B7E]">No conversations recorded.</p>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#873BFF]/20 bg-[#873BFF]/[0.05] p-4 text-[10px] leading-relaxed text-[#A9B4C6]">
            The assistant answers from the live database through tools. Course prices, payments and private progress are never invented. Voice uses the browser speech engine by default, with server speech when an OpenAI key is configured.
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
            <div className="flex items-center gap-2">
              <Settings2 size={14} className="text-[#C9B8FF]" />
              <h2 className="text-[12.5px] font-semibold text-white">Assistant behaviour</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Assistant name</label>
                <input className="field h-10 text-[12px]" value={settings["ai.name"] || ""} onChange={(e) => set("ai.name", e.target.value)} />
              </div>
              <div>
                <label className="label">Escalation email</label>
                <input className="field h-10 text-[12px]" value={settings["ai.escalationEmail"] || ""} onChange={(e) => set("ai.escalationEmail", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Greeting</label>
                <textarea rows={3} className="field text-[12px]" value={settings["ai.greeting"] || ""} onChange={(e) => set("ai.greeting", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Additional instructions</label>
                <textarea rows={4} className="field text-[12px]" value={settings["ai.instructions"] || ""} onChange={(e) => set("ai.instructions", e.target.value)} />
                <p className="mt-1 text-[9px] text-[#5F6B7E]">These are appended to the protected system prompt. Accuracy and privacy rules cannot be overridden.</p>
              </div>
              <div>
                <label className="label">Tone</label>
                <select className="field h-10 text-[12px]" value={settings["ai.tone"]} onChange={(e) => set("ai.tone", e.target.value)}>
                  <option value="warm-professional">Warm & professional</option>
                  <option value="concise">Concise</option>
                  <option value="friendly">Friendly & conversational</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
              <div>
                <label className="label">Voice</label>
                <select className="field h-10 text-[12px]" value={settings["ai.voice"]} onChange={(e) => set("ai.voice", e.target.value)}>
                  <option value="auto">Auto (device voice)</option>
                  <option value="en-NG">Nigerian English</option>
                  <option value="en-GB">British English</option>
                  <option value="browser">Device default</option>
                </select>
              </div>
              <div>
                <label className="label">Speech rate</label>
                <input className="field h-10 text-[12px]" value={settings["ai.voiceRate"] || "0.98"} onChange={(e) => set("ai.voiceRate", e.target.value)} />
              </div>
              <div>
                <label className="label">Pitch</label>
                <input className="field h-10 text-[12px]" value={settings["ai.voicePitch"] || "1"} onChange={(e) => set("ai.voicePitch", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-[11.5px] text-[#C2CCDD]">
                <input type="checkbox" checked={enabled} onChange={(e) => set("ai.enabled", e.target.checked ? "true" : "false")} className="h-4 w-4 accent-[#873BFF]" />
                Enable the assistant on the website
              </label>
              <label className="flex items-center gap-2 text-[11.5px] text-[#C2CCDD]">
                <input type="checkbox" checked={settings["ai.allowAnonymous"] === "true"} onChange={(e) => set("ai.allowAnonymous", e.target.checked ? "true" : "false")} className="h-4 w-4 accent-[#873BFF]" />
                Allow anonymous visitors to ask general questions
              </label>
            </div>
            <button onClick={saveSettings} disabled={busy === "settings"} className="btn btn-primary btn-sm mt-5 h-9">
              {busy === "settings" ? <Loader2 size={12} className="animate-spin" /> : <><Save size={12} /> Save settings</>}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Speech</p>
              <p className="mt-1.5 text-[11.5px] text-white">Free device voice and on-device recognition</p>
              <p className="mt-1 text-[9.5px] leading-relaxed text-[#5F6B7E]">No speech API is required or billed. Android uses the system speech engine; browsers use Web Speech. Cloudflare Workers AI powers free reasoning on the deployed Worker, with the grounded engine as fallback.</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Privacy</p>
              <p className="mt-1.5 text-[11.5px] text-white">Private data is scoped to the signed-in student</p>
              <p className="mt-1 text-[9.5px] leading-relaxed text-[#5F6B7E]">Payment, enrolment and progress tools require authentication. Voice transcripts are only stored as conversation text. Passwords, PINs and OTPs are never requested.</p>
            </div>
          </div>
        </div>
      )}

      {tab === "knowledge" && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-[#8492A6]">{documents.length} documents · courses, FAQs and announcements are indexed automatically.</p>
            <button onClick={() => setDocModal({ open: true, title: "", category: "General", content: "", isPublished: true })} className="btn btn-primary btn-sm h-8">
              <Plus size={12} /> New document
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#873BFF]/12 text-[#C9B8FF]"><CircleDot size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11.5px] font-medium text-white">{doc.title}</p>
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] uppercase text-[#8492A6]">{doc.category}</span>
                    {!doc.isPublished && <span className="text-[8px] text-amber-300">Draft</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#7C8AA3]">{doc.content}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setDocModal({ open: true, doc, title: doc.title, category: doc.category, content: doc.content, isPublished: doc.isPublished })} className="h-7 rounded-md border border-white/10 px-2 text-[9px] text-[#C2CCDD] hover:text-white">Edit</button>
                  <button onClick={() => deleteDocument(doc.id)} disabled={busy === doc.id} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:text-rose-300">
                    {busy === doc.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  </button>
                </div>
              </div>
            ))}
            {!documents.length && <p className="rounded-xl border border-dashed border-white/10 py-10 text-center text-[11px] text-[#6F7C90]">No custom documents. Add enrolment, payment or policy guidance for the assistant.</p>}
          </div>
        </div>
      )}

      {tab === "conversations" && (
        <div className="mt-5 table-wrap">
          <table className="data">
            <thead><tr><th>Student</th><th>Channel</th><th>Messages</th><th>Escalated</th><th>Last activity</th><th className="text-right">Open</th></tr></thead>
            <tbody>
              {conversations.map((conversation) => (
                <tr key={conversation.id}>
                  <td>
                    <p className="text-[11px] text-white">{conversation.user?.name || "Anonymous visitor"}</p>
                    <p className="text-[9px] text-[#5F6B7E]">{conversation.user?.email || "Not signed in"}</p>
                  </td>
                  <td><span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] uppercase text-[#8492A6]">{conversation.channel}</span></td>
                  <td className="num">{conversation.messageCount}</td>
                  <td>{conversation.escalated ? <span className="text-[9px] text-amber-300">Yes</span> : <span className="text-[9px] text-[#5F6B7E]">No</span>}</td>
                  <td className="text-[10px] text-[#6F7C90]">{formatDate(conversation.lastMessageAt, true)}</td>
                  <td className="text-right"><button onClick={() => openConversation(conversation)} className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-[#C2CCDD] hover:text-white">View</button></td>
                </tr>
              ))}
              {!conversations.length && <tr><td colSpan={6} className="py-10 text-center text-[11px] text-[#6F7C90]">No conversations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "tickets" && (
        <div className="mt-5 table-wrap">
          <table className="data">
            <thead><tr><th>Reference</th><th>Student</th><th>Subject</th><th>Priority</th><th>Status</th><th>Created</th><th className="text-right">Note</th></tr></thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="font-mono text-[9.5px] text-[#C9B8FF]">{ticket.reference}</td>
                  <td><p className="text-[10.5px] text-white">{ticket.name}</p><p className="text-[8.5px] text-[#5F6B7E]">{ticket.email}</p></td>
                  <td className="max-w-[220px] truncate text-[10.5px]" title={ticket.message}>{ticket.subject}</td>
                  <td>
                    <select className="field h-7 w-[92px] text-[9px]" value={ticket.priority} onChange={(e) => updateTicket(ticket, { priority: e.target.value })}>
                      {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="field h-7 w-[110px] text-[9px]" value={ticket.status} onChange={(e) => updateTicket(ticket, { status: e.target.value })}>
                      {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                  </td>
                  <td className="text-[9px] text-[#6F7C90]">{formatDate(ticket.createdAt)}</td>
                  <td className="text-right"><button onClick={() => { setNoteTarget(ticket); setNote(ticket.adminNote || ""); }} className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-[#C2CCDD] hover:text-white">Note</button></td>
                </tr>
              ))}
              {!tickets.length && <tr><td colSpan={7} className="py-10 text-center text-[11px] text-[#6F7C90]">No escalations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {docModal.open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-[640px] rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-white">{docModal.doc ? "Edit knowledge document" : "New knowledge document"}</h2>
              <button onClick={() => setDocModal({ open: false, title: "", category: "General", content: "", isPublished: true })} className="text-[#6F7C90] hover:text-white"><X size={15} /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Title</label><input className="field h-10 text-[12px]" value={docModal.title} onChange={(e) => setDocModal({ ...docModal, title: e.target.value })} /></div>
                <div><label className="label">Category</label><input className="field h-10 text-[12px]" value={docModal.category} onChange={(e) => setDocModal({ ...docModal, category: e.target.value })} /></div>
              </div>
              <div>
                <label className="label">Content</label>
                <textarea rows={10} className="field text-[11.5px]" placeholder="Write the approved answer. Plain text works best." value={docModal.content} onChange={(e) => setDocModal({ ...docModal, content: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-[11px] text-[#C2CCDD]">
                <input type="checkbox" checked={docModal.isPublished} onChange={(e) => setDocModal({ ...docModal, isPublished: e.target.checked })} className="h-4 w-4 accent-[#873BFF]" /> Published
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDocModal({ open: false, title: "", category: "General", content: "", isPublished: true })} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button onClick={saveDocument} disabled={busy === "doc" || docModal.title.length < 3 || docModal.content.length < 20} className="btn btn-primary btn-sm h-9">
                {busy === "doc" ? <Loader2 size={12} className="animate-spin" /> : "Save document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeConversation && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setActiveConversation(null)}>
          <div className="h-full w-full max-w-[520px] overflow-y-auto border-l border-white/[0.08] bg-[#080A12] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Conversation transcript</p>
                <h3 className="mt-1 text-[15px] font-semibold text-white">{activeConversation.title || "Conversation"}</h3>
                <p className="text-[10px] text-[#7C8AA3]">{activeConversation.user?.email || "Anonymous"} · {activeConversation.channel}</p>
              </div>
              <button onClick={() => setActiveConversation(null)} className="text-[#6F7C90] hover:text-white"><X size={18} /></button>
            </div>
            <div className="mt-5 space-y-3">
              {loadingConversation && <LoadingInline />}
              {messages.map((message) => (
                <div key={message.id} className={`rounded-xl border p-3 ${message.role === "USER" ? "border-white/[0.08] bg-white/[0.03]" : "border-[#873BFF]/20 bg-[#873BFF]/[0.06]"}`}>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-[#6F7C90]">{message.role}{message.intent ? ` · ${message.intent}` : ""}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-[#D6DFEC]">{message.content}</p>
                </div>
              ))}
              {!messages.length && !loadingConversation && <p className="text-[10px] text-[#5F6B7E]">No transcript available.</p>}
            </div>
            <div className="mt-5 flex gap-2 border-t border-white/[0.07] pt-4">
              <button
                onClick={async () => {
                  await fetch(`/api/admin/agent/conversations/${activeConversation.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ resolved: !activeConversation.resolved }),
                  });
                  setActiveConversation({ ...activeConversation, resolved: !activeConversation.resolved });
                  router.refresh();
                }}
                className="btn btn-ghost btn-sm h-9"
              >
                {activeConversation.resolved ? "Reopen" : "Mark resolved"}
              </button>
            </div>
          </div>
        </div>
      )}

      {noteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <h3 className="text-[13px] font-semibold text-white">Internal note · {noteTarget.reference}</h3>
            <textarea rows={5} className="field mt-3 text-[11.5px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to administrators only." />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setNoteTarget(null)} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button
                onClick={async () => {
                  await updateTicket(noteTarget, { adminNote: note });
                  setNoteTarget(null);
                }}
                className="btn btn-primary btn-sm h-9"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingInline() {
  return <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-[#8492A6]" /></div>;
}
