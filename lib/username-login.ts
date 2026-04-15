/**
 * Логин для Better Auth username plugin: только a–z, 0–9, _ (после нормализации).
 * В БД хранится отдельный синтетический email `{login}@users.local` — почта пользователю не нужна.
 */
export function normalizeLogin(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function internalEmailFromLogin(raw: string): string {
  const u = normalizeLogin(raw) || "user";
  return `${u}@users.local`;
}
