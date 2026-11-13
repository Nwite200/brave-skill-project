import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  if (process.env.CF_WORKER === "1") {
    const token = process.env.CLOUDFLARE_D1_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
    if (!token || !accountId || !databaseId) {
      throw new Error(
        "Cloudflare D1 is not configured. Set CLOUDFLARE_D1_TOKEN, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_DATABASE_ID."
      );
    }

    // Prisma's D1 HTTP adapter talks directly to the Cloudflare D1 API.
    // No PostgreSQL server, Hyperdrive, or external database is involved.
    const adapter = new PrismaD1({
      CLOUDFLARE_D1_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: accountId,
      CLOUDFLARE_DATABASE_ID: databaseId,
    });
    return new PrismaClient({ adapter, log: ["error"] });
  }

  // Local development also uses D1 through the same Cloudflare API.
  const token = process.env.CLOUDFLARE_D1_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  if (token && accountId && databaseId) {
    return new PrismaClient({
      adapter: new PrismaD1({
        CLOUDFLARE_D1_TOKEN: token,
        CLOUDFLARE_ACCOUNT_ID: accountId,
        CLOUDFLARE_DATABASE_ID: databaseId,
      }),
      log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
    });
  }

  throw new Error(
    "Cloudflare D1 credentials are required. Configure CLOUDFLARE_D1_TOKEN, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_DATABASE_ID."
  );
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

// Lazy construction prevents build-time imports from requiring production secrets.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
