/**
 * Claim Boundary Doctrine — what each class can justify alone, weakly, or never.
 *
 * Strategy 1 (Truth-Domain Sovereignty) + Strategy 4 (Claim Escalation).
 */

import { TRUTH_CLASSES } from '../registry';
import type { TruthClass } from '../registry';
import type { ClaimStrength, ClaimEscalationRule } from './types';

export interface ClaimBoundary {
  truthClass: TruthClass;
  canJustifyAlone: string[];
  canJustifyWeakly: string[];
  canNeverJustify: string[];
}

export const CLAIM_BOUNDARIES: Record<string, ClaimBoundary> = {
  [TRUTH_CLASSES.MARKET_SURFACE]: {
    truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    canJustifyAlone: ['price direction', 'volume trend', 'market cap rank', 'broad visibility'],
    canJustifyWeakly: ['demand presence', 'liquidity adequacy'],
    canNeverJustify: ['structural demand quality', 'manipulation detection', 'fundamental improvement', 'whale conviction'],
  },
  [TRUTH_CLASSES.DEX_EMERGENCE]: {
    truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    canJustifyAlone: ['new pair existence', 'initial liquidity level', 'pool age'],
    canJustifyWeakly: ['early momentum signal', 'discovery opportunity'],
    canNeverJustify: ['long-term quality', 'sustainable demand', 'structural safety', 'institutional relevance'],
  },
  [TRUTH_CLASSES.DERIVATIVES_PRESSURE]: {
    truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    canJustifyAlone: ['leverage level', 'funding direction', 'liquidation proximity', 'OI trend'],
    canJustifyWeakly: ['leverage-driven move classification', 'crowding risk'],
    canNeverJustify: ['organic spot demand', 'protocol quality', 'treasury intent', 'structural safety'],
  },
  [TRUTH_CLASSES.PROTOCOL_SUBSTANCE]: {
    truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    canJustifyAlone: ['revenue trend', 'TVL direction', 'unlock schedule', 'business quality'],
    canJustifyWeakly: ['fundamental rerating justification', 'valuation context'],
    canNeverJustify: ['near-term price prediction', 'leverage safety', 'whale intent', 'memetic timing'],
  },
  [TRUTH_CLASSES.ONCHAIN_BEHAVIOR]: {
    truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    canJustifyAlone: ['large wallet movement', 'exchange flow direction', 'contract interaction'],
    canJustifyWeakly: ['accumulation pattern', 'distribution pattern', 'treasury activity'],
    canNeverJustify: ['derivatives safety', 'protocol economics', 'narrative momentum', 'entity identity'],
  },
  [TRUTH_CLASSES.STRUCTURAL_SAFETY]: {
    truthClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    canJustifyAlone: ['contract danger flags', 'ownership concentration', 'confidence cap'],
    canJustifyWeakly: ['legitimacy baseline'],
    canNeverJustify: ['opportunity quality', 'demand strength', 'timing favorability', 'protocol merit'],
  },
  [TRUTH_CLASSES.NARRATIVE_ATTENTION]: {
    truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    canJustifyAlone: ['attention concentration', 'narrative heat trend', 'sentiment direction'],
    canJustifyWeakly: ['narrative-driven move possibility'],
    canNeverJustify: ['real accumulation', 'protocol quality', 'structural safety', 'sustainable continuation'],
  },
  [TRUTH_CLASSES.ENTITY_CONTEXT]: {
    truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    canJustifyAlone: ['wallet identity label', 'entity classification'],
    canJustifyWeakly: ['actor significance assessment', 'smart money involvement'],
    canNeverJustify: ['timing prediction', 'leverage conditions', 'protocol soundness', 'narrative trend'],
  },
  [TRUTH_CLASSES.REASONING_EXPRESSION]: {
    truthClass: TRUTH_CLASSES.REASONING_EXPRESSION,
    canJustifyAlone: ['explanation of engine conclusions', 'language synthesis', 'comparison framing'],
    canJustifyWeakly: [],
    canNeverJustify: ['new evidence creation', 'missing domain substitution', 'contradiction override', 'degraded visibility masking'],
  },
};

export const CLAIM_ESCALATION_RULES: ClaimEscalationRule[] = [
  {
    claimType: 'This is a low-quality reflexive pump with fragile continuation',
    minimumStrength: 'strong',
    requiredClasses: [TRUTH_CLASSES.NARRATIVE_ATTENTION, TRUTH_CLASSES.DERIVATIVES_PRESSURE, TRUTH_CLASSES.PROTOCOL_SUBSTANCE, TRUTH_CLASSES.ONCHAIN_BEHAVIOR],
    minimumClassCount: 3,
    description: 'Strong fragility claim requires narrative + pressure + weak substance + weak behavior',
  },
  {
    claimType: 'Smart money is accumulating with conviction',
    minimumStrength: 'strong',
    requiredClasses: [TRUTH_CLASSES.ONCHAIN_BEHAVIOR, TRUTH_CLASSES.ENTITY_CONTEXT],
    minimumClassCount: 2,
    description: 'Conviction accumulation requires behavior + entity identity',
  },
  {
    claimType: 'Move is leverage-driven not spot-driven',
    minimumStrength: 'medium',
    requiredClasses: [TRUTH_CLASSES.DERIVATIVES_PRESSURE, TRUTH_CLASSES.MARKET_SURFACE],
    minimumClassCount: 2,
    description: 'Leverage vs spot classification needs both pressure and surface observation',
  },
  {
    claimType: 'Protocol fundamentally deserves rerating',
    minimumStrength: 'strong',
    requiredClasses: [TRUTH_CLASSES.PROTOCOL_SUBSTANCE, TRUTH_CLASSES.MARKET_SURFACE],
    minimumClassCount: 2,
    description: 'Rerating claim needs substance proof + surface confirmation',
  },
  {
    claimType: 'This is a manipulated or structurally dangerous setup',
    minimumStrength: 'strong',
    requiredClasses: [TRUTH_CLASSES.STRUCTURAL_SAFETY, TRUTH_CLASSES.ONCHAIN_BEHAVIOR],
    minimumClassCount: 2,
    description: 'Manipulation claim requires safety flags + on-chain evidence',
  },
  {
    claimType: 'Narrative heat is building but structure is absent',
    minimumStrength: 'medium',
    requiredClasses: [TRUTH_CLASSES.NARRATIVE_ATTENTION, TRUTH_CLASSES.PROTOCOL_SUBSTANCE],
    minimumClassCount: 2,
    description: 'Narrative-without-substance requires observing both sides',
  },
];

export function getClaimBoundary(truthClass: TruthClass): ClaimBoundary | undefined {
  return CLAIM_BOUNDARIES[truthClass];
}

export function canClassJustifyClaim(truthClass: TruthClass, claim: string): ClaimStrength | 'never' {
  const boundary = CLAIM_BOUNDARIES[truthClass];
  if (!boundary) return 'never';
  if (boundary.canJustifyAlone.some(c => claim.toLowerCase().includes(c.toLowerCase()))) return 'medium';
  if (boundary.canJustifyWeakly.some(c => claim.toLowerCase().includes(c.toLowerCase()))) return 'weak';
  if (boundary.canNeverJustify.some(c => claim.toLowerCase().includes(c.toLowerCase()))) return 'never';
  return 'weak';
}

export function getEscalationRequirements(claimType: string): ClaimEscalationRule | undefined {
  return CLAIM_ESCALATION_RULES.find(r =>
    claimType.toLowerCase().includes(r.claimType.toLowerCase().slice(0, 30)),
  );
}
