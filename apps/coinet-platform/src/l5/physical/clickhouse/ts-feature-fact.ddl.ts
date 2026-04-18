/**
 * L5.6 — ts_feature_fact_v1
 *
 * §5.6.9.3 — Derived feature histories.
 */

export const TS_FEATURE_FACT_TABLE = {
  database: 'coinet',
  name: 'ts_feature_fact_v1',
  engine: 'MergeTree',

  columns: {
    manifest_id:                  { type: 'UUID',                            nullable: false },
    envelope_id:                  { type: 'String',                           nullable: false },
    trace_id:                     { type: 'UUID',                            nullable: false },
    dedupe_key:                   { type: 'String',                           nullable: false },
    feature_set:                  { type: 'LowCardinality(String)',           nullable: false },
    feature_name:                 { type: 'LowCardinality(String)',           nullable: false },
    feature_version:              { type: 'LowCardinality(String)',           nullable: false },
    canonical_scope_type:         { type: 'LowCardinality(String)',           nullable: false },
    canonical_scope_id:           { type: 'String',                           nullable: false },
    interval:                     { type: 'LowCardinality(String)',           nullable: false },
    observed_at:                  { type: "DateTime64(3, 'UTC')",            nullable: false },
    value_kind:                   { type: 'LowCardinality(String)',           nullable: false },
    value_decimal:                { type: 'Nullable(Decimal(38, 18))',        nullable: true },
    value_text:                   { type: 'Nullable(String)',                 nullable: true },
    value_bool:                   { type: 'Nullable(UInt8)',                  nullable: true },
    quality_state:                { type: 'LowCardinality(String)',           nullable: false },
    input_snapshot_archive_uri:   { type: 'Nullable(String)',                 nullable: true },
    late_arrival_flag:            { type: 'UInt8',                             nullable: false },
    schema_version:               { type: 'LowCardinality(String)',           nullable: false },
  },

  partitionBy: "toYYYYMM(observed_at)",
  orderKey: ['feature_set', 'feature_name', 'canonical_scope_id', 'interval', 'observed_at', 'dedupe_key'],

  dataSkippingIndices: [
    { name: 'idx_observed_at', expression: 'observed_at', type: 'minmax', granularity: 8192 },
  ],

  lineageFields: ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'],

  valueKindLaw: 'Exactly one of value_decimal, value_text, or value_bool must be populated per row',
} as const;
