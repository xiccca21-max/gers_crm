import dns from "node:dns";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var cachedPrisma: PrismaClient | undefined;
}

/** Vercel/serverless: `pg` может резолвить `db.*.supabase.co` в AAAA первым; исходящий IPv6 часто недоступен → P1001. */
function preferIpv4FirstForDbConnections(): void {
  if (process.env.VERCEL !== "1") return;
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    /* Node < 17: нет API — пропускаем */
  }
}

/** Доп. параметры в URI для Supabase/Neon без правки строки вручную в Vercel. */
function normalizeServerlessPostgresUrl(raw: string): string {
  const trimmed = raw?.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname;
    if (!/supabase\.co$/i.test(host) && !/\.neon\.tech$/i.test(host)) {
      return trimmed;
    }
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "25");
    }
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return trimmed;
  }
}

// Prisma Client configuration with connection pooling and lifecycle management
const prismaClientSingleton = () => {
  preferIpv4FirstForDbConnections();
  const connectionString = normalizeServerlessPostgresUrl(`${process.env.DATABASE_URL}`);
  const needsSsl =
    /supabase\.co/i.test(connectionString) ||
    /\.neon\.tech/i.test(connectionString) ||
    /sslmode=require/i.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: process.env.VERCEL === "1" ? 3 : 10,
    connectionTimeoutMillis: 25_000,
    idleTimeoutMillis: process.env.VERCEL === "1" ? 10_000 : 30_000,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Ensure graceful shutdown on hot reload in development
  if (process.env.NODE_ENV !== "production") {
    // Clean up on process termination
    const cleanup = async () => {
      await client.$disconnect();
    };

    process.on("beforeExit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  return client;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = prismaClientSingleton();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = prismaClientSingleton();
  }
  prisma = global.cachedPrisma;
}

export const prismadb = prisma;
