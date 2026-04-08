/**
 * L3.3 — Entity Confidence Model: Policy Map (Constitutional v2)
 *
 * Defines the cap chain, rights derivation, and conditional policy matrix.
 * Cap order: epistemic state → hard veto → scar → probation → object-family.
 * Rights use four-state model: ALLOW, ALLOW_WITH_SCAR, CONDITIONAL, DENY
 * across 13 downstream domains.
 *
 * Constitutional axiom: confidence is permission, not presentation.
 */

import type { CanonicalObjectType } from './canonical-entity-types';
import {
  BAND_THRESHOLDS,
  type ConfidenceBand,
  type ConfidenceRightDecision,
  type ConfidenceEpistemicState,
  type ConfidenceScar,
  type ScarSeverity,
} from './confidence-factors';

// ═══════════════════════════════════════════════════════════════════════════════
// RIGHTS PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export interface RightsProfile {
  scoring: ConfidenceRightDecision;
  contradictionEngine: ConfidenceRightDecision;
  scenarioEngine: ConfidenceRightDecision;
  judgment: ConfidenceRightDecision;
  graphRelations: ConfidenceRightDecision;
  canonicalMutation: ConfidenceRightDecision;
  metricAttachment: ConfidenceRightDecision;
  contextualReasoning: ConfidenceRightDecision;
  enrichmentOnly: ConfidenceRightDecision;
  display: ConfidenceRightDecision;
  unresolvedQueue: ConfidenceRightDecision;
  forensicReplay: ConfidenceRightDecision;
  manualReviewQueue: ConfidenceRightDecision;
  conditions: string[];
}

export interface ProbationState {
  active: boolean;
  startedAt: string;
  reasonCodes: string[];
  minStableDurationMs: number;
  reviewAt?: string;
}

export interface CapResult {
  capType: string;
  cappedFrom: ConfidenceBand;
  cappedTo: ConfidenceBand;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT RIGHTS PROFILES BY BAND
// ═══════════════════════════════════════════════════════════════════════════════

const HIGH_RIGHTS: RightsProfile = {
  scoring: 'ALLOW',
  contradictionEngine: 'ALLOW',
  scenarioEngine: 'ALLOW',
  judgment: 'ALLOW',
  graphRelations: 'ALLOW',
  canonicalMutation: 'CONDITIONAL',
  metricAttachment: 'ALLOW',
  contextualReasoning: 'ALLOW',
  enrichmentOnly: 'ALLOW',
  display: 'ALLOW',
  unresolvedQueue: 'DENY',
  forensicReplay: 'ALLOW',
  manualReviewQueue: 'CONDITIONAL',
  conditions: [],
};

const MEDIUM_RIGHTS: RightsProfile = {
  scoring: 'CONDITIONAL',
  contradictionEngine: 'CONDITIONAL',
  scenarioEngine: 'CONDITIONAL',
  judgment: 'CONDITIONAL',
  graphRelations: 'CONDITIONAL',
  canonicalMutation: 'DENY',
  metricAttachment: 'CONDITIONAL',
  contextualReasoning: 'ALLOW',
  enrichmentOnly: 'ALLOW',
  display: 'ALLOW',
  unresolvedQueue: 'DENY',
  forensicReplay: 'ALLOW',
  manualReviewQueue: 'CONDITIONAL',
  conditions: [],
};

const LOW_RIGHTS: RightsProfile = {
  scoring: 'DENY',
  contradictionEngine: 'CONDITIONAL',
  scenarioEngine: 'DENY',
  judgment: 'DENY',
  graphRelations: 'DENY',
  canonicalMutation: 'DENY',
  metricAttachment: 'CONDITIONAL',
  contextualReasoning: 'CONDITIONAL',
  enrichmentOnly: 'ALLOW',
  display: 'ALLOW',
  unresolvedQueue: 'CONDITIONAL',
  forensicReplay: 'ALLOW',
  manualReviewQueue: 'ALLOW',
  conditions: [],
};

const UNRESOLVED_RIGHTS: RightsProfile = {
  scoring: 'DENY',
  contradictionEngine: 'DENY',
  scenarioEngine: 'DENY',
  judgment: 'DENY',
  graphRelations: 'DENY',
  canonicalMutation: 'DENY',
  metricAttachment: 'DENY',
  contextualReasoning: 'CONDITIONAL',
  enrichmentOnly: 'CONDITIONAL',
  display: 'ALLOW_WITH_SCAR',
  unresolvedQueue: 'ALLOW',
  forensicReplay: 'ALLOW',
  manualReviewQueue: 'ALLOW',
  conditions: [],
};

function getBaseRightsForBand(band: ConfidenceBand): RightsProfile {
  switch (band) {
    case 'HIGH': return { ...HIGH_RIGHTS, conditions: [] };
    case 'MEDIUM': return { ...MEDIUM_RIGHTS, conditions: [] };
    case 'LOW': return { ...LOW_RIGHTS, conditions: [] };
    case 'UNRESOLVED': return { ...UNRESOLVED_RIGHTS, conditions: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAP 1 — EPISTEMIC STATE (from L3.2)
// ═══════════════════════════════════════════════════════════════════════════════

export function applyEpistemicStateCap(
  band: ConfidenceBand,
  epistemicState: ConfidenceEpistemicState,
  hasMajorScar: boolean,
): CapResult | null {
  if (epistemicState === 'UNRESOLVED') {
    if (band !== 'UNRESOLVED') {
      return { capType: 'EPISTEMIC', cappedFrom: band, cappedTo: 'UNRESOLVED', reason: 'EPISTEMIC_UNRESOLVED_FORCES_UNRESOLVED' };
    }
    return null;
  }
  if (epistemicState === 'CONTESTED') {
    if (band === 'HIGH' || band === 'MEDIUM') {
      return { capType: 'EPISTEMIC', cappedFrom: band, cappedTo: 'LOW', reason: 'EPISTEMIC_CONTESTED_CAPS_LOW' };
    }
    return null;
  }
  if (epistemicState === 'RESOLVED_WITH_SCAR' && hasMajorScar) {
    if (band === 'HIGH') {
      return { capType: 'EPISTEMIC', cappedFrom: 'HIGH', cappedTo: 'MEDIUM', reason: 'EPISTEMIC_SCAR_CAPS_MEDIUM' };
    }
    return null;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAP 2 — HARD VETOES
// ═══════════════════════════════════════════════════════════════════════════════

export function applyHardVetoCap(band: ConfidenceBand, vetoes: string[]): CapResult | null {
  if (vetoes.length === 0) return null;

  const forceUnresolved = vetoes.some(v =>
    v === 'UNRESOLVED_CO_AUTHORITY' ||
    v === 'SCOPE_CONFLICT' ||
    v === 'ABSENT_PROVENANCE' ||
    v === 'ENTITY_ABSENT_PROVENANCE' ||
    v === 'OSCILLATING_IDENTITY',
  );

  if (forceUnresolved && band !== 'UNRESOLVED') {
    return { capType: 'HARD_VETO', cappedFrom: band, cappedTo: 'UNRESOLVED', reason: `VETO:${vetoes[0]}` };
  }

  const forceLow = vetoes.some(v =>
    v === 'PROVIDER_CLAIM_ONLY_ASSET' ||
    v === 'ALIAS_ONLY_ENTITY',
  );
  if (forceLow && (band === 'HIGH' || band === 'MEDIUM')) {
    return { capType: 'HARD_VETO', cappedFrom: band, cappedTo: 'LOW', reason: `VETO:${vetoes[0]}` };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAP 3 — SCAR CAPS
// ═══════════════════════════════════════════════════════════════════════════════

export function applyScarCap(band: ConfidenceBand, scars: ConfidenceScar[]): CapResult | null {
  if (scars.length === 0) return null;

  const hasCritical = scars.some(s => s.severity === 'CRITICAL');
  const hasHigh = scars.some(s => s.severity === 'HIGH');
  const criticalCount = scars.filter(s => s.severity === 'CRITICAL').length;

  if (hasCritical && criticalCount >= 2 && band !== 'UNRESOLVED' && band !== 'LOW') {
    return { capType: 'SCAR', cappedFrom: band, cappedTo: 'LOW', reason: 'MULTIPLE_CRITICAL_SCARS' };
  }
  if (hasCritical && band === 'HIGH') {
    return { capType: 'SCAR', cappedFrom: 'HIGH', cappedTo: 'MEDIUM', reason: 'CRITICAL_SCAR_CAPS_MEDIUM' };
  }
  if (hasHigh && scars.filter(s => s.severity === 'HIGH').length >= 3 && band === 'HIGH') {
    return { capType: 'SCAR', cappedFrom: 'HIGH', cappedTo: 'MEDIUM', reason: 'MANY_HIGH_SCARS_CAPS_MEDIUM' };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAP 4 — PROBATION
// ═══════════════════════════════════════════════════════════════════════════════

export function applyProbationCap(band: ConfidenceBand, probation?: ProbationState): CapResult | null {
  if (!probation || !probation.active) return null;
  if (band === 'HIGH') {
    return { capType: 'PROBATION', cappedFrom: 'HIGH', cappedTo: 'MEDIUM', reason: 'PROBATION_CAPS_MEDIUM' };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAP 5 — OBJECT-FAMILY POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export function applyObjectFamilyCap(
  band: ConfidenceBand,
  objectType: CanonicalObjectType,
  scars: ConfidenceScar[],
  input: { isAliasOnly: boolean; isProviderClaimOnly: boolean; hasAbsentProvenance: boolean },
): CapResult | null {
  const scarCodes = new Set(scars.map(s => s.code));

  if (objectType === 'ENTITY') {
    if (input.hasAbsentProvenance && (band === 'HIGH' || band === 'MEDIUM')) {
      return { capType: 'OBJECT_FAMILY', cappedFrom: band, cappedTo: 'LOW', reason: 'ENTITY_NO_PROVENANCE' };
    }
    if (scarCodes.has('ENTITY_ATTRIBUTION_WEAK') && band === 'HIGH') {
      return { capType: 'OBJECT_FAMILY', cappedFrom: 'HIGH', cappedTo: 'MEDIUM', reason: 'ENTITY_WEAK_ATTRIBUTION' };
    }
  }

  if (objectType === 'NARRATIVE_TOPIC') {
    if (scarCodes.has('TOPIC_BOUNDARY_OVERLAP') && band === 'HIGH') {
      return { capType: 'OBJECT_FAMILY', cappedFrom: 'HIGH', cappedTo: 'MEDIUM', reason: 'TOPIC_OVERLAP_CAPS_MEDIUM' };
    }
  }

  if (input.isAliasOnly && band === 'HIGH') {
    return { capType: 'OBJECT_FAMILY', cappedFrom: 'HIGH', cappedTo: 'MEDIUM', reason: 'ALIAS_ONLY_CAPS_MEDIUM' };
  }
  if (input.isProviderClaimOnly && (band === 'HIGH' || band === 'MEDIUM')) {
    return { capType: 'OBJECT_FAMILY', cappedFrom: band, cappedTo: 'LOW', reason: 'PROVIDER_CLAIM_ONLY_CAPS_LOW' };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERED CAP CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

const BAND_RANK: Record<ConfidenceBand, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNRESOLVED: 0 };

export interface CapChainResult {
  finalBand: ConfidenceBand;
  capChain: CapResult[];
}

export function applyAllCaps(
  provisionalBand: ConfidenceBand,
  epistemicState: ConfidenceEpistemicState,
  vetoes: string[],
  scars: ConfidenceScar[],
  probation: ProbationState | undefined,
  objectType: CanonicalObjectType,
  input: { isAliasOnly: boolean; isProviderClaimOnly: boolean; hasAbsentProvenance: boolean },
): CapChainResult {
  const capChain: CapResult[] = [];
  let band = provisionalBand;

  const hasMajorScar = scars.some(s => s.severity === 'CRITICAL' || s.severity === 'HIGH');

  const c1 = applyEpistemicStateCap(band, epistemicState, hasMajorScar);
  if (c1 && BAND_RANK[c1.cappedTo] < BAND_RANK[band]) { band = c1.cappedTo; capChain.push(c1); }

  const c2 = applyHardVetoCap(band, vetoes);
  if (c2 && BAND_RANK[c2.cappedTo] < BAND_RANK[band]) { band = c2.cappedTo; capChain.push(c2); }

  const c3 = applyScarCap(band, scars);
  if (c3 && BAND_RANK[c3.cappedTo] < BAND_RANK[band]) { band = c3.cappedTo; capChain.push(c3); }

  const c4 = applyProbationCap(band, probation);
  if (c4 && BAND_RANK[c4.cappedTo] < BAND_RANK[band]) { band = c4.cappedTo; capChain.push(c4); }

  const c5 = applyObjectFamilyCap(band, objectType, scars, input);
  if (c5 && BAND_RANK[c5.cappedTo] < BAND_RANK[band]) { band = c5.cappedTo; capChain.push(c5); }

  return { finalBand: band, capChain };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIGHTS DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

export function deriveRightsProfile(
  band: ConfidenceBand,
  objectType: CanonicalObjectType,
  scars: ConfidenceScar[],
  epistemicState: ConfidenceEpistemicState,
): RightsProfile {
  const rights = getBaseRightsForBand(band);
  const scarCodes = new Set(scars.map(s => s.code));
  const conditions: string[] = [];

  if (band === 'HIGH' && scars.length > 0) {
    rights.scoring = 'ALLOW_WITH_SCAR';
    rights.graphRelations = 'ALLOW_WITH_SCAR';
    conditions.push('HIGH_WITH_SCARS:scoring_and_graph_carry_scar');
  }

  if (objectType === 'ENTITY') {
    if (scarCodes.has('ENTITY_ATTRIBUTION_WEAK')) {
      rights.scoring = 'DENY';
      rights.judgment = 'DENY';
      conditions.push('ENTITY_WEAK_ATTRIBUTION:scoring_and_judgment_denied');
    }
    if (band === 'MEDIUM') {
      rights.scenarioEngine = 'DENY';
      conditions.push('ENTITY_MEDIUM:scenario_denied');
    }
  }

  if (objectType === 'NARRATIVE_TOPIC') {
    if (scarCodes.has('TOPIC_BOUNDARY_OVERLAP')) {
      rights.scenarioEngine = 'DENY';
      rights.judgment = 'DENY';
      conditions.push('TOPIC_OVERLAP:scenario_and_judgment_denied');
    }
    if (band === 'MEDIUM') {
      rights.scoring = 'DENY';
      conditions.push('NARRATIVE_MEDIUM:scoring_denied');
    }
  }

  if (objectType === 'PAIR' && scarCodes.has('SCOPE_AMBIGUITY') && band !== 'HIGH') {
    rights.scoring = 'DENY';
    rights.metricAttachment = 'DENY';
    conditions.push('PAIR_SCOPE_AMBIGUITY:scoring_denied');
  }

  if (objectType === 'PROTOCOL' && scarCodes.has('OSCILLATING_IDENTITY')) {
    rights.graphRelations = 'DENY';
    conditions.push('PROTOCOL_OSCILLATING:graph_denied');
  }

  if (epistemicState === 'CONTESTED') {
    rights.canonicalMutation = 'DENY';
    conditions.push('CONTESTED:mutation_denied');
  }

  rights.conditions = conditions;
  return rights;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MISSION-CRITICAL SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

export function isMissionCriticalUseAllowed(
  rights: RightsProfile,
  useContext: string,
): boolean {
  switch (useContext) {
    case 'PRICE_SCORING':
    case 'OI_SCORING':
    case 'FUNDING_SCORING':
    case 'LIQUIDITY_SCORING':
    case 'TVL_SCORING':
      return rights.scoring === 'ALLOW' || rights.scoring === 'ALLOW_WITH_SCAR';
    case 'EXCHANGE_FLOW_CLAIMS':
    case 'SMART_MONEY_CONCLUSIONS':
      return rights.judgment === 'ALLOW';
    case 'CONTRACT_REASONING':
    case 'TRANSFER_REASONING':
      return rights.graphRelations === 'ALLOW' || rights.graphRelations === 'ALLOW_WITH_SCAR';
    default:
      return rights.scoring === 'ALLOW';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROBATION POLICY
// ═══════════════════════════════════════════════════════════════════════════════

const PROBATION_DURATIONS: Record<CanonicalObjectType, number> = {
  ASSET: 3600_000,
  PAIR: 3600_000,
  PROTOCOL: 7200_000,
  ENTITY: 14400_000,
  CHAIN: 7200_000,
  NARRATIVE_TOPIC: 3600_000,
};

export function createProbation(objectType: CanonicalObjectType, reasonCodes: string[]): ProbationState {
  return {
    active: true,
    startedAt: new Date().toISOString(),
    reasonCodes,
    minStableDurationMs: PROBATION_DURATIONS[objectType],
  };
}

export function shouldEnterProbation(isRecentlyCorrected: boolean, isOscillating: boolean): boolean {
  return isRecentlyCorrected || isOscillating;
}

export { BAND_THRESHOLDS };
