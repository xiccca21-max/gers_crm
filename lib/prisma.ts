import { PrismaClient } from "@prisma/client";
import type { Pool } from "pg";
import { createPgPool, createPrismaWithAdapter, getNormalizedDatabaseUrl } from "@/lib/pg-prisma";

declare global {
  var cachedPrisma: PrismaClient | undefined;
  var cachedPgPool: Pool | undefined;
}

const prismaClientSingleton = (): PrismaClient => {
  if (global.cachedPrisma) {
    return global.cachedPrisma;
  }

  const connectionString = getNormalizedDatabaseUrl();
  if (!global.cachedPgPool) {
    global.cachedPgPool = createPgPool(connectionString);
  }

  global.cachedPrisma = createPrismaWithAdapter(global.cachedPgPool);

  if (process.env.NODE_ENV !== "production") {
    const cleanup = async () => {
      await global.cachedPrisma?.$disconnect();
      await global.cachedPgPool?.end();
      global.cachedPgPool = undefined;
      global.cachedPrisma = undefined;
    };
    process.on("beforeExit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  return global.cachedPrisma;
};

export const prismadb = prismaClientSingleton();
