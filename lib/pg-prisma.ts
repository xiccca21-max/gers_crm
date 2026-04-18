import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeServerlessPostgresUrl, preferIpv4FirstForDbConnections } from "./prisma-env";

type PrismaLogLevel = "query" | "info" | "warn" | "error";

/** Нормализованный URL в `process.env.DATABASE_URL` + проверка наличия. */
export function getNormalizedDatabaseUrl(): string {
  preferIpv4FirstForDbConnections();
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is required");
  }
  const connectionString = normalizeServerlessPostgresUrl(raw);
  process.env.DATABASE_URL = connectionString;
  return connectionString;
}

export function createPgPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: process.env.VERCEL ? 10 : 20,
  });
}

/** Prisma 7 + PostgreSQL: движок `client` требует адаптер (`@prisma/adapter-pg`). */
export function createPrismaWithAdapter(
  pool: Pool,
  log?: PrismaLogLevel[] | Array<{ level: PrismaLogLevel; emit: "stdout" | "event" }>
): PrismaClient {
  const adapter = new PrismaPg(pool);
  const defaultLog: PrismaLogLevel[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
  return new PrismaClient({
    adapter,
    log: log ?? defaultLog,
  });
}
