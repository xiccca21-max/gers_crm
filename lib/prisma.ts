import { PrismaClient } from "@prisma/client";
import { normalizeServerlessPostgresUrl, preferIpv4FirstForDbConnections } from "@/lib/prisma-env";

declare global {
  var cachedPrisma: PrismaClient | undefined;
}

/**
 * Как в `geko/server/lib/prisma.ts`: классический движок Prisma без `@prisma/adapter-pg` / `pg.Pool`.
 * На Vercel+Supabase отдельный `pg`-адаптер часто ведёт себя иначе, чем встроенный клиент (как у рабочего Expo/Vercel-проекта).
 */
const prismaClientSingleton = () => {
  preferIpv4FirstForDbConnections();
  const raw = process.env.DATABASE_URL?.trim();
  // Prisma 7: `datasources` в конструкторе PrismaClient не в типах — нормализуем URL в env (как раньше по смыслу).
  if (raw) {
    process.env.DATABASE_URL = normalizeServerlessPostgresUrl(raw);
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
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
