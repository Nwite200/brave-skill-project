import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");

  // Cloudflare Workers cannot use Prisma's native query engine. The pg driver
  // adapter uses the Cloudflare TCP socket shim (nodejs_compat) and Hyperdrive
  // when DATABASE_URL points at a Hyperdrive connection string.
  if (process.env.CF_WORKER === "1") {
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: url, max: 5 }),
      log: ["error"],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
