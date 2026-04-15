import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  databaseFailureUserHint,
  databaseUrlHint,
  pingDatabase,
  redactJsonForLog,
  shouldPingDbForPath,
} from "@/lib/auth-route-log";

const { GET: authGET, POST: authPOST } = toNextJsHandler(auth);

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const t0 = Date.now();
  try {
    const res = await authGET(req);
    const ms = Date.now() - t0;
    if (!res.ok) {
      const text = await res.clone().text().catch(() => "");
      console.warn("[api/auth] GET", res.status, path, `${ms}ms`, "body:", text.slice(0, 800));
    }
    return res;
  } catch (e) {
    console.error("[api/auth] GET exception", { path, err: e });
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const t0 = Date.now();
  const loud = shouldPingDbForPath(path);

  if (loud) {
    const hint = databaseUrlHint();
    const ping = await pingDatabase();
    if (ping.ok) {
      console.info("[api/auth] db ping ok", { path, database: hint });
    } else {
      console.error("[api/auth] db ping FAILED", {
        path,
        database: hint,
        err: ping.message,
        hint: "Prisma нужен Postgres URI (postgresql://…). Supabase: главная проекта → **Connect** → Session/Transaction pooler :6543. Не цилиндр Database→Settings. Пункт Database в Project settings может отсутствовать — используй Connect.",
      });
      return NextResponse.json(
        {
          code: "DATABASE_UNAVAILABLE",
          message:
            "PostgreSQL недоступен с сервера: регистрация и вход не могут продолжиться, пока не исправлен DATABASE_URL или сеть до БД.",
          details: ping.message,
          hint: databaseFailureUserHint(ping.message),
          database: hint,
        },
        { status: 503 }
      );
    }
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const raw = await req.clone().text();
        if (raw) {
          console.info("[api/auth] POST body (redacted)", path, redactJsonForLog(raw));
        }
      }
    } catch (e) {
      console.warn("[api/auth] body log skipped", e);
    }
  }

  try {
    const res = await authPOST(req);
    const ms = Date.now() - t0;
    if (!res.ok) {
      const text = await res.clone().text().catch(() => "");
      console.warn("[api/auth] POST", res.status, path, `${ms}ms`, "response:", text.slice(0, 1500));

      // Better Auth при необработанной ошибке отдаёт HTML — клиент с fetch+JSON не видит причину.
      if (
        path.includes("sign-up/email") &&
        (res.headers.get("content-type") || "").includes("text/html")
      ) {
        const snippet = text
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 800);
        return NextResponse.json(
          {
            code: "SIGN_UP_SERVER_HTML_ERROR",
            message:
              snippet ||
              `Сервер вернул HTML вместо JSON (${res.status}). Открой Vercel → Logs по метке [api/auth] или [better-auth].`,
          },
          { status: res.status }
        );
      }
    } else if (loud) {
      console.info("[api/auth] POST", res.status, path, `${ms}ms`);
    }
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/auth] POST exception", { path, err: e });
    return NextResponse.json(
      { code: "AUTH_ROUTE_UNCAUGHT", message: msg },
      { status: 500 }
    );
  }
}
