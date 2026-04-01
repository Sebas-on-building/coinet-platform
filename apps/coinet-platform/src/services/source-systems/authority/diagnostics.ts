/**
 * Authority Diagnostics — internal observability panel for the
 * authority hierarchy.
 */

import type { TruthAtomId, ResolvedAuthority, AuthorityFingerprint } from './types';
import { TRUTH_ATOMS } from './truth-atoms';
import { AUTHORITY_RULES } from './authority-registry';
import { CHALLENGER_RULES } from './challenger-matrix';
import { CLAIM_AUTHORITY_REQUIREMENTS } from './claim-authority-ladder';
import { resolveAuthority, type ResolveInput } from './resolver';
import { buildAuthorityFingerprint } from './authority-fingerprint';
import { buildContestedState, getContestedSummary, type ContestedState } from './contested-state';
import { getChallengersForAtom } from './challenger-matrix';
import type { AuthorityContext } from './authority-policies';
import { L12_AUTHORITY_VERSION } from './types';

export interface AuthorityDiagnosticsReport {
  version: string;
  timestamp: string;
  atomCount: number;
  ruleCount: number;
  challengerRuleCount: number;
  claimLadderCount: number;
  resolutions: ResolvedAuthority[];
  fingerprint: AuthorityFingerprint;
  contestedStates: ContestedState[];
  contestedSummary: ReturnType<typeof getContestedSummary>;
  blindAtoms: string[];
  substitutedAtoms: string[];
  healthyAtoms: string[];
  warnings: string[];
}

export function buildAuthorityDiagnostics(
  context: AuthorityContext = {},
  activeChallengerSignals: string[] = [],
): AuthorityDiagnosticsReport {
  const atomIds = TRUTH_ATOMS.map(a => a.id);
  const resolutions: ResolvedAuthority[] = [];
  const contestedStates: ContestedState[] = [];

  for (const atomId of atomIds) {
    const resolved = resolveAuthority({
      truthAtomId: atomId,
      context,
      activeChallengerSignals,
    });
    resolutions.push(resolved);

    if (resolved.outcome === 'PRIMARY_CONTESTED' || resolved.outcome === 'UNRESOLVED_CONFLICT') {
      const challengers = getChallengersForAtom(atomId).filter(
        c => activeChallengerSignals.includes(c.triggerCondition),
      );
      const contested = buildContestedState(resolved, challengers);
      if (contested) contestedStates.push(contested);
    }
  }

  const resolutionMap = new Map<string, ResolvedAuthority>();
  for (const r of resolutions) {
    resolutionMap.set(r.truthAtomId, r);
  }

  const fingerprint = buildAuthorityFingerprint(resolutionMap);
  const contestedSummary = getContestedSummary(contestedStates);

  const blindAtoms = resolutions
    .filter(r => r.outcome === 'AUTHORITY_BLIND')
    .map(r => r.truthAtomId);

  const substitutedAtoms = resolutions
    .filter(r => r.outcome === 'SECONDARY_SUBSTITUTED')
    .map(r => r.truthAtomId);

  const healthyAtoms = resolutions
    .filter(r => r.outcome === 'PRIMARY_CONFIRMED' || r.outcome === 'PRIMARY_WITH_SECONDARY_SUPPORT')
    .map(r => r.truthAtomId);

  const warnings: string[] = [];
  if (blindAtoms.length > 5) {
    warnings.push(`High blind-atom count: ${blindAtoms.length} truth atoms without authority`);
  }
  if (contestedStates.filter(s => s.severity === 'severe').length > 0) {
    warnings.push('Severe contested states detected — claim strength significantly limited');
  }
  if (substitutedAtoms.length > atomIds.length * 0.3) {
    warnings.push(`High substitution rate: ${substitutedAtoms.length}/${atomIds.length} atoms using secondary`);
  }

  return {
    version: L12_AUTHORITY_VERSION,
    timestamp: new Date().toISOString(),
    atomCount: TRUTH_ATOMS.length,
    ruleCount: AUTHORITY_RULES.length,
    challengerRuleCount: CHALLENGER_RULES.length,
    claimLadderCount: CLAIM_AUTHORITY_REQUIREMENTS.length,
    resolutions,
    fingerprint,
    contestedStates,
    contestedSummary,
    blindAtoms,
    substitutedAtoms,
    healthyAtoms,
    warnings,
  };
}
