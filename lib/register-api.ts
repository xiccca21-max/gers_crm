/**
 * Прямой POST на Better Auth — чтобы в тост попало тело ответа (JSON или обрезанный HTML),
 * а не пустой error.message из better-fetch.
 */
export async function signUpEmailViaFetch(params: {
  origin: string;
  name: string;
  email: string;
  password: string;
  username: string;
}): Promise<{ ok: true } | { ok: false; status: number; userMessage: string }> {
  const { origin, name, email, password, username } = params;
  const url = `${origin.replace(/\/$/, "")}/api/auth/sign-up/email`;

  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: origin,
    },
    body: JSON.stringify({
      name,
      email,
      password,
      username,
      displayUsername: username,
    }),
  });

  const text = await res.text();
  if (res.ok) {
    return { ok: true };
  }

  let userMessage = `HTTP ${res.status}`;
  try {
    const j = JSON.parse(text) as {
      message?: string;
      code?: string;
      hint?: string;
      errors?: unknown;
      error?: string;
    };
    if (typeof j.message === "string" && j.message.trim()) {
      userMessage = j.code ? `${j.message} (${j.code})` : j.message;
      if (j.code === "DATABASE_UNAVAILABLE" && typeof j.hint === "string" && j.hint.trim()) {
        userMessage = `${userMessage}\n\n${j.hint.trim()}`;
      }
    } else if (typeof j.code === "string") {
      userMessage = `${userMessage}: ${j.code}`;
    } else if (j.errors != null) {
      userMessage = `${userMessage}: ${JSON.stringify(j.errors).slice(0, 500)}`;
    } else if (typeof j.error === "string") {
      userMessage = `${userMessage}: ${j.error}`;
    }
  } catch {
    const stripped = text
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length > 0) {
      userMessage = `${userMessage}: ${stripped.slice(0, 500)}`;
    }
  }

  return { ok: false, status: res.status, userMessage };
}
