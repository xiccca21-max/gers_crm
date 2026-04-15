/**
 * Shared secret for public webhooks (site → CRM).
 * Env: NEXTCRM_TOKEN (same as legacy create-lead-from-web).
 */
export function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const t = authorization.trim();
  if (t.toLowerCase().startsWith("bearer ")) return t.slice(7).trim();
  return t;
}

export function verifyNextCrmWebhookToken(authorization: string | null): boolean {
  const secret = process.env.NEXTCRM_TOKEN?.trim();
  if (!secret) return false;
  const got = extractBearerToken(authorization);
  return !!got && got === secret;
}
