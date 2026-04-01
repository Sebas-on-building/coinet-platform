/**
 * Claim Authority Ladder — Strategy 4: Strong Claims Require Authority Quorum.
 *
 * No single source should justify certain strong claims alone.
 * Claim strength determines the authority quorum needed.
 */

import { TRUTH_CLASSES } from '../registry';
import type { TruthClass } from '../registry';
import type { ClaimAuthorityLevel, ClaimAuthorityRequirement } from './types';

const TC = TRUTH_CLASSES;

export const CLAIM_AUTHORITY_REQUIREMENTS: ClaimAuthorityRequirement[] = [
  // ── WEAK CLAIMS (single healthy primary sufficient) ───────────────────
  {
    claimType: 'Funding is elevated',
    level: 'WEAK',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 1,
    requiredTruthClasses: [TC.DERIVATIVES_PRESSURE],
    challengerMustBeClear: false,
    description: 'Single-domain factual observation from healthy primary',
  },
  {
    claimType: 'TVL increased',
    level: 'WEAK',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 1,
    requiredTruthClasses: [TC.PROTOCOL_SUBSTANCE],
    challengerMustBeClear: false,
    description: 'Single-domain factual observation from healthy primary',
  },
  {
    claimType: 'Narrative intensity is rising',
    level: 'WEAK',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 1,
    requiredTruthClasses: [TC.NARRATIVE_ATTENTION],
    challengerMustBeClear: false,
    description: 'Single-domain factual observation from healthy primary',
  },
  {
    claimType: 'Large wallet movement detected',
    level: 'WEAK',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 1,
    requiredTruthClasses: [TC.ONCHAIN_BEHAVIOR],
    challengerMustBeClear: false,
    description: 'Raw behavioral observation',
  },

  // ── MEDIUM CLAIMS (primary + secondary or no-contradiction) ───────────
  {
    claimType: 'This move appears leverage-heavy',
    level: 'MEDIUM',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 2,
    requiredTruthClasses: [TC.DERIVATIVES_PRESSURE, TC.MARKET_SURFACE],
    challengerMustBeClear: false,
    description: 'Interpretive claim requiring primary + market confirmation',
  },
  {
    claimType: 'This rerating has some substance support',
    level: 'MEDIUM',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 2,
    requiredTruthClasses: [TC.PROTOCOL_SUBSTANCE, TC.MARKET_SURFACE],
    challengerMustBeClear: false,
    description: 'Requires substance + surface alignment',
  },
  {
    claimType: 'Smart money is active on this asset',
    level: 'MEDIUM',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 2,
    requiredTruthClasses: [TC.ONCHAIN_BEHAVIOR, TC.ENTITY_CONTEXT],
    challengerMustBeClear: false,
    description: 'Behavior + entity labeling needed',
  },
  {
    claimType: 'Narrative is driving this move more than structure',
    level: 'MEDIUM',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 2,
    requiredTruthClasses: [TC.NARRATIVE_ATTENTION, TC.PROTOCOL_SUBSTANCE],
    challengerMustBeClear: false,
    description: 'Must observe both narrative strength and substance weakness',
  },

  // ── STRONG CLAIMS (multi-domain, no severe challenger conflict) ───────
  {
    claimType: 'This is a fragile leverage-led continuation',
    level: 'STRONG',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 3,
    requiredTruthClasses: [TC.DERIVATIVES_PRESSURE, TC.MARKET_SURFACE, TC.ONCHAIN_BEHAVIOR],
    challengerMustBeClear: true,
    description: 'Fragility thesis requires pressure + surface + behavior alignment without major challenger dispute',
  },
  {
    claimType: 'This is a structurally improving rerating',
    level: 'STRONG',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 3,
    requiredTruthClasses: [TC.PROTOCOL_SUBSTANCE, TC.MARKET_SURFACE, TC.ONCHAIN_BEHAVIOR],
    forbiddenBlindClasses: [TC.STRUCTURAL_SAFETY],
    challengerMustBeClear: true,
    description: 'Rerating thesis requires substance + surface + behavior without safety blindness',
  },
  {
    claimType: 'This is a low-quality reflexive pump likely to fail',
    level: 'STRONG',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 3,
    requiredTruthClasses: [TC.NARRATIVE_ATTENTION, TC.DERIVATIVES_PRESSURE, TC.PROTOCOL_SUBSTANCE],
    challengerMustBeClear: true,
    description: 'Reflexive pump thesis requires hot narrative + pressure + weak substance',
  },
  {
    claimType: 'This asset is structurally dangerous',
    level: 'STRONG',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 2,
    requiredTruthClasses: [TC.STRUCTURAL_SAFETY, TC.ONCHAIN_BEHAVIOR],
    challengerMustBeClear: true,
    description: 'Safety + behavioral evidence together justify structural danger claim',
  },

  // ── DECISIVE CLAIMS (multi-domain quorum, clean authority, rare) ──────
  {
    claimType: 'This is a high-conviction accumulation opportunity with structural support',
    level: 'DECISIVE',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 5,
    requiredTruthClasses: [TC.MARKET_SURFACE, TC.ONCHAIN_BEHAVIOR, TC.PROTOCOL_SUBSTANCE, TC.STRUCTURAL_SAFETY, TC.ENTITY_CONTEXT],
    forbiddenBlindClasses: [TC.DERIVATIVES_PRESSURE, TC.STRUCTURAL_SAFETY],
    challengerMustBeClear: true,
    description: 'Decisive opportunity requires surface + behavior + substance + safety + entity quorum with no severe blind spots',
  },
  {
    claimType: 'This is an imminent cascade failure',
    level: 'DECISIVE',
    requiredPrimaryHealthy: true,
    minimumDomainCount: 4,
    requiredTruthClasses: [TC.DERIVATIVES_PRESSURE, TC.MARKET_SURFACE, TC.ONCHAIN_BEHAVIOR, TC.STRUCTURAL_SAFETY],
    challengerMustBeClear: true,
    description: 'Cascade failure requires pressure + surface + behavior + safety all confirming fragility',
  },
];

export function getRequirementsForLevel(level: ClaimAuthorityLevel): ClaimAuthorityRequirement[] {
  return CLAIM_AUTHORITY_REQUIREMENTS.filter(r => r.level === level);
}

export function findMatchingRequirement(claimType: string): ClaimAuthorityRequirement | undefined {
  const normalized = claimType.toLowerCase();
  return CLAIM_AUTHORITY_REQUIREMENTS.find(r =>
    normalized.includes(r.claimType.toLowerCase().slice(0, 25)),
  );
}

export interface ClaimEligibilityResult {
  eligible: boolean;
  maxAllowedLevel: ClaimAuthorityLevel;
  blockers: string[];
  satisfiedRequirements: string[];
}

export function evaluateClaimEligibility(
  availableClasses: TruthClass[],
  blindClasses: TruthClass[],
  hasChallenge: boolean,
  requirement: ClaimAuthorityRequirement,
): ClaimEligibilityResult {
  const blockers: string[] = [];
  const satisfied: string[] = [];

  const available = new Set(availableClasses);
  const blind = new Set(blindClasses);

  const hasRequired = requirement.requiredTruthClasses.every(tc => available.has(tc));
  if (!hasRequired) {
    const missing = requirement.requiredTruthClasses.filter(tc => !available.has(tc));
    blockers.push(`Missing required truth classes: ${missing.join(', ')}`);
  } else {
    satisfied.push('All required truth classes present');
  }

  if (availableClasses.length < requirement.minimumDomainCount) {
    blockers.push(`Only ${availableClasses.length} domains available, need ${requirement.minimumDomainCount}`);
  } else {
    satisfied.push(`Domain count sufficient (${availableClasses.length}/${requirement.minimumDomainCount})`);
  }

  if (requirement.forbiddenBlindClasses) {
    const blindForbidden = requirement.forbiddenBlindClasses.filter(tc => blind.has(tc));
    if (blindForbidden.length > 0) {
      blockers.push(`Forbidden blind spots present: ${blindForbidden.join(', ')}`);
    }
  }

  if (requirement.challengerMustBeClear && hasChallenge) {
    blockers.push('Active challenger disputes block this claim level');
  }

  const eligible = blockers.length === 0;

  let maxAllowedLevel: ClaimAuthorityLevel = 'WEAK';
  if (eligible) {
    maxAllowedLevel = requirement.level;
  } else if (availableClasses.length >= 2) {
    maxAllowedLevel = 'MEDIUM';
  }

  return { eligible, maxAllowedLevel, blockers, satisfiedRequirements: satisfied };
}
