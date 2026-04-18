/**
 * L5.6 — l5.outbox_jobs
 *
 * §5.6.7.A.2 — Durable projection contract table.
 */

import { PgSchema } from '../postgres-schemas';

export const OUTBOX_JOBS_TABLE = {
  schema: PgSchema.L5,
  name: 'outbox_jobs',
  qualifiedName: 'l5.outbox_jobs',

  columns: {
    job_id:                { type: 'uuid',         nullable: false, primaryKey: true },
    manifest_id:           { type: 'uuid',         nullable: false },
    target_store:          { type: 'varchar(32)',   nullable: false },
    projection_category:   { type: 'varchar(48)',   nullable: false },
    job_type:              { type: 'varchar(64)',   nullable: false },
    required:              { type: 'boolean',       nullable: false },
    job_sequence:          { type: 'smallint',     nullable: false, default: 0 },
    dependency_job_id:     { type: 'uuid',         nullable: true },
    trace_id:              { type: 'uuid',         nullable: false },
    envelope_id:           { type: 'varchar(26)',   nullable: false },
    dedupe_key:            { type: 'varchar(128)',  nullable: false },
    projection_natural_key: { type: 'varchar(256)', nullable: false },
    payload_ref:           { type: 'text',         nullable: false },
    payload_hash_sha256:   { type: 'char(64)',      nullable: false },
    status:                { type: 'varchar(48)',   nullable: false },
    attempt_count:         { type: 'integer',      nullable: false, default: 0 },
    max_attempts:          { type: 'integer',      nullable: false, default: 10 },
    next_attempt_at:       { type: 'timestamptz',  nullable: true },
    last_started_at:       { type: 'timestamptz',  nullable: true },
    last_finished_at:      { type: 'timestamptz',  nullable: true },
    lease_owner:           { type: 'varchar(128)',  nullable: true },
    lease_expires_at:      { type: 'timestamptz',  nullable: true },
    last_error_code:       { type: 'varchar(64)',   nullable: true },
    last_error_message:    { type: 'text',         nullable: true },
    quarantine_flag:       { type: 'boolean',       nullable: false, default: false },
    created_at:            { type: 'timestamptz',  nullable: false, default: 'now()' },
    updated_at:            { type: 'timestamptz',  nullable: false, default: 'now()' },
  },

  uniqueConstraints: [
    ['manifest_id', 'job_sequence', 'target_store', 'projection_natural_key'],
    ['target_store', 'projection_natural_key', 'dedupe_key'],
  ],

  checkConstraints: [
    'attempt_count <= max_attempts',
    'dependency_job_id != job_id',
  ],

  indexes: [
    { columns: ['manifest_id'] },
    { columns: ['status'] },
    { columns: ['target_store', 'status', 'next_attempt_at'] },
    { columns: ['lease_owner', 'lease_expires_at'] },
    { columns: ['trace_id'] },
    { columns: ['target_store', 'projection_natural_key', 'dedupe_key'], unique: true },
    { columns: ['status'], partial: "status IN ('PENDING','FAILED_RETRYABLE')" },
  ],

  foreignKeys: [
    { columns: ['manifest_id'], references: 'l5.write_manifests(manifest_id)', onDelete: 'CASCADE' },
  ],

  partitionBy: { column: 'created_at', strategy: 'RANGE', granularity: 'monthly' },
} as const;

export const OUTBOX_JOBS_REQUIRED_COLUMNS = Object.keys(OUTBOX_JOBS_TABLE.columns);
export const OUTBOX_JOBS_LINEAGE_FIELDS = ['job_id', 'manifest_id', 'trace_id', 'envelope_id', 'dedupe_key'] as const;
