/**
 * L5.6 — l5.projection_receipts
 *
 * §5.6.7.A.5 — Physically enforces projection idempotency and completion truth.
 */

import { PgSchema } from '../postgres-schemas';

export const PROJECTION_RECEIPTS_TABLE = {
  schema: PgSchema.L5,
  name: 'projection_receipts',
  qualifiedName: 'l5.projection_receipts',

  columns: {
    projection_receipt_id: { type: 'uuid',         nullable: false, primaryKey: true },
    job_id:                { type: 'uuid',         nullable: false },
    manifest_id:           { type: 'uuid',         nullable: false },
    target_store:          { type: 'varchar(32)',   nullable: false },
    projection_natural_key: { type: 'varchar(256)', nullable: false },
    dedupe_key:            { type: 'varchar(128)',  nullable: false },
    trace_id:              { type: 'uuid',         nullable: false },
    status:                { type: 'varchar(48)',   nullable: false },
    first_succeeded_at:    { type: 'timestamptz',  nullable: true },
    last_seen_at:          { type: 'timestamptz',  nullable: false, default: 'now()' },
    created_at:            { type: 'timestamptz',  nullable: false, default: 'now()' },
  },

  uniqueConstraints: [
    ['target_store', 'projection_natural_key', 'dedupe_key'],
  ],

  checkConstraints: [],

  indexes: [
    { columns: ['manifest_id'] },
    { columns: ['job_id'] },
    { columns: ['trace_id'] },
  ],

  foreignKeys: [
    { columns: ['job_id'], references: 'l5.outbox_jobs(job_id)', onDelete: 'CASCADE' },
    { columns: ['manifest_id'], references: 'l5.write_manifests(manifest_id)', onDelete: 'CASCADE' },
  ],
} as const;

export const PROJECTION_RECEIPTS_REQUIRED_COLUMNS = Object.keys(PROJECTION_RECEIPTS_TABLE.columns);
