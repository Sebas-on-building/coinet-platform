/**
 * L5.6 — Physical Design: Schemas, Tables, Keys, Paths
 * Certification Test Suite
 *
 * Bands:
 *   A — Postgres contract integrity
 *   B — Manifest and outbox linkage
 *   C — Analytical physical law (ClickHouse)
 *   D — Redis and namespace law
 *   E — Object storage law
 *   F — Replay, repair lookup, and invariants
 */

import {
  // Schemas
  PgSchema, ALL_PG_SCHEMAS, SCHEMA_DEFINITIONS, FORBIDDEN_SCHEMA_NAMES, FORBIDDEN_TABLE_NAMES,
  isSchemaAllowed, isTableNameAllowed, schemaCreateDDL, allSchemasCreateDDL,
  JSONB_ALLOWED_ONLY_FOR, TYPED_COLUMN_DOMAINS,
  // PG tables — coordination
  WRITE_MANIFESTS_TABLE, WRITE_MANIFESTS_REQUIRED_COLUMNS, WRITE_MANIFESTS_LINEAGE_FIELDS,
  OUTBOX_JOBS_TABLE, OUTBOX_JOBS_REQUIRED_COLUMNS, OUTBOX_JOBS_LINEAGE_FIELDS,
  ARCHIVE_POINTERS_TABLE, ARCHIVE_POINTERS_REQUIRED_COLUMNS, ARCHIVE_POINTERS_LINEAGE_FIELDS,
  MANIFEST_TRANSITIONS_TABLE, MANIFEST_TRANSITIONS_REQUIRED_COLUMNS,
  PROJECTION_RECEIPTS_TABLE, PROJECTION_RECEIPTS_REQUIRED_COLUMNS,
  QUARANTINE_CASES_TABLE, QUARANTINE_CASES_REQUIRED_COLUMNS,
  // PG tables — domain
  WATCHLISTS_TABLE, WATCHLIST_ITEMS_TABLE, USER_SETTINGS_TABLE,
  SCORE_REGISTRY_TABLE, REPORT_REGISTRY_TABLE, AUDIT_EVENTS_TABLE,
  // ClickHouse
  TS_NUMERIC_FACT_TABLE, TS_OHLCV_BAR_TABLE, TS_FEATURE_FACT_TABLE, TS_SCORE_HISTORY_TABLE,
  // Redis
  RedisKeyFamily, ALL_REDIS_KEY_FAMILIES, TTL_POLICIES, getTTLPolicy,
  hotMetricKey, recentWindowKey, dedupeKey, alertCooldownKey,
  triggerActiveKey, featureCacheKey, contextCacheKey,
  isValidL5RedisKey, extractKeyFamily, validateRedisKeyNamespace,
  REDIS_VALUE_REQUIRED_FIELDS, validateRedisValueLineage,
  // Object storage
  ObjectPathFamily, ALL_OBJECT_PATH_FAMILIES,
  buildRawSourcePath, buildNormalizedEnvelopePath, buildBackfillPath,
  buildModelIOPath, buildReportRenderPath, buildSnapshotPath,
  buildReplayBundlePath, buildForensicExportPath,
  isValidL5ObjectPath, extractPathFamily, hasRequiredCompression, REQUIRED_COMPRESSION,
  REQUIRED_OBJECT_TAGS, RetentionClass, ALL_RETENTION_CLASSES,
  validateObjectTags, buildObjectTagSet, OBJECT_STORAGE_LAW,
  // Evaluator
  evaluatePhysicalDesign, ALL_PG_TABLES, ALL_CLICKHOUSE_TABLES,
  // Invariants
  ALL_PHYSICAL_INVARIANT_IDS, assertPhysicalInvariant, assertAllPhysicalInvariants, enforceAllPhysicalInvariants,
  type PhysicalInvariantContext,
} from '../l5/physical';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND A — Postgres Contract Integrity
// ═══════════════════════════════════════════════════════════════════════════════

function bandA(): void {
  // A1: Schema completeness
  assert(ALL_PG_SCHEMAS.length === 8, 'A1: 8 Postgres schemas');
  assert(ALL_PG_SCHEMAS.includes(PgSchema.L5), 'A2: L5 schema present');
  assert(ALL_PG_SCHEMAS.includes(PgSchema.USER_STATE), 'A3: USER_STATE schema present');
  assert(ALL_PG_SCHEMAS.includes(PgSchema.SCORING), 'A4: SCORING schema present');
  assert(ALL_PG_SCHEMAS.includes(PgSchema.REPORTS), 'A5: REPORTS schema present');
  assert(ALL_PG_SCHEMAS.includes(PgSchema.AUDIT), 'A6: AUDIT schema present');
  assert(ALL_PG_SCHEMAS.includes(PgSchema.OPS), 'A7: OPS schema present');

  // A8: Schema definitions have roles
  for (const s of ALL_PG_SCHEMAS) {
    assert(SCHEMA_DEFINITIONS[s].role.length > 0, `A8: Schema ${s} has a role`);
  }

  // A9: Forbidden schemas
  assert(!isSchemaAllowed('public'), 'A9: public schema forbidden');
  assert(isSchemaAllowed(PgSchema.L5), 'A10: l5 schema allowed');

  // A11: DDL generation
  const ddl = allSchemasCreateDDL();
  assert(ddl.includes('CREATE SCHEMA IF NOT EXISTS l5'), 'A11: DDL includes l5 schema');
  assert(ddl.includes('CREATE SCHEMA IF NOT EXISTS audit'), 'A12: DDL includes audit schema');

  // A13: Forbidden table names
  for (const name of FORBIDDEN_TABLE_NAMES) {
    assert(!isTableNameAllowed(name), `A13: Table name '${name}' is forbidden`);
  }
  assert(isTableNameAllowed('write_manifests'), 'A14: write_manifests is allowed');

  // A15: Core L5 tables present
  assert(ALL_PG_TABLES.length >= 6, 'A15: At least 6 core L5 PG tables');
  assert(WRITE_MANIFESTS_TABLE.qualifiedName === 'l5.write_manifests', 'A16: write_manifests qualified name');
  assert(OUTBOX_JOBS_TABLE.qualifiedName === 'l5.outbox_jobs', 'A17: outbox_jobs qualified name');
  assert(ARCHIVE_POINTERS_TABLE.qualifiedName === 'l5.archive_pointers', 'A18: archive_pointers qualified name');

  // A19: write_manifests required columns
  const wmCols = Object.keys(WRITE_MANIFESTS_TABLE.columns);
  assert(wmCols.includes('manifest_id'), 'A19: write_manifests has manifest_id');
  assert(wmCols.includes('envelope_id'), 'A20: write_manifests has envelope_id');
  assert(wmCols.includes('trace_id'), 'A21: write_manifests has trace_id');
  assert(wmCols.includes('dedupe_key'), 'A22: write_manifests has dedupe_key');
  assert(wmCols.includes('manifest_state'), 'A23: write_manifests has manifest_state');
  assert(wmCols.includes('payload_hash_sha256'), 'A24: write_manifests has payload_hash');
  assert(wmCols.includes('created_at'), 'A25: write_manifests has created_at');
  assert(wmCols.includes('updated_at'), 'A26: write_manifests has updated_at');
  assert(wmCols.includes('archive_required'), 'A27: write_manifests has archive_required');
  assert(wmCols.includes('finalized_at'), 'A28: write_manifests has finalized_at');

  // A29: Projection accounting columns
  assert(wmCols.includes('required_projection_total'), 'A29: write_manifests has required_projection_total');
  assert(wmCols.includes('required_projection_succeeded'), 'A30: write_manifests has required_projection_succeeded');
  assert(wmCols.includes('optional_projection_total'), 'A31: write_manifests has optional_projection_total');

  // A32: Domain registries exist
  assert(WATCHLISTS_TABLE.qualifiedName === 'user_state.watchlists', 'A32: watchlists table');
  assert(USER_SETTINGS_TABLE.qualifiedName === 'user_state.user_settings', 'A33: user_settings table');
  assert(SCORE_REGISTRY_TABLE.qualifiedName === 'scoring.score_registry', 'A34: score_registry table');
  assert(REPORT_REGISTRY_TABLE.qualifiedName === 'reports.report_registry', 'A35: report_registry table');
  assert(AUDIT_EVENTS_TABLE.qualifiedName === 'audit.audit_events', 'A36: audit_events table');

  // A37: JSONB discipline — only allowed where explicitly marked
  const settingsCols = USER_SETTINGS_TABLE.columns as Record<string, any>;
  assert(settingsCols.alert_preferences_jsonb?.type === 'jsonb', 'A37: user_settings JSONB for preferences');
  assert(settingsCols.alert_preferences_jsonb?.jsonbAllowed === true, 'A38: JSONB explicitly allowed');

  // A39: Column type discipline
  assert(TYPED_COLUMN_DOMAINS.length >= 8, 'A39: At least 8 typed column domains');
  assert(JSONB_ALLOWED_ONLY_FOR === 'sparse adjunct state', 'A40: JSONB restriction documented');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND B — Manifest and Outbox Linkage
// ═══════════════════════════════════════════════════════════════════════════════

function bandB(): void {
  // B1: Manifest unique constraints
  const wmUniques = WRITE_MANIFESTS_TABLE.uniqueConstraints;
  assert(wmUniques.some((u: readonly string[]) => u.includes('envelope_id')), 'B1: envelope_id unique');
  assert(wmUniques.some((u: readonly string[]) => u.includes('dedupe_key')), 'B2: dedupe_key unique');

  // B3: Manifest check constraints
  const wmChecks = WRITE_MANIFESTS_TABLE.checkConstraints;
  assert(wmChecks.length >= 2, 'B3: At least 2 check constraints on write_manifests');

  // B4: Manifest indexes
  const wmIndexes = WRITE_MANIFESTS_TABLE.indexes;
  assert(wmIndexes.some((i: { columns: readonly string[] }) => i.columns.includes('trace_id')), 'B4: trace_id indexed');
  assert(wmIndexes.some((i: { columns: readonly string[] }) => i.columns.includes('manifest_state')), 'B5: manifest_state indexed');
  assert(wmIndexes.some((i: { columns: readonly string[]; partial?: string }) => i.partial?.includes('FAILED_RETRYABLE')), 'B6: Retry scan partial index');
  assert(wmIndexes.some((i: { columns: readonly string[]; partial?: string }) => i.partial?.includes('quarantine_flag')), 'B7: Quarantine partial index');

  // B8: Outbox foreign key to manifest
  const ojFKs = OUTBOX_JOBS_TABLE.foreignKeys;
  assert(ojFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('manifest_id')), 'B8: outbox_jobs FK to manifest');

  // B9: Outbox unique constraints
  const ojUniques = OUTBOX_JOBS_TABLE.uniqueConstraints;
  assert(ojUniques.some((u: readonly string[]) => u.includes('target_store') && u.includes('projection_natural_key') && u.includes('dedupe_key')),
    'B9: outbox_jobs idempotency unique');

  // B10: Outbox check constraints
  const ojChecks = OUTBOX_JOBS_TABLE.checkConstraints;
  assert(ojChecks.some((c: string) => c.includes('attempt_count')), 'B10: attempt_count check');
  assert(ojChecks.some((c: string) => c.includes('dependency_job_id')), 'B11: self-dependency check');

  // B12: Outbox indexes
  const ojIndexes = OUTBOX_JOBS_TABLE.indexes;
  assert(ojIndexes.some((i: { columns: readonly string[] }) => i.columns.includes('manifest_id')), 'B12: outbox manifest_id indexed');
  assert(ojIndexes.some((i: { columns: readonly string[]; partial?: string }) => i.partial?.includes('PENDING')), 'B13: Pending jobs partial index');

  // B14: Archive pointer FK to manifest
  const apFKs = ARCHIVE_POINTERS_TABLE.foreignKeys;
  assert(apFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('manifest_id')), 'B14: archive_pointers FK to manifest');

  // B15: Archive pointer unique on URI
  const apUniques = ARCHIVE_POINTERS_TABLE.uniqueConstraints;
  assert(apUniques.some((u: readonly string[]) => u.includes('archive_uri')), 'B15: archive_uri unique');

  // B16: Manifest transitions FK
  const mtFKs = MANIFEST_TRANSITIONS_TABLE.foreignKeys;
  assert(mtFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('manifest_id')), 'B16: transitions FK to manifest');

  // B17: Projection receipts FK to both job and manifest
  const prFKs = PROJECTION_RECEIPTS_TABLE.foreignKeys;
  assert(prFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('job_id')), 'B17: receipts FK to job');
  assert(prFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('manifest_id')), 'B18: receipts FK to manifest');

  // B19: Projection receipts uniqueness
  const prUniques = PROJECTION_RECEIPTS_TABLE.uniqueConstraints;
  assert(prUniques.some((u: readonly string[]) => u.includes('target_store') && u.includes('projection_natural_key') && u.includes('dedupe_key')),
    'B19: projection receipts idempotency unique');

  // B20: Quarantine FK to manifest
  const qcFKs = QUARANTINE_CASES_TABLE.foreignKeys;
  assert(qcFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('manifest_id')), 'B20: quarantine FK to manifest');

  // B21: Score/report registries FK to manifest and archive
  const srFKs = SCORE_REGISTRY_TABLE.foreignKeys;
  assert(srFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('manifest_id')), 'B21: score_registry FK to manifest');
  assert(srFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('feature_snapshot_archive_id')), 'B22: score FK to archive');

  const rrFKs = REPORT_REGISTRY_TABLE.foreignKeys;
  assert(rrFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('manifest_id')), 'B23: report_registry FK to manifest');
  assert(rrFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('render_archive_id')), 'B24: report FK to archive');

  // B25: Audit events FK
  const aeFKs = AUDIT_EVENTS_TABLE.foreignKeys;
  assert(aeFKs.some((fk: { columns: readonly string[] }) => fk.columns.includes('manifest_id')), 'B25: audit_events FK to manifest');

  // B26: Lineage field sets
  assert(WRITE_MANIFESTS_LINEAGE_FIELDS.includes('manifest_id'), 'B26: manifest lineage includes manifest_id');
  assert(OUTBOX_JOBS_LINEAGE_FIELDS.includes('trace_id'), 'B27: outbox lineage includes trace_id');
  assert(ARCHIVE_POINTERS_LINEAGE_FIELDS.includes('archive_id'), 'B28: archive lineage includes archive_id');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND C — Analytical Physical Law (ClickHouse)
// ═══════════════════════════════════════════════════════════════════════════════

function bandC(): void {
  // C1: 4 ClickHouse table families
  assert(ALL_CLICKHOUSE_TABLES.length === 4, 'C1: 4 ClickHouse table families');

  // C2: All use MergeTree
  for (const t of ALL_CLICKHOUSE_TABLES) {
    assert(t.engine === 'MergeTree', `C2: ${t.name} uses MergeTree`);
  }

  // C3: All have lineage fields
  const requiredLineage = ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'];
  for (const t of ALL_CLICKHOUSE_TABLES) {
    for (const field of requiredLineage) {
      assert(t.lineageFields.includes(field as any), `C3: ${t.name} has lineage field ${field}`);
      assert(field in t.columns, `C4: ${t.name} column '${field}' exists`);
    }
  }

  // C5: Numeric fact specific
  assert(TS_NUMERIC_FACT_TABLE.name === 'ts_numeric_fact_v1', 'C5: numeric fact name');
  assert(TS_NUMERIC_FACT_TABLE.partitionBy === 'toYYYYMM(observed_at)', 'C6: numeric fact partition');
  assert(TS_NUMERIC_FACT_TABLE.orderKey.includes('metric_contract_id'), 'C7: numeric fact order key starts with metric');
  assert(TS_NUMERIC_FACT_TABLE.orderKey.includes('dedupe_key'), 'C8: numeric fact order key ends with dedupe');
  assert('value_decimal' in TS_NUMERIC_FACT_TABLE.columns, 'C9: numeric fact has value_decimal');
  assert('late_arrival_flag' in TS_NUMERIC_FACT_TABLE.columns, 'C10: numeric fact has late_arrival_flag');
  assert(TS_NUMERIC_FACT_TABLE.dataSkippingIndices.length >= 2, 'C11: numeric fact has data-skipping indices');

  // C12: OHLCV specific
  assert(TS_OHLCV_BAR_TABLE.name === 'ts_ohlcv_bar_v1', 'C12: OHLCV name');
  assert(TS_OHLCV_BAR_TABLE.orderKey.includes('canonical_pair_id'), 'C13: OHLCV keyed by pair');
  assert('open' in TS_OHLCV_BAR_TABLE.columns, 'C14: OHLCV has open');
  assert('high' in TS_OHLCV_BAR_TABLE.columns, 'C15: OHLCV has high');
  assert('low' in TS_OHLCV_BAR_TABLE.columns, 'C16: OHLCV has low');
  assert('close' in TS_OHLCV_BAR_TABLE.columns, 'C17: OHLCV has close');
  assert('volume_base' in TS_OHLCV_BAR_TABLE.columns, 'C18: OHLCV has volume_base');

  // C19: Feature fact specific
  assert(TS_FEATURE_FACT_TABLE.name === 'ts_feature_fact_v1', 'C19: feature fact name');
  assert('value_decimal' in TS_FEATURE_FACT_TABLE.columns, 'C20: feature fact has value_decimal');
  assert('value_text' in TS_FEATURE_FACT_TABLE.columns, 'C21: feature fact has value_text');
  assert('value_bool' in TS_FEATURE_FACT_TABLE.columns, 'C22: feature fact has value_bool');
  assert((TS_FEATURE_FACT_TABLE as any).valueKindLaw !== undefined, 'C23: feature fact value kind law defined');

  // C24: Score history specific
  assert(TS_SCORE_HISTORY_TABLE.name === 'ts_score_history_v1', 'C24: score history name');
  assert(TS_SCORE_HISTORY_TABLE.orderKey.includes('canonical_entity_id'), 'C25: score keyed by entity');
  assert(TS_SCORE_HISTORY_TABLE.orderKey.includes('as_of'), 'C26: score keyed by as_of');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND D — Redis and Namespace Law
// ═══════════════════════════════════════════════════════════════════════════════

function bandD(): void {
  // D1: 7 key families
  assert(ALL_REDIS_KEY_FAMILIES.length === 7, 'D1: 7 Redis key families');

  // D2: All families have TTL policies
  for (const family of ALL_REDIS_KEY_FAMILIES) {
    const policy = getTTLPolicy(family);
    assert(policy.defaultTTLSeconds > 0, `D2: ${family} has positive default TTL`);
    assert(policy.minTTLSeconds <= policy.defaultTTLSeconds, `D3: ${family} min <= default TTL`);
    assert(policy.defaultTTLSeconds <= policy.maxTTLSeconds, `D4: ${family} default <= max TTL`);
  }

  // D5: Key builders produce env-prefixed keys
  const env = 'prod';
  const metricK = hotMetricKey(env, 'price:spot', 'TOKEN', 'btc');
  assert(metricK.startsWith('prod:l5:'), 'D5: Hot metric key starts with env:l5:');
  assert(metricK.includes('hot:metric'), 'D6: Hot metric key includes family');

  const windowK = recentWindowKey(env, 'trades', 'PAIR', 'btc-usd');
  assert(windowK.startsWith('prod:l5:'), 'D7: Window key starts with env:l5:');

  const dedupeK = dedupeKey(env, 'ingestion-worker', 'dk123');
  assert(dedupeK.startsWith('prod:l5:'), 'D8: Dedupe key starts with env:l5:');

  const alertK = alertCooldownKey(env, 'user1', 'alert1', 'scope1');
  assert(alertK.startsWith('prod:l5:'), 'D9: Alert cooldown key starts with env:l5:');

  const triggerK = triggerActiveKey(env, 'price_cross', 'TOKEN', 'eth');
  assert(triggerK.startsWith('prod:l5:'), 'D10: Trigger key starts with env:l5:');

  const featureK = featureCacheKey(env, 'momentum', 'TOKEN', 'btc', '1h');
  assert(featureK.startsWith('prod:l5:'), 'D11: Feature cache key starts with env:l5:');

  const contextK = contextCacheKey(env, 'protocol:aave');
  assert(contextK.startsWith('prod:l5:'), 'D12: Context cache key starts with env:l5:');

  // D13: Namespace validation
  assert(isValidL5RedisKey(metricK), 'D13: Valid L5 Redis key');
  assert(!isValidL5RedisKey('bad:key:format'), 'D14: Invalid key rejected');
  assert(!isValidL5RedisKey('prod:bad:something'), 'D15: Missing l5: segment rejected');

  // D16: Key family extraction
  assert(extractKeyFamily(metricK) === RedisKeyFamily.HOT_METRIC, 'D16: Extract hot metric family');
  assert(extractKeyFamily(dedupeK) === RedisKeyFamily.DEDUPE, 'D17: Extract dedupe family');
  assert(extractKeyFamily('prod:l5:unknown:key') === null, 'D18: Unknown family returns null');

  // D19: Namespace validation with env
  const nsValid = validateRedisKeyNamespace(metricK, 'prod');
  assert(nsValid.valid, 'D19: Namespace valid for correct env');
  const nsInvalid = validateRedisKeyNamespace(metricK, 'staging');
  assert(!nsInvalid.valid, 'D20: Namespace invalid for wrong env');

  // D21: Redis value lineage validation
  const goodValue = { trace_id: 'tr1', manifest_id: 'mf1', schema_version: '1.0', value: 42 };
  assert(validateRedisValueLineage(goodValue).valid, 'D21: Valid Redis value lineage');
  const badValue = { value: 42 };
  const badResult = validateRedisValueLineage(badValue);
  assert(!badResult.valid, 'D22: Missing lineage fields detected');
  assert(badResult.missingFields.length === 3, 'D23: All 3 lineage fields missing');

  // D24: Required Redis value fields
  assert(REDIS_VALUE_REQUIRED_FIELDS.length === 3, 'D24: 3 required Redis value fields');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND E — Object Storage Law
// ═══════════════════════════════════════════════════════════════════════════════

function bandE(): void {
  // E1: 8 object path families
  assert(ALL_OBJECT_PATH_FAMILIES.length === 8, 'E1: 8 object path families');

  // E2: Path builders produce deterministic paths
  const rawPath = buildRawSourcePath({
    env: 'prod', bucket: 'coinet-data', sourceClass: 'price', provider: 'binance',
    traceId: 'trace-1', envelopeId: 'env-1', payloadHash: 'abc123',
    observedAt: new Date('2025-06-15T10:30:00Z'),
  });
  assert(rawPath.includes('coinet-data/prod/coinet-l5/raw/'), 'E2: Raw path has correct root');
  assert(rawPath.includes('source_class=price'), 'E3: Raw path has source_class');
  assert(rawPath.includes('provider=binance'), 'E4: Raw path has provider');
  assert(rawPath.includes('yyyy=2025'), 'E5: Raw path has year');
  assert(rawPath.includes('mm=06'), 'E6: Raw path has month');
  assert(rawPath.endsWith('.json.zst'), 'E7: Raw path has .json.zst');

  const normPath = buildNormalizedEnvelopePath({
    env: 'prod', bucket: 'coinet-data', producerService: 'worker-1',
    traceId: 'trace-2', envelopeId: 'env-2',
    observedAt: new Date('2025-03-10T00:00:00Z'),
  });
  assert(normPath.includes('/normalized/'), 'E8: Normalized path family');
  assert(normPath.endsWith('.json.zst'), 'E9: Normalized compressed');

  const backfillPath = buildBackfillPath({ env: 'prod', bucket: 'b', jobId: 'j1', partNumber: 3, payloadHash: 'h1' });
  assert(backfillPath.includes('/backfill/'), 'E10: Backfill path family');
  assert(backfillPath.endsWith('.parquet.zst'), 'E11: Backfill parquet compressed');

  const modelPath = buildModelIOPath({ env: 'prod', bucket: 'b', modelName: 'risk_v2', runId: 'r1', kind: 'input', payloadHash: 'h2' });
  assert(modelPath.includes('/model_io/'), 'E12: Model IO path family');

  const reportPath = buildReportRenderPath({ env: 'prod', bucket: 'b', reportId: 'rpt1', reportVersion: 'v1', payloadHash: 'h3' });
  assert(reportPath.includes('/reports/'), 'E13: Report path family');
  assert(reportPath.endsWith('.html.zst'), 'E14: Report HTML compressed');

  const snapPath = buildSnapshotPath({ env: 'prod', bucket: 'b', scoreId: 's1', kind: 'feature', payloadHash: 'h4' });
  assert(snapPath.includes('/snapshots/'), 'E15: Snapshot path family');

  const replayPath = buildReplayBundlePath({ env: 'prod', bucket: 'b', replayWindowId: 'rw1', traceId: 't1', payloadHash: 'h5' });
  assert(replayPath.includes('/replay/'), 'E16: Replay path family');

  const forensicPath = buildForensicExportPath({ env: 'prod', bucket: 'b', caseId: 'c1', traceId: 't2', payloadHash: 'h6' });
  assert(forensicPath.includes('/forensics/'), 'E17: Forensic path family');

  // E18: Path validation
  assert(isValidL5ObjectPath(rawPath), 'E18: Raw path valid');
  assert(!isValidL5ObjectPath('/random/bad/path'), 'E19: Random path invalid');

  // E20: Path family extraction
  assert(extractPathFamily(rawPath) === ObjectPathFamily.RAW_SOURCE, 'E20: Extract raw family');
  assert(extractPathFamily(replayPath) === ObjectPathFamily.REPLAY_BUNDLE, 'E21: Extract replay family');

  // E22: Compression requirement
  assert(hasRequiredCompression(rawPath), 'E22: Raw path has compression');
  assert(!hasRequiredCompression('bad/path.json'), 'E23: No compression fails');
  assert(REQUIRED_COMPRESSION === '.zst', 'E24: Required compression is .zst');

  // E25: Required object tags
  assert(REQUIRED_OBJECT_TAGS.length === 9, 'E25: 9 required object tags');

  // E26: Tag validation
  const goodTags = {
    trace_id: 'tr1', envelope_id: 'env1', source_provider: 'binance',
    producer_service: 'worker-1', schema_version: '1.0',
    retention_class: RetentionClass.IMMUTABLE_FOREVER,
    content_type: 'application/json', compression: 'zstd',
    checksum_sha256: 'abc123def',
  };
  const tagResult = validateObjectTags(goodTags);
  assert(tagResult.valid, 'E26: Valid tags pass');

  const badTags = { trace_id: 'tr1' };
  const badTagResult = validateObjectTags(badTags);
  assert(!badTagResult.valid, 'E27: Incomplete tags fail');
  assert(badTagResult.missingTags.length > 0, 'E28: Missing tags identified');

  // E29: Retention classes
  assert(ALL_RETENTION_CLASSES.length === 4, 'E29: 4 retention classes');

  // E30: Object storage law
  assert(OBJECT_STORAGE_LAW.immutableByDefault, 'E30: Immutable by default');
  assert(OBJECT_STORAGE_LAW.checksumRequired, 'E31: Checksum required');
  assert(OBJECT_STORAGE_LAW.compressionRequired, 'E32: Compression required');
  assert(OBJECT_STORAGE_LAW.anonymousBlobsForbidden, 'E33: Anonymous blobs forbidden');
  assert(OBJECT_STORAGE_LAW.deterministicPathRequired, 'E34: Deterministic path required');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND F — Replay, Repair Lookup, and Invariants
// ═══════════════════════════════════════════════════════════════════════════════

function bandF(): void {
  // F1: Physical evaluator produces clean result
  const evalResult = evaluatePhysicalDesign();
  assert(evalResult.pgSchemasPresent === 8, 'F1: Evaluator sees 8 schemas');
  assert(evalResult.pgTablesPresent >= 6, 'F2: Evaluator sees >= 6 PG tables');
  assert(evalResult.clickhouseTablesPresent === 4, 'F3: Evaluator sees 4 CH tables');
  assert(evalResult.redisKeyFamiliesPresent === 7, 'F4: Evaluator sees 7 Redis families');
  assert(evalResult.objectPathFamiliesPresent === 8, 'F5: Evaluator sees 8 object families');
  assert(evalResult.crossStoreSpineIntact, 'F6: Cross-store spine intact');
  assert(evalResult.issues.length === 0, 'F7: No physical design issues');

  // F8: All 12 invariant IDs
  assert(ALL_PHYSICAL_INVARIANT_IDS.length === 12, 'F8: 12 physical invariants');

  // F9: Invariant context — all good
  const goodCtx: PhysicalInvariantContext = {
    manifestHasEnvelopeId: true,
    outboxJobHasManifestId: true,
    archiveRequiredManifestHasArchivePointer: true,
    outboxJobCountMatchesManifestCounters: true,
    clickhouseRowLineageFields: ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'],
    redisKeys: [hotMetricKey('prod', 'price', 'TOKEN', 'btc'), dedupeKey('prod', 'w1', 'dk1')],
    objectPaths: [buildRawSourcePath({
      env: 'prod', bucket: 'b', sourceClass: 'price', provider: 'binance',
      traceId: 't1', envelopeId: 'e1', payloadHash: 'h1',
      observedAt: new Date('2025-01-01'),
    })],
    objectTags: [{
      trace_id: 'tr', envelope_id: 'env', source_provider: 'bin',
      producer_service: 'w', schema_version: '1', retention_class: 'IMMUTABLE_FOREVER',
      content_type: 'application/json', compression: 'zstd', checksum_sha256: 'abc',
    }],
    jsonbOnPrimaryQueryPath: false,
    tableNames: ['write_manifests', 'outbox_jobs', 'archive_pointers'],
    duplicateAnalyticalOverwrite: false,
    archiveLinkageViaTypedRef: true,
    replayFromTraceIdReachesAll: true,
  };
  const allResults = assertAllPhysicalInvariants(goodCtx);
  assert(allResults.length === 12, 'F9: 12 invariant results');
  assert(allResults.every(r => r.passed), 'F10: All invariants pass for valid context');

  // F11: Specific invariant failures
  assert(!assertPhysicalInvariant('INV-5.6-A', { manifestHasEnvelopeId: false }).passed, 'F11: INV-5.6-A fails on missing envelope');
  assert(!assertPhysicalInvariant('INV-5.6-B', { outboxJobHasManifestId: false }).passed, 'F12: INV-5.6-B fails on missing manifest FK');
  assert(!assertPhysicalInvariant('INV-5.6-C', { archiveRequiredManifestHasArchivePointer: false }).passed, 'F13: INV-5.6-C fails on missing archive');
  assert(!assertPhysicalInvariant('INV-5.6-E', { clickhouseRowLineageFields: ['manifest_id'] }).passed, 'F14: INV-5.6-E fails on missing CH lineage');
  assert(!assertPhysicalInvariant('INV-5.6-F', { redisKeys: ['bad:key:no:l5'], redisEnv: 'prod' }).passed, 'F15: INV-5.6-F fails on bad Redis key');
  assert(!assertPhysicalInvariant('INV-5.6-H', { jsonbOnPrimaryQueryPath: true }).passed, 'F16: INV-5.6-H fails on JSONB primary path');
  assert(!assertPhysicalInvariant('INV-5.6-I', { tableNames: ['events', 'misc'] }).passed, 'F17: INV-5.6-I fails on shapeless tables');
  assert(!assertPhysicalInvariant('INV-5.6-J', { duplicateAnalyticalOverwrite: true }).passed, 'F18: INV-5.6-J fails on silent overwrite');
  assert(!assertPhysicalInvariant('INV-5.6-K', { archiveLinkageViaTypedRef: false }).passed, 'F19: INV-5.6-K fails on opaque archive ref');
  assert(!assertPhysicalInvariant('INV-5.6-L', { replayFromTraceIdReachesAll: false }).passed, 'F20: INV-5.6-L fails on broken replay path');

  // F21: Object path with missing tags fails INV-5.6-G
  const badObjCtx: PhysicalInvariantContext = {
    objectTags: [{ trace_id: 'tr', envelope_id: undefined } as any],
  };
  assert(!assertPhysicalInvariant('INV-5.6-G', badObjCtx).passed, 'F21: INV-5.6-G fails on missing tags');

  // F22: Enforce throws
  let threw = false;
  try { enforceAllPhysicalInvariants({ manifestHasEnvelopeId: false }); } catch { threw = true; }
  assert(threw, 'F22: enforceAllPhysicalInvariants throws');

  // F23: Cross-store spine verification
  const spineFields = ['manifest_id', 'trace_id', 'envelope_id'];
  for (const f of spineFields) {
    assert(f in WRITE_MANIFESTS_TABLE.columns, `F23: write_manifests has spine field ${f}`);
    assert(f in OUTBOX_JOBS_TABLE.columns, `F24: outbox_jobs has spine field ${f}`);
    assert(f in ARCHIVE_POINTERS_TABLE.columns, `F25: archive_pointers has spine field ${f}`);
  }

  // F26: ClickHouse tables all carry spine fields
  for (const table of ALL_CLICKHOUSE_TABLES) {
    for (const f of ['manifest_id', 'trace_id', 'dedupe_key']) {
      assert(f in table.columns, `F26: CH ${table.name} has ${f}`);
    }
  }

  // F27: Partition strategy correctness
  assert(WRITE_MANIFESTS_TABLE.partitionBy?.strategy === 'RANGE', 'F27: write_manifests partitioned by RANGE');
  assert(OUTBOX_JOBS_TABLE.partitionBy?.strategy === 'RANGE', 'F28: outbox_jobs partitioned by RANGE');
  assert(AUDIT_EVENTS_TABLE.partitionBy?.strategy === 'RANGE', 'F29: audit_events partitioned by RANGE');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════');
console.log(' L5.6 Physical Design Certification Suite');
console.log('═══════════════════════════════════════════');

const t0 = Date.now();

try { bandA(); console.log(`  Band A (Postgres contract integrity): ✓`); } catch (e) { console.error(`  Band A CRASHED:`, e); }
try { bandB(); console.log(`  Band B (Manifest & outbox linkage): ✓`); } catch (e) { console.error(`  Band B CRASHED:`, e); }
try { bandC(); console.log(`  Band C (Analytical physical law): ✓`); } catch (e) { console.error(`  Band C CRASHED:`, e); }
try { bandD(); console.log(`  Band D (Redis & namespace law): ✓`); } catch (e) { console.error(`  Band D CRASHED:`, e); }
try { bandE(); console.log(`  Band E (Object storage law): ✓`); } catch (e) { console.error(`  Band E CRASHED:`, e); }
try { bandF(); console.log(`  Band F (Replay, repair & invariants): ✓`); } catch (e) { console.error(`  Band F CRASHED:`, e); }

console.log('───────────────────────────────────────────');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
if (failures.length > 0) {
  console.log('  Failures:');
  failures.forEach(f => console.log(`    ✗ ${f}`));
}
console.log(`  Time: ${Date.now() - t0}ms`);
console.log('═══════════════════════════════════════════');

if (failed > 0) process.exit(1);
