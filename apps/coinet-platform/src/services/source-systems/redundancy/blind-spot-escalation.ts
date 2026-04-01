/**
 * Blind-Spot Escalation — Strategy C: compound blindness detection.
 *
 * If too many critical truth atoms in the same claim family are degraded,
 * escalate from degraded → partial_blind → judgment_unsafe.
 */

import type { TruthClass } from '../registry';
import { TRUTH_CLASSES } from '../registry';
import type { BlindSpotEscalation, EscalationLevel, SubstitutionStatus } from './types';
import { getLockedOutClaimFamilies } from './claim-lockouts';

interface EscalationInput {
  atomStatuses: Array<{ truthAtomId: string; truthClass: TruthClass; status: SubstitutionStatus }>;
}

const CRITICAL_CLAIM_FAMILY_GROUPS: Array<{
  name: string;
  requiredClasses: TruthClass[];
  escalationThreshold: number;
}> = [
  {
    name: 'leverage-fragility thesis',
    requiredClasses: [TRUTH_CLASSES.DERIVATIVES_PRESSURE, TRUTH_CLASSES.MARKET_SURFACE, TRUTH_CLASSES.ONCHAIN_BEHAVIOR],
    escalationThreshold: 2,
  },
  {
    name: 'structural quality thesis',
    requiredClasses: [TRUTH_CLASSES.PROTOCOL_SUBSTANCE, TRUTH_CLASSES.STRUCTURAL_SAFETY, TRUTH_CLASSES.ONCHAIN_BEHAVIOR],
    escalationThreshold: 2,
  },
  {
    name: 'smart money accumulation thesis',
    requiredClasses: [TRUTH_CLASSES.ONCHAIN_BEHAVIOR, TRUTH_CLASSES.ENTITY_CONTEXT, TRUTH_CLASSES.MARKET_SURFACE],
    escalationThreshold: 2,
  },
  {
    name: 'narrative-vs-substance thesis',
    requiredClasses: [TRUTH_CLASSES.NARRATIVE_ATTENTION, TRUTH_CLASSES.PROTOCOL_SUBSTANCE],
    escalationThreshold: 2,
  },
  {
    name: 'early-stage safety thesis',
    requiredClasses: [TRUTH_CLASSES.DEX_EMERGENCE, TRUTH_CLASSES.STRUCTURAL_SAFETY, TRUTH_CLASSES.ONCHAIN_BEHAVIOR],
    escalationThreshold: 2,
  },
];

export function evaluateBlindSpotEscalation(input: EscalationInput): BlindSpotEscalation | null {
  const blindOrLockedStatuses: SubstitutionStatus[] = ['BLIND', 'LOCKED_OUT'];
  const degradedStatuses: SubstitutionStatus[] = ['BLIND', 'LOCKED_OUT', 'TEMPORAL_FALLBACK_ACTIVE', 'ADJACENT_CONTINUITY_ONLY'];

  const blindAtoms = input.atomStatuses
    .filter(a => blindOrLockedStatuses.includes(a.status))
    .map(a => a.truthAtomId);

  const degradedAtoms = input.atomStatuses
    .filter(a => degradedStatuses.includes(a.status))
    .map(a => a.truthAtomId);

  const blindClasses = new Set<TruthClass>();
  for (const a of input.atomStatuses) {
    if (blindOrLockedStatuses.includes(a.status)) {
      blindClasses.add(a.truthClass);
    }
  }

  if (blindClasses.size === 0 && degradedAtoms.length === 0) return null;

  const affectedFamilies: string[] = [];
  let maxCompoundSeverity = 0;

  for (const group of CRITICAL_CLAIM_FAMILY_GROUPS) {
    const blindInGroup = group.requiredClasses.filter(tc => blindClasses.has(tc));
    if (blindInGroup.length >= group.escalationThreshold) {
      affectedFamilies.push(group.name);
      maxCompoundSeverity = Math.max(maxCompoundSeverity, blindInGroup.length / group.requiredClasses.length);
    }
  }

  const lockouts = getLockedOutClaimFamilies(blindAtoms);
  for (const lf of lockouts) {
    if (!affectedFamilies.includes(lf)) affectedFamilies.push(lf);
  }

  if (affectedFamilies.length === 0 && blindClasses.size < 2) return null;

  let level: EscalationLevel;
  if (maxCompoundSeverity >= 0.7 || blindClasses.size >= 4) {
    level = 'judgment_unsafe';
  } else if (maxCompoundSeverity >= 0.4 || blindClasses.size >= 2) {
    level = 'partial_blind';
  } else {
    level = 'degraded';
  }

  const messages: string[] = [];
  if (level === 'judgment_unsafe') {
    messages.push(`CRITICAL: ${blindClasses.size} truth classes are blind — judgment quality is severely compromised`);
  } else if (level === 'partial_blind') {
    messages.push(`WARNING: ${blindClasses.size} truth classes have blind spots — claim strength must be restricted`);
  } else {
    messages.push(`NOTICE: degraded visibility across ${degradedAtoms.length} truth atoms`);
  }

  return {
    level,
    blindAtoms,
    blindClasses: [...blindClasses],
    affectedClaimFamilies: affectedFamilies,
    compoundSeverity: maxCompoundSeverity,
    message: messages.join('; '),
  };
}
