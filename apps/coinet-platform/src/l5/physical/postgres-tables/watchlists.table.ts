/**
 * L5.6 — user_state.watchlists + user_state.watchlist_items
 *
 * §5.6.7.B.1–B.2
 */

import { PgSchema } from '../postgres-schemas';

export const WATCHLISTS_TABLE = {
  schema: PgSchema.USER_STATE,
  name: 'watchlists',
  qualifiedName: 'user_state.watchlists',

  columns: {
    watchlist_id: { type: 'uuid',        nullable: false, primaryKey: true },
    user_id:      { type: 'varchar(128)', nullable: false },
    tenant_id:    { type: 'varchar(128)', nullable: true },
    slug:         { type: 'varchar(64)',  nullable: false },
    name:         { type: 'varchar(128)', nullable: false },
    description:  { type: 'text',        nullable: true },
    is_default:   { type: 'boolean',     nullable: false, default: false },
    sort_order:   { type: 'integer',     nullable: false, default: 0 },
    created_at:   { type: 'timestamptz', nullable: false },
    updated_at:   { type: 'timestamptz', nullable: false },
  },

  uniqueConstraints: [['user_id', 'slug']],
  checkConstraints: [],
  indexes: [{ columns: ['user_id'] }],
  foreignKeys: [],
} as const;

export const WATCHLIST_ITEMS_TABLE = {
  schema: PgSchema.USER_STATE,
  name: 'watchlist_items',
  qualifiedName: 'user_state.watchlist_items',

  columns: {
    watchlist_item_id:   { type: 'uuid',        nullable: false, primaryKey: true },
    watchlist_id:        { type: 'uuid',        nullable: false },
    canonical_entity_id: { type: 'varchar(128)', nullable: false },
    entity_type:         { type: 'varchar(48)',  nullable: false },
    note:                { type: 'text',        nullable: true },
    added_at:            { type: 'timestamptz', nullable: false },
  },

  uniqueConstraints: [['watchlist_id', 'canonical_entity_id']],
  checkConstraints: [],
  indexes: [],
  foreignKeys: [
    { columns: ['watchlist_id'], references: 'user_state.watchlists(watchlist_id)', onDelete: 'CASCADE' },
  ],
} as const;
