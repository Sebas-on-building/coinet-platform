/**
 * L5.6 — l5.quarantine_cases
 *
 * §5.6.7.A.6 — First-class quarantine tracking.
 */

import { PgSchema } from '../postgres-schemas';

export const QUARANTINE_CASES_TABLE = {
  schema: PgSchema.L5,
  name: 'quarantine_cases',
  qualifiedName: 'l5.quarantine_cases',

  columns: {
    quarantine_case_id: { type: 'uuid',        nullable: false, primaryKey: true },
    manifest_id:        { type: 'uuid',        nullable: true },
    envelope_id:        { type: 'varchar(26)',  nullable: false },
    trace_id:           { type: 'uuid',        nullable: false },
    case_class:         { type: 'varchar(64)',  nullable: false },
    reason_codes:       { type: 'jsonb',       nullable: false, jsonbAllowed: true },
    status:             { type: 'varchar(32)',  nullable: false },
    review_notes:       { type: 'text',        nullable: true },
    resolved_by:        { type: 'varchar(128)', nullable: true },
    resolved_at:        { type: 'timestamptz', nullable: true },
    created_at:         { type: 'timestamptz', nullable: false, default: 'now()' },
    updated_at:         { type: 'timestamptz', nullable: false, default: 'now()' },
  },

  uniqueConstraints: [],
  checkConstraints: [],

  indexes: [
    { columns: ['trace_id'] },
    { columns: ['status'] },
    { columns: ['status'], partial: "status != 'RESOLVED'" },
  ],

  foreignKeys: [
    { columns: ['manifest_id'], references: 'l5.write_manifests(manifest_id)', onDelete: 'SET NULL' },
  ],
} as const;

export const QUARANTINE_CASES_REQUIRED_COLUMNS = Object.keys(QUARANTINE_CASES_TABLE.columns);
