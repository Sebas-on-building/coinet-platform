/**
 * Authority Resolver — the runtime engine that determines who has
 * speaking rights for a truth atom at a given moment.
 *
 * Execution order:
 * 1. Identify truth atom
 * 2. Load candidate authority rules
 * 3. Filter by condition (freshness, health, chain, endpoint)
 * 4. Select active primary authority
 * 5. Check secondary substitution
 * 6. Load challenger rights
 * 7. Evaluate challenger evidence
 * 8. Produce resolution outcome
 * 9. Emit authority metadata for downstream judgment
 */

import type {
  TruthAtomId,
  ResolvedAuthority,
  AuthorityStatus,
  AuthorityStrength,
  ResolutionOutcome,
} from './types';
import { getTruthAtom } from './truth-atoms';
import { getPrimaryRulesForAtom, getSecondaryRulesForAtom, getChallengerRulesForAtom } from './authority-registry';
import { evaluateAuthorityPolicy, type AuthorityContext } from './authority-policies';
import { getChallengersForAtom } from './challenger-matrix';

export interface ResolveInput {
  truthAtomId: TruthAtomId;
  context: AuthorityContext;
  activeChallengerSignals?: string[];
}

export function resolveAuthority(input: ResolveInput): ResolvedAuthority {
  const atom = getTruthAtom(input.truthAtomId);
  if (!atom) {
    return blindResult(input.truthAtomId, 'Unknown truth atom');
  }

  const primaryRules = getPrimaryRulesForAtom(input.truthAtomId);
  const secondaryRules = getSecondaryRulesForAtom(input.truthAtomId);
  const challengerAuthorityRules = getChallengerRulesForAtom(input.truthAtomId);
  const challengerMatrixRules = getChallengersForAtom(input.truthAtomId);

  const evaluatedPrimaries = primaryRules
    .map(rule => ({ rule, eval: evaluateAuthorityPolicy(rule, input.context) }))
    .filter(e => e.eval.passes)
    .sort((a, b) => strengthOrder(b.eval.effectiveStrength) - strengthOrder(a.eval.effectiveStrength));

  const evaluatedSecondaries = secondaryRules
    .map(rule => ({ rule, eval: evaluateAuthorityPolicy(rule, input.context) }))
    .filter(e => e.eval.passes)
    .sort((a, b) => strengthOrder(b.eval.effectiveStrength) - strengthOrder(a.eval.effectiveStrength));

  const activeSignals = new Set(input.activeChallengerSignals ?? []);
  const activeChallengers = challengerMatrixRules.filter(
    cr => activeSignals.has(cr.triggerCondition),
  );

  if (evaluatedPrimaries.length === 0 && evaluatedSecondaries.length === 0) {
    return blindResult(input.truthAtomId, 'No authority source passed policy evaluation');
  }

  if (evaluatedPrimaries.length === 0 && evaluatedSecondaries.length > 0) {
    const sub = evaluatedSecondaries[0];
    return {
      truthAtomId: input.truthAtomId,
      outcome: 'SECONDARY_SUBSTITUTED',
      activePrimary: null,
      activeSecondary: sub.rule.sourceId,
      activeChallengers: activeChallengers.map(c => c.challengerId),
      contestedBy: [],
      strength: sub.eval.effectiveStrength,
      status: 'DEGRADED',
      confidenceMultiplier: 0.7,
      rationale: [
        `Primary sources unavailable for ${input.truthAtomId}`,
        `Secondary ${sub.rule.sourceId} substituted`,
        ...sub.eval.reasons,
      ],
    };
  }

  const primary = evaluatedPrimaries[0];
  const secondary = evaluatedSecondaries[0] ?? null;

  if (activeChallengers.length > 0) {
    const totalWeaken = activeChallengers.reduce((sum, c) => sum + c.weakenStrength, 0);
    const cappedWeaken = Math.min(totalWeaken, 0.6);
    const confidenceMultiplier = 1 - cappedWeaken;

    const challengerIds = activeChallengers.map(c => c.challengerId);

    const hasMetricChallenge = activeChallengers.some(c => c.challengeType === 'metric');

    const outcome: ResolutionOutcome = hasMetricChallenge
      ? 'UNRESOLVED_CONFLICT'
      : 'PRIMARY_CONTESTED';

    const status: AuthorityStatus = hasMetricChallenge ? 'CONTESTED' : 'PARTIAL';

    return {
      truthAtomId: input.truthAtomId,
      outcome,
      activePrimary: primary.rule.sourceId,
      activeSecondary: secondary?.rule.sourceId ?? null,
      activeChallengers: challengerIds,
      contestedBy: challengerIds,
      strength: degradeStrengthBy(primary.eval.effectiveStrength, activeChallengers.length),
      status,
      confidenceMultiplier,
      rationale: [
        `Primary ${primary.rule.sourceId} authority on ${input.truthAtomId}`,
        ...activeChallengers.map(c => `CHALLENGED by ${c.challengerClass}: ${c.description}`),
        `Confidence reduced by ${(cappedWeaken * 100).toFixed(0)}% from challenger pressure`,
      ],
    };
  }

  if (secondary) {
    return {
      truthAtomId: input.truthAtomId,
      outcome: 'PRIMARY_WITH_SECONDARY_SUPPORT',
      activePrimary: primary.rule.sourceId,
      activeSecondary: secondary.rule.sourceId,
      activeChallengers: [],
      contestedBy: [],
      strength: primary.eval.effectiveStrength,
      status: 'HEALTHY',
      confidenceMultiplier: 1.0,
      rationale: [
        `Primary ${primary.rule.sourceId} confirmed for ${input.truthAtomId}`,
        `Secondary ${secondary.rule.sourceId} available as support`,
        ...primary.eval.reasons,
      ],
    };
  }

  return {
    truthAtomId: input.truthAtomId,
    outcome: 'PRIMARY_CONFIRMED',
    activePrimary: primary.rule.sourceId,
    activeSecondary: null,
    activeChallengers: [],
    contestedBy: [],
    strength: primary.eval.effectiveStrength,
    status: 'HEALTHY',
    confidenceMultiplier: 1.0,
    rationale: [
      `Primary ${primary.rule.sourceId} confirmed for ${input.truthAtomId}`,
      ...primary.eval.reasons,
    ],
  };
}

export function resolveMultipleAtoms(
  atomIds: TruthAtomId[],
  context: AuthorityContext,
  activeChallengerSignals?: string[],
): Map<TruthAtomId, ResolvedAuthority> {
  const results = new Map<TruthAtomId, ResolvedAuthority>();
  for (const atomId of atomIds) {
    results.set(atomId, resolveAuthority({ truthAtomId: atomId, context, activeChallengerSignals }));
  }
  return results;
}

function blindResult(truthAtomId: string, reason: string): ResolvedAuthority {
  return {
    truthAtomId,
    outcome: 'AUTHORITY_BLIND',
    activePrimary: null,
    activeSecondary: null,
    activeChallengers: [],
    contestedBy: [],
    strength: 'WEAK',
    status: 'BLIND',
    confidenceMultiplier: 0,
    rationale: [reason],
  };
}

const STRENGTH_MAP: Record<AuthorityStrength, number> = {
  ABSOLUTE: 4,
  HIGH: 3,
  MEDIUM: 2,
  WEAK: 1,
};

function strengthOrder(s: AuthorityStrength): number {
  return STRENGTH_MAP[s] ?? 0;
}

function degradeStrengthBy(base: AuthorityStrength, levels: number): AuthorityStrength {
  const current = STRENGTH_MAP[base];
  const degraded = Math.max(1, current - levels);
  const entries = Object.entries(STRENGTH_MAP) as [AuthorityStrength, number][];
  return entries.find(([, v]) => v === degraded)?.[0] ?? 'WEAK';
}
