/**
 * L3.2 — Canonical Identity Resolution: Alias Registry
 *
 * Alias normalization, collision detection, forbidden rules,
 * chain-scoped and object-type-scoped alias management.
 *
 * Core rule: aliases can propose candidates but cannot define
 * mission-critical identity by themselves.
 */

import type { CanonicalObjectType } from './canonical-entity-types';
import type { AliasExpansionResult } from './identity-resolution-types';

// ═══════════════════════════════════════════════════════════════════════════════
// ALIAS ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

export type AliasEntry = {
  alias: string;
  normalizedAlias: string;
  objectType: CanonicalObjectType;
  chainScope?: string;
  canonicalCandidateIds: string[];
  validFrom?: string;
  validUntil?: string;
  forbidden: boolean;
  forbiddenReason?: string;
  sourceRefs: string[];
};

export type AliasStrengthContext =
  | 'CONTRACT_SCOPED'    // strongest — alias tied to chain+contract
  | 'CHAIN_SCOPED'       // moderate — alias scoped to chain
  | 'TYPE_SCOPED'        // moderate — alias scoped to object type
  | 'GLOBAL'             // weak — unscoped alias
  | 'NARRATIVE_PHRASE';  // weakest for identity, useful for topic matching

const ALIAS_STRENGTH_WEIGHTS: Record<AliasStrengthContext, number> = {
  CONTRACT_SCOPED: 12,
  CHAIN_SCOPED: 8,
  TYPE_SCOPED: 6,
  GLOBAL: 3,
  NARRATIVE_PHRASE: 2,
};

// ═══════════════════════════════════════════════════════════════════════════════
// COLLISION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export type AliasCollision = {
  normalizedAlias: string;
  collidingCandidateIds: string[];
  objectTypes: CanonicalObjectType[];
  chains: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN ALIAS RULES
// ═══════════════════════════════════════════════════════════════════════════════

export type ForbiddenAliasRule = {
  normalizedAlias: string;
  forbiddenForType: CanonicalObjectType;
  reason: string;
};

const STRUCTURAL_FORBIDDEN_RULES: ForbiddenAliasRule[] = [
  { normalizedAlias: '*', forbiddenForType: 'ENTITY', reason: 'SINGLE_LABEL_CANNOT_RESOLVE_ENTITY_KIND' },
  { normalizedAlias: '*', forbiddenForType: 'NARRATIVE_TOPIC', reason: 'SINGLE_PHRASE_CANNOT_CANONIZE_TOPIC' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALIAS REGISTRY (in-memory for now; production backs to persistent store)
// ═══════════════════════════════════════════════════════════════════════════════

let _aliasStore: AliasEntry[] = [];
let _forbiddenRules: ForbiddenAliasRule[] = [...STRUCTURAL_FORBIDDEN_RULES];

export function normalizeAlias(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s\-_]+/g, '_');
}

export function registerAlias(entry: AliasEntry): void {
  const existing = _aliasStore.find(
    e => e.normalizedAlias === entry.normalizedAlias
      && e.objectType === entry.objectType
      && e.chainScope === entry.chainScope
  );
  if (existing) {
    const newIds = entry.canonicalCandidateIds.filter(id => !existing.canonicalCandidateIds.includes(id));
    existing.canonicalCandidateIds.push(...newIds);
    existing.sourceRefs.push(...entry.sourceRefs.filter(r => !existing.sourceRefs.includes(r)));
    return;
  }
  _aliasStore.push({ ...entry });
}

export function registerForbiddenRule(rule: ForbiddenAliasRule): void {
  _forbiddenRules.push(rule);
}

export function isForbidden(
  normalizedAlias: string,
  objectType: CanonicalObjectType,
): { forbidden: boolean; reason?: string } {
  for (const rule of _forbiddenRules) {
    if (rule.forbiddenForType === objectType) {
      if (rule.normalizedAlias === '*' || rule.normalizedAlias === normalizedAlias) {
        return { forbidden: true, reason: rule.reason };
      }
    }
  }
  const entry = _aliasStore.find(e => e.normalizedAlias === normalizedAlias && e.objectType === objectType);
  if (entry?.forbidden) {
    return { forbidden: true, reason: entry.forbiddenReason ?? 'EXPLICIT_FORBIDDEN' };
  }
  return { forbidden: false };
}

export function lookupAlias(
  normalizedAlias: string,
  objectType?: CanonicalObjectType,
  chainScope?: string,
): AliasEntry[] {
  return _aliasStore.filter(e => {
    if (e.normalizedAlias !== normalizedAlias) return false;
    if (objectType && e.objectType !== objectType) return false;
    if (chainScope && e.chainScope && e.chainScope !== chainScope) return false;
    if (e.forbidden) return false;
    if (e.validUntil && new Date(e.validUntil) < new Date()) return false;
    return true;
  });
}

function determineStrength(entry: AliasEntry): AliasStrengthContext {
  if (entry.objectType === 'NARRATIVE_TOPIC') return 'NARRATIVE_PHRASE';
  if (entry.chainScope && entry.normalizedAlias.includes('0x')) return 'CONTRACT_SCOPED';
  if (entry.chainScope) return 'CHAIN_SCOPED';
  if (entry.objectType) return 'TYPE_SCOPED';
  return 'GLOBAL';
}

export function expandAliases(
  aliasHints: string[],
  objectType: CanonicalObjectType,
  chainScope?: string,
): AliasExpansionResult {
  const candidateIds = new Set<string>();
  const aliasStrengthByCandidate: Record<string, number> = {};
  const aliasMatchesByCandidate: Record<string, string[]> = {};
  const collisionWarnings: string[] = [];

  for (const raw of aliasHints) {
    const norm = normalizeAlias(raw);
    const entries = lookupAlias(norm, objectType, chainScope);

    const allMatchCandidates = entries.flatMap(e => e.canonicalCandidateIds);
    const uniqueMatchCandidates = [...new Set(allMatchCandidates)];
    if (uniqueMatchCandidates.length > 1) {
      collisionWarnings.push(`ALIAS_COLLISION:${norm}:${uniqueMatchCandidates.join(',')}`);
    }

    for (const entry of entries) {
      const strength = ALIAS_STRENGTH_WEIGHTS[determineStrength(entry)];
      for (const cid of entry.canonicalCandidateIds) {
        candidateIds.add(cid);
        aliasStrengthByCandidate[cid] = Math.max(aliasStrengthByCandidate[cid] ?? 0, strength);
        if (!aliasMatchesByCandidate[cid]) aliasMatchesByCandidate[cid] = [];
        aliasMatchesByCandidate[cid].push(norm);
      }
    }
  }

  return {
    candidateIds: [...candidateIds],
    aliasStrengthByCandidate,
    aliasMatchesByCandidate,
    collisionWarnings,
  };
}

export function detectCollisions(
  objectType: CanonicalObjectType,
): AliasCollision[] {
  const byAlias = new Map<string, AliasEntry[]>();
  for (const e of _aliasStore) {
    if (e.objectType !== objectType || e.forbidden) continue;
    const key = e.normalizedAlias;
    if (!byAlias.has(key)) byAlias.set(key, []);
    byAlias.get(key)!.push(e);
  }

  const collisions: AliasCollision[] = [];
  for (const [norm, entries] of byAlias) {
    const allCandidates = [...new Set(entries.flatMap(e => e.canonicalCandidateIds))];
    if (allCandidates.length <= 1) continue;

    const chains = [...new Set(entries.map(e => e.chainScope).filter(Boolean) as string[])];
    collisions.push({
      normalizedAlias: norm,
      collidingCandidateIds: allCandidates,
      objectTypes: [objectType],
      chains,
      severity: allCandidates.length > 2 ? 'HIGH' : chains.length > 1 ? 'HIGH' : 'MEDIUM',
    });
  }
  return collisions;
}

export function resetAliasRegistry(): void {
  _aliasStore = [];
  _forbiddenRules = [...STRUCTURAL_FORBIDDEN_RULES];
}

export function getAliasStore(): readonly AliasEntry[] {
  return _aliasStore;
}
