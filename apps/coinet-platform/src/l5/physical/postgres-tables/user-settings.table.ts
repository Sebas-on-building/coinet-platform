/**
 * L5.6 — user_state.user_settings
 *
 * §5.6.7.B.3
 * JSONB allowed for sparse adjunct preference bags.
 */

import { PgSchema } from '../postgres-schemas';

export const USER_SETTINGS_TABLE = {
  schema: PgSchema.USER_STATE,
  name: 'user_settings',
  qualifiedName: 'user_state.user_settings',

  columns: {
    user_id:                { type: 'varchar(128)', nullable: false, primaryKey: true },
    tenant_id:              { type: 'varchar(128)', nullable: true },
    timezone:               { type: 'varchar(64)',  nullable: false },
    locale:                 { type: 'varchar(16)',  nullable: false },
    currency:               { type: 'varchar(8)',   nullable: false },
    risk_profile:           { type: 'varchar(32)',  nullable: true },
    alert_preferences_jsonb: { type: 'jsonb',       nullable: true, jsonbAllowed: true },
    ui_preferences_jsonb:   { type: 'jsonb',        nullable: true, jsonbAllowed: true },
    updated_at:             { type: 'timestamptz',  nullable: false },
  },

  uniqueConstraints: [],
  checkConstraints: [],
  indexes: [],
  foreignKeys: [],
} as const;
