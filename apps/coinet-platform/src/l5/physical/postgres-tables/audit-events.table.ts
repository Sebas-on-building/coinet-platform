/**
 * L5.6 — audit.audit_events
 *
 * §5.6.7.B.6
 */

import { PgSchema } from '../postgres-schemas';

export const AUDIT_EVENTS_TABLE = {
  schema: PgSchema.AUDIT,
  name: 'audit_events',
  qualifiedName: 'audit.audit_events',

  columns: {
    audit_event_id:    { type: 'uuid',        nullable: false, primaryKey: true },
    manifest_id:       { type: 'uuid',        nullable: true },
    trace_id:          { type: 'uuid',        nullable: false },
    actor_type:        { type: 'varchar(32)',  nullable: false },
    actor_id:          { type: 'varchar(128)', nullable: false },
    object_type:       { type: 'varchar(64)',  nullable: false },
    object_id:         { type: 'varchar(128)', nullable: false },
    action_type:       { type: 'varchar(64)',  nullable: false },
    reason_code:       { type: 'varchar(64)',  nullable: true },
    before_archive_id: { type: 'uuid',        nullable: true },
    after_archive_id:  { type: 'uuid',        nullable: true },
    created_at:        { type: 'timestamptz', nullable: false },
  },

  uniqueConstraints: [],
  checkConstraints: [],

  indexes: [
    { columns: ['trace_id'] },
    { columns: ['object_type', 'object_id', 'created_at DESC'] },
  ],

  foreignKeys: [
    { columns: ['manifest_id'], references: 'l5.write_manifests(manifest_id)', onDelete: 'SET NULL' },
    { columns: ['before_archive_id'], references: 'l5.archive_pointers(archive_id)', onDelete: 'SET NULL' },
    { columns: ['after_archive_id'], references: 'l5.archive_pointers(archive_id)', onDelete: 'SET NULL' },
  ],

  partitionBy: { column: 'created_at', strategy: 'RANGE', granularity: 'monthly' },
} as const;
