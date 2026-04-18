/**
 * L5.6 — l5.archive_pointers
 *
 * §5.6.7.A.3 — Relational bridge from mutable coordination to immutable artifacts.
 */

import { PgSchema } from '../postgres-schemas';

export const ARCHIVE_POINTERS_TABLE = {
  schema: PgSchema.L5,
  name: 'archive_pointers',
  qualifiedName: 'l5.archive_pointers',

  columns: {
    archive_id:       { type: 'uuid',         nullable: false, primaryKey: true },
    manifest_id:      { type: 'uuid',         nullable: true },
    trace_id:         { type: 'uuid',         nullable: false },
    envelope_id:      { type: 'varchar(26)',   nullable: false },
    archive_class:    { type: 'varchar(64)',   nullable: false },
    archive_uri:      { type: 'text',         nullable: false },
    checksum_sha256:  { type: 'char(64)',      nullable: false },
    content_type:     { type: 'varchar(128)',  nullable: false },
    compression:      { type: 'varchar(32)',   nullable: false },
    size_bytes:       { type: 'bigint',       nullable: false },
    retention_class:  { type: 'varchar(32)',   nullable: false },
    producer_service: { type: 'varchar(64)',   nullable: false },
    source_provider:  { type: 'varchar(64)',   nullable: true },
    schema_version:   { type: 'varchar(32)',   nullable: false },
    created_at:       { type: 'timestamptz',  nullable: false, default: 'now()' },
  },

  uniqueConstraints: [
    ['archive_uri'],
  ],

  checkConstraints: [],

  indexes: [
    { columns: ['archive_uri'], unique: true },
    { columns: ['manifest_id'] },
    { columns: ['trace_id'] },
    { columns: ['archive_class', 'created_at DESC'] },
  ],

  foreignKeys: [
    { columns: ['manifest_id'], references: 'l5.write_manifests(manifest_id)', onDelete: 'SET NULL' },
  ],
} as const;

export const ARCHIVE_POINTERS_REQUIRED_COLUMNS = Object.keys(ARCHIVE_POINTERS_TABLE.columns);
export const ARCHIVE_POINTERS_LINEAGE_FIELDS = ['archive_id', 'manifest_id', 'trace_id', 'envelope_id'] as const;
