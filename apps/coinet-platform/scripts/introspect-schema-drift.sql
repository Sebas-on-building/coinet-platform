-- ============================================================================
-- PHASE 1 — READ-ONLY prod introspection for the 3-table schema-drift family
-- ----------------------------------------------------------------------------
-- Purpose: capture prod's ACTUAL current shape for user_preferences,
-- user_watchlist (singular) / user_watchlists (plural), and project_knowledge,
-- so a data-preserving migration can be written against truth (not the repo
-- migrations, which don't reflect prod).
--
-- SAFETY: 100% read-only. Only information_schema / pg_catalog reads and a
-- catalog-estimate row count (pg_class.reltuples — no table scan, no locks).
-- No table is referenced directly, so MISSING tables simply do not appear in
-- the results instead of aborting the script. Nothing here writes or locks.
--
-- Run against the BACKED-UP prod DB, e.g.:
--   psql "$DATABASE_URL" -f scripts/introspect-schema-drift.sql
-- (or paste each block into the Railway DB console). Paste the full output back.
-- ============================================================================

\echo '=== Q1: which of the family tables EXIST in prod ==='
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_preferences',
    'user_watchlist',     -- singular (old migration shape)
    'user_watchlists',    -- plural (current schema / Prisma client target)
    'project_knowledge',
    'project_research_logs'
  )
ORDER BY table_name;

\echo ''
\echo '=== Q2: full column inventory (name, type, length, nullable, default) ==='
SELECT
  table_name,
  ordinal_position AS pos,
  column_name,
  data_type,
  character_maximum_length AS len,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'user_preferences',
    'user_watchlist',
    'user_watchlists',
    'project_knowledge',
    'project_research_logs'
  )
ORDER BY table_name, ordinal_position;

\echo ''
\echo '=== Q3: approximate row counts (pg_class estimate — safe, no scan) ==='
-- reltuples is an estimate maintained by ANALYZE/VACUUM. -1 means "never
-- analyzed" (treat as unknown). Missing tables simply will not appear here.
SELECT
  c.relname AS table_name,
  c.reltuples::bigint AS approx_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'user_preferences',
    'user_watchlist',
    'user_watchlists',
    'project_knowledge',
    'project_research_logs'
  )
ORDER BY c.relname;

\echo ''
\echo '=== Q4: indexes on the family tables ==='
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'user_preferences',
    'user_watchlist',
    'user_watchlists',
    'project_knowledge',
    'project_research_logs'
  )
ORDER BY tablename, indexname;

\echo ''
\echo '=== Q5: foreign-key + unique/PK constraints on the family tables ==='
SELECT
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name  AS ref_table,
  ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'user_preferences',
    'user_watchlist',
    'user_watchlists',
    'project_knowledge',
    'project_research_logs'
  )
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

\echo ''
\echo '=== Q6: migration history (did the project_knowledge "fix" actually run?) ==='
-- Confirms whether 20260104180000_fix_project_knowledge_migration ran in prod
-- (that one drops+recreates project_knowledge WITHOUT sector). rolled_back_at
-- non-null = it failed and was rolled back.
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations
ORDER BY started_at;

\echo ''
\echo '=== EXACT counts (OPTIONAL) ==='
\echo 'Run these ONLY for tables Q1 reported as existing (a SELECT on a missing'
\echo 'table errors). Read-only:'
\echo '   SELECT count(*) FROM user_preferences;'
\echo '   SELECT count(*) FROM user_watchlist;     -- if singular exists'
\echo '   SELECT count(*) FROM user_watchlists;    -- if plural exists'
\echo '   SELECT count(*) FROM project_knowledge;'
