import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let database = "down";
  try {
    await db.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  const healthy = database === "up";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "brave-skill",
      database,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
