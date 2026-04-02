/**
 * L1.5 — Conflict Resolver for BTC Quantum Loop
 *
 * Runtime engine that:
 *   1. Compares two source candidates for the same field
 *   2. Classifies conflict type and severity
 *   3. Applies governed resolution rules
 *   4. Reconciles only where averaging preserves meaning
 *   5. Preserves contradiction where ambiguity is real
 *   6. Propagates restrictions downstream
 */

import type {
  ConflictCandidate,
  ConflictResolutionRecord,
  PreservedContradiction,
  ConflictType,
  ConflictSeverity,
  ConflictAction,
  AuthorityComparison,
  SemanticComparability,
  FreshnessComparison,
  HealthComparison,
  ConflictDiagnostics,
} from './conflict-types';
import { L15_QR_VERSION } from './conflict-types';
import { getConflictRule } from './conflict-matrix';

const conflictLog: ConflictResolutionRecord[] = [];
const contradictionStore: PreservedContradiction[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — CANDIDATE COMPARATOR
// ═══════════════════════════════════════════════════════════════════════════════

function compareAuthority(a: ConflictCandidate, b: ConflictCandidate): AuthorityComparison {
  const diff = a.authorityLevel - b.authorityLevel;
  if (diff > 0.05) return 'a_higher';
  if (diff < -0.05) return 'b_higher';
  return 'equal';
}

function compareFreshness(a: ConflictCandidate, b: ConflictCandidate): FreshnessComparison {
  if (!a.observedAt && !b.observedAt) return 'unknown';
  if (!a.observedAt) return 'b_fresher';
  if (!b.observedAt) return 'a_fresher';
  const ta = new Date(a.observedAt).getTime();
  const tb = new Date(b.observedAt).getTime();
  const diff = ta - tb;
  if (diff > 60_000) return 'a_fresher';
  if (diff < -60_000) return 'b_fresher';
  return 'equal';
}

function compareHealth(a: ConflictCandidate, b: ConflictCandidate): HealthComparison {
  const diff = a.healthScore - b.healthScore;
  if (diff > 0.05) return 'a_healthier';
  if (diff < -0.05) return 'b_healthier';
  return 'equal';
}

function compareSemantics(a: ConflictCandidate, b: ConflictCandidate): SemanticComparability {
  if (!a.semanticDefinition && !b.semanticDefinition) return 'aligned';
  if (!a.semanticDefinition || !b.semanticDefinition) return 'uncertain';
  if (a.semanticDefinition === b.semanticDefinition) return 'aligned';
  return 'misaligned';
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — CONFLICT CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════════

function classifyConflictType(
  fieldName: string,
  a: ConflictCandidate,
  b: ConflictCandidate,
  semantics: SemanticComparability,
  freshComp: FreshnessComparison,
  healthComp: HealthComparison,
): ConflictType {
  const rule = getConflictRule(fieldName);

  if (semantics === 'misaligned') return 'semantic';

  if (rule?.policy === 'stage' || rule?.policy === 'categorical') {
    return 'structural';
  }

  if (freshComp !== 'equal' && freshComp !== 'unknown') {
    const hasLargeSpread = computeNumericSpread(a.data, b.data) > 0.03;
    if (hasLargeSpread) return 'temporal';
  }

  if (healthComp !== 'equal') {
    const hasSpread = computeNumericSpread(a.data, b.data) > 0.01;
    if (hasSpread) return 'health_driven';
  }

  return 'numeric';
}

function classifySeverity(
  fieldName: string,
  spread: number,
  conflictType: ConflictType,
  semantics: SemanticComparability,
): ConflictSeverity {
  const rule = getConflictRule(fieldName);
  if (!rule) return 'moderate';

  if (semantics === 'misaligned') return 'critical';

  if (conflictType === 'structural' || conflictType === 'interpretive') {
    return spread > 0 ? 'high' : 'moderate';
  }

  if (rule.policy === 'stage') return 'high';

  const tol = rule.tolerancePct;
  if (spread <= tol * 0.5) return 'low';
  if (spread <= tol) return 'moderate';
  if (spread <= tol * 3) return 'high';
  return 'critical';
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — NUMERIC SPREAD COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function extractNumeric(data: unknown): number | null {
  if (typeof data === 'number') return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.value === 'number') return d.value;
    if (typeof d.total === 'number') return d.total;
    if (typeof d.price === 'number') return d.price;
  }
  return null;
}

function computeNumericSpread(a: unknown, b: unknown): number {
  const na = extractNumeric(a);
  const nb = extractNumeric(b);
  if (na === null || nb === null || na === 0) return 1.0;
  return Math.abs(na - nb) / Math.abs(na);
}

function computeObjectSpread(a: unknown, b: unknown): number {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return 1.0;
  const oa = a as Record<string, unknown>;
  const ob = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(oa), ...Object.keys(ob)]);
  if (keys.size === 0) return 0;

  let totalDrift = 0;
  let comparableKeys = 0;
  for (const k of keys) {
    const va = oa[k];
    const vb = ob[k];
    if (typeof va === 'number' && typeof vb === 'number' && va !== 0) {
      totalDrift += Math.abs(va - vb) / Math.abs(va);
      comparableKeys++;
    }
  }
  return comparableKeys > 0 ? totalDrift / comparableKeys : 1.0;
}

function computeFieldSpread(fieldName: string, a: unknown, b: unknown): number {
  const rule = getConflictRule(fieldName);

  if (rule?.policy === 'stage') {
    return stageFieldsEqual(a, b) ? 0 : 1.0;
  }

  if (typeof a === 'number' || typeof b === 'number') {
    return computeNumericSpread(a, b);
  }

  if (a && typeof a === 'object' && b && typeof b === 'object') {
    return computeObjectSpread(a, b);
  }

  return 1.0;
}

function stageFieldsEqual(a: unknown, b: unknown): boolean {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const oa = a as Record<string, unknown>;
  const ob = b as Record<string, unknown>;
  for (const k of ['hasProposal', 'hasImplementation', 'hasDeployment']) {
    if (oa[k] !== ob[k]) return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — RECONCILIATION ENGINE (averaging)
// ═══════════════════════════════════════════════════════════════════════════════

function reconcileNumeric(a: unknown, b: unknown): unknown {
  const na = extractNumeric(a);
  const nb = extractNumeric(b);
  if (na !== null && nb !== null) return (na + nb) / 2;
  return na ?? nb;
}

function reconcileObject(a: unknown, b: unknown): unknown {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return a ?? b;
  const oa = a as Record<string, unknown>;
  const ob = b as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(oa), ...Object.keys(ob)]);
  for (const k of keys) {
    const va = oa[k];
    const vb = ob[k];
    if (typeof va === 'number' && typeof vb === 'number') {
      result[k] = (va + vb) / 2;
    } else {
      result[k] = va ?? vb;
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — STAGE CONFLICT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

function resolveStageConflict(
  a: ConflictCandidate,
  b: ConflictCandidate,
): { winner: 'a' | 'b'; reason: string } {
  const oa = a.data as Record<string, unknown> | null;
  const ob = b.data as Record<string, unknown> | null;

  if (!oa && ob) return { winner: 'b', reason: 'Source A has no data' };
  if (oa && !ob) return { winner: 'a', reason: 'Source B has no data' };
  if (!oa && !ob) return { winner: 'a', reason: 'Both sources empty' };

  const stageA = getStageLevel(oa!);
  const stageB = getStageLevel(ob!);

  // Deployed code evidence beats implementation claim beats proposal
  if (stageA > stageB) {
    return { winner: 'a', reason: `Source A has stronger evidence (stage ${stageA} vs ${stageB})` };
  }
  if (stageB > stageA) {
    return { winner: 'b', reason: `Source B has stronger evidence (stage ${stageB} vs ${stageA})` };
  }

  // Same stage — stricter defensible wins (lower stage from conservative source)
  if (a.authorityLevel > b.authorityLevel) {
    return { winner: 'a', reason: 'Same stage; Source A has higher authority' };
  }
  if (b.authorityLevel > a.authorityLevel) {
    return { winner: 'b', reason: 'Same stage; Source B has higher authority' };
  }

  // Equal authority, same stage — fresher wins
  if (a.observedAt && b.observedAt) {
    if (new Date(a.observedAt) > new Date(b.observedAt)) {
      return { winner: 'a', reason: 'Same stage and authority; Source A is fresher' };
    }
    return { winner: 'b', reason: 'Same stage and authority; Source B is fresher' };
  }

  return { winner: 'a', reason: 'Tie-break: Source A selected by default' };
}

function getStageLevel(data: Record<string, unknown>): number {
  if (data.hasDeployment === true) return 3;
  if (data.hasImplementation === true) return 2;
  if (data.hasProposal === true) return 1;
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6 — MAIN RESOLUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveConflict(
  fieldName: string,
  a: ConflictCandidate,
  b: ConflictCandidate,
): ConflictResolutionRecord {
  const rule = getConflictRule(fieldName);

  const authComp = compareAuthority(a, b);
  const freshComp = compareFreshness(a, b);
  const healthComp = compareHealth(a, b);
  const semComp = compareSemantics(a, b);

  const spread = computeFieldSpread(fieldName, a.data, b.data);
  const conflictType = classifyConflictType(fieldName, a, b, semComp, freshComp, healthComp);
  const severity = classifySeverity(fieldName, spread, conflictType, semComp);

  const reasons: string[] = [];
  const restrictions: string[] = [];
  let action: ConflictAction;
  let resolvedValue: unknown = null;
  let penalty = 0;
  let contradictionPreserved = false;

  // ── STEP 1: Semantic comparability gate ──────────────────────────────
  if (semComp === 'misaligned') {
    action = 'unresolved';
    penalty = 0.30;
    reasons.push('Semantic definitions misaligned — cannot compare values');
    if (rule) restrictions.push(...rule.downstreamRestrictions);

  // ── STEP 2: Stage/categorical fields — never average ─────────────────
  } else if (rule?.policy === 'stage') {
    const stageResult = resolveStageConflict(a, b);
    if (spread === 0) {
      action = stageResult.winner === 'a' ? 'winner_a' : 'winner_b';
      resolvedValue = stageResult.winner === 'a' ? a.data : b.data;
      penalty = 0;
      reasons.push('Stage values agree — no real conflict');
    } else if (severity === 'critical' || severity === 'high') {
      action = 'preserved_contradiction';
      contradictionPreserved = true;
      resolvedValue = stageResult.winner === 'a' ? a.data : b.data;
      penalty = 0.25;
      reasons.push(`Stage conflict preserved: ${stageResult.reason}`);
      restrictions.push(...(rule?.downstreamRestrictions ?? []));
      contradictionStore.push({
        fieldName,
        sourceA: a.sourceId,
        sourceB: b.sourceId,
        valueA: a.data,
        valueB: b.data,
        conflictType,
        severity,
        materialityNote: 'PQ evidence stage disagreement between sources',
        downstreamConsequence: 'Migration progress confidence degraded',
        interpretationConstraint: `Use stricter defensible stage: ${stageResult.reason}`,
      });
    } else {
      action = stageResult.winner === 'a' ? 'winner_a' : 'winner_b';
      resolvedValue = stageResult.winner === 'a' ? a.data : b.data;
      penalty = 0.10;
      reasons.push(`Stage winner: ${stageResult.reason}`);
    }

  // ── STEP 3: Numeric fields ───────────────────────────────────────────
  } else if (rule?.policy === 'numeric') {
    const tol = rule.tolerancePct;
    const absTol = rule.toleranceAbsolute;

    const na = extractNumeric(a.data);
    const nb = extractNumeric(b.data);
    const withinAbsTol = absTol !== undefined && na !== null && nb !== null
      ? Math.abs(na - nb) <= absTol
      : false;

    if (spread <= tol || withinAbsTol) {
      // Low conflict — averaging allowed if rule permits
      if (rule.averagingAllowed && semComp === 'aligned') {
        action = 'reconciled';
        resolvedValue = typeof a.data === 'object' && a.data !== null
          ? reconcileObject(a.data, b.data)
          : reconcileNumeric(a.data, b.data);
        penalty = spread > tol * 0.5 ? 0.03 : 0;
        reasons.push(`Reconciled: spread ${(spread * 100).toFixed(2)}% within tolerance ${(tol * 100).toFixed(2)}%`);
      } else {
        const winner = pickNumericWinner(a, b, authComp, freshComp, healthComp);
        action = winner === 'a' ? 'winner_a' : 'winner_b';
        resolvedValue = winner === 'a' ? a.data : b.data;
        penalty = 0.02;
        reasons.push(`Winner (averaging not allowed): ${winnerReason(winner, authComp, freshComp, healthComp)}`);
      }

    } else if (spread <= tol * 3) {
      // Moderate conflict
      const winner = pickNumericWinner(a, b, authComp, freshComp, healthComp);
      action = `degraded_resolution`;
      resolvedValue = winner === 'a' ? a.data : b.data;
      penalty = 0.10 + spread * 0.5;
      reasons.push(`Degraded resolution: spread ${(spread * 100).toFixed(2)}% exceeds tolerance but winner identifiable`);
      reasons.push(`Winner: ${winnerReason(winner, authComp, freshComp, healthComp)}`);

    } else {
      // Large conflict
      if (severity === 'critical') {
        action = 'unresolved';
        penalty = 0.30;
        reasons.push(`Critical numeric conflict: spread ${(spread * 100).toFixed(2)}% — no safe resolution`);
        restrictions.push(...rule.downstreamRestrictions);
      } else {
        action = 'preserved_contradiction';
        contradictionPreserved = true;
        const winner = pickNumericWinner(a, b, authComp, freshComp, healthComp);
        resolvedValue = winner === 'a' ? a.data : b.data;
        penalty = 0.20;
        reasons.push(`Contradiction preserved: spread ${(spread * 100).toFixed(2)}% is material`);
        contradictionStore.push({
          fieldName,
          sourceA: a.sourceId,
          sourceB: b.sourceId,
          valueA: a.data,
          valueB: b.data,
          conflictType,
          severity,
          materialityNote: `Numeric spread ${(spread * 100).toFixed(2)}% exceeds safe reconciliation`,
          downstreamConsequence: rule.downstreamRestrictions.join('; '),
          interpretationConstraint: `Use ${winner === 'a' ? a.sourceId : b.sourceId} provisionally with elevated uncertainty`,
        });
      }
    }

  // ── STEP 4: No rule — treat as unresolved ────────────────────────────
  } else {
    action = 'unresolved';
    penalty = 0.20;
    reasons.push(`No conflict rule found for field "${fieldName}"`);
  }

  const record: ConflictResolutionRecord = {
    fieldName,
    conflictType,
    sourceA: a.sourceId,
    sourceB: b.sourceId,
    valueA: a.data,
    valueB: b.data,
    authorityComparison: authComp,
    semanticComparability: semComp,
    freshnessComparison: freshComp,
    healthComparison: healthComp,
    severity,
    action,
    resolvedValue,
    confidencePenalty: round(penalty),
    contradictionPreserved,
    outputRestrictionFlags: restrictions,
    reasonSummary: reasons,
    policyVersion: L15_QR_VERSION,
  };

  conflictLog.push(record);
  return record;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WINNER PICKER — governed precedence for numeric fields
// ═══════════════════════════════════════════════════════════════════════════════

function pickNumericWinner(
  a: ConflictCandidate,
  b: ConflictCandidate,
  auth: AuthorityComparison,
  fresh: FreshnessComparison,
  health: HealthComparison,
): 'a' | 'b' {
  if (auth === 'a_higher') return 'a';
  if (auth === 'b_higher') return 'b';
  if (health === 'a_healthier') return 'a';
  if (health === 'b_healthier') return 'b';
  if (fresh === 'a_fresher') return 'a';
  if (fresh === 'b_fresher') return 'b';
  return 'a';
}

function winnerReason(
  winner: 'a' | 'b',
  auth: AuthorityComparison,
  fresh: FreshnessComparison,
  health: HealthComparison,
): string {
  if (auth === `${winner}_higher`) return `${winner} has higher authority`;
  if (health === `${winner}_healthier`) return `${winner} is healthier`;
  if (fresh === `${winner}_fresher`) return `${winner} is fresher`;
  return `${winner} selected by tie-break`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH RESOLVER — resolve conflicts for all fields with dual sources
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveAllConflicts(
  fields: Record<string, { a: ConflictCandidate; b: ConflictCandidate } | null>,
): {
  records: Record<string, ConflictResolutionRecord>;
  diagnostics: ConflictDiagnostics;
} {
  const records: Record<string, ConflictResolutionRecord> = {};
  const allRecords: ConflictResolutionRecord[] = [];

  for (const [fieldName, pair] of Object.entries(fields)) {
    if (!pair) continue;
    const record = resolveConflict(fieldName, pair.a, pair.b);
    records[fieldName] = record;
    allRecords.push(record);
  }

  return {
    records,
    diagnostics: buildConflictDiagnostics(allRecords),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════

function buildConflictDiagnostics(records: ConflictResolutionRecord[]): ConflictDiagnostics {
  const resolved = records.filter(r => r.action === 'winner_a' || r.action === 'winner_b').length;
  const reconciled = records.filter(r => r.action === 'reconciled').length;
  const preserved = records.filter(r => r.contradictionPreserved).length;
  const degraded = records.filter(r => r.action === 'degraded_resolution').length;
  const unresolved = records.filter(r => r.action === 'unresolved').length;
  const totalPenalty = records.reduce((sum, r) => sum + r.confidencePenalty, 0);
  const allRestrictions = [...new Set(records.flatMap(r => r.outputRestrictionFlags))];

  return {
    timestamp: new Date().toISOString(),
    records,
    contradictions: [...contradictionStore],
    totalConflicts: records.length,
    resolved,
    reconciled,
    contradictionsPreserved: preserved,
    degraded,
    unresolved,
    totalConfidencePenalty: round(totalPenalty),
    outputRestrictions: allRestrictions,
    version: L15_QR_VERSION,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOG ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

export function getConflictLog(): ConflictResolutionRecord[] {
  return [...conflictLog];
}

export function getContradictions(): PreservedContradiction[] {
  return [...contradictionStore];
}

export function getConflictCount(): number {
  return conflictLog.length;
}

export function clearConflictState(): void {
  conflictLog.length = 0;
  contradictionStore.length = 0;
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}
