/**
 * Логин для Better Auth username plugin: только a–z, 0–9, _ (после нормализации).
 * В БД хранится синтетический email `{login}@users.invalid` — почта пользователю не нужна.
 * Домен `.invalid` (RFC 2606): проходит z.email() в Better Auth; `@users.local` часто режется валидатором и ломает регистрацию.
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
  return `${u}@users.invalid`;
}
