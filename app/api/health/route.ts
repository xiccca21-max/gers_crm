import { NextResponse } from "next/server";
import { databaseFailureUserHint, pingDatabase } from "@/lib/auth-route-log";

export const dynamic = "force-dynamic";

/** Проверка доступности Postgres с сервера (после деплоя: открыть GET /api/health). */
export async function GET() {
  const ping = await pingDatabase();
  if (ping.ok) {
    return NextResponse.json({ ok: true, database: "reachable" });
  }
  return NextResponse.json(
    {
      ok: false,
      database: "unreachable",
      message: ping.message,
      hint: databaseFailureUserHint(ping.message),
    },
    { status: 503 }
  );
}
