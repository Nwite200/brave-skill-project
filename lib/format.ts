export const formatNaira = (kobo: number, opts: { compact?: boolean; decimals?: boolean } = {}) => {
  const naira = (kobo || 0) / 100;
  if (opts.compact && naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (opts.compact && naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(naira);
};

export const formatNumber = (value: number) => new Intl.NumberFormat("en-NG").format(value || 0);

export const formatDate = (date: Date | string | null | undefined, withTime = false) => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
};

export const formatDateTime = (date: Date | string | null | undefined) => formatDate(date, true);

export const timeAgo = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
};

export const formatDuration = (seconds: number) => {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  if (m > 0) return `${m} min`;
  return `${seconds}s`;
};

export const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
};

export const percent = (part: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0;

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const truncate = (value: string, length = 120) =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;

export const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
};

export const toKobo = (naira: number) => Math.round((Number(naira) || 0) * 100);

export const toNaira = (kobo: number) => Math.round((Number(kobo) || 0) / 100);

export const nl2br = (value: string | null | undefined) => (value || "").split("\n").filter(Boolean);

export const fileSize = (bytes: number) => {
  if (!bytes) return "—";
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

export const levelLabel: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const statusTone: Record<string, string> = {
  PAID: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
  PENDING: "text-amber-300 bg-amber-500/10 border-amber-400/20",
  FAILED: "text-rose-300 bg-rose-500/10 border-rose-400/20",
  REFUNDED: "text-slate-300 bg-slate-500/10 border-slate-400/20",
  ACTIVE: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
  SUSPENDED: "text-rose-300 bg-rose-500/10 border-rose-400/20",
  REVOKED: "text-rose-300 bg-rose-500/10 border-rose-400/20",
  COMPLETED: "text-cyan-300 bg-cyan-500/10 border-cyan-400/20",
};
