/**
 * L5.6 Physical Design — Postgres Schema Architecture
 *
 * §5.6.5 — Postgres schema architecture
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export enum PgSchema {
  L3 = 'l3',
  L4 = 'l4',
  L5 = 'l5',
  USER_STATE = 'user_state',
  SCORING = 'scoring',
  REPORTS = 'reports',
  AUDIT = 'audit',
  OPS = 'ops',
}

export const ALL_PG_SCHEMAS: readonly PgSchema[] = Object.values(PgSchema);

export interface PgSchemaDefinition {
  readonly schema: PgSchema;
  readonly role: string;
  readonly ownerLayer: string;
}

export const SCHEMA_DEFINITIONS: Record<PgSchema, PgSchemaDefinition> = {
  [PgSchema.L3]: { schema: PgSchema.L3, role: 'Frozen lower-layer internal reality persistence', ownerLayer: 'L3' },
  [PgSchema.L4]: { schema: PgSchema.L4, role: 'Frozen lower-layer relational intelligence persistence', ownerLayer: 'L4' },
  [PgSchema.L5]: { schema: PgSchema.L5, role: 'Coordination, manifests, outbox, archive pointers, repair, quarantine', ownerLayer: 'L5' },
  [PgSchema.USER_STATE]: { schema: PgSchema.USER_STATE, role: 'Watchlists, settings, user-owned operational state', ownerLayer: 'L5' },
  [PgSchema.SCORING]: { schema: PgSchema.SCORING, role: 'Current score registry and score control-plane', ownerLayer: 'L5' },
  [PgSchema.REPORTS]: { schema: PgSchema.REPORTS, role: 'Current report registry and report metadata', ownerLayer: 'L5' },
  [PgSchema.AUDIT]: { schema: PgSchema.AUDIT, role: 'Actor/object/action durable audit rows', ownerLayer: 'L5' },
  [PgSchema.OPS]: { schema: PgSchema.OPS, role: 'Operational helpers, leases, health, worker control', ownerLayer: 'L5' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN SCHEMA NAMES
// ═══════════════════════════════════════════════════════════════════════════════

export const FORBIDDEN_SCHEMA_NAMES: readonly string[] = ['public', 'pg_catalog', 'information_schema'];

export function isSchemaAllowed(name: string): boolean {
  return ALL_PG_SCHEMAS.includes(name as PgSchema) && !FORBIDDEN_SCHEMA_NAMES.includes(name);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN TYPE DISCIPLINE — §5.6.6.1
// ═══════════════════════════════════════════════════════════════════════════════

export type PgColumnType =
  | 'uuid' | 'varchar' | 'text' | 'timestamptz' | 'numeric'
  | 'boolean' | 'integer' | 'smallint' | 'bigint' | 'char' | 'jsonb';

export const TYPED_COLUMN_DOMAINS: readonly string[] = [
  'authority_lookups', 'lifecycle_state', 'join_keys', 'repair_scans',
  'replay_scans', 'queue_ownership', 'time_semantics', 'idempotency_surfaces',
];

export const JSONB_ALLOWED_ONLY_FOR = 'sparse adjunct state' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN TABLE NAMES — §5.6.6.4
// ═══════════════════════════════════════════════════════════════════════════════

export const FORBIDDEN_TABLE_NAMES: readonly string[] = [
  'events', 'misc', 'blobs', 'records', 'storage_items', 'data', 'items', 'things',
];

export function isTableNameAllowed(name: string): boolean {
  return !FORBIDDEN_TABLE_NAMES.includes(name.toLowerCase());
}

// ═══════════════════════════════════════════════════════════════════════════════
// DDL GENERATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function schemaCreateDDL(schema: PgSchema): string {
  return `CREATE SCHEMA IF NOT EXISTS ${schema};`;
}

export function allSchemasCreateDDL(): string {
  return ALL_PG_SCHEMAS.map(schemaCreateDDL).join('\n');
}
