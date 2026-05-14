/**
 * L11.2 — Score Meaning-Claim Registry (§11.2.15)
 *
 * Authoritative store of `L11ScoreFamilyMeaningClaim` instances. Each
 * production family ships exactly one canonical meaning claim. The
 * registry refuses duplicates and enforces direction agreement
 * between the meaning claim and the family-direction map.
 */

import {
  L11ScoreFamilyMeaningClaim,
  L11_REQUIRED_FORBIDDEN_USES,
  L11ScoreDownstreamUse,
  L11ScoreDisclosureRequirement,
  L11CalibrationCategory,
} from '../contracts/score-meaning-claim';
import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
} from '../contracts/score-family';
import {
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from '../contracts/score-direction';
import {
  L11ScoreProductionStatus,
} from '../contracts/score-production-status';
import {
  L11_DOCTRINE_POLICY_VERSION,
  getL11ScoreFamilyDefinition,
} from '../contracts/score-family-catalogue';

function defaultLegalInterpretations(family: L11ScoreFamily): readonly string[] {
  const d = getL11ScoreFamilyDefinition(family);
  return d ? d.legal_interpretations : [];
}

function defaultIllegalInterpretations(family: L11ScoreFamily): readonly string[] {
  const d = getL11ScoreFamilyDefinition(family);
  return d ? d.illegal_interpretations : [];
}

function defaultDisclosures(family: L11ScoreFamily): readonly L11ScoreDisclosureRequirement[] {
  const d = getL11ScoreFamilyDefinition(family);
  return d ? d.required_disclosure_requirements : [];
}

function buildClaim(
  family: L11ScoreFamily,
  scoreName: string,
  meaning: string,
  measures: readonly string[],
  doesNotMeasure: readonly string[],
  high: string,
  low: string,
  status: L11ScoreProductionStatus,
  calibrationCategory: L11CalibrationCategory,
): L11ScoreFamilyMeaningClaim {
  return {
    meaning_claim_id: `l11d.meaning_claim.${family.toLowerCase()}.v1`,
    score_family: family,
    score_name: scoreName,
    meaning_claim: meaning,
    measures,
    does_not_measure: doesNotMeasure,
    high_value_means: high,
    low_value_means: low,
    legal_interpretations: defaultLegalInterpretations(family),
    illegal_interpretations: defaultIllegalInterpretations(family),
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[family],
    intended_downstream_uses: [
      L11ScoreDownstreamUse.SCENARIO_WEIGHTING_INPUT,
      L11ScoreDownstreamUse.RANKING_SUPPORT,
      L11ScoreDownstreamUse.JUDGMENT_SUPPORT,
      L11ScoreDownstreamUse.CALIBRATION_INPUT,
      L11ScoreDownstreamUse.MONITORING_INPUT,
    ],
    forbidden_downstream_uses: [...L11_REQUIRED_FORBIDDEN_USES],
    required_disclosures: defaultDisclosures(family),
    calibration_category: calibrationCategory,
    production_status: status,
    policy_version: L11_DOCTRINE_POLICY_VERSION,
  };
}

const OPPORTUNITY_CLAIM = buildClaim(
  L11ScoreFamily.OPPORTUNITY,
  'opportunity_score',
  'Measures upside-quality of the current setup under governed evidence, regime, sequence, and hypothesis posture.',
  [
    'governed validation posture',
    'regime support / mismatch',
    'sequence posture support / decay',
    'hypothesis reliance posture',
  ],
  [
    'buy signal',
    'final recommendation',
    'guaranteed upside',
    'best trade selection',
    'final scenario judgment',
  ],
  'Stronger governed opportunity quality.',
  'Weak or insufficient governed opportunity quality.',
  L11ScoreProductionStatus.PRODUCTION_ENABLED,
  L11CalibrationCategory.GOVERNED_BAND_EVALUATION,
);

const RISK_CLAIM = buildClaim(
  L11ScoreFamily.RISK,
  'risk_score',
  'Measures downside, fragility, invalidation, and structural danger under governed evidence.',
  [
    'governed contradiction posture',
    'invalidation posture',
    'regime fragility',
    'sequence fragility',
    'overhang / event-history risk',
  ],
  [
    'safe',
    'guaranteed safety',
    'guaranteed downside',
    'avoid signal',
    'final risk judgment',
  ],
  'More observed danger or fragility under governed evidence.',
  'Lower observed risk under governed evidence.',
  L11ScoreProductionStatus.PRODUCTION_ENABLED,
  L11CalibrationCategory.GOVERNED_EMPIRICAL_EVALUATION,
);

const TIMING_CLAIM = buildClaim(
  L11ScoreFamily.TIMING,
  'timing_score',
  'Measures whether the setup is early, mature, crowded, late, decaying, or digesting.',
  [
    'L9 phase posture',
    'L9 lead-lag profile',
    'L9 decay profile',
    'regime transition risk',
    'hypothesis readiness',
  ],
  [
    'enter now',
    'exact buy zone',
    'perfect timing',
    'guaranteed continuation',
    'final timing call',
  ],
  'Stronger governed timing quality.',
  'Too early, too late, too decayed, too crowded, or too unsupported.',
  L11ScoreProductionStatus.PRODUCTION_ENABLED,
  L11CalibrationCategory.GOVERNED_BAND_EVALUATION,
);

const THESIS_COHERENCE_CLAIM = buildClaim(
  L11ScoreFamily.THESIS_COHERENCE,
  'thesis_coherence_score',
  'Measures whether evidence, regime, sequence, and hypothesis agree.',
  [
    'L7 validation agreement',
    'L7 contradiction posture',
    'L8 regime compatibility',
    'L9 sequence compatibility',
    'L10 hypothesis spread / reliance posture',
  ],
  [
    'guaranteed thesis',
    'thesis confirmation',
    'winning thesis selection',
    'final judgment',
  ],
  'More internally aligned governed evidence stack.',
  'Conflicted, incomplete, ambiguous, or competitively unresolved evidence stack.',
  L11ScoreProductionStatus.PRODUCTION_ENABLED,
  L11CalibrationCategory.GOVERNED_EMPIRICAL_EVALUATION,
);

const SIGNAL_CONFIDENCE_CLAIM = buildClaim(
  L11ScoreFamily.SIGNAL_CONFIDENCE,
  'signal_confidence_score',
  'Measures how reliable the signal stack is after contradiction and missingness.',
  [
    'L6 quality / freshness / null metadata',
    'L7 confidence assessment',
    'L8 confidence profile',
    'L9 sequence confidence',
    'L10 reliance profile',
  ],
  [
    'bullish',
    'bearish',
    'final answer',
    'recommendation',
    'guaranteed direction',
  ],
  'More reliable and usable signal stack under governance.',
  'Incomplete, stale, degraded, contradictory, or restricted signal stack.',
  L11ScoreProductionStatus.PRODUCTION_ENABLED,
  L11CalibrationCategory.GOVERNED_DRIFT_EVALUATION,
);

const MARKET_STRUCTURE_CLAIM = buildClaim(
  L11ScoreFamily.MARKET_STRUCTURE,
  'market_structure_score',
  'Measures liquidity, volatility, participation, derivatives, and structure quality.',
  [
    'L6 liquidity / volatility / participation primitives',
    'L7 validation posture',
    'L8 crypto-structure regime',
    'L9 sequence timing',
  ],
  [
    'bullish by itself',
    'safe structure',
    'guaranteed continuation',
    'final entry quality',
  ],
  'Healthier and more supportive market structure for governed interpretation.',
  'Fragile, thin, crowded, volatile, or structurally weak market structure.',
  L11ScoreProductionStatus.PRODUCTION_ENABLED,
  L11CalibrationCategory.GOVERNED_BAND_EVALUATION,
);

const WHALE_CONVICTION_CLAIM = buildClaim(
  L11ScoreFamily.WHALE_CONVICTION,
  'whale_conviction_score',
  'Measures whether entity/whale behavior supports accumulation or distribution under governed evidence.',
  [
    'accumulation refs',
    'distribution refs',
    'exchange-flow posture',
    'entity-quality posture',
    'smart-wallet quality',
    'sequence timing of whale behavior',
  ],
  [
    'whales are always right',
    'whale buys guarantee continuation',
    'final accumulation truth',
    'recommendation',
  ],
  'Whale / entity behavior more constructively aligned with accumulation or thesis support.',
  'Whale / entity posture weak, neutral, distributive, low-quality, or unreliable.',
  L11ScoreProductionStatus.PRODUCTION_ENABLED,
  L11CalibrationCategory.GOVERNED_EMPIRICAL_EVALUATION,
);

const UNLOCK_RISK_CLAIM = buildClaim(
  L11ScoreFamily.UNLOCK_RISK,
  'unlock_risk_score',
  'Measures supply-overhang danger from unlocks, treasury, and distribution pressure.',
  [
    'unlock proximity',
    'unlock magnitude',
    'liquidity absorption context',
    'treasury movement',
    'distribution evidence',
    'post-unlock sequence posture',
    'recovery / reaccumulation confirmations',
  ],
  [
    'guaranteed dump',
    'price will definitely fall',
    'unlock always causes a sell-off',
    'avoid automatically',
    'final downside judgment',
  ],
  'Higher governed supply-overhang danger.',
  'Lower or better-absorbed supply-overhang risk.',
  L11ScoreProductionStatus.PRODUCTION_ENABLED,
  L11CalibrationCategory.GOVERNED_EMPIRICAL_EVALUATION,
);

export const L11_PRODUCTION_MEANING_CLAIMS:
  readonly L11ScoreFamilyMeaningClaim[] = [
  OPPORTUNITY_CLAIM,
  RISK_CLAIM,
  TIMING_CLAIM,
  THESIS_COHERENCE_CLAIM,
  SIGNAL_CONFIDENCE_CLAIM,
  MARKET_STRUCTURE_CLAIM,
  WHALE_CONVICTION_CLAIM,
  UNLOCK_RISK_CLAIM,
];

export interface L11MeaningClaimRegistryIssue {
  readonly family: L11ScoreFamily | null;
  readonly meaning_claim_id: string | null;
  readonly reason: string;
}

export interface L11MeaningClaimRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly direction_by_family: Readonly<Record<string, L11ScoreFamilyDirectionClass>>;
  readonly issues: readonly L11MeaningClaimRegistryIssue[];
}

export function buildL11MeaningClaimRegistryReport(
  claims: readonly L11ScoreFamilyMeaningClaim[] = L11_PRODUCTION_MEANING_CLAIMS,
): L11MeaningClaimRegistryReport {
  const issues: L11MeaningClaimRegistryIssue[] = [];
  const seenIds = new Set<string>();
  const seenFamilies = new Set<L11ScoreFamily>();
  const dirByFamily: Record<string, L11ScoreFamilyDirectionClass> = {};

  for (const c of claims) {
    if (seenIds.has(c.meaning_claim_id)) {
      issues.push({
        family: c.score_family,
        meaning_claim_id: c.meaning_claim_id,
        reason: 'duplicate meaning_claim_id',
      });
      continue;
    }
    seenIds.add(c.meaning_claim_id);

    if (seenFamilies.has(c.score_family)) {
      issues.push({
        family: c.score_family,
        meaning_claim_id: c.meaning_claim_id,
        reason: 'duplicate meaning claim for family',
      });
      continue;
    }
    seenFamilies.add(c.score_family);

    const requiredDirection = L11_REQUIRED_DIRECTION_BY_FAMILY[c.score_family];
    if (c.direction_class !== requiredDirection) {
      issues.push({
        family: c.score_family,
        meaning_claim_id: c.meaning_claim_id,
        reason: `direction mismatch: expected ${requiredDirection}, got ${c.direction_class}`,
      });
    }
    dirByFamily[c.score_family] = c.direction_class;

    const missingForbidden = L11_REQUIRED_FORBIDDEN_USES.filter(
      f => !c.forbidden_downstream_uses.includes(f),
    );
    if (missingForbidden.length > 0) {
      issues.push({
        family: c.score_family,
        meaning_claim_id: c.meaning_claim_id,
        reason: `missing required forbidden uses: ${missingForbidden.join(',')}`,
      });
    }
  }

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    if (!seenFamilies.has(f)) {
      issues.push({
        family: f,
        meaning_claim_id: null,
        reason: 'production family missing meaning claim',
      });
    }
  }

  return {
    ok: issues.length === 0,
    count: claims.length,
    direction_by_family: dirByFamily,
    issues,
  };
}

export function getL11MeaningClaimForFamily(
  family: L11ScoreFamily,
  claims: readonly L11ScoreFamilyMeaningClaim[] = L11_PRODUCTION_MEANING_CLAIMS,
): L11ScoreFamilyMeaningClaim | null {
  return claims.find(c => c.score_family === family) ?? null;
}
