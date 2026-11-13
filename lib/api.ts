import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { db } from "@/lib/db";

export type ApiContext = { params: Promise<Record<string, string>> };

export function json<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

/**
 * CSRF defence for cookie-authenticated mutations: the Origin (when present)
 * must match the request host. Combined with SameSite=Lax cookies this blocks
 * cross-site form posts while keeping the Android WebView/native client working
 * (it sends no Origin header, so we fall back to requiring JSON).
 */
export function assertSameOrigin(req: NextRequest) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new AuthError("Blocked cross-origin request.", 403);
  } catch {
    throw new AuthError("Blocked cross-origin request.", 403);
  }
}

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  // Opportunistic cleanup so the bucket table does not grow without bound.
  if (Math.random() < 0.02) {
    await db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86_400_000) } } }).catch(() => {});
  }
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + (${windowSeconds} || ' seconds')::interval)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" < now() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" < now() THEN EXCLUDED."resetAt" ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"
  `;
  const row = rows[0];
  const remaining = Math.max(0, limit - Number(row.count));
  return {
    allowed: Number(row.count) <= limit,
    remaining,
    resetAt: row.resetAt,
  };
}

export async function enforceRateLimit(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowSeconds: number,
) {
  const ip = clientIp(req);
  const result = await rateLimit(`${bucket}:${ip}`, limit, windowSeconds);
  if (!result.allowed) {
    const retry = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
    throw new HttpError("Too many requests. Please slow down and try again.", 429, {
      "Retry-After": String(retry),
    });
  }
}

export class HttpError extends Error {
  status: number;
  headers?: Record<string, string>;
  constructor(message: string, status = 400, headers?: Record<string, string>) {
    super(message);
    this.status = status;
    this.headers = headers;
    this.name = "HttpError";
  }
}

type Handler = (req: NextRequest, ctx: ApiContext) => Promise<Response> | Response;

export function route(handler: Handler) {
  return async (req: NextRequest, ctx: ApiContext) => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof AuthError || error instanceof HttpError) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: error.status, headers: "headers" in error ? error.headers : undefined },
        );
      }
      if (error instanceof ZodError) {
        const first = error.issues[0];
        return NextResponse.json(
          {
            ok: false,
            error: first ? `${first.path.join(".") || "Input"}: ${first.message}` : "Invalid input.",
            issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          },
          { status: 422 },
        );
      }
      console.error("[api]", req.method, req.nextUrl.pathname, error);
      const message =
        process.env.NODE_ENV === "production"
          ? "Something went wrong. Please try again."
          : error instanceof Error
            ? error.message
            : "Unknown error";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  };
}

export async function parseJson<T>(req: NextRequest, schema: { parse: (data: unknown) => T }): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError("Invalid JSON body.", 400);
  }
  return schema.parse(body);
}

export function getPagination(req: NextRequest, defaultSize = 20) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
  const rawSize = Number(req.nextUrl.searchParams.get("pageSize") || defaultSize);
  const pageSize = Math.min(100, Math.max(1, Number.isFinite(rawSize) ? rawSize : defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function csvResponse(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
