-- ROLLBACK for 20260605120000_add_user_memories_tenant_id
--
-- MANUAL USE ONLY. Prisma never runs this file (it only executes migration.sql).
--     psql "$DATABASE_URL" -f rollback.sql
--
-- After running, tell Prisma the migration is rolled back so migrate deploy won't
-- consider it applied:
--     npx prisma migrate resolve --rolled-back 20260605120000_add_user_memories_tenant_id --schema=./prisma/schema.prisma
--
-- Reverts to the pre-migration shape (drops the index + tenantId column). Restores the
-- exact "tenantId does not exist" state, so only do this if intentionally reverting.

BEGIN;

DROP INDEX IF EXISTS "user_memories_tenantId_idx";
ALTER TABLE "user_memories" DROP COLUMN IF EXISTS "tenantId";

COMMIT;
