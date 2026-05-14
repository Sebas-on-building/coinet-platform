/**
 * L11.6 — Calibration Cohort Registry (§11.6.13)
 *
 * Authoritative production cohort catalogue: one default cohort
 * per production score family, with score-band, formula-version,
 * regime, and visibility filtering capability.
 */

import {
  L11CalibrationCohortDefinition,
  L11_CALIBRATION_COHORT_POLICY_VERSION,
  isL11CalibrationCohortStructurallyValid,
} from '../contracts/calibration-cohort';
import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
} from '../contracts/score-family';
import {
  L11ScoreBand,
  ALL_L11_SCORE_BANDS,
} from '../contracts/score-band-policy';
import {
  L11ScoreVisibilityClass,
} from '../contracts/score-visibility-class';

const C = (
  cohort_id: string,
  cohort_name: string,
  score_family: L11ScoreFamily,
  formula_version_filters: readonly string[],
  visibility_class_filters: readonly L11ScoreVisibilityClass[],
  score_band_filters: readonly L11ScoreBand[] = ALL_L11_SCORE_BANDS,
): L11CalibrationCohortDefinition => ({
  cohort_id,
  cohort_name,
  score_family,
  scope_type_filters: [],
  asset_class_filters: [],
  liquidity_bucket_filters: [],
  market_cap_bucket_filters: [],
  regime_filters: [],
  sequence_state_filters: [],
  hypothesis_family_filters: [],
  visibility_class_filters,
  score_band_filters,
  minimum_observation_count: 30,
  formula_version_filters,
  migration_cohort: formula_version_filters.length > 1,
  cohort_version: 'v1',
  policy_version: L11_CALIBRATION_COHORT_POLICY_VERSION,
});

const ACTIVE_VISIBILITY: readonly L11ScoreVisibilityClass[] = [
  L11ScoreVisibilityClass.FULL_VISIBILITY,
  L11ScoreVisibilityClass.PARTIAL_VISIBILITY,
  L11ScoreVisibilityClass.DEGRADED_VISIBILITY,
];

export const L11_PRODUCTION_CALIBRATION_COHORTS:
  readonly L11CalibrationCohortDefinition[] = [
  C('coh.opportunity.v1', 'Opportunity Score production cohort v1',
    L11ScoreFamily.OPPORTUNITY, ['v1'], ACTIVE_VISIBILITY),
  C('coh.risk.v1', 'Risk Score production cohort v1',
    L11ScoreFamily.RISK, ['v1'], ACTIVE_VISIBILITY),
  C('coh.timing.v1', 'Timing Score production cohort v1',
    L11ScoreFamily.TIMING, ['v1'], ACTIVE_VISIBILITY),
  C('coh.thesis.v1', 'Thesis Coherence Score production cohort v1',
    L11ScoreFamily.THESIS_COHERENCE, ['v1'], ACTIVE_VISIBILITY),
  C('coh.signal.v1', 'Signal Confidence Score production cohort v1',
    L11ScoreFamily.SIGNAL_CONFIDENCE, ['v1'], ACTIVE_VISIBILITY),
  C('coh.market.v1', 'Market Structure Score production cohort v1',
    L11ScoreFamily.MARKET_STRUCTURE, ['v1'], ACTIVE_VISIBILITY),
  C('coh.whale.v1', 'Whale Conviction Score production cohort v1',
    L11ScoreFamily.WHALE_CONVICTION, ['v1'], ACTIVE_VISIBILITY),
  C('coh.unlock.v1', 'Unlock Risk Score production cohort v1',
    L11ScoreFamily.UNLOCK_RISK, ['v1'], ACTIVE_VISIBILITY),
];

const COHORTS_BY_ID =
  new Map(L11_PRODUCTION_CALIBRATION_COHORTS.map(c => [c.cohort_id, c]));

const COHORTS_BY_FAMILY = new Map<L11ScoreFamily, L11CalibrationCohortDefinition[]>();
for (const c of L11_PRODUCTION_CALIBRATION_COHORTS) {
  const arr = COHORTS_BY_FAMILY.get(c.score_family) ?? [];
  arr.push(c);
  COHORTS_BY_FAMILY.set(c.score_family, arr);
}

export function getL11CalibrationCohort(
  cohort_id: string,
): L11CalibrationCohortDefinition | null {
  return COHORTS_BY_ID.get(cohort_id) ?? null;
}

export function getL11CalibrationCohortsForFamily(
  family: L11ScoreFamily,
): readonly L11CalibrationCohortDefinition[] {
  return COHORTS_BY_FAMILY.get(family) ?? [];
}

export interface L11CohortRegistryIssue {
  readonly cohort_id: string | null;
  readonly score_family: L11ScoreFamily | null;
  readonly reason: string;
}

export interface L11CohortRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly families_covered: readonly L11ScoreFamily[];
  readonly missing_families: readonly L11ScoreFamily[];
  readonly issues: readonly L11CohortRegistryIssue[];
}

export function buildL11CohortRegistryReport(
  cohorts: readonly L11CalibrationCohortDefinition[] =
    L11_PRODUCTION_CALIBRATION_COHORTS,
): L11CohortRegistryReport {
  const issues: L11CohortRegistryIssue[] = [];
  const ids = new Set<string>();
  const families = new Set<L11ScoreFamily>();

  for (const c of cohorts) {
    if (ids.has(c.cohort_id)) {
      issues.push({ cohort_id: c.cohort_id, score_family: c.score_family,
        reason: 'duplicate cohort_id' });
      continue;
    }
    ids.add(c.cohort_id);
    const sv = isL11CalibrationCohortStructurallyValid(c);
    if (!sv.ok) {
      issues.push({ cohort_id: c.cohort_id, score_family: c.score_family,
        reason: sv.reason });
    }
    families.add(c.score_family);
  }

  const missingFamilies = L11_PRODUCTION_SCORE_FAMILIES
    .filter(f => !families.has(f));
  for (const f of missingFamilies) {
    issues.push({ cohort_id: null, score_family: f,
      reason: `family ${f} has no production cohort` });
  }

  return {
    ok: issues.length === 0,
    count: cohorts.length,
    families_covered: [...families],
    missing_families: missingFamilies,
    issues,
  };
}
