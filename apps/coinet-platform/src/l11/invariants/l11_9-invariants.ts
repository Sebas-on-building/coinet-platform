/**
 * L11.9 — Final Ratification Invariants (§11.9.13)
 *
 *   INV-11.9-A — completion coverage law
 *   INV-11.9-B — non-duplication law
 *   INV-11.9-C — production-green gate law
 *   INV-11.9-D — freeze law
 *   INV-11.9-E — L12 dependency safety law
 *   INV-11.9-F — no judgment leakage law
 *   INV-11.9-G — replay and repair closure law
 *   INV-11.9-H — artifact fingerprint law
 */

import {
  L11LayerRatificationArtifact,
  L11CertificationLevel,
  computeL11ArtifactFingerprint,
} from '../contracts/l11-ratification-artifact';
import {
  L11SublayerId,
  L11_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
} from '../contracts/l11-layer-inventory';
import {
  ALL_L11_COMPLETION_CLAUSES,
  L11_COMPLETION_CLAUSE_TO_SUBLAYER,
  L11CompletionClauseStatus,
} from '../contracts/l11-completion-standard';
import {
  L11FreezePolicy,
  L11FreezeStatus,
} from '../contracts/l11-freeze-policy';
import {
  L11DownstreamDependencyContract,
  L11ForbiddenDownstreamConsumptionPattern,
  isL11DownstreamDependencyContractValid,
} from '../contracts/l11-downstream-dependency';

export interface L11_9InvariantResult {
  readonly id: string;
  readonly ok: boolean;
  readonly evidence: string;
}

const ok = (id: string, evidence: string): L11_9InvariantResult =>
  ({ id, ok: true, evidence });
const fail = (id: string, evidence: string): L11_9InvariantResult =>
  ({ id, ok: false, evidence });

// ─── INV-11.9-A — completion coverage law ──────────────────────────

export function invariantL11_9_A_completionCoverage(
  clauseStatuses: readonly L11CompletionClauseStatus[],
): L11_9InvariantResult {
  if (clauseStatuses.length !== ALL_L11_COMPLETION_CLAUSES.length) {
    return fail('INV-11.9-A',
      `expected ${ALL_L11_COMPLETION_CLAUSES.length} clause statuses, got ${clauseStatuses.length}`);
  }
  const seen = new Set(clauseStatuses.map(c => c.clause));
  for (const c of ALL_L11_COMPLETION_CLAUSES) {
    if (!seen.has(c)) {
      return fail('INV-11.9-A', `clause ${c} not present`);
    }
  }
  const unsatisfied = clauseStatuses.filter(c => !c.satisfied);
  if (unsatisfied.length > 0) {
    return fail('INV-11.9-A',
      `${unsatisfied.length} clauses unsatisfied: ${unsatisfied.map(c => c.clause).join(', ')}`);
  }
  return ok('INV-11.9-A',
    `all ${ALL_L11_COMPLETION_CLAUSES.length} completion clauses satisfied`);
}

// ─── INV-11.9-B — non-duplication law ──────────────────────────────

export interface L11NonDuplicationCheckInput {
  readonly l11_9_owned_modules: readonly string[];
  readonly l11_1_to_8_owned_modules: readonly string[];
}

/**
 * L11.9 may aggregate but may not redefine. Detect any module name
 * present in BOTH the L11.9-owned set AND any earlier sublayer-owned
 * set. Module names should be path-relative ids.
 */
export function invariantL11_9_B_nonDuplication(
  input: L11NonDuplicationCheckInput,
): L11_9InvariantResult {
  const earlier = new Set(input.l11_1_to_8_owned_modules);
  const collisions = input.l11_9_owned_modules.filter(m => earlier.has(m));
  if (collisions.length > 0) {
    return fail('INV-11.9-B',
      `${collisions.length} duplicate module(s) detected: ${collisions.join(', ')}`);
  }
  return ok('INV-11.9-B',
    `no module collision between L11.9 (${input.l11_9_owned_modules.length}) and L11.1–L11.8 (${input.l11_1_to_8_owned_modules.length})`);
}

// ─── INV-11.9-C — production-green gate law ────────────────────────

export interface L11ProductionGreenGateInput {
  readonly artifact: L11LayerRatificationArtifact;
}

export function invariantL11_9_C_productionGreenGate(
  input: L11ProductionGreenGateInput,
): L11_9InvariantResult {
  const a = input.artifact;
  if (a.certification_level !== L11CertificationLevel.PRODUCTION_GREEN) {
    return ok('INV-11.9-C',
      `non-PRODUCTION_GREEN level=${a.certification_level} → gate not asserting`);
  }
  if (a.critical_breach_count > 0) {
    return fail('INV-11.9-C',
      `PRODUCTION_GREEN with ${a.critical_breach_count} critical breach(es)`);
  }
  const failingBands = a.certification_band_results.filter(b => !b.passed);
  if (failingBands.length > 0) {
    return fail('INV-11.9-C',
      `PRODUCTION_GREEN with failing bands: ${failingBands.map(b => b.band_id).join(', ')}`);
  }
  return ok('INV-11.9-C',
    'PRODUCTION_GREEN with zero critical breaches and all bands green');
}

// ─── INV-11.9-D — freeze law ──────────────────────────────────────

export function invariantL11_9_D_freeze(args: {
  policy: L11FreezePolicy;
  artifact: L11LayerRatificationArtifact;
}): L11_9InvariantResult {
  if (args.artifact.freeze_activated && args.policy.status !== L11FreezeStatus.ACTIVE) {
    return fail('INV-11.9-D',
      'artifact reports freeze_activated but policy.status != ACTIVE');
  }
  if (!args.artifact.freeze_activated && args.policy.status === L11FreezeStatus.ACTIVE) {
    return fail('INV-11.9-D',
      'policy.status=ACTIVE but artifact reports freeze_activated=false');
  }
  if (args.artifact.freeze_activated &&
      args.artifact.certification_level !== L11CertificationLevel.PRODUCTION_GREEN) {
    return fail('INV-11.9-D',
      `freeze activated at level=${args.artifact.certification_level} (not PRODUCTION_GREEN)`);
  }
  return ok('INV-11.9-D',
    `freeze policy / artifact alignment ok (status=${args.policy.status}, activated=${args.artifact.freeze_activated})`);
}

// ─── INV-11.9-E — L12 dependency safety law ───────────────────────

export function invariantL11_9_E_l12DependencySafety(
  contract: L11DownstreamDependencyContract,
): L11_9InvariantResult {
  const v = isL11DownstreamDependencyContractValid(contract);
  if (!v.ok) return fail('INV-11.9-E', v.reason);

  const required: readonly L11ForbiddenDownstreamConsumptionPattern[] = [
    L11ForbiddenDownstreamConsumptionPattern.LIVE_SCORE_RECOMPUTE_FROM_L6_TO_L10,
    L11ForbiddenDownstreamConsumptionPattern.SCORE_AS_FINAL_JUDGMENT,
    L11ForbiddenDownstreamConsumptionPattern.SCORE_AS_RECOMMENDATION,
    L11ForbiddenDownstreamConsumptionPattern.SCORE_AS_SCENARIO_WINNER,
    L11ForbiddenDownstreamConsumptionPattern.REDIS_CACHE_AS_SCORE_AUTHORITY,
  ];
  const missing = required.filter(p =>
    !contract.forbidden_consumption_patterns.includes(p));
  if (missing.length > 0) {
    return fail('INV-11.9-E',
      `dependency contract missing forbidden patterns: ${missing.join(', ')}`);
  }
  return ok('INV-11.9-E',
    'L12 dependency contract bans live recompute / judgment / recommendation / scenario winner / redis-as-authority');
}

// ─── INV-11.9-F — no judgment leakage law ─────────────────────────

const FORBIDDEN_TERMS = [
  'BUY', 'SELL', 'HOLD', 'AVOID', 'RECOMMEND', 'SCENARIO_WINNER',
  'FINAL_JUDGMENT', 'TRADE_ACTION',
];

export function invariantL11_9_F_noJudgmentLeakage(
  art: L11LayerRatificationArtifact,
): L11_9InvariantResult {
  const haystack = JSON.stringify({
    bands: art.certification_band_results.map(b => `${b.band_id}::${b.title}`),
    invariants: art.invariant_results.map(i => i.invariant_id),
    artifact_id: art.artifact_id,
  }).toUpperCase();
  for (const t of FORBIDDEN_TERMS) {
    if (haystack.includes(`"${t}"`) || haystack.includes(`::${t}`) ||
        haystack.includes(`-${t}-`)) {
      return fail('INV-11.9-F',
        `forbidden judgment term "${t}" leaked into ratification artifact`);
    }
  }
  return ok('INV-11.9-F',
    'no judgment / recommendation / scenario-winner term in ratification artifact');
}

// ─── INV-11.9-G — replay and repair closure law ───────────────────

export interface L11ReplayRepairClosureInput {
  readonly l11_8_passed: boolean;
  readonly replay_invariants_held: number;
  readonly repair_invariants_held: number;
}

export function invariantL11_9_G_replayRepairClosure(
  input: L11ReplayRepairClosureInput,
): L11_9InvariantResult {
  if (!input.l11_8_passed) {
    return fail('INV-11.9-G', 'L11.8 persistence sublayer not green');
  }
  if (input.replay_invariants_held < 1) {
    return fail('INV-11.9-G', 'no replay invariants held');
  }
  if (input.repair_invariants_held < 1) {
    return fail('INV-11.9-G', 'no repair invariants held');
  }
  return ok('INV-11.9-G',
    `replay (${input.replay_invariants_held}) + repair (${input.repair_invariants_held}) invariants closed`);
}

// ─── INV-11.9-H — artifact fingerprint law ────────────────────────

/**
 * Identical certification material → identical fingerprint.
 * Material change → different fingerprint.
 * Order-only changes in unordered collections → unchanged fingerprint.
 */
export function invariantL11_9_H_artifactFingerprint(
  art: L11LayerRatificationArtifact,
): L11_9InvariantResult {
  if (!art.artifact_fingerprint) {
    return fail('INV-11.9-H', 'artifact fingerprint missing');
  }
  // Recompute and compare to ensure the fingerprint matches the
  // artifact body (deterministic recompute).
  const expected = computeL11ArtifactFingerprint({
    ...art,
    // omit fingerprint
  } as Omit<L11LayerRatificationArtifact, 'artifact_fingerprint'>);
  if (expected !== art.artifact_fingerprint) {
    return fail('INV-11.9-H',
      `fingerprint mismatch: expected ${expected}, got ${art.artifact_fingerprint}`);
  }

  // Order-invariance test: shuffle the band/invariant arrays and
  // recompute. The fingerprint must remain unchanged.
  const reorderedBands = [...art.certification_band_results].reverse();
  const reorderedInvariants = [...art.invariant_results].reverse();
  const reorderedRegressions = [...art.regression_results].reverse();
  const reordered = computeL11ArtifactFingerprint({
    ...art,
    certification_band_results: reorderedBands,
    invariant_results: reorderedInvariants,
    regression_results: reorderedRegressions,
  } as Omit<L11LayerRatificationArtifact, 'artifact_fingerprint'>);
  if (reordered !== art.artifact_fingerprint) {
    return fail('INV-11.9-H',
      'fingerprint changed under order-only permutation of unordered sets');
  }

  // Material-change detection: change one band result and recompute
  // — fingerprint must differ. We do not mutate the artifact.
  const mutatedArt = {
    ...art,
    critical_breach_count: art.critical_breach_count + 1,
  } as Omit<L11LayerRatificationArtifact, 'artifact_fingerprint'>;
  const mutated = computeL11ArtifactFingerprint(mutatedArt);
  if (mutated === art.artifact_fingerprint) {
    return fail('INV-11.9-H',
      'fingerprint unchanged after material critical_breach_count change');
  }

  return ok('INV-11.9-H',
    `fingerprint ${art.artifact_fingerprint} deterministic, order-invariant, change-sensitive`);
}

export function runAllL11_9Invariants(args: {
  clauseStatuses: readonly L11CompletionClauseStatus[];
  nonDuplication: L11NonDuplicationCheckInput;
  artifact: L11LayerRatificationArtifact;
  freezePolicy: L11FreezePolicy;
  dependencyContract: L11DownstreamDependencyContract;
  replayRepair: L11ReplayRepairClosureInput;
}): readonly L11_9InvariantResult[] {
  return [
    invariantL11_9_A_completionCoverage(args.clauseStatuses),
    invariantL11_9_B_nonDuplication(args.nonDuplication),
    invariantL11_9_C_productionGreenGate({ artifact: args.artifact }),
    invariantL11_9_D_freeze({ policy: args.freezePolicy, artifact: args.artifact }),
    invariantL11_9_E_l12DependencySafety(args.dependencyContract),
    invariantL11_9_F_noJudgmentLeakage(args.artifact),
    invariantL11_9_G_replayRepairClosure(args.replayRepair),
    invariantL11_9_H_artifactFingerprint(args.artifact),
  ];
}

// Suppress unused lint
void L11SublayerId;
void L11_REQUIRED_SUBLAYERS_FOR_RATIFICATION;
void L11_COMPLETION_CLAUSE_TO_SUBLAYER;
