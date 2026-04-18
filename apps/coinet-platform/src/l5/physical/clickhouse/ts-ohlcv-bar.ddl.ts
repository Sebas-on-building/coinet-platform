/**
 * L5.6 — ts_ohlcv_bar_v1
 *
 * §5.6.9.2 — OHLCV bars only.
 */

export const TS_OHLCV_BAR_TABLE = {
  database: 'coinet',
  name: 'ts_ohlcv_bar_v1',
  engine: 'MergeTree',

  columns: {
    manifest_id:      { type: 'UUID',                   nullable: false },
    envelope_id:      { type: 'String',                  nullable: false },
    trace_id:         { type: 'UUID',                   nullable: false },
    dedupe_key:       { type: 'String',                  nullable: false },
    canonical_pair_id: { type: 'String',                  nullable: false },
    market_type:      { type: 'LowCardinality(String)',  nullable: false },
    venue_id:         { type: 'Nullable(String)',         nullable: true },
    interval:         { type: 'LowCardinality(String)',  nullable: false },
    open_time:        { type: "DateTime64(3, 'UTC')",    nullable: false },
    close_time:       { type: "DateTime64(3, 'UTC')",    nullable: false },
    open:             { type: 'Decimal(38, 18)',          nullable: false },
    high:             { type: 'Decimal(38, 18)',          nullable: false },
    low:              { type: 'Decimal(38, 18)',          nullable: false },
    close:            { type: 'Decimal(38, 18)',          nullable: false },
    volume_base:      { type: 'Decimal(38, 18)',          nullable: false },
    volume_quote:     { type: 'Decimal(38, 18)',          nullable: false },
    trade_count:      { type: 'UInt64',                   nullable: false },
    quality_state:    { type: 'LowCardinality(String)',  nullable: false },
    source_provider:  { type: 'LowCardinality(String)',  nullable: false },
    late_arrival_flag: { type: 'UInt8',                   nullable: false },
    archive_uri:      { type: 'Nullable(String)',         nullable: true },
    schema_version:   { type: 'LowCardinality(String)',  nullable: false },
  },

  partitionBy: "toYYYYMM(open_time)",
  orderKey: ['canonical_pair_id', 'venue_id', 'interval', 'open_time', 'dedupe_key'],

  dataSkippingIndices: [
    { name: 'idx_open_time', expression: 'open_time', type: 'minmax', granularity: 8192 },
  ],

  lineageFields: ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'],
} as const;
