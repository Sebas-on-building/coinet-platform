-- ============================================================================
-- MANUAL-USE ROLLBACK for 20260608120000_reconcile_user_prefs_watchlist_project_knowledge
-- ----------------------------------------------------------------------------
-- This is NOT run by Prisma. Use it by hand only if the migration must be undone.
--
-- AUTHORITATIVE RESTORE = the pg_dump taken immediately before applying the
-- migration. The pre-migration shapes of `user_preferences` and `project_knowledge`
-- were drifted and are NOT reconstructable from the repo (e.g. user_preferences
-- carried chatStyle/alertEmail/theme/language; project_knowledge had ~37 columns
-- with researchDepth INTEGER / dataQuality DOUBLE). To get those exact shapes back,
-- restore them from the pg_dump.
--
-- This script only: (a) drops the wave-2 schema-matching tables, and (b) recreates
-- the prior SINGULAR `user_watchlist` (its DDL is known from the original
-- 20251201_user_memory_system migration). All four tables were empty except
-- user_watchlist (1 row), which is NOT restored here — restore it from the
-- pg_dump if it mattered (it was a single test entry).
-- ============================================================================

DROP TABLE IF EXISTS "project_research_logs" CASCADE;
DROP TABLE IF EXISTS "project_knowledge" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;
DROP TABLE IF EXISTS "user_watchlists" CASCADE;

-- Recreate the prior singular watchlist shape (empty).
CREATE TABLE IF NOT EXISTS "user_watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "targetBuy" DOUBLE PRECISION,
    "targetSell" DOUBLE PRECISION,
    "notes" TEXT,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_watchlist_pkey" PRIMARY KEY ("id")
);

-- NOTE: user_preferences and project_knowledge / project_research_logs are left
-- DROPPED. Restore their pre-migration (drifted) shapes from the pg_dump if a
-- true rollback is required.
