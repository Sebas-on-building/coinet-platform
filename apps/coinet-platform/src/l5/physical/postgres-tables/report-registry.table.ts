/**
 * L5.6 — reports.report_registry
 *
 * §5.6.7.B.5
 */

import { PgSchema } from '../postgres-schemas';

export const REPORT_REGISTRY_TABLE = {
  schema: PgSchema.REPORTS,
  name: 'report_registry',
  qualifiedName: 'reports.report_registry',

  columns: {
    report_id:                     { type: 'uuid',         nullable: false, primaryKey: true },
    canonical_subject_id:          { type: 'varchar(128)',  nullable: false },
    report_type:                   { type: 'varchar(64)',   nullable: false },
    report_version:                { type: 'varchar(32)',   nullable: false },
    status:                        { type: 'varchar(32)',   nullable: false },
    render_archive_id:             { type: 'uuid',         nullable: true },
    input_snapshot_archive_id:     { type: 'uuid',         nullable: true },
    output_snapshot_archive_id:    { type: 'uuid',         nullable: true },
    manifest_id:                   { type: 'uuid',         nullable: false },
    created_by:                    { type: 'varchar(128)',  nullable: false },
    created_at:                    { type: 'timestamptz',  nullable: false },
    updated_at:                    { type: 'timestamptz',  nullable: false },
  },

  uniqueConstraints: [],
  checkConstraints: [],
  indexes: [],

  foreignKeys: [
    { columns: ['render_archive_id'], references: 'l5.archive_pointers(archive_id)', onDelete: 'SET NULL' },
    { columns: ['input_snapshot_archive_id'], references: 'l5.archive_pointers(archive_id)', onDelete: 'SET NULL' },
    { columns: ['output_snapshot_archive_id'], references: 'l5.archive_pointers(archive_id)', onDelete: 'SET NULL' },
    { columns: ['manifest_id'], references: 'l5.write_manifests(manifest_id)', onDelete: 'RESTRICT' },
  ],
} as const;
