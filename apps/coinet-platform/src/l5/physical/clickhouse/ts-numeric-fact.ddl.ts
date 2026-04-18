/**
 * L5.6 — ts_numeric_fact_v1
 *
 * §5.6.9.1 — Scalar numerical facts (prices, TVL, fees, OI, funding, etc.)
 */

export const TS_NUMERIC_FACT_TABLE = {
  database: 'coinet',
  name: 'ts_numeric_fact_v1',
  engine: 'MergeTree',

  columns: {
    manifest_id:          { type: 'UUID',                              nullable: false },
    envelope_id:          { type: 'String',                            nullable: false },
    trace_id:             { type: 'UUID',                              nullable: false },
    dedupe_key:           { type: 'String',                            nullable: false },
    metric_contract_id:   { type: 'LowCardinality(String)',            nullable: false },
    metric_path:          { type: 'LowCardinality(String)',            nullable: false },
    canonical_scope_type: { type: 'LowCardinality(String)',            nullable: false },
    canonical_scope_id:   { type: 'String',                            nullable: false },
    authority_scope_type: { type: 'LowCardinality(String)',            nullable: false },
    authority_scope_id:   { type: 'String',                            nullable: false },
    chain_id:             { type: 'Nullable(String)',                   nullable: true },
    venue_id:             { type: 'Nullable(String)',                   nullable: true },
    interval:             { type: 'LowCardinality(String)',            nullable: false },
    source_provider:      { type: 'LowCardinality(String)',            nullable: false },
    source_event_id:      { type: 'Nullable(String)',                   nullable: true },
    observed_at:          { type: "DateTime64(3, 'UTC')",              nullable: false },
    ingested_at:          { type: "DateTime64(3, 'UTC')",              nullable: false },
    effective_at:         { type: "Nullable(DateTime64(3, 'UTC'))",    nullable: true },
    value_decimal:        { type: 'Decimal(38, 18)',                    nullable: false },
    unit:                 { type: 'LowCardinality(String)',            nullable: false },
    quality_state:        { type: 'LowCardinality(String)',            nullable: false },
    confidence_band:      { type: 'LowCardinality(String)',            nullable: false },
    late_arrival_flag:    { type: 'UInt8',                              nullable: false },
    archive_uri:          { type: 'Nullable(String)',                   nullable: true },
    schema_version:       { type: 'LowCardinality(String)',            nullable: false },
  },

  partitionBy: "toYYYYMM(observed_at)",
  orderKey: ['metric_contract_id', 'canonical_scope_id', 'interval', 'observed_at', 'dedupe_key'],

  dataSkippingIndices: [
    { name: 'idx_observed_at', expression: 'observed_at', type: 'minmax', granularity: 8192 },
    { name: 'idx_source_provider', expression: 'source_provider', type: 'set(64)', granularity: 8192 },
  ],

  lineageFields: ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'],
} as const;
