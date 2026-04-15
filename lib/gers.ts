/**
 * GERS fork: slim internal CRM — hide AI/MCP/campaign noise by default.
 * Set NEXT_PUBLIC_GERS_SLIM_UI=0 or false to restore full NextCRM navigation.
 */
export function isGersSlimUi(): boolean {
  const v = process.env.NEXT_PUBLIC_GERS_SLIM_UI;
  if (v === "0" || v === "false") return false;
  return true;
}
