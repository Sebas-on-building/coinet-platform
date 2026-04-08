/**
 * L3.3-B — Confidence Enforcement Layer (confidence-gate.ts)
 *
 * The only legal entry point for downstream confidence consumption.
 * Translates EntityConfidenceState into a downstream-safe decision
 * for one requested use. Without this file, L3.3 is advisory.
 * With it, L3.3 becomes constitutional law.
 *
 * No downstream domain may consume canonical identity without
 * a confidence gate decision. No downstream module may reinterpret
 * confidence bands locally. Rights are consumed through this shared
 * gate, not duplicated per module.
 */

import type { CanonicalObjectType } from './canonical-entity-types';
import type {
  ConfidenceBand,
  ConfidenceRightDecision,
  ConfidenceEpistemicState,
  ConfidenceScar,
} from './confidence-factors';
import type { RightsProfile } from './confidence-policy-map';
import type { EntityConfidenceState } from './entity-confidence-model';

// ═══════════════════════════════════════════════════════════════════════════════
// GATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceUseDomain =
  | 'SCORING'
  | 'CONTRADICTION'
  | 'SCENARIO'
  | 'JUDGMENT'
  | 'GRAPH_RELATION'
  | 'CANONICAL_MUTATION'
  | 'DISPLAY'
  | 'FORENSIC_REPLAY';

export interface ConfidenceGateInput {
  canonicalId: string;
  objectType: CanonicalObjectType;
  requestedUse: ConfidenceUseDomain;
  missionCritical: boolean;
  confidenceState: EntityConfidenceState | undefined;
  evaluationContext?: {
    fieldFamily?: string;
    requestedByModule?: string;
    allowConditional?: boolean;
    requireExplicitProvenance?: boolean;
    requireStableIdentity?: boolean;
    replayTimestamp?: string;
  };
}

export interface ConfidenceGateDecision {
  allowed: boolean;
  mode: ConfidenceRightDecision;
  reasons: string[];
  activeScars: ConfidenceScar[];
  band: ConfidenceBand;
  epistemicState: ConfidenceEpistemicState;
  conditions: string[];
  auditStamp: GateAuditStamp;
}

export interface GateAuditStamp {
  stateId: string;
  canonicalId: string;
  requestedUse: ConfidenceUseDomain;
  missionCritical: boolean;
  decision: ConfidenceRightDecision;
  policyVersion: string;
  evaluatorVersion: string;
  capChain: string[];
  gatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN → RIGHTS FIELD MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

function mapDomainToRightsField(domain: ConfidenceUseDomain): keyof Omit<RightsProfile, 'conditions'> {
  switch (domain) {
    case 'SCORING': return 'scoring';
    case 'CONTRADICTION': return 'contradictionEngine';
    case 'SCENARIO': return 'scenarioEngine';
    case 'JUDGMENT': return 'judgment';
    case 'GRAPH_RELATION': return 'graphRelations';
    case 'CANONICAL_MUTATION': return 'canonicalMutation';
    case 'DISPLAY': return 'display';
    case 'FORENSIC_REPLAY': return 'forensicReplay';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DENIED STATE — used when no confidence state exists
// ═══════════════════════════════════════════════════════════════════════════════

function buildDeniedDecision(
  canonicalId: string,
  domain: ConfidenceUseDomain,
  missionCritical: boolean,
  reason: string,
): ConfidenceGateDecision {
  return {
    allowed: false,
    mode: 'DENY',
    reasons: [reason],
    activeScars: [],
    band: 'UNRESOLVED',
    epistemicState: 'UNRESOLVED',
    conditions: [],
    auditStamp: {
      stateId: 'MISSING',
      canonicalId,
      requestedUse: domain,
      missionCritical,
      decision: 'DENY',
      policyVersion: 'N/A',
      evaluatorVersion: 'N/A',
      capChain: [],
      gatedAt: new Date().toISOString(),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

const _gateAuditLog: GateAuditStamp[] = [];

export function getGateAuditLog(): readonly GateAuditStamp[] {
  return _gateAuditLog;
}

export function resetGateAuditLog(): void {
  _gateAuditLog.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE GATE — the single enforcement entry point
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateConfidenceGate(input: ConfidenceGateInput): ConfidenceGateDecision {
  const { canonicalId, requestedUse, missionCritical, confidenceState, evaluationContext } = input;

  // 1. Reject missing state
  if (!confidenceState) {
    const d = buildDeniedDecision(canonicalId, requestedUse, missionCritical, 'NO_CONFIDENCE_STATE');
    _gateAuditLog.push(d.auditStamp);
    return d;
  }

  const state = confidenceState;
  const rights = state.rightsProfile;
  const band = state.band;
  const epistemic = state.epistemicState;
  const scars = state.activeScars;

  // 2. UNRESOLVED hard block for all deterministic paths
  if (band === 'UNRESOLVED' && requestedUse !== 'DISPLAY' && requestedUse !== 'FORENSIC_REPLAY') {
    const d = buildDecision(state, requestedUse, missionCritical, 'DENY', ['UNRESOLVED_BLOCKS_DETERMINISTIC_USE']);
    _gateAuditLog.push(d.auditStamp);
    return d;
  }

  // 3. Map requestedUse to rights field
  const rightsField = mapDomainToRightsField(requestedUse);
  const baseRight = rights[rightsField];

  // 4. Object-family special restrictions (constitutional hard blocks, checked first)
  const familyBlock = checkObjectFamilyRestrictions(state, requestedUse, evaluationContext);
  if (familyBlock) {
    const d = buildDecision(state, requestedUse, missionCritical, 'DENY', [familyBlock]);
    _gateAuditLog.push(d.auditStamp);
    return d;
  }

  // 5. Mission-critical block
  if (missionCritical && baseRight !== 'ALLOW') {
    const mode: ConfidenceRightDecision = baseRight === 'ALLOW_WITH_SCAR' ? 'ALLOW_WITH_SCAR' : 'DENY';
    const allowed = mode === 'ALLOW_WITH_SCAR';
    const d = buildDecision(state, requestedUse, missionCritical, mode,
      allowed ? ['MISSION_CRITICAL_ALLOWED_WITH_SCAR'] : ['MISSION_CRITICAL_DENIED:requires_ALLOW']);
    _gateAuditLog.push(d.auditStamp);
    return d;
  }

  // 6. Scar-based restrictions
  const scarRestriction = checkScarRestrictions(scars, requestedUse);
  if (scarRestriction) {
    if (baseRight === 'ALLOW') {
      const d = buildDecision(state, requestedUse, missionCritical, 'ALLOW_WITH_SCAR', [scarRestriction]);
      _gateAuditLog.push(d.auditStamp);
      return d;
    }
  }

  // 7. Probation restrictions
  if (state.probationState?.active) {
    if (requestedUse === 'CANONICAL_MUTATION') {
      const d = buildDecision(state, requestedUse, missionCritical, 'DENY', ['PROBATION_BLOCKS_MUTATION']);
      _gateAuditLog.push(d.auditStamp);
      return d;
    }
    if (requestedUse === 'GRAPH_RELATION' && baseRight !== 'ALLOW') {
      const d = buildDecision(state, requestedUse, missionCritical, 'DENY', ['PROBATION_BLOCKS_UNSTABLE_GRAPH']);
      _gateAuditLog.push(d.auditStamp);
      return d;
    }
  }

  // 8. Conditional handling
  if (baseRight === 'CONDITIONAL') {
    const condAllowed = evaluationContext?.allowConditional === true;
    const mode: ConfidenceRightDecision = condAllowed ? 'CONDITIONAL' : 'DENY';
    const allowed = condAllowed;
    const reasons = condAllowed
      ? [`CONDITIONAL_ACCEPTED:${evaluationContext?.requestedByModule ?? 'unknown'}`]
      : ['CONDITIONAL_NOT_EXPLICITLY_ALLOWED'];
    const d = buildDecision(state, requestedUse, missionCritical, mode, reasons, allowed);
    _gateAuditLog.push(d.auditStamp);
    return d;
  }

  // 9. Standard decision
  const allowed = baseRight === 'ALLOW' || baseRight === 'ALLOW_WITH_SCAR';
  const d = buildDecision(state, requestedUse, missionCritical, baseRight, [`RIGHTS_FIELD:${rightsField}=${baseRight}`], allowed);
  _gateAuditLog.push(d.auditStamp);
  return d;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECT-FAMILY RESTRICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function checkObjectFamilyRestrictions(
  state: EntityConfidenceState,
  domain: ConfidenceUseDomain,
  ctx?: ConfidenceGateInput['evaluationContext'],
): string | null {
  const scarCodes = new Set(state.activeScars.map(s => s.code));
  const ot = state.objectType;

  if (ot === 'ENTITY' && scarCodes.has('ENTITY_ATTRIBUTION_WEAK')) {
    if (domain === 'SCORING' || domain === 'JUDGMENT') {
      return 'ENTITY_WEAK_ATTRIBUTION_BLOCKS_' + domain;
    }
  }

  if (ot === 'ENTITY' && ctx?.requireExplicitProvenance) {
    const provFactor = state.factorEvaluations.find(f => f.family === 'PROVENANCE_STRENGTH');
    if (provFactor && provFactor.substate === 'ABSENT') {
      return 'ENTITY_ABSENT_PROVENANCE_EXPLICIT_REQUIRED';
    }
  }

  if (ot === 'NARRATIVE_TOPIC' && scarCodes.has('TOPIC_BOUNDARY_OVERLAP')) {
    if (domain === 'SCENARIO' || domain === 'JUDGMENT') {
      return 'TOPIC_BOUNDARY_OVERLAP_BLOCKS_' + domain;
    }
  }

  if (ot === 'PAIR' && scarCodes.has('SCOPE_AMBIGUITY') && state.band !== 'HIGH') {
    if (domain === 'SCORING') {
      return 'PAIR_SCOPE_AMBIGUITY_BLOCKS_SCORING';
    }
  }

  if (ot === 'PROTOCOL' && scarCodes.has('OSCILLATING_IDENTITY')) {
    if (domain === 'GRAPH_RELATION') {
      return 'PROTOCOL_OSCILLATING_BLOCKS_GRAPH';
    }
  }

  if (ctx?.requireStableIdentity && state.probationState?.active) {
    return 'PROBATION_BLOCKS_STABLE_IDENTITY_REQUIRED';
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCAR-BASED RESTRICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function checkScarRestrictions(
  scars: ConfidenceScar[],
  domain: ConfidenceUseDomain,
): string | null {
  for (const scar of scars) {
    if (scar.severity === 'CRITICAL' && scar.affectsRights.includes(domainToRightsKey(domain))) {
      return `CRITICAL_SCAR:${scar.code}:affects:${domain}`;
    }
  }
  return null;
}

function domainToRightsKey(domain: ConfidenceUseDomain): string {
  switch (domain) {
    case 'SCORING': return 'scoring';
    case 'CONTRADICTION': return 'contradictionEngine';
    case 'SCENARIO': return 'scenarioEngine';
    case 'JUDGMENT': return 'judgment';
    case 'GRAPH_RELATION': return 'graphRelations';
    case 'CANONICAL_MUTATION': return 'canonicalMutation';
    case 'DISPLAY': return 'display';
    case 'FORENSIC_REPLAY': return 'forensicReplay';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildDecision(
  state: EntityConfidenceState,
  domain: ConfidenceUseDomain,
  missionCritical: boolean,
  mode: ConfidenceRightDecision,
  reasons: string[],
  allowedOverride?: boolean,
): ConfidenceGateDecision {
  const allowed = allowedOverride ?? (mode === 'ALLOW' || mode === 'ALLOW_WITH_SCAR');
  return {
    allowed,
    mode,
    reasons,
    activeScars: state.activeScars,
    band: state.band,
    epistemicState: state.epistemicState,
    conditions: state.rightsProfile.conditions,
    auditStamp: {
      stateId: state.stateId,
      canonicalId: state.canonicalId,
      requestedUse: domain,
      missionCritical,
      decision: mode,
      policyVersion: state.policyVersion,
      evaluatorVersion: state.evaluatorVersion,
      capChain: state.capChain.map(c => c.reason),
      gatedAt: new Date().toISOString(),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN WRAPPERS — typed helpers that pre-fill requestedUse
// ═══════════════════════════════════════════════════════════════════════════════

export function canUseForScoring(
  canonicalId: string,
  objectType: CanonicalObjectType,
  confidenceState: EntityConfidenceState | undefined,
  opts?: { missionCritical?: boolean; fieldFamily?: string; requestedByModule?: string },
): ConfidenceGateDecision {
  return evaluateConfidenceGate({
    canonicalId, objectType,
    requestedUse: 'SCORING',
    missionCritical: opts?.missionCritical ?? true,
    confidenceState,
    evaluationContext: { fieldFamily: opts?.fieldFamily, requestedByModule: opts?.requestedByModule },
  });
}

export function canUseForContradiction(
  canonicalId: string,
  objectType: CanonicalObjectType,
  confidenceState: EntityConfidenceState | undefined,
  opts?: { requestedByModule?: string; allowConditional?: boolean },
): ConfidenceGateDecision {
  return evaluateConfidenceGate({
    canonicalId, objectType,
    requestedUse: 'CONTRADICTION',
    missionCritical: false,
    confidenceState,
    evaluationContext: { requestedByModule: opts?.requestedByModule, allowConditional: opts?.allowConditional },
  });
}

export function canUseForScenario(
  canonicalId: string,
  objectType: CanonicalObjectType,
  confidenceState: EntityConfidenceState | undefined,
  opts?: { requestedByModule?: string; allowConditional?: boolean },
): ConfidenceGateDecision {
  return evaluateConfidenceGate({
    canonicalId, objectType,
    requestedUse: 'SCENARIO',
    missionCritical: false,
    confidenceState,
    evaluationContext: { requestedByModule: opts?.requestedByModule, allowConditional: opts?.allowConditional },
  });
}

export function canUseForJudgment(
  canonicalId: string,
  objectType: CanonicalObjectType,
  confidenceState: EntityConfidenceState | undefined,
  opts?: { missionCritical?: boolean; requestedByModule?: string; allowConditional?: boolean },
): ConfidenceGateDecision {
  return evaluateConfidenceGate({
    canonicalId, objectType,
    requestedUse: 'JUDGMENT',
    missionCritical: opts?.missionCritical ?? false,
    confidenceState,
    evaluationContext: { requestedByModule: opts?.requestedByModule, allowConditional: opts?.allowConditional },
  });
}

export function canUseForGraphRelation(
  canonicalId: string,
  objectType: CanonicalObjectType,
  confidenceState: EntityConfidenceState | undefined,
  opts?: { requireStableIdentity?: boolean; requestedByModule?: string; allowConditional?: boolean },
): ConfidenceGateDecision {
  return evaluateConfidenceGate({
    canonicalId, objectType,
    requestedUse: 'GRAPH_RELATION',
    missionCritical: false,
    confidenceState,
    evaluationContext: {
      requireStableIdentity: opts?.requireStableIdentity ?? true,
      requestedByModule: opts?.requestedByModule,
      allowConditional: opts?.allowConditional,
    },
  });
}

export function canUseForReplayOrForensic(
  canonicalId: string,
  objectType: CanonicalObjectType,
  confidenceState: EntityConfidenceState | undefined,
  opts?: { replayTimestamp?: string },
): ConfidenceGateDecision {
  return evaluateConfidenceGate({
    canonicalId, objectType,
    requestedUse: 'FORENSIC_REPLAY',
    missionCritical: false,
    confidenceState,
    evaluationContext: { replayTimestamp: opts?.replayTimestamp },
  });
}
