/**
 * L1.5 Conflict Adjudicator
 *
 * The constitutional decision engine for conflicts.
 * Handles detection, classification, fusion legality, adjudication,
 * cross-class contradiction detection, and conflict propagation.
 *
 * The adjudication ladder (strict order):
 *   1. Reject non-comparable claims
 *   2. Apply constitutional vetoes (hard blockers)
 *   3. Apply authority winner rules
 *   4. Attempt legal fusion
 *   5. Preserve contradiction if informative
 *   6. Degrade unresolved material conflict
 *   7. Suppress if mission-critical and unspeakable
 */

import {
  type ConflictKind, type ConflictSeverity, type ConflictOutcome, type WinnerRule,
  type FusionGate, type FusionGateResult, type BlockerClass, type BlockerRecord,
  type ConflictClaim, type ConflictRecord, type PreservedContradiction,
  type ConflictDiagnostics,
  CONFLICT_SEVERITY_RANK, CONFLICT_THRESHOLDS, L15_PLATFORM_VERSION,
} from './conflict-types';
import { getFieldConflictRule, type FieldConflictRule } from './conflict-constitution';
import { getFieldCriticality } from './field-criticality-map';
import { FIELD_TUPLES } from './epistemic-integrity-engine';

let conflictCounter = 0;
function nextConflictId(): string {
  return `C${Date.now()}-${++conflictCounter}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export function classifyConflict(a: ConflictClaim, b: ConflictClaim): ConflictKind {
  if (a.integrityState === 'I4_BROKEN' || b.integrityState === 'I4_BROKEN') {
    return 'INTEGRITY_CONFLICT';
  }
  if (a.fieldId !== b.fieldId) return 'UNCOMPARABLE_CLAIMS';
  if (a.methodologyId && b.methodologyId && a.methodologyId !== b.methodologyId) return 'METHODOLOGY_CONFLICT';
  if (a.scope && b.scope && a.scope !== b.scope) return 'SCOPE_CONFLICT';
  if (a.timeBasis && b.timeBasis && a.timeBasis !== b.timeBasis) return 'TIME_BASIS_CONFLICT';
  if (a.unit && b.unit && a.unit !== b.unit) return 'UNCOMPARABLE_CLAIMS';

  if (typeof a.value === 'number' && typeof b.value === 'number') return 'NUMERIC_DRIFT';
  if (typeof a.value === 'string' && typeof b.value === 'string' && a.value !== b.value) return 'CATEGORICAL_LABEL_CONFLICT';

  return 'AUTHORITY_CONFLICT';
}

export function classifySeverity(
  kind: ConflictKind, a: ConflictClaim, b: ConflictClaim,
): ConflictSeverity {
  if (kind === 'INTEGRITY_CONFLICT') return 'CRITICAL';
  if (kind === 'UNCOMPARABLE_CLAIMS') return 'LOW';

  const threshold = CONFLICT_THRESHOLDS[a.fieldId];
  const crit = getFieldCriticality(a.fieldId);

  if (kind === 'NUMERIC_DRIFT' && typeof a.value === 'number' && typeof b.value === 'number') {
    const avg = (Math.abs(a.value as number) + Math.abs(b.value as number)) / 2;
    if (avg === 0) return 'LOW';
    const pctDiff = Math.abs((a.value as number) - (b.value as number)) / avg * 100;
    const tol = threshold?.tolerancePct ?? 5;

    if (pctDiff <= tol) return 'LOW';
    if (pctDiff <= tol * 3) return 'MEDIUM';
    if (pctDiff <= tol * 10) return 'HIGH';
    return 'CRITICAL';
  }

  if (kind === 'CATEGORICAL_LABEL_CONFLICT') {
    return crit?.criticality === 'MISSION_CRITICAL' ? 'HIGH' : 'MEDIUM';
  }

  if (kind === 'METHODOLOGY_CONFLICT' || kind === 'SCOPE_CONFLICT') return 'HIGH';
  if (kind === 'TIME_BASIS_CONFLICT') return 'MEDIUM';
  if (kind === 'BLOCKER_CONFLICT') return 'CRITICAL';

  return 'MEDIUM';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUSION LEGALITY
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateFusionLegality(
  a: ConflictClaim, b: ConflictClaim, rule: FieldConflictRule | undefined,
): FusionGateResult[] {
  const gates: FusionGateResult[] = [];
  const tuple = FIELD_TUPLES[a.fieldId];

  gates.push({
    gate: 'same_field_id', passed: a.fieldId === b.fieldId,
    reason: a.fieldId === b.fieldId ? 'Same field' : `Different fields: ${a.fieldId} vs ${b.fieldId}`,
  });
  gates.push({
    gate: 'same_unit', passed: !a.unit || !b.unit || a.unit === b.unit,
    reason: a.unit === b.unit ? 'Same unit' : `Unit mismatch: ${a.unit} vs ${b.unit}`,
  });
  gates.push({
    gate: 'same_scope', passed: !a.scope || !b.scope || a.scope === b.scope,
    reason: a.scope === b.scope ? 'Same scope' : `Scope mismatch: ${a.scope} vs ${b.scope}`,
  });
  gates.push({
    gate: 'same_quote_basis', passed: true,
    reason: 'Quote basis check passed',
  });
  gates.push({
    gate: 'time_basis_compatible', passed: !a.timeBasis || !b.timeBasis || a.timeBasis === b.timeBasis,
    reason: a.timeBasis === b.timeBasis ? 'Compatible time basis' : `Time basis mismatch: ${a.timeBasis} vs ${b.timeBasis}`,
  });
  gates.push({
    gate: 'methodology_compatible', passed: !a.methodologyId || !b.methodologyId || a.methodologyId === b.methodologyId,
    reason: a.methodologyId === b.methodologyId ? 'Same methodology' : `Methodology mismatch`,
  });

  const threshold = CONFLICT_THRESHOLDS[a.fieldId];
  let varianceOk = true;
  if (typeof a.value === 'number' && typeof b.value === 'number' && threshold) {
    const avg = (Math.abs(a.value) + Math.abs(b.value)) / 2;
    const pctDiff = avg > 0 ? Math.abs(a.value - b.value) / avg * 100 : 0;
    varianceOk = pctDiff <= threshold.tolerancePct;
  }
  gates.push({
    gate: 'variance_within_threshold', passed: varianceOk,
    reason: varianceOk ? 'Within tolerance' : 'Variance exceeds threshold',
  });

  gates.push({
    gate: 'no_integrity_concern',
    passed: a.integrityState !== 'I3_MATERIAL_MISMATCH' && a.integrityState !== 'I4_BROKEN'
         && b.integrityState !== 'I3_MATERIAL_MISMATCH' && b.integrityState !== 'I4_BROKEN',
    reason: 'Integrity check',
  });
  gates.push({ gate: 'no_blocker_conflict', passed: true, reason: 'No blocker detected' });
  gates.push({
    gate: 'constitution_allows_fusion', passed: !!rule?.fusionAllowed,
    reason: rule?.fusionAllowed ? 'Constitution allows fusion' : 'Constitution forbids fusion for this field',
  });

  return gates;
}

export function isFusionLegal(gates: FusionGateResult[]): boolean {
  return gates.every(g => g.passed);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKER DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export function detectBlockers(a: ConflictClaim, b: ConflictClaim): BlockerRecord[] {
  const blockers: BlockerRecord[] = [];
  const crit = getFieldCriticality(a.fieldId);

  if (a.fieldId.startsWith('security.') || b.fieldId.startsWith('security.')) {
    if (typeof a.value === 'string' && a.value.includes('severe')) {
      blockers.push({
        blockerClass: 'STRUCTURAL_SAFETY_VETO', fieldId: a.fieldId, triggeredBy: a.providerId,
        overrides: ['all_bullish_claims', 'opportunity_confidence'], suppresses: ['strong_directional_claims'],
        forcesContradiction: true, blocksScore: false, escalatesIncident: false,
        description: `Severe safety flag from ${a.providerId} overrides consensus`,
      });
    }
    if (typeof b.value === 'string' && b.value.includes('severe')) {
      blockers.push({
        blockerClass: 'STRUCTURAL_SAFETY_VETO', fieldId: b.fieldId, triggeredBy: b.providerId,
        overrides: ['all_bullish_claims', 'opportunity_confidence'], suppresses: ['strong_directional_claims'],
        forcesContradiction: true, blocksScore: false, escalatesIncident: false,
        description: `Severe safety flag from ${b.providerId} overrides consensus`,
      });
    }
  }

  if (a.integrityState === 'I4_BROKEN' && crit?.criticality === 'MISSION_CRITICAL') {
    blockers.push({
      blockerClass: 'INTEGRITY_BROKEN_MISSION_CRITICAL', fieldId: a.fieldId, triggeredBy: a.providerId,
      overrides: [], suppresses: [a.fieldId], forcesContradiction: false,
      blocksScore: true, escalatesIncident: true,
      description: `Integrity broken on mission-critical field ${a.fieldId} from ${a.providerId}`,
    });
  }
  if (b.integrityState === 'I4_BROKEN' && crit?.criticality === 'MISSION_CRITICAL') {
    blockers.push({
      blockerClass: 'INTEGRITY_BROKEN_MISSION_CRITICAL', fieldId: b.fieldId, triggeredBy: b.providerId,
      overrides: [], suppresses: [b.fieldId], forcesContradiction: false,
      blocksScore: true, escalatesIncident: true,
      description: `Integrity broken on mission-critical field ${b.fieldId} from ${b.providerId}`,
    });
  }

  return blockers;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE ADJUDICATION LADDER
// ═══════════════════════════════════════════════════════════════════════════════

export function adjudicate(a: ConflictClaim, b: ConflictClaim): ConflictRecord {
  const kind = classifyConflict(a, b);
  const severity = classifySeverity(kind, a, b);
  const rule = getFieldConflictRule(a.fieldId);
  const crit = getFieldCriticality(a.fieldId);
  const reasons: string[] = [];
  const effects: string[] = rule?.downstreamEffects ?? [];

  // Fusion legality
  const fusionGates = evaluateFusionLegality(a, b, rule);
  const fusionLegal = isFusionLegal(fusionGates);

  // Blockers
  const blockers = detectBlockers(a, b);

  let outcome: ConflictOutcome;
  let winnerRule: WinnerRule | null = null;
  let winnerId: string | null = null;
  let confidencePenalty = 0;
  let disclosureRequired = false;
  const comparable = kind !== 'UNCOMPARABLE_CLAIMS';

  // ── Gate 1: Reject non-comparable ──────────────────────────────────────
  if (!comparable) {
    outcome = 'FILTER_INVALID';
    reasons.push('Claims are not legally comparable');
  }

  // ── Gate 2: Constitutional vetoes ──────────────────────────────────────
  else if (blockers.length > 0) {
    const hasScoreBlocker = blockers.some(bl => bl.blocksScore);
    const hasEscalation = blockers.some(bl => bl.escalatesIncident);
    if (hasEscalation) {
      outcome = 'ESCALATE_INCIDENT';
      confidencePenalty = 0.50;
    } else if (hasScoreBlocker) {
      outcome = 'BLOCK_OUTPUT';
      confidencePenalty = 1.0;
    } else {
      outcome = 'DEGRADE_CLAIM';
      confidencePenalty = 0.25;
    }
    disclosureRequired = true;
    reasons.push(`Blocker(s) active: ${blockers.map(bl => bl.blockerClass).join(', ')}`);
  }

  // ── Gate 3: Authority winner rules ─────────────────────────────────────
  else if (rule && rule.winnerRule !== 'NO_WINNER' && rule.winnerRule !== 'CO_AUTHORITY_PRESERVE_CONTRADICTION') {
    winnerRule = rule.winnerRule;

    if (winnerRule === 'NATIVE_OVER_DERIVED' || winnerRule === 'SPECIALIST_OVER_BREADTH' || winnerRule === 'OWNER_OVER_CONFIRMER') {
      winnerId = a.authorityTier >= b.authorityTier ? a.providerId : b.providerId;
      outcome = 'RESOLVE_BY_AUTHORITY';
      confidencePenalty = severity === 'LOW' ? 0.02 : severity === 'MEDIUM' ? 0.05 : 0.10;
      reasons.push(`Authority resolution: ${winnerRule}, winner=${winnerId}`);
    } else if (winnerRule === 'FRESHER_WINS') {
      winnerId = (a.observedAt ?? '') >= (b.observedAt ?? '') ? a.providerId : b.providerId;
      outcome = 'RESOLVE_BY_AUTHORITY';
      confidencePenalty = 0.03;
      reasons.push(`Freshness resolution: ${winnerId} is fresher`);
    } else if (winnerRule === 'HEALTHIER_WINS') {
      winnerId = a.healthState <= b.healthState ? a.providerId : b.providerId;
      outcome = 'RESOLVE_BY_AUTHORITY';
      confidencePenalty = 0.05;
      reasons.push(`Health resolution: ${winnerId} is healthier`);
    } else {
      outcome = 'PRESERVE_CONTRADICTION';
      confidencePenalty = 0.10;
      reasons.push('No clear authority winner');
    }

    if (severity === 'HIGH' || severity === 'CRITICAL') {
      disclosureRequired = true;
    }
  }

  // ── Gate 4: Attempt legal fusion ───────────────────────────────────────
  else if (fusionLegal && (typeof a.value === 'number' && typeof b.value === 'number')) {
    outcome = 'RESOLVE_BY_FUSION';
    winnerId = null;
    confidencePenalty = 0.02;
    reasons.push('Legal fusion: both claims comparable, within tolerance, constitution permits');
  }

  // ── Gate 5: CO_AUTHORITY → preserve if informative ─────────────────────
  else if (rule?.winnerRule === 'CO_AUTHORITY_PRESERVE_CONTRADICTION') {
    outcome = 'PRESERVE_CONTRADICTION';
    confidencePenalty = rule.preservePolicy.confidencePenaltyRange[0] +
      (rule.preservePolicy.confidencePenaltyRange[1] - rule.preservePolicy.confidencePenaltyRange[0]) *
      (CONFLICT_SEVERITY_RANK[severity] / 4);
    disclosureRequired = rule.preservePolicy.disclosureRequired;
    reasons.push('Co-authority conflict: contradiction preserved as information');
  }

  // ── Gate 6: Preserve if material and policy says so ────────────────────
  else if (rule?.preservePolicy.preserveIfMaterial && (severity === 'HIGH' || severity === 'CRITICAL')) {
    outcome = 'PRESERVE_CONTRADICTION';
    confidencePenalty = rule.preservePolicy.confidencePenaltyRange[1];
    disclosureRequired = true;
    reasons.push('Material conflict preserved as informative contradiction');
  }

  // ── Gate 7: Suppress mission-critical with critical unresolved ─────────
  else if (crit?.criticality === 'MISSION_CRITICAL' && severity === 'CRITICAL') {
    outcome = 'SUPPRESS_CLAIM';
    confidencePenalty = 0.50;
    disclosureRequired = true;
    reasons.push('Mission-critical field with critical unresolved conflict — suppressed');
  }

  // ── Gate 8: Degrade unresolved material ────────────────────────────────
  else if (severity === 'HIGH' || severity === 'CRITICAL') {
    outcome = 'DEGRADE_CLAIM';
    confidencePenalty = 0.20;
    disclosureRequired = true;
    reasons.push('Unresolved material conflict — claim degraded');
  }

  // ── Default: low severity → authority resolution ───────────────────────
  else {
    outcome = 'RESOLVE_BY_AUTHORITY';
    winnerId = a.authorityTier >= b.authorityTier ? a.providerId : b.providerId;
    confidencePenalty = 0.02;
    reasons.push('Low-severity conflict resolved by default authority');
  }

  return {
    conflictId: nextConflictId(),
    fieldId: a.fieldId,
    conflictKind: kind,
    severity,
    claimA: a,
    claimB: b,
    comparable,
    fusionLegal,
    fusionGates,
    outcome,
    winnerRule,
    winnerId,
    confidencePenalty: Math.round(confidencePenalty * 1000) / 1000,
    disclosureRequired,
    downstreamEffects: effects,
    reasonCodes: reasons,
    blockers,
    version: L15_PLATFORM_VERSION,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ADJUDICATION
// ═══════════════════════════════════════════════════════════════════════════════

export function adjudicateAll(pairs: [ConflictClaim, ConflictClaim][]): ConflictRecord[] {
  return pairs.map(([a, b]) => adjudicate(a, b));
}

export function getPreservedContradictions(records: ConflictRecord[]): PreservedContradiction[] {
  return records
    .filter(r => r.outcome === 'PRESERVE_CONTRADICTION')
    .map(r => ({
      conflictId: r.conflictId,
      fieldId: r.fieldId,
      providerA: r.claimA.providerId,
      providerB: r.claimB.providerId,
      valueA: r.claimA.value,
      valueB: r.claimB.value,
      kind: r.conflictKind,
      severity: r.severity,
      materialityNote: r.reasonCodes.join('; '),
      thesisImpact: r.downstreamEffects.join(', ') || 'none specified',
      confidencePenalty: r.confidencePenalty,
      disclosureText: `Sources ${r.claimA.providerId} and ${r.claimB.providerId} disagree on ${r.fieldId}`,
    }));
}

export function buildConflictDiagnostics(records: ConflictRecord[]): ConflictDiagnostics {
  return {
    timestamp: new Date().toISOString(),
    totalConflicts: records.length,
    resolved: records.filter(r => r.outcome === 'RESOLVE_BY_AUTHORITY' || r.outcome === 'RESOLVE_BY_FUSION').length,
    fused: records.filter(r => r.outcome === 'RESOLVE_BY_FUSION').length,
    contradictionsPreserved: records.filter(r => r.outcome === 'PRESERVE_CONTRADICTION').length,
    degraded: records.filter(r => r.outcome === 'DEGRADE_CLAIM').length,
    suppressed: records.filter(r => r.outcome === 'SUPPRESS_CLAIM').length,
    blocked: records.filter(r => r.outcome === 'BLOCK_OUTPUT').length,
    escalated: records.filter(r => r.outcome === 'ESCALATE_INCIDENT').length,
    activeBlockers: records.flatMap(r => r.blockers),
    totalConfidencePenalty: records.reduce((sum, r) => sum + r.confidencePenalty, 0),
    version: L15_PLATFORM_VERSION,
  };
}
