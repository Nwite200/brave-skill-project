import { NextResponse } from "next/server";

// Frontend-first deployment health check. Database-backed functionality is
// intentionally reported as not configured until the D1 resource is added.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "brave-skill",
      frontend: "up",
      database: "not-configured",
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
