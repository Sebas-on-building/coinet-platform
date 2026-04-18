/**
 * L5.6 — l5.manifest_transitions
 *
 * §5.6.7.A.4 — Durable lifecycle transition log.
 */

import { PgSchema } from '../postgres-schemas';

export const MANIFEST_TRANSITIONS_TABLE = {
  schema: PgSchema.L5,
  name: 'manifest_transitions',
  qualifiedName: 'l5.manifest_transitions',

  columns: {
    transition_id: { type: 'uuid',        nullable: false, primaryKey: true },
    manifest_id:   { type: 'uuid',        nullable: false },
    from_state:    { type: 'varchar(48)',  nullable: true },
    to_state:      { type: 'varchar(48)',  nullable: false },
    reason_code:   { type: 'varchar(64)',  nullable: true },
    failure_code:  { type: 'varchar(64)',  nullable: true },
    actor_type:    { type: 'varchar(32)',  nullable: false },
    actor_id:      { type: 'varchar(128)', nullable: false },
    created_at:    { type: 'timestamptz', nullable: false, default: 'now()' },
  },

  uniqueConstraints: [],
  checkConstraints: [],

  indexes: [
    { columns: ['manifest_id'] },
    { columns: ['manifest_id', 'created_at DESC'] },
  ],

  foreignKeys: [
    { columns: ['manifest_id'], references: 'l5.write_manifests(manifest_id)', onDelete: 'CASCADE' },
  ],

  partitionBy: { column: 'created_at', strategy: 'RANGE', granularity: 'monthly' },
} as const;

export const MANIFEST_TRANSITIONS_REQUIRED_COLUMNS = Object.keys(MANIFEST_TRANSITIONS_TABLE.columns);
