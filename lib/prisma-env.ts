import dns from "node:dns";

/** Vercel/serverless: резолв AAAA первым для `db.*.supabase.co` часто даёт P1001 при недоступном IPv6. */
export function preferIpv4FirstForDbConnections(): void {
  if (process.env.VERCEL !== "1") return;
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    /* Node < 17 */
  }
}

/** Параметры URI для Supabase/Neon без ручной правки в Vercel. */
export function normalizeServerlessPostgresUrl(raw: string): string {
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
