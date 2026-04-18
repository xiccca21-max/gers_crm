/**
 * Backfill the `role` column from existing `is_admin` / `is_account_admin` flags.
 * Idempotent: safe to run multiple times.
 *
 * Mapping:
 *   is_admin = true              → role = "admin"
 *   is_account_admin = true      → role = "member"
 *   both false                   → role = "member"
 *
 * Run: npx tsx scripts/migration/backfill-roles.ts
 */
import { createPgPool, createPrismaWithAdapter, getNormalizedDatabaseUrl } from "../../lib/pg-prisma";

const connectionString = getNormalizedDatabaseUrl();
const pool = createPgPool(connectionString);
const prisma = createPrismaWithAdapter(pool);

async function main() {
  console.log("Starting role backfill...");

  // Admins first (is_admin takes precedence)
  const adminResult = await prisma.users.updateMany({
    where: { is_admin: true, role: "member" },
    data: { role: "admin" },
  });
  console.log(`  Updated ${adminResult.count} users to role=admin`);

  // is_account_admin users stay as "member" (already the default)

  const summary = await prisma.users.groupBy({
    by: ["role"],
    _count: { role: true },
  });
  console.log("Role distribution:", summary);

  console.log("Role backfill complete.");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
