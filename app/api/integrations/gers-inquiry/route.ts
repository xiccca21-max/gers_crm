import { NextResponse } from "next/server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { verifyNextCrmWebhookToken } from "@/lib/verify-webhook-token";

const bodySchema = z.object({
  name: z.string().max(200).optional(),
  email: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().email().max(320).optional(),
  ),
  telegram: z.string().max(120).optional(),
  projectType: z.string().max(120).optional(),
  budget: z.string().max(120).optional(),
  message: z.string().max(8000).optional(),
  source: z.string().max(80).optional(),
});

function splitName(full?: string): { firstName: string | null; lastName: string } {
  const n = (full ?? "").trim();
  if (!n) return { firstName: null, lastName: "Сайт GERS" };
  const parts = n.split(/\s+/);
  if (parts.length === 1) return { firstName: null, lastName: parts[0]! };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1]! };
}

function buildDescription(parsed: z.infer<typeof bodySchema>): string {
  const lines: string[] = [];
  if (parsed.telegram) lines.push(`Telegram: ${parsed.telegram}`);
  if (parsed.projectType) lines.push(`Тип проекта: ${parsed.projectType}`);
  if (parsed.budget) lines.push(`Бюджет: ${parsed.budget}`);
  if (parsed.message) lines.push(`Комментарий:\n${parsed.message}`);
  if (parsed.source) lines.push(`Источник: ${parsed.source}`);
  return lines.join("\n") || "Заявка с сайта";
}

function corsHeaders(req: Request, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  const raw = process.env.GERS_WEBHOOK_ALLOWED_ORIGINS ?? "";
  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "content-type, authorization");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export async function OPTIONS(req: Request) {
  return corsHeaders(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return corsHeaders(
      req,
      NextResponse.json({ message: "Invalid content-type" }, { status: 400 }),
    );
  }

  if (!verifyNextCrmWebhookToken(req.headers.get("authorization"))) {
    return corsHeaders(
      req,
      NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return corsHeaders(req, NextResponse.json({ message: "Invalid JSON" }, { status: 400 }));
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return corsHeaders(
      req,
      NextResponse.json({ message: "Validation error", issues: parsed.error.flatten() }, { status: 400 }),
    );
  }

  const data = parsed.data;
  if (!data.email && !data.telegram) {
    return corsHeaders(
      req,
      NextResponse.json({ message: "Need email or telegram" }, { status: 400 }),
    );
  }

  const { firstName, lastName } = splitName(data.name);
  const description = buildDescription(data);

  let leadSourceId: string | null = null;
  const sourceName = "GERS Website";
  const src = await prismadb.crm_Lead_Sources.upsert({
    where: { name: sourceName },
    create: { name: sourceName, v: 0 },
    update: {},
  });
  leadSourceId = src.id;

  const statusNew = await prismadb.crm_Lead_Statuses.findFirst({ where: { name: "New" } });
  const typeDemo = await prismadb.crm_Lead_Types.findFirst({ where: { name: "Demo" } });

  const phone = data.telegram
    ? data.telegram.startsWith("@")
      ? data.telegram
      : `@${data.telegram}`
    : null;

  try {
    const lead = await prismadb.crm_Leads.create({
      data: {
        v: 0,
        firstName,
        lastName,
        email: data.email || null,
        phone: phone || null,
        description,
        campaign: data.source ?? "gers.agency",
        lead_source_id: leadSourceId,
        lead_status_id: statusNew?.id ?? null,
        lead_type_id: typeDemo?.id ?? null,
      },
    });

    return corsHeaders(
      req,
      NextResponse.json({ ok: true, id: lead.id, message: "Lead created" }, { status: 201 }),
    );
  } catch (e) {
    console.error("[gers-inquiry]", e);
    return corsHeaders(
      req,
      NextResponse.json({ message: "Error creating lead" }, { status: 500 }),
    );
  }
}
