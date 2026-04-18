/**
 * L5.6 — ts_score_history_v1
 *
 * §5.6.9.4 — Historical score evolution.
 */

export const TS_SCORE_HISTORY_TABLE = {
  database: 'coinet',
  name: 'ts_score_history_v1',
  engine: 'MergeTree',

  columns: {
    manifest_id:                          { type: 'UUID',                    nullable: false },
    envelope_id:                          { type: 'String',                   nullable: false },
    trace_id:                             { type: 'UUID',                    nullable: false },
    dedupe_key:                           { type: 'String',                   nullable: false },
    score_id:                             { type: 'UUID',                    nullable: false },
    canonical_entity_id:                  { type: 'String',                   nullable: false },
    score_family:                         { type: 'LowCardinality(String)',  nullable: false },
    score_version:                        { type: 'LowCardinality(String)',  nullable: false },
    as_of:                                { type: "DateTime64(3, 'UTC')",    nullable: false },
    score_value:                          { type: 'Decimal(18, 6)',           nullable: false },
    score_band:                           { type: 'LowCardinality(String)',  nullable: false },
    confidence_band:                      { type: 'LowCardinality(String)',  nullable: false },
    feature_snapshot_archive_uri:         { type: 'Nullable(String)',         nullable: true },
    explanation_snapshot_archive_uri:     { type: 'Nullable(String)',         nullable: true },
    late_arrival_flag:                    { type: 'UInt8',                     nullable: false },
    schema_version:                       { type: 'LowCardinality(String)',  nullable: false },
  },

  partitionBy: "toYYYYMM(as_of)",
  orderKey: ['canonical_entity_id', 'score_family', 'as_of', 'dedupe_key'],

  dataSkippingIndices: [
    { name: 'idx_as_of', expression: 'as_of', type: 'minmax', granularity: 8192 },
  ],

  lineageFields: ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'],
} as const;
