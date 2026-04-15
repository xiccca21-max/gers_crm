import { prismadb } from "@/lib/prisma";

const SENSITIVE_KEYS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "refreshToken",
  "secret",
  "code",
]);

/** Убираем секреты из JSON-строки для логов (ломаемся мягко, если не JSON). */
export function redactJsonForLog(raw: string, maxLen = 2048): string {
  const slice = raw.length > maxLen ? `${raw.slice(0, maxLen)}…[truncated]` : raw;
  try {
    const v = JSON.parse(slice) as unknown;
    return JSON.stringify(redactValue(v));
  } catch {
    return "[non-json body]";
  }
}

function redactValue(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(redactValue);
  const o = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(o)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = val != null && val !== "" ? "[REDACTED]" : val;
    } else {
      out[k] = redactValue(val);
    }
  }
  return out;
}

export async function pingDatabase(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, message: "DATABASE_URL is empty or missing" };
  }
  try {
    await prismadb.$queryRawUnsafe("SELECT 1");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}

export function databaseUrlHint(): string {
  const u = process.env.DATABASE_URL?.trim();
  if (!u) return "missing";
  try {
    const parsed = new URL(u);
    const port = parsed.port || "(default port)";
    return `${parsed.protocol}//${parsed.hostname}:${port}`;
  } catch {
    return "unparseable (check format)";
  }
}

/** Подсказка для UI/логов, если Postgres недоступен (часто Vercel + Supabase direct :5432). */
export function databaseFailureUserHint(pingMessage: string): string {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  const chunks: string[] = [];
  if (/P1001|Can't reach database|DatabaseNotReachable|ECONNREFUSED|ETIMEDOUT/i.test(pingMessage)) {
    chunks.push("Код/тип: недоступен хост Postgres с текущего сервера (часто сеть/IPv6, не «неверный пароль»).");
  }
  if (/db\.[^.]+\.supabase\.co/i.test(url) && !/:6543\b/.test(url)) {
    chunks.push(
      "Похоже на прямой хост Supabase `db.*.supabase.co` (порт 5432). На Vercel с Prisma часто нужна строка из Supabase → Project Settings → Database → Connection string → **Session pooler** или **Transaction pooler** (порт **6543**, хост вида `*.pooler.supabase.com`). Отдельно проверь: проект в Supabase не **на паузе** (Free tier). Документация: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler"
    );
  }
  if (chunks.length === 0) {
    return "Проверь `DATABASE_URL` в Vercel (Production и Preview), доступность БД с интернета и что строка — именно Postgres URI из раздела Database.";
  }
  return chunks.join(" ");
}

export function shouldPingDbForPath(pathname: string): boolean {
  return (
    pathname.includes("sign-up") ||
    pathname.includes("sign-in") ||
    pathname.includes("sign_in")
  );
}
