-- Add the missing user_memories.tenantId column (+ index) to match schema.prisma.
--
-- The UserMemory model declares `tenantId String @default("default") @db.VarChar(36)`
-- and `@@index([tenantId])`, but the live table lacks the column. So the generated
-- Prisma client's userMemory.findMany() throws:
--   "The column `user_memories.tenantId` does not exist in the current database."
-- which breaks memory personalization. (The chat judgment still degrades gracefully
-- via the service.ts:418 null-guard, so this is non-blocking for the engine — but
-- memory load stays broken until this lands.)
--
-- This was surfaced after 20260604120000 fixed the `category` drift, which had been
-- the first column Prisma choked on. Mirrors the user_portfolios.tenantId fix exactly.
-- Live table has 3 rows; data-preserving. Schema keeps @default("default"), so the
-- DEFAULT is intentionally retained (unlike the passwordHash case).

BEGIN;

ALTER TABLE "user_memories"
  ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS "user_memories_tenantId_idx"
  ON "user_memories" ("tenantId");

COMMIT;
