-- ROLLBACK for 20260604120000_reconcile_prod_schema_drift
--
-- MANUAL USE ONLY. Prisma never runs this file (it only executes migration.sql).
-- Run it by hand against the DB to reverse the forward migration, e.g.:
--     psql "$DATABASE_URL" -f rollback.sql
--
-- IMPORTANT — after running this SQL, also tell Prisma the migration is rolled back,
-- otherwise `migrate deploy` will think it is still applied and never re-run it:
--     npx prisma migrate resolve --rolled-back 20260604120000_reconcile_prod_schema_drift
--
-- This restores the schema to its pre-migration shape. Any rows written to
-- users.passwordHash or user_portfolios AFTER the forward migration are discarded by
-- step 3/4 (expected for a rollback). The full pg_dump remains the ultimate fallback.

BEGIN;

-- Reverse 4) user_portfolios -> user_portfolio (re-add wallet, relax exchange,
--            drop tenantId + its index, rename back to singular).
ALTER TABLE "user_portfolios" ADD COLUMN IF NOT EXISTS "wallet" TEXT;
ALTER TABLE "user_portfolios" ALTER COLUMN "exchange" DROP NOT NULL;
ALTER TABLE "user_portfolios" ALTER COLUMN "exchange" DROP DEFAULT;
DROP INDEX IF EXISTS "user_portfolios_tenantId_idx";
ALTER TABLE "user_portfolios" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE IF EXISTS "user_portfolios" RENAME TO "user_portfolio";

-- Reverse 3) users.passwordHash : drop the column again (restores the missing-column state).
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordHash";

-- Reverse 2) user_memories.category : varchar(50) -> enum "MemoryCategory".
--    The forward migration left "MemoryCategory" in place (its DROP was commented),
--    so the type still exists. If you had uncommented that DROP, recreate it first:
--    CREATE TYPE "MemoryCategory" AS ENUM ('preference','context'); -- + any other members
ALTER TABLE "user_memories"
  ALTER COLUMN "category" TYPE "MemoryCategory" USING "category"::"MemoryCategory";

-- Reverse 1) chat_messages.role : enum "MessageRole" -> text.
ALTER TABLE "chat_messages"
  ALTER COLUMN "role" TYPE TEXT USING "role"::text;

COMMIT;

-- Optional: drop the "MessageRole" enum type — ONLY if the forward migration CREATED it
-- (i.e. it did not exist beforehand) and nothing else references it. Run the enum check
-- before applying the forward migration to know. Left commented for explicit review:
-- DROP TYPE IF EXISTS "MessageRole";
