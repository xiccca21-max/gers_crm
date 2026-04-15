/** Достаёт человекочитаемую строку из ответа Better Auth / better-fetch (message часто пустой). */
export function formatAuthClientError(error: unknown): string {
  if (error == null) return "Пустой ответ от сервера авторизации.";
  if (typeof error === "string") return error;
  if (typeof error !== "object") return String(error);

  const e = error as Record<string, unknown>;
  const msg = e.message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();

  const status = e.status;
  const statusText = typeof e.statusText === "string" ? e.statusText : "";
  const code = typeof e.code === "string" ? e.code : "";

  const body = pickBody(e);
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const bm =
      (typeof b.message === "string" && b.message) ||
      (typeof b.error === "string" && b.error) ||
      (typeof b.code === "string" && b.code);
    if (bm) {
      return status != null ? `HTTP ${status}: ${bm}` : String(bm);
    }
  }

  if (status != null) {
    const parts = [`HTTP ${status}`, statusText, code].filter(Boolean);
    return parts.join(" ") || `HTTP ${status}`;
  }

  if (code) return code;

  try {
    const s = JSON.stringify(error);
    if (s && s !== "{}") return s.length > 400 ? `${s.slice(0, 400)}…` : s;
  } catch {
    /* ignore */
  }

  return "Сервер отклонил регистрацию без текста ошибки — открой консоль (F12) → вкладка Network → запрос sign-up/email → Response.";
}

function pickBody(e: Record<string, unknown>): unknown {
  const candidates = [e.data, e.body, e.response, e.cause];
  for (const c of candidates) {
    if (c != null && typeof c === "object") return c;
  }
  return null;
}
