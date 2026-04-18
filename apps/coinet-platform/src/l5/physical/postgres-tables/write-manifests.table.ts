/**
 * L5.6 — l5.write_manifests
 *
 * §5.6.7.A.1 — Durable heart of L5.5 coordination.
 * One row per governed coordinated write lifecycle.
 */

import { PgSchema } from '../postgres-schemas';

export const WRITE_MANIFESTS_TABLE = {
  schema: PgSchema.L5,
  name: 'write_manifests',
  qualifiedName: 'l5.write_manifests',

  columns: {
    manifest_id:                    { type: 'uuid',         nullable: false, primaryKey: true },
    envelope_id:                    { type: 'varchar(26)',   nullable: false },
    trace_id:                       { type: 'uuid',         nullable: false },
    correlation_id:                 { type: 'uuid',         nullable: true },
    parent_manifest_id:             { type: 'uuid',         nullable: true },
    producer_service:               { type: 'varchar(64)',   nullable: false },
    producer_layer:                 { type: 'varchar(32)',   nullable: false },
    ingress_mode:                   { type: 'varchar(32)',   nullable: false },
    derivation_kind:                { type: 'varchar(32)',   nullable: false },
    write_class:                    { type: 'varchar(48)',   nullable: false },
    primary_state_class:            { type: 'varchar(48)',   nullable: false },
    primary_authority_store:        { type: 'varchar(32)',   nullable: false },
    authority_tier:                 { type: 'varchar(48)',   nullable: false },
    canonical_scope_type:           { type: 'varchar(48)',   nullable: false },
    canonical_scope_id:             { type: 'varchar(128)',  nullable: false },
    authority_scope_type:           { type: 'varchar(48)',   nullable: false },
    authority_scope_id:             { type: 'varchar(128)',  nullable: false },
    manifest_state:                 { type: 'varchar(48)',   nullable: false },
    repairability_class:            { type: 'varchar(48)',   nullable: true },
    quarantine_flag:                { type: 'boolean',       nullable: false, default: false },
    late_arrival_flag:              { type: 'boolean',       nullable: false, default: false },
    schema_version:                 { type: 'varchar(32)',   nullable: false },
    payload_hash_sha256:            { type: 'char(64)',      nullable: false },
    dedupe_key:                     { type: 'varchar(128)',  nullable: false },
    archive_required:               { type: 'boolean',       nullable: false },
    replay_required:                { type: 'boolean',       nullable: false },
    archive_id:                     { type: 'uuid',         nullable: true },
    archive_uri:                    { type: 'text',         nullable: true },
    archive_checksum:               { type: 'char(64)',      nullable: true },
    archive_content_length:         { type: 'bigint',       nullable: true },
    archive_content_type:           { type: 'varchar(128)',  nullable: true },
    required_projection_total:      { type: 'smallint',     nullable: false, default: 0 },
    required_projection_succeeded:  { type: 'smallint',     nullable: false, default: 0 },
    required_projection_failed:     { type: 'smallint',     nullable: false, default: 0 },
    optional_projection_total:      { type: 'smallint',     nullable: false, default: 0 },
    optional_projection_succeeded:  { type: 'smallint',     nullable: false, default: 0 },
    optional_projection_failed:     { type: 'smallint',     nullable: false, default: 0 },
    retry_count:                    { type: 'integer',      nullable: false, default: 0 },
    last_failure_code:              { type: 'varchar(64)',   nullable: true },
    last_failure_reason:            { type: 'text',         nullable: true },
    next_retry_at:                  { type: 'timestamptz',  nullable: true },
    last_retry_at:                  { type: 'timestamptz',  nullable: true },
    declared_at:                    { type: 'timestamptz',  nullable: false },
    archive_completed_at:           { type: 'timestamptz',  nullable: true },
    primary_authority_committed_at: { type: 'timestamptz',  nullable: true },
    outbox_emitted_at:              { type: 'timestamptz',  nullable: true },
    required_projections_completed_at: { type: 'timestamptz', nullable: true },
    finalized_at:                   { type: 'timestamptz',  nullable: true },
    quarantined_at:                 { type: 'timestamptz',  nullable: true },
    created_at:                     { type: 'timestamptz',  nullable: false, default: 'now()' },
    updated_at:                     { type: 'timestamptz',  nullable: false, default: 'now()' },
  },

  uniqueConstraints: [
    ['envelope_id'],
    ['dedupe_key'],
  ],

  checkConstraints: [
    'required_projection_succeeded + required_projection_failed <= required_projection_total',
    'optional_projection_succeeded + optional_projection_failed <= optional_projection_total',
  ],

  indexes: [
    { columns: ['dedupe_key'], unique: true },
    { columns: ['trace_id'] },
    { columns: ['manifest_state'] },
    { columns: ['canonical_scope_type', 'canonical_scope_id', 'created_at DESC'] },
    { columns: ['authority_scope_type', 'authority_scope_id', 'created_at DESC'] },
    { columns: ['manifest_state'], partial: "manifest_state IN ('FAILED_RETRYABLE','REQUIRED_PROJECTIONS_PARTIAL','OPTIONAL_PROJECTIONS_PARTIAL')" },
    { columns: ['late_arrival_flag'], partial: 'late_arrival_flag = true' },
    { columns: ['quarantine_flag'], partial: 'quarantine_flag = true' },
  ],

  foreignKeys: [],

  partitionBy: { column: 'created_at', strategy: 'RANGE', granularity: 'monthly' },
} as const;

export const WRITE_MANIFESTS_REQUIRED_COLUMNS = Object.keys(WRITE_MANIFESTS_TABLE.columns);
export const WRITE_MANIFESTS_LINEAGE_FIELDS = ['manifest_id', 'envelope_id', 'trace_id', 'dedupe_key'] as const;
