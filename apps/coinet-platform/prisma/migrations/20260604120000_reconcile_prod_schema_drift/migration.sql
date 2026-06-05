-- Reconcile production schema drift with prisma/schema.prisma.
--
-- Direction: bring the LIVE DB in line with schema.prisma (the source of truth for
-- the generated Prisma Client — the mismatch is what was throwing in prod).
-- Every step below was written against the ACTUAL live column types/values captured
-- read-only on 2026-06-04, and is data-preserving. Take a full pg_dump first.
--
-- Live facts this migration assumes (verified):
--   chat_messages.role     = text, NOT NULL, values ONLY {'user','assistant'}
--   user_memories.category = enum "MemoryCategory", NOT NULL, values {'preference','context'}
--   users.passwordHash     = column MISSING (13 rows)
--   user_portfolio         = singular table, 0 rows, no tenantId, extra "wallet" col
--
-- Wrapped in a single transaction: either it all applies or nothing does.

BEGIN;

-- 1) chat_messages.role : text -> enum "MessageRole"
--    schema: model Message { role MessageRole }  (enum user|assistant|system)
--    Live values {'user','assistant'} are valid enum members, so the cast is lossless.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageRole') THEN
    CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system');
  END IF;
END$$;

ALTER TABLE "chat_messages"
  ALTER COLUMN "role" TYPE "MessageRole" USING "role"::"MessageRole";

-- 2) user_memories.category : enum "MemoryCategory" -> varchar(50)
--    schema: model UserMemory { category String @db.VarChar(50) }
--    enum -> text cast always succeeds; values become plain strings.
ALTER TABLE "user_memories"
  ALTER COLUMN "category" TYPE VARCHAR(50) USING "category"::text;

-- The "MemoryCategory" enum type is now orphaned. Dropping is optional and only
-- succeeds if nothing else references it. Left commented for explicit review:
-- DROP TYPE IF EXISTS "MemoryCategory";

-- 3) users.passwordHash : add the missing required column
--    schema: model User { password String @map("passwordHash") }  (NOT NULL, no default)
--    The 13 existing users are Clerk-only (legacy JWT is disabled), so they have no
--    real password. Backfill '' so the NOT NULL add succeeds, then drop the default
--    to match the schema exactly. New users receive a bcrypt placeholder from
--    user-resolver.ts on create.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users"
  ALTER COLUMN "passwordHash" DROP DEFAULT;

-- 4) user_portfolio -> user_portfolios  (matches model @@map("user_portfolios"))
--    Table is empty (0 rows), so this is risk-free. Add tenantId + its index, align
--    exchange to NOT NULL DEFAULT 'default', and drop the non-schema "wallet" column.
ALTER TABLE IF EXISTS "user_portfolio" RENAME TO "user_portfolios";

ALTER TABLE "user_portfolios"
  ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS "user_portfolios_tenantId_idx"
  ON "user_portfolios" ("tenantId");

UPDATE "user_portfolios" SET "exchange" = 'default' WHERE "exchange" IS NULL;
ALTER TABLE "user_portfolios" ALTER COLUMN "exchange" SET DEFAULT 'default';
ALTER TABLE "user_portfolios" ALTER COLUMN "exchange" SET NOT NULL;

ALTER TABLE "user_portfolios" DROP COLUMN IF EXISTS "wallet";

COMMIT;
