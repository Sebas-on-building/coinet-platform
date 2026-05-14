/**
 * L11.6 — Calibration Target Registry (§11.6.13)
 *
 * Authoritative registry of L11.6 production calibration targets.
 * Enforces:
 *   - every production score family has at least one target
 *   - reserved families have no production target
 *   - no duplicate target ids
 *   - target metric/family/horizon compatibility
 *   - target structural validity
 *   - target replay-hash determinism (verified by validator layer)
 */

import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
  isL11ProductionScoreFamily,
  isL11ReservedScoreFamily,
} from '../contracts/score-family';
import {
  ALL_L11_SCORE_BANDS,
} from '../contracts/score-band-policy';
import {
  L11CalibrationHorizon,
  computeL11EvaluationWindow,
  isL11HorizonAllowedForFamily,
} from '../contracts/calibration-horizon';
import {
  L11OutcomeMetric,
  isL11OutcomeMetricLegalForFamily,
  isL11OutcomeMetricLegalForHorizon,
} from '../contracts/outcome-metric';
import {
  L11ExpectedOutcomeDirection,
  isL11ExpectedDirectionCompatible,
  isL11CalibrationDescriptionCausalityFree,
} from '../contracts/expected-direction';
import {
  L11ScoreCalibrationTarget,
  L11CalibrationContextRequirement,
  L11_CALIBRATION_TARGET_POLICY_VERSION,
  isL11CalibrationTargetStructurallyValid,
  extractL11CalibrationTargetReplayMaterial,
  canonicalCalibrationTargetReplayHash,
} from '../contracts/calibration-target';
import {
  L11CalibrationCohortDefinition,
} from '../contracts/calibration-cohort';
import {
  L11CalibrationExclusionRule,
  getMissingRequiredExclusionClasses,
} from '../contracts/calibration-exclusion';
import {
  L11_PRODUCTION_CALIBRATION_COHORTS,
  getL11CalibrationCohortsForFamily,
} from './calibration-cohort.registry';
import {
  L11_PRODUCTION_EXCLUSION_RULES,
  getL11RequiredProductionExclusionRules,
} from './calibration-exclusion.registry';
import {
  L11_PRODUCTION_FAMILY_CALIBRATION_POLICIES,
  getL11ScoreFamilyCalibrationPolicy,
} from '../contracts/score-family-calibration-targets';

const T0_AS_OF = '2024-01-01T00:00:00.000Z';

const REQUIRED_CTX: readonly L11CalibrationContextRequirement[] = [
  { requirement_id: 'ctx.regime', context_dimension: 'REGIME',
    required: true, description: 'L8 regime context required' },
  { requirement_id: 'ctx.visibility', context_dimension: 'VISIBILITY',
    required: true, description: 'L11.5 visibility class required' },
  { requirement_id: 'ctx.attribution', context_dimension: 'ATTRIBUTION',
    required: true, description: 'L11.4 attribution ref required' },
  { requirement_id: 'ctx.missing_data', context_dimension: 'MISSING_DATA',
    required: true, description: 'L11.5 missing-data profile ref required' },
];

interface BuildTargetInput {
  readonly target_id: string;
  readonly score_family: L11ScoreFamily;
  readonly score_name: string;
  readonly horizon: L11CalibrationHorizon;
  readonly outcome_metric: L11OutcomeMetric;
  readonly expected_direction: L11ExpectedOutcomeDirection;
  readonly cohort: L11CalibrationCohortDefinition;
  readonly exclusion_rules: readonly L11CalibrationExclusionRule[];
  readonly description: string;
}

function buildTarget(i: BuildTargetInput): L11ScoreCalibrationTarget {
  const policy = getL11ScoreFamilyCalibrationPolicy(i.score_family);
  if (!policy) {
    throw new Error(`no family policy for ${i.score_family}`);
  }
  const window = computeL11EvaluationWindow(T0_AS_OF, i.horizon);
  const base: Omit<L11ScoreCalibrationTarget, 'replay_hash'> = {
    calibration_target_id: i.target_id,
    score_family: i.score_family,
    score_name: i.score_name,
    target_version: 'v1',
    policy_version: L11_CALIBRATION_TARGET_POLICY_VERSION,
    horizon: i.horizon,
    evaluation_window: window,
    outcome_metric: i.outcome_metric,
    expected_direction: i.expected_direction,
    cohort_definition: i.cohort,
    minimum_sample_size: 30,
    exclusion_rules: i.exclusion_rules,
    required_context_refs: REQUIRED_CTX,
    allowed_score_bands: ALL_L11_SCORE_BANDS,
    allowed_score_versions: ['v1'],
    allowed_formula_versions: ['v1'],
    regime_stratification_required: policy.regime_stratification_required,
    sequence_stratification_required: policy.sequence_stratification_required,
    hypothesis_stratification_required: policy.hypothesis_stratification_required,
    visibility_stratification_required: policy.visibility_stratification_required,
    description: i.description,
    lineage_refs: [`l11.6.target.${i.target_id}`],
  };
  const replay_hash = canonicalCalibrationTargetReplayHash(
    extractL11CalibrationTargetReplayMaterial(base),
  );
  return { ...base, replay_hash };
}

const cohortFor = (f: L11ScoreFamily): L11CalibrationCohortDefinition => {
  const list = getL11CalibrationCohortsForFamily(f);
  if (list.length === 0) {
    throw new Error(`no production cohort registered for family ${f}`);
  }
  return list[0];
};

const REQUIRED_RULES = getL11RequiredProductionExclusionRules();

export const L11_PRODUCTION_CALIBRATION_TARGETS:
  readonly L11ScoreCalibrationTarget[] = [
  buildTarget({
    target_id: 'tgt.opportunity.fwd_return.7d',
    score_family: L11ScoreFamily.OPPORTUNITY,
    score_name: 'Opportunity Score',
    horizon: L11CalibrationHorizon.D_7,
    outcome_metric: L11OutcomeMetric.FORWARD_RETURN,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
    cohort: cohortFor(L11ScoreFamily.OPPORTUNITY),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Opportunity Score is expected to correlate with higher 7-day forward return',
  }),
  buildTarget({
    target_id: 'tgt.opportunity.rel_outperf.30d',
    score_family: L11ScoreFamily.OPPORTUNITY,
    score_name: 'Opportunity Score',
    horizon: L11CalibrationHorizon.D_30,
    outcome_metric: L11OutcomeMetric.RELATIVE_SECTOR_OUTPERFORMANCE,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
    cohort: cohortFor(L11ScoreFamily.OPPORTUNITY),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Opportunity Score is expected to correlate with higher 30-day relative sector outperformance',
  }),

  buildTarget({
    target_id: 'tgt.risk.max_drawdown.7d',
    score_family: L11ScoreFamily.RISK,
    score_name: 'Risk Score',
    horizon: L11CalibrationHorizon.D_7,
    outcome_metric: L11OutcomeMetric.MAX_DRAWDOWN,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
    cohort: cohortFor(L11ScoreFamily.RISK),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Risk Score is expected to correlate with higher 7-day max drawdown',
  }),
  buildTarget({
    target_id: 'tgt.risk.vol_spike.30d',
    score_family: L11ScoreFamily.RISK,
    score_name: 'Risk Score',
    horizon: L11CalibrationHorizon.D_30,
    outcome_metric: L11OutcomeMetric.VOLATILITY_SPIKE,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
    cohort: cohortFor(L11ScoreFamily.RISK),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Risk Score is expected to correlate with higher 30-day volatility spike rate',
  }),

  buildTarget({
    target_id: 'tgt.timing.confirmation.3d',
    score_family: L11ScoreFamily.TIMING,
    score_name: 'Timing Score',
    horizon: L11CalibrationHorizon.D_3,
    outcome_metric: L11OutcomeMetric.TIME_TO_CONFIRMATION,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_FASTER_CONFIRMATION,
    cohort: cohortFor(L11ScoreFamily.TIMING),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Timing Score is expected to correlate with faster confirmation within 3 days',
  }),

  buildTarget({
    target_id: 'tgt.thesis.stability.14d',
    score_family: L11ScoreFamily.THESIS_COHERENCE,
    score_name: 'Thesis Coherence Score',
    horizon: L11CalibrationHorizon.D_14,
    outcome_metric: L11OutcomeMetric.HYPOTHESIS_STABILITY,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
    cohort: cohortFor(L11ScoreFamily.THESIS_COHERENCE),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Thesis Coherence is expected to correlate with higher 14-day hypothesis stability',
  }),

  buildTarget({
    target_id: 'tgt.signal.contradiction.7d',
    score_family: L11ScoreFamily.SIGNAL_CONFIDENCE,
    score_name: 'Signal Confidence Score',
    horizon: L11CalibrationHorizon.D_7,
    outcome_metric: L11OutcomeMetric.CONTRADICTION_EMERGENCE_RATE,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_LESS_FREQUENT_EVENT,
    cohort: cohortFor(L11ScoreFamily.SIGNAL_CONFIDENCE),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Signal Confidence is expected to correlate with fewer contradictions within 7 days',
  }),

  buildTarget({
    target_id: 'tgt.market.momentum.3d',
    score_family: L11ScoreFamily.MARKET_STRUCTURE,
    score_name: 'Market Structure Score',
    horizon: L11CalibrationHorizon.D_3,
    outcome_metric: L11OutcomeMetric.MOMENTUM_PERSISTENCE,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
    cohort: cohortFor(L11ScoreFamily.MARKET_STRUCTURE),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Market Structure is expected to correlate with higher 3-day momentum persistence',
  }),

  buildTarget({
    target_id: 'tgt.whale.flow_confirm.30d',
    score_family: L11ScoreFamily.WHALE_CONVICTION,
    score_name: 'Whale Conviction Score',
    horizon: L11CalibrationHorizon.D_30,
    outcome_metric: L11OutcomeMetric.FORWARD_FLOW_CONFIRMATION,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
    cohort: cohortFor(L11ScoreFamily.WHALE_CONVICTION),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Whale Conviction is expected to correlate with higher 30-day forward flow confirmation',
  }),

  buildTarget({
    target_id: 'tgt.unlock.drawdown.14d',
    score_family: L11ScoreFamily.UNLOCK_RISK,
    score_name: 'Unlock Risk Score',
    horizon: L11CalibrationHorizon.D_14,
    outcome_metric: L11OutcomeMetric.POST_UNLOCK_DRAWDOWN,
    expected_direction:
      L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
    cohort: cohortFor(L11ScoreFamily.UNLOCK_RISK),
    exclusion_rules: REQUIRED_RULES,
    description: 'higher Unlock Risk is expected to correlate with deeper 14-day post-unlock drawdown',
  }),
];

const TARGETS_BY_ID =
  new Map(L11_PRODUCTION_CALIBRATION_TARGETS.map(t => [t.calibration_target_id, t]));

const TARGETS_BY_FAMILY = new Map<L11ScoreFamily, L11ScoreCalibrationTarget[]>();
for (const t of L11_PRODUCTION_CALIBRATION_TARGETS) {
  const arr = TARGETS_BY_FAMILY.get(t.score_family) ?? [];
  arr.push(t);
  TARGETS_BY_FAMILY.set(t.score_family, arr);
}

export function getL11CalibrationTarget(
  target_id: string,
): L11ScoreCalibrationTarget | null {
  return TARGETS_BY_ID.get(target_id) ?? null;
}

export function getL11CalibrationTargetsForFamily(
  family: L11ScoreFamily,
): readonly L11ScoreCalibrationTarget[] {
  return TARGETS_BY_FAMILY.get(family) ?? [];
}

export function getL11ProductionFamilyTargets(): readonly L11ScoreCalibrationTarget[] {
  return L11_PRODUCTION_CALIBRATION_TARGETS;
}

export interface L11CalibrationTargetRegistryIssue {
  readonly target_id: string | null;
  readonly score_family: L11ScoreFamily | null;
  readonly reason: string;
}

export interface L11CalibrationTargetRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly families_covered: readonly L11ScoreFamily[];
  readonly missing_families: readonly L11ScoreFamily[];
  readonly issues: readonly L11CalibrationTargetRegistryIssue[];
}

export function buildL11CalibrationTargetRegistryReport(
  targets: readonly L11ScoreCalibrationTarget[] = L11_PRODUCTION_CALIBRATION_TARGETS,
): L11CalibrationTargetRegistryReport {
  const issues: L11CalibrationTargetRegistryIssue[] = [];
  const ids = new Set<string>();
  const families = new Set<L11ScoreFamily>();

  for (const t of targets) {
    if (ids.has(t.calibration_target_id)) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: 'duplicate calibration_target_id' });
      continue;
    }
    ids.add(t.calibration_target_id);

    if (isL11ReservedScoreFamily(t.score_family)) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: `reserved family ${t.score_family} must not have production target` });
      continue;
    }
    if (!isL11ProductionScoreFamily(t.score_family)) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: `family ${t.score_family} is not a recognized production family` });
      continue;
    }

    const sv = isL11CalibrationTargetStructurallyValid(t);
    if (!sv.ok) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: sv.reason });
    }

    if (!isL11HorizonAllowedForFamily(t.score_family, t.horizon)) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: `horizon ${t.horizon} not allowed for family ${t.score_family}` });
    }
    if (!isL11OutcomeMetricLegalForFamily(t.outcome_metric, t.score_family)) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: `metric ${t.outcome_metric} not allowed for family ${t.score_family}` });
    }
    if (!isL11OutcomeMetricLegalForHorizon(t.outcome_metric, t.horizon)) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: `metric ${t.outcome_metric} not allowed for horizon ${t.horizon}` });
    }

    const dir = isL11ExpectedDirectionCompatible(
      t.score_family, t.outcome_metric, t.expected_direction);
    if (!dir.ok) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: dir.reason });
    }

    const desc = isL11CalibrationDescriptionCausalityFree(t.description);
    if (!desc.ok) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: desc.reason });
    }

    const missingExc = getMissingRequiredExclusionClasses(t.exclusion_rules);
    for (const c of missingExc) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: `target missing required exclusion class ${c}` });
    }

    const expectedHash = canonicalCalibrationTargetReplayHash(
      extractL11CalibrationTargetReplayMaterial(t));
    if (expectedHash !== t.replay_hash) {
      issues.push({ target_id: t.calibration_target_id, score_family: t.score_family,
        reason: 'replay hash drift' });
    }

    families.add(t.score_family);
  }

  const missingFamilies = L11_PRODUCTION_SCORE_FAMILIES
    .filter(f => !families.has(f));
  for (const f of missingFamilies) {
    issues.push({ target_id: null, score_family: f,
      reason: `production family ${f} has no calibration target` });
  }

  return {
    ok: issues.length === 0,
    count: targets.length,
    families_covered: [...families],
    missing_families: missingFamilies,
    issues,
  };
}

void L11_PRODUCTION_CALIBRATION_COHORTS;
void L11_PRODUCTION_EXCLUSION_RULES;
void L11_PRODUCTION_FAMILY_CALIBRATION_POLICIES;
