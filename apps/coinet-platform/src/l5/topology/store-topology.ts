/**
 * L5.3 Multi-store Architecture — Store Interaction Topology
 *
 * §5.3.7 — Topology Interaction Law
 *
 * Each store-to-store interaction has a legal classification.
 * Illegal interactions must be structurally blocked.
 */

import { L5StoreKind } from './store-profile';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTION LEGALITY
// ═══════════════════════════════════════════════════════════════════════════════

export enum L5InteractionLegality {
  /** Unconditionally allowed. */
  LEGAL = 'LEGAL',
  /** Allowed only through an explicit L5 coordination path. */
  LEGAL_WITH_COORDINATION = 'LEGAL_WITH_COORDINATION',
  /** Constitutionally forbidden. */
  ILLEGAL = 'ILLEGAL',
}

export interface InteractionRule {
  readonly from: L5StoreKind;
  readonly to: L5StoreKind;
  readonly legality: L5InteractionLegality;
  readonly reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTION MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

function k(from: L5StoreKind, to: L5StoreKind): string {
  return `${from}->${to}`;
}

const INTERACTION_RULES: readonly InteractionRule[] = [
  // Postgres outbound
  { from: L5StoreKind.POSTGRES, to: L5StoreKind.CLICKHOUSE,      legality: L5InteractionLegality.LEGAL, reason: 'Authority events produce historical analytical series' },
  { from: L5StoreKind.POSTGRES, to: L5StoreKind.REDIS,           legality: L5InteractionLegality.LEGAL, reason: 'Authority state accelerated into hot cache' },
  { from: L5StoreKind.POSTGRES, to: L5StoreKind.OBJECT_STORAGE,  legality: L5InteractionLegality.LEGAL, reason: 'Authority records attach immutable artifacts' },

  // ClickHouse outbound
  { from: L5StoreKind.CLICKHOUSE, to: L5StoreKind.REDIS,           legality: L5InteractionLegality.LEGAL, reason: 'Latest analytical slice materialized into hot state' },
  { from: L5StoreKind.CLICKHOUSE, to: L5StoreKind.POSTGRES,        legality: L5InteractionLegality.ILLEGAL, reason: 'ClickHouse may not define canonical relational truth' },
  { from: L5StoreKind.CLICKHOUSE, to: L5StoreKind.OBJECT_STORAGE,  legality: L5InteractionLegality.LEGAL_WITH_COORDINATION, reason: 'Cold export or archive derivation only through coordination' },

  // Redis outbound
  { from: L5StoreKind.REDIS, to: L5StoreKind.POSTGRES,        legality: L5InteractionLegality.ILLEGAL, reason: 'Redis may not promote state to durable authority' },
  { from: L5StoreKind.REDIS, to: L5StoreKind.CLICKHOUSE,      legality: L5InteractionLegality.ILLEGAL, reason: 'Redis may not serve as analytical truth source' },
  { from: L5StoreKind.REDIS, to: L5StoreKind.OBJECT_STORAGE,  legality: L5InteractionLegality.ILLEGAL, reason: 'Redis may not write immutable evidence' },

  // Object storage outbound
  { from: L5StoreKind.OBJECT_STORAGE, to: L5StoreKind.POSTGRES,   legality: L5InteractionLegality.LEGAL_WITH_COORDINATION, reason: 'Pointer registration and replay coordination only' },
  { from: L5StoreKind.OBJECT_STORAGE, to: L5StoreKind.CLICKHOUSE, legality: L5InteractionLegality.LEGAL_WITH_COORDINATION, reason: 'Backfill and cold batch reload into analytical history' },
  { from: L5StoreKind.OBJECT_STORAGE, to: L5StoreKind.REDIS,      legality: L5InteractionLegality.ILLEGAL, reason: 'Object storage may not populate hot execution state directly' },
];

const INTERACTION_MAP = new Map<string, InteractionRule>(
  INTERACTION_RULES.map(r => [k(r.from, r.to), r]),
);

export function getInteractionRule(from: L5StoreKind, to: L5StoreKind): InteractionRule | undefined {
  return INTERACTION_MAP.get(k(from, to));
}

export function getInteractionLegality(from: L5StoreKind, to: L5StoreKind): L5InteractionLegality {
  if (from === to) return L5InteractionLegality.LEGAL;
  const rule = INTERACTION_MAP.get(k(from, to));
  return rule?.legality ?? L5InteractionLegality.ILLEGAL;
}

export function isLegalInteraction(from: L5StoreKind, to: L5StoreKind): boolean {
  const leg = getInteractionLegality(from, to);
  return leg === L5InteractionLegality.LEGAL || leg === L5InteractionLegality.LEGAL_WITH_COORDINATION;
}

export function getAllInteractionRules(): readonly InteractionRule[] {
  return INTERACTION_RULES;
}

export function getIllegalInteractions(): readonly InteractionRule[] {
  return INTERACTION_RULES.filter(r => r.legality === L5InteractionLegality.ILLEGAL);
}

export function getCoordinationRequiredInteractions(): readonly InteractionRule[] {
  return INTERACTION_RULES.filter(r => r.legality === L5InteractionLegality.LEGAL_WITH_COORDINATION);
}
