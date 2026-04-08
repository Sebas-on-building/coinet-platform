/**
 * L1.6 Degradation Ledger + Restoration Engine
 *
 * Every degradation transition is an auditable, immutable record.
 * Restoration follows strict hysteresis: D4 cannot jump to D0.
 */

import type { TruthClass } from '../registry';
import type { DegradationLevel, DegradationAssessment, VisibilityLoss, DownstreamComponent } from './degradation-types';
import { DEGRADATION_RANK, L16_PLATFORM_VERSION } from './degradation-types';

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER EVENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DegradationLedgerEvent {
  timestamp: string;
  classId: TruthClass;
  levelFrom: DegradationLevel;
  levelTo: DegradationLevel;
  direction: 'DEGRADED' | 'RESTORED' | 'UNCHANGED';
  affectedFields: string[];
  trigger: string;
  reasonCodes: string[];
  visibilityLoss: VisibilityLoss;
  confidencePenalty: number;
  blockedComponents: DownstreamComponent[];
  userDisclosure: string;
  auditCode: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STATE + LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

const currentLevels: Map<TruthClass, DegradationLevel> = new Map();
const ledger: DegradationLedgerEvent[] = [];
const MAX_LEDGER = 2000;

export function getCurrentLevel(classId: TruthClass): DegradationLevel {
  return currentLevels.get(classId) ?? 'D0_NORMAL';
}

export function getAllCurrentLevels(): Record<string, DegradationLevel> {
  const result: Record<string, DegradationLevel> = {};
  for (const [k, v] of currentLevels) result[k] = v;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECORD DEGRADATION / RESTORATION
// ═══════════════════════════════════════════════════════════════════════════════

export function recordDegradation(assessment: DegradationAssessment): DegradationLedgerEvent {
  const previous = getCurrentLevel(assessment.classId);
  const next = assessment.level;
  const direction = DEGRADATION_RANK[next] > DEGRADATION_RANK[previous]
    ? 'DEGRADED'
    : DEGRADATION_RANK[next] < DEGRADATION_RANK[previous]
      ? 'RESTORED'
      : 'UNCHANGED';

  currentLevels.set(assessment.classId, next);

  const event: DegradationLedgerEvent = {
    timestamp: new Date().toISOString(),
    classId: assessment.classId,
    levelFrom: previous,
    levelTo: next,
    direction,
    affectedFields: assessment.affectedFields,
    trigger: assessment.reasonCodes[0] || 'evaluation',
    reasonCodes: assessment.reasonCodes,
    visibilityLoss: assessment.visibilityLoss,
    confidencePenalty: assessment.confidencePenalty,
    blockedComponents: assessment.blockedDownstream,
    userDisclosure: assessment.userDisclosure,
    auditCode: assessment.auditCode,
  };

  ledger.push(event);
  if (ledger.length > MAX_LEDGER) ledger.splice(0, ledger.length - MAX_LEDGER);

  return event;
}

export function recordDegradationBatch(assessments: DegradationAssessment[]): DegradationLedgerEvent[] {
  return assessments.map(recordDegradation);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESTORATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const ALLOWED_RESTORATION_STEPS: Record<DegradationLevel, DegradationLevel[]> = {
  D4_EPISTEMIC_LOCK: ['D3_DOMAIN_DEGRADATION'],
  D3_DOMAIN_DEGRADATION: ['D2_PARTIAL_BLINDNESS'],
  D2_PARTIAL_BLINDNESS: ['D1_REDUCED_CONFIDENCE'],
  D1_REDUCED_CONFIDENCE: ['D0_NORMAL'],
  D0_NORMAL: [],
};

/**
 * Apply restoration constraint: D4 cannot jump to D0.
 * Returns the maximum allowed restoration target given current level.
 */
export function constrainRestoration(
  current: DegradationLevel,
  proposed: DegradationLevel,
): DegradationLevel {
  if (DEGRADATION_RANK[proposed] >= DEGRADATION_RANK[current]) return proposed;

  const allowed = ALLOWED_RESTORATION_STEPS[current];
  if (allowed.length === 0) return current;
  return allowed[0];
}

/**
 * Evaluate and apply a restoration step with hysteresis enforcement.
 */
export function attemptRestoration(
  classId: TruthClass,
  newAssessment: DegradationAssessment,
): DegradationLedgerEvent {
  const current = getCurrentLevel(classId);
  const constrained = constrainRestoration(current, newAssessment.level);

  const effectiveAssessment: DegradationAssessment = {
    ...newAssessment,
    level: constrained,
  };

  return recordDegradation(effectiveAssessment);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

export function getLedger(): DegradationLedgerEvent[] {
  return [...ledger];
}

export function getLedgerForClass(classId: TruthClass): DegradationLedgerEvent[] {
  return ledger.filter(e => e.classId === classId);
}

export function getLedgerSince(sinceIso: string): DegradationLedgerEvent[] {
  return ledger.filter(e => e.timestamp >= sinceIso);
}

export function getDegradationEvents(): DegradationLedgerEvent[] {
  return ledger.filter(e => e.direction === 'DEGRADED');
}

export function getRestorationEvents(): DegradationLedgerEvent[] {
  return ledger.filter(e => e.direction === 'RESTORED');
}

export function clearLedger(): void {
  ledger.length = 0;
}

export function resetAllLevels(): void {
  currentLevels.clear();
}

export function resetState(): void {
  currentLevels.clear();
  ledger.length = 0;
}
