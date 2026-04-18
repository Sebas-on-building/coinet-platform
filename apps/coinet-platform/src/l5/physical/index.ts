/**
 * L5.6 — Physical Design: Schemas, Tables, Keys, Paths
 *
 * Public API surface.
 */

// Errors
export { L5PhysicalErrorCode, L5PhysicalError } from './physical-errors';

// Postgres schemas
export {
  PgSchema, ALL_PG_SCHEMAS, SCHEMA_DEFINITIONS,
  FORBIDDEN_SCHEMA_NAMES, FORBIDDEN_TABLE_NAMES,
  isSchemaAllowed, isTableNameAllowed,
  schemaCreateDDL, allSchemasCreateDDL,
  JSONB_ALLOWED_ONLY_FOR, TYPED_COLUMN_DOMAINS,
} from './postgres-schemas';
export type { PgSchemaDefinition, PgColumnType } from './postgres-schemas';

// Postgres tables — L5 coordination
export { WRITE_MANIFESTS_TABLE, WRITE_MANIFESTS_REQUIRED_COLUMNS, WRITE_MANIFESTS_LINEAGE_FIELDS } from './postgres-tables/write-manifests.table';
export { OUTBOX_JOBS_TABLE, OUTBOX_JOBS_REQUIRED_COLUMNS, OUTBOX_JOBS_LINEAGE_FIELDS } from './postgres-tables/outbox-jobs.table';
export { ARCHIVE_POINTERS_TABLE, ARCHIVE_POINTERS_REQUIRED_COLUMNS, ARCHIVE_POINTERS_LINEAGE_FIELDS } from './postgres-tables/archive-pointers.table';
export { MANIFEST_TRANSITIONS_TABLE, MANIFEST_TRANSITIONS_REQUIRED_COLUMNS } from './postgres-tables/manifest-transitions.table';
export { PROJECTION_RECEIPTS_TABLE, PROJECTION_RECEIPTS_REQUIRED_COLUMNS } from './postgres-tables/projection-receipts.table';
export { QUARANTINE_CASES_TABLE, QUARANTINE_CASES_REQUIRED_COLUMNS } from './postgres-tables/quarantine-cases.table';

// Postgres tables — domain registries
export { WATCHLISTS_TABLE, WATCHLIST_ITEMS_TABLE } from './postgres-tables/watchlists.table';
export { USER_SETTINGS_TABLE } from './postgres-tables/user-settings.table';
export { SCORE_REGISTRY_TABLE } from './postgres-tables/score-registry.table';
export { REPORT_REGISTRY_TABLE } from './postgres-tables/report-registry.table';
export { AUDIT_EVENTS_TABLE } from './postgres-tables/audit-events.table';

// ClickHouse DDL
export { TS_NUMERIC_FACT_TABLE } from './clickhouse/ts-numeric-fact.ddl';
export { TS_OHLCV_BAR_TABLE } from './clickhouse/ts-ohlcv-bar.ddl';
export { TS_FEATURE_FACT_TABLE } from './clickhouse/ts-feature-fact.ddl';
export { TS_SCORE_HISTORY_TABLE } from './clickhouse/ts-score-history.ddl';

// Redis key families
export {
  RedisKeyFamily, ALL_REDIS_KEY_FAMILIES, TTL_POLICIES, getTTLPolicy,
  hotMetricKey, recentWindowKey, dedupeKey, alertCooldownKey,
  triggerActiveKey, featureCacheKey, contextCacheKey,
  isValidL5RedisKey, extractKeyFamily, validateRedisKeyNamespace,
  REDIS_VALUE_REQUIRED_FIELDS, validateRedisValueLineage,
} from './redis/key-families';
export type { RedisTTLPolicy } from './redis/key-families';

// Object storage
export {
  ObjectPathFamily, ALL_OBJECT_PATH_FAMILIES,
  buildRawSourcePath, buildNormalizedEnvelopePath, buildBackfillPath,
  buildModelIOPath, buildReportRenderPath, buildSnapshotPath,
  buildReplayBundlePath, buildForensicExportPath,
  isValidL5ObjectPath, extractPathFamily, hasRequiredCompression, REQUIRED_COMPRESSION,
} from './object-store/path-builder';
export type {
  RawSourcePathInput, NormalizedEnvelopePathInput, BackfillPathInput,
  ModelIOPathInput, ReportRenderPathInput, SnapshotPathInput,
  ReplayBundlePathInput, ForensicExportPathInput,
} from './object-store/path-builder';

export {
  REQUIRED_OBJECT_TAGS, OPTIONAL_OBJECT_TAGS,
  RetentionClass, ALL_RETENTION_CLASSES,
  validateObjectTags, buildObjectTagSet, OBJECT_STORAGE_LAW,
} from './object-store/tag-policy';
export type { ObjectTagSet, RequiredObjectTag, OptionalObjectTag } from './object-store/tag-policy';

// Physical evaluator
export { evaluatePhysicalDesign, ALL_PG_TABLES, ALL_CLICKHOUSE_TABLES } from './physical-evaluator';
export type { PhysicalEvaluationResult } from './physical-evaluator';

// Physical invariants
export {
  ALL_PHYSICAL_INVARIANT_IDS, assertPhysicalInvariant,
  assertAllPhysicalInvariants, enforceAllPhysicalInvariants,
} from './physical-invariants';
export type { L5PhysicalInvariantId, PhysicalInvariantResult, PhysicalInvariantContext } from './physical-invariants';
