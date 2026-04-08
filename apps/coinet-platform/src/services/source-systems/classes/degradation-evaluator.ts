/**
 * L1.6 Degradation Evaluator
 *
 * The core engine of L1.6. Compiles inputs from L1.2–L1.5 into a
 * DegradationAssessment per class. Follows strict precedence:
 *
 *   1. Hard locks → D4
 *   2. Domain viability → D3
 *   3. Partial blindness → D2
 *   4. Confidence-only → D1
 *   5. Normal → D0
 *
 * Also provides system-wide evaluation, propagation maps,
 * and the global degradation fingerprint.
 */

import type { TruthClass } from '../registry';
import { TRUTH_CLASSES } from '../registry';
import {
  type DegradationLevel, type DegradationAssessment, type DegradationInput,
  type FieldDegradationInput, type VisibilityLoss, type DownstreamComponent, type TruthState,
  DEGRADATION_RANK, DOWNSTREAM_BLOCKS, CONFIDENCE_PENALTY_RANGE,
  DISCLOSURE_TEMPLATES, CLAIM_RESTRICTIONS, L16_PLATFORM_VERSION,
} from './degradation-types';
import { CLASS_DEGRADATION_PROFILES } from './degradation-constitution';

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT CODE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function makeAuditCode(classId: string, level: DegradationLevel, reasons: string[]): string {
  const prefix = classId.toUpperCase().replace(/_/g, '').substring(0, 6);
  const lvl = level.substring(0, 2).toUpperCase();
  const tag = reasons[0]?.toUpperCase().replace(/\s+/g, '_').substring(0, 24) || 'UNKNOWN';
  return `${prefix}_${lvl}_${tag}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATE SINGLE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateDegradation(input: DegradationInput): DegradationAssessment {
  const { classId, fieldStates } = input;
  const reasons: string[] = [];
  const affectedFields: string[] = [];

  const missionCriticalFields = fieldStates.filter(f => f.isMissionCritical);
  const thesisCriticalFields = fieldStates.filter(f => f.isThesisCritical);

  const blockedFields = fieldStates.filter(f =>
    f.permissionState === 'BLOCK_OUTPUT' || f.permissionState === 'ESCALATE_INCIDENT',
  );
  const suppressedFields = fieldStates.filter(f =>
    f.permissionState === 'SUPPRESS_CLAIM',
  );
  const integrityBrokenFields = fieldStates.filter(f =>
    f.integrityState === 'I4_BROKEN',
  );
  const unhealthyFields = fieldStates.filter(f =>
    f.healthState === 'H4_UNSAFE' || f.healthState === 'H5_SUPPRESSED',
  );
  const degradedFields = fieldStates.filter(f =>
    f.healthState === 'H2_DEGRADED' || f.healthState === 'H3_PARTIAL_BLINDNESS',
  );
  const stressedFields = fieldStates.filter(f =>
    f.healthState === 'H1_STRESSED',
  );

  let level: DegradationLevel;
  let visibilityLoss: VisibilityLoss;
  let truthState: TruthState;

  // ── Gate 1: D4 — Hard locks ──────────────────────────────────────────────

  const missionCriticalBlocked = missionCriticalFields.some(f =>
    f.permissionState === 'BLOCK_OUTPUT' || f.permissionState === 'ESCALATE_INCIDENT',
  );
  const missionCriticalIntegrityBroken = missionCriticalFields.some(f =>
    f.integrityState === 'I4_BROKEN',
  );
  const hasBlockerConflict = input.conflictBlockersActive > 0;
  const noFallbackOnRequired = input.noFallbackTriggered;
  const hasIllegalSubstitution = fieldStates.some(f =>
    f.blockerClass === 'REASONING_OVERCLAIM' || f.blockerClass === 'METHODOLOGY_BROKEN_SUBSTANCE',
  );

  if (missionCriticalBlocked || missionCriticalIntegrityBroken || hasIllegalSubstitution) {
    level = 'D4_EPISTEMIC_LOCK';
    visibilityLoss = 'DOMAIN_UNSPEAKABLE';
    truthState = 'PROHIBITED_TRUTH';
    for (const f of [...blockedFields, ...integrityBrokenFields]) {
      affectedFields.push(f.fieldId);
    }
    if (missionCriticalBlocked) reasons.push('mission_critical_field_blocked');
    if (missionCriticalIntegrityBroken) reasons.push('mission_critical_integrity_broken');
    if (hasIllegalSubstitution) reasons.push('illegal_substitution_or_overclaim');
  }

  // ── Gate 2: D3 — Domain viability lost ─────────────────────────────────

  else if (noFallbackOnRequired || unhealthyFields.length >= 2 || (hasBlockerConflict && thesisCriticalFields.some(f => f.healthState >= 'H3_PARTIAL_BLINDNESS'))) {
    level = 'D3_DOMAIN_DEGRADATION';
    visibilityLoss = 'CLASS_DIRECTIONAL_LOSS';
    truthState = 'ABSENT_TRUTH';
    for (const f of [...unhealthyFields, ...suppressedFields]) {
      affectedFields.push(f.fieldId);
    }
    if (noFallbackOnRequired) reasons.push('no_fallback_owner_absent');
    if (unhealthyFields.length >= 2) reasons.push(`${unhealthyFields.length}_fields_unsafe_or_suppressed`);
    if (hasBlockerConflict) reasons.push('active_blocker_conflict');
  }

  // ── Gate 3: D2 — Partial blindness ─────────────────────────────────────

  else if (suppressedFields.length > 0 || degradedFields.length >= 2 || input.substitutionBlindCount > 0 || input.conflictContradictionsPreserved >= 2) {
    level = 'D2_PARTIAL_BLINDNESS';
    visibilityLoss = 'CLASS_PARTIAL';
    truthState = 'DEGRADED_TRUTH';
    for (const f of [...suppressedFields, ...degradedFields]) {
      affectedFields.push(f.fieldId);
    }
    if (suppressedFields.length > 0) reasons.push(`${suppressedFields.length}_fields_suppressed`);
    if (degradedFields.length >= 2) reasons.push(`${degradedFields.length}_fields_degraded`);
    if (input.substitutionBlindCount > 0) reasons.push(`${input.substitutionBlindCount}_substitution_blind`);
    if (input.conflictContradictionsPreserved >= 2) reasons.push(`${input.conflictContradictionsPreserved}_contradictions_preserved`);
  }

  // ── Gate 4: D1 — Confidence-only ───────────────────────────────────────

  else if (stressedFields.length > 0 || degradedFields.length === 1 || input.substitutionDegradedCount > 0 || input.conflictContradictionsPreserved === 1 || input.conflictUnresolved > 0) {
    level = 'D1_REDUCED_CONFIDENCE';
    visibilityLoss = 'FIELD_PARTIAL';
    truthState = 'DEGRADED_TRUTH';
    for (const f of [...stressedFields, ...degradedFields]) {
      affectedFields.push(f.fieldId);
    }
    if (stressedFields.length > 0) reasons.push(`${stressedFields.length}_fields_stressed`);
    if (degradedFields.length === 1) reasons.push('1_field_degraded');
    if (input.substitutionDegradedCount > 0) reasons.push(`${input.substitutionDegradedCount}_substitution_degraded`);
    if (input.conflictContradictionsPreserved === 1) reasons.push('1_contradiction_preserved');
    if (input.conflictUnresolved > 0) reasons.push(`${input.conflictUnresolved}_conflicts_unresolved`);
  }

  // ── Gate 5: D0 — Normal ────────────────────────────────────────────────

  else {
    level = 'D0_NORMAL';
    visibilityLoss = 'NONE';
    truthState = 'FULL_TRUTH';
  }

  const penaltyRange = CONFIDENCE_PENALTY_RANGE[level];
  const severityFraction = affectedFields.length / Math.max(fieldStates.length, 1);
  const confidencePenalty = Math.round(
    (penaltyRange[0] + (penaltyRange[1] - penaltyRange[0]) * Math.min(severityFraction * 2, 1)) * 1000,
  ) / 1000;

  const restrictions = CLAIM_RESTRICTIONS[level];
  const blockedDownstream = DOWNSTREAM_BLOCKS[level];

  const disclosure = DISCLOSURE_TEMPLATES[classId as string]?.[level] ?? '';

  return {
    classId,
    level,
    visibilityLoss,
    truthState,
    confidencePenalty,
    directionalClaimsAllowed: restrictions.directionalClaimsAllowed,
    blockedDownstream,
    permissionChanges: reasons,
    userDisclosure: disclosure,
    auditCode: level === 'D0_NORMAL' ? '' : makeAuditCode(classId, level, reasons),
    reasonCodes: reasons,
    affectedFields: [...new Set(affectedFields)],
    version: L16_PLATFORM_VERSION,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATE ALL CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateAllDegradation(inputs: DegradationInput[]): DegradationAssessment[] {
  return inputs.map(evaluateDegradation);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEGRADATION FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DegradationFingerprintEntry {
  classId: TruthClass;
  level: DegradationLevel;
  visibilityLoss: VisibilityLoss;
  confidencePenalty: number;
  directionalClaimsAllowed: boolean;
  affectedFieldCount: number;
  disclosure: string;
}

export interface DegradationFingerprint {
  timestamp: string;
  entries: DegradationFingerprintEntry[];
  globalLevel: DegradationLevel;
  totalConfidencePenalty: number;
  classesAtD3OrAbove: number;
  classesAtD4: number;
  systemSpeakable: boolean;
  version: string;
}

export function buildDegradationFingerprint(assessments: DegradationAssessment[]): DegradationFingerprint {
  const entries: DegradationFingerprintEntry[] = assessments.map(a => ({
    classId: a.classId,
    level: a.level,
    visibilityLoss: a.visibilityLoss,
    confidencePenalty: a.confidencePenalty,
    directionalClaimsAllowed: a.directionalClaimsAllowed,
    affectedFieldCount: a.affectedFields.length,
    disclosure: a.userDisclosure,
  }));

  const d3Plus = assessments.filter(a => DEGRADATION_RANK[a.level] >= 3);
  const d4Only = assessments.filter(a => a.level === 'D4_EPISTEMIC_LOCK');
  const worstLevel = assessments.reduce<DegradationLevel>(
    (worst, a) => DEGRADATION_RANK[a.level] > DEGRADATION_RANK[worst] ? a.level : worst,
    'D0_NORMAL',
  );
  const totalPenalty = assessments.reduce((s, a) => s + a.confidencePenalty, 0);

  return {
    timestamp: new Date().toISOString(),
    entries,
    globalLevel: worstLevel,
    totalConfidencePenalty: Math.round(totalPenalty * 1000) / 1000,
    classesAtD3OrAbove: d3Plus.length,
    classesAtD4: d4Only.length,
    systemSpeakable: d4Only.length === 0,
    version: L16_PLATFORM_VERSION,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPAGATION MAP
// ═══════════════════════════════════════════════════════════════════════════════

export interface PropagationEffect {
  component: DownstreamComponent;
  classId: TruthClass;
  level: DegradationLevel;
  effect: string;
}

export function buildPropagationMap(assessments: DegradationAssessment[]): PropagationEffect[] {
  const effects: PropagationEffect[] = [];
  for (const a of assessments) {
    if (a.level === 'D0_NORMAL') continue;
    for (const comp of a.blockedDownstream) {
      let effect: string;
      switch (a.level) {
        case 'D1_REDUCED_CONFIDENCE': effect = 'haircut'; break;
        case 'D2_PARTIAL_BLINDNESS': effect = comp === 'SCORE_OUTPUT' ? 'cap_or_suppress' : 'weaken'; break;
        case 'D3_DOMAIN_DEGRADATION': effect = comp === 'SCENARIO_ENGINE' ? 'remove_as_confirmer' : 'block_directional'; break;
        case 'D4_EPISTEMIC_LOCK': effect = 'block'; break;
        default: effect = 'unknown';
      }
      effects.push({ component: comp, classId: a.classId, level: a.level, effect });
    }
  }
  return effects;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getLockedClasses(assessments: DegradationAssessment[]): DegradationAssessment[] {
  return assessments.filter(a => a.level === 'D4_EPISTEMIC_LOCK');
}

export function getDegradedClasses(assessments: DegradationAssessment[]): DegradationAssessment[] {
  return assessments.filter(a => a.level !== 'D0_NORMAL');
}

export function getClassesUnsafeForThesis(assessments: DegradationAssessment[]): DegradationAssessment[] {
  return assessments.filter(a => !a.directionalClaimsAllowed);
}

export function getAllDisclosures(assessments: DegradationAssessment[]): { classId: TruthClass; disclosure: string }[] {
  return assessments
    .filter(a => a.userDisclosure.length > 0)
    .map(a => ({ classId: a.classId, disclosure: a.userDisclosure }));
}
