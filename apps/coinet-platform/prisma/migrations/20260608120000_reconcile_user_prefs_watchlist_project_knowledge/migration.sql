-- ============================================================================
-- Reconcile prod schema drift — Wave 2
-- user_preferences · user_watchlists · project_knowledge · project_research_logs
-- ----------------------------------------------------------------------------
-- WHY: these tables were created in prod by the old `db push` band-aid (now
-- removed) and/or a regressive "fix" migration, so they drifted from
-- schema.prisma. Prod introspection (read-only) confirmed:
--   - user_preferences : EXISTS, drifted columns, NO tenantId, 0 rows.
--   - user_watchlist   : SINGULAR table exists (old 9-col shape), 1 row.
--                        schema.prisma maps the PLURAL `user_watchlists` (19 cols).
--   - project_knowledge: 37 cols, structurally drifted (researchDepth INTEGER /
--                        dataQuality DOUBLE / missing `sector` / extra columns),
--                        0 rows. The fix_project_knowledge migration (finished,
--                        not rolled back) is what dropped `sector`.
--   - project_research_logs: drifted, 0 rows, FK → project_knowledge.
--
-- STRATEGY (approved): every table is empty except user_watchlist (1 row). So
-- favor the cleanest end-state that matches schema.prisma EXACTLY (clean
-- `migrate diff`) rather than preserving the drifted structures. The single
-- watchlist row is preserved through the singular→plural move (overlapping
-- columns only). All CREATE/INDEX/FK DDL below is Prisma-generated from
-- schema.prisma (migrate diff --from-empty), so it matches the datamodel 1:1.
--
-- DATA SAFETY: only user_watchlist holds data (1 row), preserved below. All
-- other tables are empty (0 rows) — DROP+CREATE loses no data. A full pg_dump
-- is taken before applying. Apply via `prisma migrate deploy` only.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. user_preferences — empty + drifted → recreate to schema (adds tenantId)
-- ─────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "user_preferences" CASCADE;

CREATE TABLE "user_preferences" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "riskTolerance" VARCHAR(20),
    "tradingStyle" VARCHAR(20),
    "experienceLevel" VARCHAR(20),
    "preferredAssets" TEXT[],
    "preferredSectors" TEXT[],
    "morningDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "morningDigestTime" VARCHAR(5),
    "regimeAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "opportunityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "maxPushPerDay" INTEGER NOT NULL DEFAULT 2,
    "typicalSessionTime" VARCHAR(5),
    "sessionTimeConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferredDepth" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");
CREATE INDEX "user_preferences_tenantId_idx" ON "user_preferences"("tenantId");

-- ─────────────────────────────────────────────────────────────────────────
-- 2. user_watchlist (singular, 1 row) → user_watchlists (plural, schema shape)
--    Create the plural table, migrate the single row's overlapping columns,
--    then drop the singular table. Guarded so it is safe if the singular table
--    is somehow already absent.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "user_watchlists" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL DEFAULT 'default',
    "symbol" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "targetBuy" DOUBLE PRECISION,
    "targetSell" DOUBLE PRECISION,
    "notes" TEXT,
    "omniscoreAtAdd" DOUBLE PRECISION,
    "qsAtAdd" DOUBLE PRECISION,
    "osAtAdd" DOUBLE PRECISION,
    "priceAtAdd" DOUBLE PRECISION,
    "lastChecked" TIMESTAMP(3),
    "checkCount" INTEGER NOT NULL DEFAULT 0,
    "alertsSet" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "user_watchlists_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_watchlist'
  ) THEN
    -- Preserve the single existing row. Only columns common to both shapes are
    -- carried; new columns take their schema defaults. The singular `alertEnabled`
    -- boolean has no counterpart in the plural model and is intentionally dropped.
    INSERT INTO "user_watchlists"
      ("id", "userId", "tenantId", "symbol", "name", "targetBuy", "targetSell",
       "notes", "checkCount", "alertsSet", "addedAt", "updatedAt", "isArchived")
    SELECT
      "id", "userId", 'default', "symbol", "name", "targetBuy", "targetSell",
      "notes", 0, 0, "addedAt", CURRENT_TIMESTAMP, false
    FROM "user_watchlist";

    DROP TABLE "user_watchlist" CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX "user_watchlists_userId_symbol_key" ON "user_watchlists"("userId", "symbol");
CREATE INDEX "user_watchlists_userId_isArchived_idx" ON "user_watchlists"("userId", "isArchived");
CREATE INDEX "user_watchlists_tenantId_idx" ON "user_watchlists"("tenantId");

-- ─────────────────────────────────────────────────────────────────────────
-- 3. project_knowledge + project_research_logs — empty + structurally drifted
--    → recreate both to schema (restores `sector`, fixes researchDepth /
--    dataQuality types). Drop logs first (FK), then knowledge.
-- ─────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "project_research_logs" CASCADE;
DROP TABLE IF EXISTS "project_knowledge" CASCADE;

CREATE TABLE "project_knowledge" (
    "id" TEXT NOT NULL,
    "projectId" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200),
    "symbol" VARCHAR(20),
    "ticker" VARCHAR(20),
    "aliases" TEXT[],
    "description" TEXT,
    "category" VARCHAR(100),
    "sector" VARCHAR(50),
    "teamInfo" JSONB,
    "partnerships" JSONB,
    "backers" JSONB,
    "audits" JSONB,
    "governanceType" VARCHAR(100),
    "socialLinks" JSONB,
    "contractAddresses" JSONB,
    "researchDepth" VARCHAR(20) NOT NULL DEFAULT 'minimal',
    "dataQuality" VARCHAR(20) NOT NULL DEFAULT 'low',
    "sourcesUsed" TEXT[],
    "lastResearchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_knowledge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_research_logs" (
    "id" TEXT NOT NULL,
    "projectId" VARCHAR(100) NOT NULL,
    "researchType" VARCHAR(50) NOT NULL,
    "findings" JSONB NOT NULL,
    "sourcesUsed" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "fieldsUpdated" TEXT[],
    "dataAdded" BOOLEAN NOT NULL DEFAULT false,
    "dataRefined" BOOLEAN NOT NULL DEFAULT false,
    "triggeredBy" VARCHAR(100),
    "userId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_research_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_knowledge_projectId_key" ON "project_knowledge"("projectId");
CREATE INDEX "project_knowledge_sector_idx" ON "project_knowledge"("sector");
CREATE INDEX "project_knowledge_dataQuality_idx" ON "project_knowledge"("dataQuality");
CREATE INDEX "project_knowledge_lastResearchedAt_idx" ON "project_knowledge"("lastResearchedAt");
CREATE INDEX "project_research_logs_projectId_idx" ON "project_research_logs"("projectId");
CREATE INDEX "project_research_logs_createdAt_idx" ON "project_research_logs"("createdAt");

ALTER TABLE "project_research_logs"
  ADD CONSTRAINT "project_research_logs_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "project_knowledge"("projectId")
  ON DELETE CASCADE ON UPDATE CASCADE;
