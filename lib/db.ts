import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Bind the Prisma client to the actual D1 database binding for this request.
  // The D1 HTTP API token is not required by the application runtime.
  const { env } = getCloudflareContext();
  const bindings = env as unknown as { DB: D1Database };
  if (!bindings.DB) throw new Error("Cloudflare D1 binding DB is missing.");
  return new PrismaClient({
    adapter: new PrismaD1(bindings.DB),
    log: ["error"],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

// Construct lazily inside a request, never while Next.js imports modules for build.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
