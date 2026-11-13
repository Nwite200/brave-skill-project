"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type Config = {
  enabled: boolean;
  name: string;
  greeting: string;
  tone: string;
  voice: { name: string; rate: number; pitch: number; lang: string };
  allowAnonymous: boolean;
  user: { name: string; email: string } | null;
  serverVoice: boolean;
  provider: string;
  suggestions: string[];
  widgetPosition?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ticket?: string;
  tools?: string[];
};

const SR: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function VoiceAgent({ offsetClass = "bottom-5" }: { offsetClass?: string }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [micSupported, setMicSupported] = useState(Boolean(SR));
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const greetingAdded = useRef(false);

  useEffect(() => {
    let active = true;
    fetch("/api/agent/bootstrap")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setConfig(data);
        setSuggestions(data.suggestions || []);
        const saved = sessionStorage.getItem("bs_agent_conversation");
        if (saved) setConversationId(saved);
      })
      .catch(() => setConfig(null));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const stored = sessionStorage.getItem("bs_agent_messages");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          greetingAdded.current = true;
          return;
        }
      } catch {
        /* ignore */
      }
    }
    if (config?.greeting && !greetingAdded.current) {
      setMessages([{ id: "greeting", role: "assistant", content: config.greeting }]);
      greetingAdded.current = true;
    }
  }, [open, config]);

  useEffect(() => {
    if (!open) return;
    sessionStorage.setItem("bs_agent_messages", JSON.stringify(messages.slice(-40)));
  }, [messages, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, interim, sending]);

  useEffect(() => {
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSpeaking(false);
  }

  function pickVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const preferred =
      voices.find((v) => v.lang?.toLowerCase().startsWith("en-ng")) ||
      voices.find((v) => /google uk english female|microsoft (aria|libby|sonia)|samantha|zira/i.test(v.name)) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("en-gb") && /female|aria|libby|sonia|google/i.test(v.name)) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("en-gb")) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
    return preferred || voices[0];
  }

  async function speak(text: string) {
    if (muted || !voiceEnabled) return;
    stopSpeaking();
    setSpeaking(true);
    const rate = config?.voice?.rate || 0.98;
    const pitch = config?.voice?.pitch || 1;

    if (config?.serverVoice && config?.voice?.name !== "browser") {
      try {
        const response = await fetch("/api/agent/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: config.voice.name }),
        });
        if (response.ok) {
          const blob = await response.blob();
          const audio = new Audio(URL.createObjectURL(blob));
          audioRef.current = audio;
          audio.onended = () => setSpeaking(false);
          audio.onerror = () => setSpeaking(false);
          await audio.play();
          return;
        }
      } catch {
        /* fall back to browser voice */
      }
    }

    if (!("speechSynthesis" in window)) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, "").slice(0, 900));
    const voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-NG";
    } else {
      utterance.lang = "en-NG";
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    if (message.length > 2000) {
      setError("Please keep your question under 2000 characters.");
      return;
    }
    setInput("");
    setError("");
    setInterim("");
    stopSpeaking();
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: message }]);
    setSending(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId, channel: "WEB" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "The assistant is unavailable right now. Please try again or contact support.");
        return;
      }
      if (data.conversationId) {
        setConversationId(data.conversationId);
        sessionStorage.setItem("bs_agent_conversation", data.conversationId);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          ticket: data.ticketReference,
          tools: data.toolsUsed,
        },
      ]);
      setSuggestions(data.suggestions || []);
      await speak(data.reply);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function startListening() {
    if (!SR) {
      setMicSupported(false);
      setError("Voice input is not supported in this browser. You can type your question below.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    setError("");
    stopSpeaking();
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setMicSupported(false);
      setError("Microphone permission was blocked. You can still type your question below.");
      return;
    }

    const recognition = new SR();
    recognition.lang = "en-NG";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setInterim("");
      stopSpeaking();
    };
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        setInterim("");
        recognition.stop();
        send(finalText.trim());
      }
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicSupported(false);
        setError("Microphone access was blocked. Type your question instead.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setError("I couldn't hear that clearly. Please try again or type your question.");
      }
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  function endConversation() {
    stopSpeaking();
    recognitionRef.current?.stop();
    setMessages([]);
    setConversationId(null);
    setSuggestions(config?.suggestions || []);
    sessionStorage.removeItem("bs_agent_conversation");
    sessionStorage.removeItem("bs_agent_messages");
    greetingAdded.current = false;
    setOpen(false);
  }

  if (!config?.enabled) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open Brave AI voice assistant"
          onClick={() => setOpen(true)}
          className={`fixed right-4 z-[90] ${offsetClass} group flex items-center gap-2.5 rounded-full border border-[#873BFF]/40 bg-[#0B0D18]/95 py-2 pl-2 pr-4 shadow-[0_20px_50px_-15px_rgba(135,59,255,0.7)] backdrop-blur transition hover:border-[#873BFF]/70 sm:right-5`}
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-white shadow-[0_0_24px_rgba(135,59,255,.55)]">
            <Bot size={18} />
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-[#20D9E8]/60" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0B0D18] bg-emerald-400" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-[10.5px] font-semibold leading-tight text-white">Ask Brave AI</span>
            <span className="block text-[8.5px] text-[#7C8AA3]">Voice or text · 24/7</span>
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-end sm:justify-end sm:p-4 md:p-6">
          <div
            className={`relative flex h-[88vh] w-full flex-col overflow-hidden rounded-t-[26px] border border-white/[0.1] bg-[#07080F] shadow-[0_50px_120px_-30px_rgba(0,0,0,1)] sm:h-[640px] sm:max-h-[88vh] sm:w-[410px] sm:rounded-[26px] ${
              config.widgetPosition === "left" ? "sm:mr-auto" : ""
            }`}
          >
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#873BFF]/20 blur-[70px]" />
            <div className="pointer-events-none absolute -left-20 bottom-24 h-44 w-44 rounded-full bg-[#20D9E8]/[0.09] blur-[70px]" />

            <header className="relative flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-white">
                <Bot size={18} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#07080F] bg-emerald-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-white">{config.name}</p>
                <p className="flex items-center gap-1.5 text-[9px] text-[#7C8AA3]">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  {listening ? "Listening…" : speaking ? "Speaking…" : "Online · voice & text"}
                </p>
              </div>
              <button
                type="button"
                aria-label={muted ? "Unmute voice" : "Mute voice"}
                onClick={() => {
                  if (!muted) stopSpeaking();
                  setMuted((v) => !v);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-[#9AA6BA] transition hover:text-white"
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button type="button" aria-label="Minimize assistant" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-[#9AA6BA] transition hover:text-white">
                <ChevronDown size={15} />
              </button>
              <button type="button" aria-label="End conversation" onClick={endConversation} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-[#9AA6BA] transition hover:border-rose-400/40 hover:text-rose-300">
                <X size={14} />
              </button>
            </header>

            <div ref={scrollRef} className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <span className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#873BFF]/15 text-[#C9B8FF]">
                      <Sparkles size={11} />
                    </span>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[11.5px] leading-[1.65] ${
                      message.role === "user"
                        ? "rounded-br-md bg-gradient-to-br from-[#873BFF] to-[#6D5CFF] text-white"
                        : "rounded-bl-md border border-white/[0.07] bg-white/[0.035] text-[#D6DFEC]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.ticket && (
                      <p className="mt-2 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[8.5px] text-emerald-200">
                        Ticket {message.ticket} · the academy team will reply by email
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {interim && (
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-br-md border border-[#20D9E8]/25 bg-[#20D9E8]/[0.07] px-3.5 py-2.5 text-[11.5px] italic text-[#9BEFF6]">
                    {interim}
                  </div>
                </div>
              )}

              {sending && (
                <div className="flex items-center gap-2 text-[10px] text-[#7C8AA3]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#873BFF]/15 text-[#C9B8FF]"><Sparkles size={10} /></span>
                  <span className="flex gap-1">
                    <span className="h-1 w-1 animate-bounce rounded-full bg-[#C9B8FF]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-[#C9B8FF] [animation-delay:120ms]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-[#C9B8FF] [animation-delay:240ms]" />
                  </span>
                  Checking the academy…
                </div>
              )}

              {listening && (
                <div className="flex items-center gap-2 rounded-xl border border-[#20D9E8]/20 bg-[#20D9E8]/[0.05] px-3 py-2 text-[9.5px] text-[#9BEFF6]">
                  <span className="flex h-4 items-end gap-0.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="w-0.5 animate-pulse rounded-full bg-[#20D9E8]" style={{ height: `${6 + i * 2}px`, animationDelay: `${i * 120}ms` }} />
                    ))}
                  </span>
                  Listening — speak naturally, then pause.
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[10px] leading-relaxed text-rose-200">{error}</div>
              )}

              {!sending && messages.length <= 2 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestions.slice(0, 4).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => send(suggestion)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-left text-[9.5px] text-[#A9B4C6] transition hover:border-[#873BFF]/40 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {speaking && (
              <div className="relative flex items-center gap-2 border-t border-white/[0.06] bg-white/[0.015] px-4 py-2">
                <span className="flex h-5 flex-1 items-end gap-0.5">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span key={i} className="w-0.5 animate-pulse rounded-full bg-gradient-to-t from-[#873BFF] to-[#20D9E8]" style={{ height: `${5 + ((i * 7) % 12)}px`, animationDelay: `${i * 60}ms` }} />
                  ))}
                </span>
                <button onClick={stopSpeaking} className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-[#C2CCDD] hover:text-white">
                  <Square size={9} /> Stop
                </button>
              </div>
            )}

            <div className="relative border-t border-white/[0.07] p-3">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  aria-label={listening ? "Stop listening" : "Speak to Brave AI"}
                  onClick={startListening}
                  disabled={sending}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                    listening
                      ? "border-[#20D9E8]/50 bg-[#20D9E8]/15 text-[#20D9E8] shadow-[0_0_18px_rgba(32,217,232,.35)]"
                      : "border-white/12 bg-white/[0.04] text-[#C2CCDD] hover:border-[#873BFF]/50 hover:text-white"
                  }`}
                >
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder={micSupported ? "Ask a question or tap the mic…" : "Type your question…"}
                  aria-label="Message Brave AI Assistant"
                  className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-white/10 bg-[#050509] px-3 py-2.5 text-[11.5px] text-white outline-none placeholder:text-[#5F6B7E] focus:border-[#873BFF]/60"
                />
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={() => send()}
                  disabled={!input.trim() || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-white transition disabled:opacity-40"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 px-1">
                <p className="text-[8px] leading-relaxed text-[#4F5B6E]">
                  AI can make mistakes. Payments and certificates are verified in your dashboard. Never share passwords or OTPs.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceEnabled((v) => !v);
                    if (voiceEnabled) stopSpeaking();
                  }}
                  className={`shrink-0 text-[8px] ${voiceEnabled ? "text-[#C9B8FF]" : "text-[#5F6B7E]"}`}
                >
                  {voiceEnabled ? "Voice on" : "Voice off"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
