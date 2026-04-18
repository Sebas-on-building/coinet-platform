/**
 * L5.6 — scoring.score_registry
 *
 * §5.6.7.B.4
 */

import { PgSchema } from '../postgres-schemas';

export const SCORE_REGISTRY_TABLE = {
  schema: PgSchema.SCORING,
  name: 'score_registry',
  qualifiedName: 'scoring.score_registry',

  columns: {
    score_id:                        { type: 'uuid',         nullable: false, primaryKey: true },
    canonical_entity_id:             { type: 'varchar(128)',  nullable: false },
    score_family:                    { type: 'varchar(64)',   nullable: false },
    score_version:                   { type: 'varchar(32)',   nullable: false },
    current_value:                   { type: 'numeric(18,6)', nullable: false },
    current_band:                    { type: 'varchar(32)',   nullable: false },
    confidence_band:                 { type: 'varchar(32)',   nullable: false },
    as_of:                           { type: 'timestamptz',  nullable: false },
    feature_snapshot_archive_id:     { type: 'uuid',         nullable: true },
    explanation_archive_id:          { type: 'uuid',         nullable: true },
    manifest_id:                     { type: 'uuid',         nullable: false },
    created_at:                      { type: 'timestamptz',  nullable: false },
    updated_at:                      { type: 'timestamptz',  nullable: false },
  },

  uniqueConstraints: [['canonical_entity_id', 'score_family']],
  checkConstraints: [],
  indexes: [],

  foreignKeys: [
    { columns: ['feature_snapshot_archive_id'], references: 'l5.archive_pointers(archive_id)', onDelete: 'SET NULL' },
    { columns: ['explanation_archive_id'], references: 'l5.archive_pointers(archive_id)', onDelete: 'SET NULL' },
    { columns: ['manifest_id'], references: 'l5.write_manifests(manifest_id)', onDelete: 'RESTRICT' },
  ],
} as const;
