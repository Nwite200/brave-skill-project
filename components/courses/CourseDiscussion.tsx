"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Plus } from "lucide-react";

type Thread = { id: string; title: string; body: string; userName: string; count: number; createdAt: string };
type Post = { id: string; body: string; userName: string; createdAt: string };

export function CourseDiscussion({ courseId, enrolled, threads: initial }: { courseId: string; enrolled: boolean; threads: Thread[] }) {
  const [threads, setThreads] = useState(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reply, setReply] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(false);

  if (!enrolled) return null;

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/courses/${courseId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not post the discussion.");
      setThreads((prev) => [{ id: data.thread.id, title: data.thread.title, body: data.thread.body, userName: data.thread.user.name, count: 0, createdAt: data.thread.createdAt }, ...prev]);
      setTitle("");
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post the discussion.");
    } finally {
      setBusy(false);
    }
  };

  const openThread = async (thread: Thread) => {
    setActive(thread);
    setLoadingPosts(true);
    setError("");
    try {
      const response = await fetch(`/api/discussion/${thread.id}/posts`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the thread.");
      setPosts(data.posts.map((post: any) => ({ id: post.id, body: post.body, userName: post.user.name, createdAt: post.createdAt })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the thread.");
    } finally {
      setLoadingPosts(false);
    }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!active) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/discussion/${active.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reply.");
      setPosts((prev) => [...prev, { id: data.post.id, body: data.post.body, userName: data.post.user.name, createdAt: data.post.createdAt }]);
      setReply("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reply.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-12 border-t border-white/[0.06] pt-10">
      <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-white">Course discussion</h2>
      <p className="mt-1 text-[11.5px] text-[#8492A6]">Ask questions and share practical notes with other enrolled students.</p>

      <form onSubmit={create} className="mt-4 rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-4">
        {error && <p className="mb-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[10.5px] text-rose-200">{error}</p>}
        <input className="field h-10 text-[12px]" placeholder="Discussion title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="field mt-2 text-[11.5px]" rows={2} placeholder="What would you like to discuss?" required value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm mt-3 h-8">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <><Plus size={11} /> Start discussion</>}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {threads.map((thread) => (
          <button key={thread.id} onClick={() => openThread(thread)} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left hover:border-white/20">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#873BFF]/12 text-[#C9B8FF]"><MessageSquare size={14} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] text-white">{thread.title}</span>
              <span className="block text-[9px] text-[#6F7C90]">{thread.userName} · {thread.count} replies</span>
            </span>
          </button>
        ))}
        {!threads.length && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-[10.5px] text-[#6F7C90]">No discussions yet. Start the first one.</p>}
      </div>

      {active && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setActive(null)}>
          <div className="max-h-[80vh] w-full max-w-[620px] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0B0E18] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-white">{active.title}</p>
                <p className="text-[9px] text-[#6F7C90]">{active.userName}</p>
              </div>
              <button onClick={() => setActive(null)} className="text-[#8492A6] hover:text-white">✕</button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[11.5px] leading-relaxed text-[#B9C3D4]">{active.body}</p>
            <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-3">
              {loadingPosts && <Loader2 size={14} className="animate-spin text-[#8492A6]" />}
              {posts.map((post) => (
                <div key={post.id} className="rounded-lg bg-white/[0.03] p-2.5">
                  <p className="text-[9px] text-[#6F7C90]">{post.userName}</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#D6DFEC]">{post.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendReply} className="mt-3 flex gap-2">
              <input className="field h-9 flex-1 text-[11px]" placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} required />
              <button type="submit" disabled={busy} className="btn btn-primary btn-sm h-9">Reply</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
