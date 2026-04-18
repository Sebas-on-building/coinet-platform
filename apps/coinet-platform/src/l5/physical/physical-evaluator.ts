/**
 * L5.6 Physical Design — Physical Evaluator
 *
 * Validates schema completeness, cross-store linkage, and physical law adherence.
 */

import { ALL_PG_SCHEMAS, PgSchema, FORBIDDEN_TABLE_NAMES, isTableNameAllowed } from './postgres-schemas';
import { WRITE_MANIFESTS_TABLE, WRITE_MANIFESTS_LINEAGE_FIELDS } from './postgres-tables/write-manifests.table';
import { OUTBOX_JOBS_TABLE, OUTBOX_JOBS_LINEAGE_FIELDS } from './postgres-tables/outbox-jobs.table';
import { ARCHIVE_POINTERS_TABLE, ARCHIVE_POINTERS_LINEAGE_FIELDS } from './postgres-tables/archive-pointers.table';
import { MANIFEST_TRANSITIONS_TABLE } from './postgres-tables/manifest-transitions.table';
import { PROJECTION_RECEIPTS_TABLE } from './postgres-tables/projection-receipts.table';
import { QUARANTINE_CASES_TABLE } from './postgres-tables/quarantine-cases.table';
import { TS_NUMERIC_FACT_TABLE } from './clickhouse/ts-numeric-fact.ddl';
import { TS_OHLCV_BAR_TABLE } from './clickhouse/ts-ohlcv-bar.ddl';
import { TS_FEATURE_FACT_TABLE } from './clickhouse/ts-feature-fact.ddl';
import { TS_SCORE_HISTORY_TABLE } from './clickhouse/ts-score-history.ddl';
import { ALL_REDIS_KEY_FAMILIES } from './redis/key-families';
import { ALL_OBJECT_PATH_FAMILIES } from './object-store/path-builder';

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_PG_TABLES = [
  WRITE_MANIFESTS_TABLE,
  OUTBOX_JOBS_TABLE,
  ARCHIVE_POINTERS_TABLE,
  MANIFEST_TRANSITIONS_TABLE,
  PROJECTION_RECEIPTS_TABLE,
  QUARANTINE_CASES_TABLE,
] as const;

export const ALL_CLICKHOUSE_TABLES = [
  TS_NUMERIC_FACT_TABLE,
  TS_OHLCV_BAR_TABLE,
  TS_FEATURE_FACT_TABLE,
  TS_SCORE_HISTORY_TABLE,
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhysicalEvaluationResult {
  readonly pgSchemasPresent: number;
  readonly pgTablesPresent: number;
  readonly clickhouseTablesPresent: number;
  readonly redisKeyFamiliesPresent: number;
  readonly objectPathFamiliesPresent: number;
  readonly crossStoreSpineIntact: boolean;
  readonly issues: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluatePhysicalDesign(): PhysicalEvaluationResult {
  const issues: string[] = [];

  // Schema completeness
  const pgSchemasPresent = ALL_PG_SCHEMAS.length;
  if (pgSchemasPresent < 8) issues.push(`Expected 8 PG schemas, found ${pgSchemasPresent}`);

  // PG table completeness
  const pgTablesPresent = ALL_PG_TABLES.length;
  if (pgTablesPresent < 6) issues.push(`Expected >=6 core L5 PG tables, found ${pgTablesPresent}`);

  // Forbidden table names
  for (const t of ALL_PG_TABLES) {
    if (!isTableNameAllowed(t.name)) {
      issues.push(`Table '${t.name}' uses a forbidden name`);
    }
  }

  // Manifest table must have envelope_id unique
  const manifestUniques = WRITE_MANIFESTS_TABLE.uniqueConstraints;
  const hasEnvelopeUnique = manifestUniques.some((u: readonly string[]) => u.includes('envelope_id'));
  if (!hasEnvelopeUnique) issues.push('write_manifests missing unique on envelope_id');

  // Outbox must have manifest FK
  const outboxFKs = OUTBOX_JOBS_TABLE.foreignKeys;
  const hasManifestFK = outboxFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('manifest_id'));
  if (!hasManifestFK) issues.push('outbox_jobs missing foreign key on manifest_id');

  // ClickHouse tables
  const clickhouseTablesPresent = ALL_CLICKHOUSE_TABLES.length;
  if (clickhouseTablesPresent < 4) issues.push(`Expected 4 ClickHouse table families, found ${clickhouseTablesPresent}`);

  // ClickHouse lineage fields
  for (const table of ALL_CLICKHOUSE_TABLES) {
    for (const field of table.lineageFields) {
      if (!(field in table.columns)) {
        issues.push(`ClickHouse table '${table.name}' missing lineage field '${field}'`);
      }
    }
  }

  // Redis key families
  const redisKeyFamiliesPresent = ALL_REDIS_KEY_FAMILIES.length;
  if (redisKeyFamiliesPresent < 7) issues.push(`Expected >=7 Redis key families, found ${redisKeyFamiliesPresent}`);

  // Object path families
  const objectPathFamiliesPresent = ALL_OBJECT_PATH_FAMILIES.length;
  if (objectPathFamiliesPresent < 8) issues.push(`Expected >=8 object path families, found ${objectPathFamiliesPresent}`);

  // Cross-store spine: manifest carries lineage, outbox carries lineage, archive carries lineage
  const spineFields = ['manifest_id', 'trace_id', 'envelope_id'];
  const manifestHasSpine = spineFields.every(f => f in WRITE_MANIFESTS_TABLE.columns);
  const outboxHasSpine = spineFields.every(f => f in OUTBOX_JOBS_TABLE.columns);
  const archiveHasSpine = spineFields.every(f => f in ARCHIVE_POINTERS_TABLE.columns);
  const crossStoreSpineIntact = manifestHasSpine && outboxHasSpine && archiveHasSpine;
  if (!crossStoreSpineIntact) issues.push('Cross-store identity spine broken');

  return {
    pgSchemasPresent,
    pgTablesPresent,
    clickhouseTablesPresent,
    redisKeyFamiliesPresent,
    objectPathFamiliesPresent,
    crossStoreSpineIntact,
    issues,
  };
}
