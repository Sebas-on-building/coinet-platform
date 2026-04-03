/**
 * L1.6 — Field-specific degradation rules for BTC Quantum Loop.
 *
 * Maps each field to its truth domain, downstream impacts, claim
 * restrictions, disclosure templates, and calibration handling.
 */

import type {
  TruthDomain,
  ClaimRestrictionClass,
  FeatureImpact,
  ScoreImpact,
  ScenarioImpact,
  CalibrationHandling,
  DegradationSeverity,
} from './degradation-types';

export interface FieldDegradationRule {
  fieldName: string;
  truthDomain: TruthDomain;
  visibilityDescription: string;
  featureTargets: string[];
  scoreTargets: string[];
  scenarioTargets: string[];
  severityPenalties: Record<DegradationSeverity, number>;
  claimRestrictionsAbove: Record<DegradationSeverity, ClaimRestrictionClass[]>;
  calibrationAbove: Record<DegradationSeverity, CalibrationHandling>;
  forceInsufficientDataAt: DegradationSeverity;
  disclosureTemplates: Record<string, string>;
}

export const DEGRADATION_RULES: Record<string, FieldDegradationRule> = {

  scriptDistribution: {
    fieldName: 'scriptDistribution',
    truthDomain: 'exposure_truth',
    visibilityDescription: 'Current BTC script-class exposure composition',
    featureTargets: ['key_exposure_rate'],
    scoreTargets: ['quantum_risk_score'],
    scenarioTargets: ['fast_quantum'],
    severityPenalties: {
      advisory: 0.03,
      partial: 0.08,
      degraded: 0.18,
      critical: 0.30,
      unresolved: 0.50,
    },
    claimRestrictionsAbove: {
      advisory: [],
      partial: ['R2_currentness'],
      degraded: ['R1_exactness', 'R2_currentness'],
      critical: ['R1_exactness', 'R2_currentness', 'R3_directional'],
      unresolved: ['R1_exactness', 'R2_currentness', 'R3_directional', 'R4_structural'],
    },
    calibrationAbove: {
      advisory: 'none',
      partial: 'none',
      degraded: 'downweight',
      critical: 'exclude',
      unresolved: 'exclude',
    },
    forceInsufficientDataAt: 'unresolved',
    disclosureTemplates: {
      missing: 'Exposure assessment unavailable: script classification data is missing.',
      stale: 'Exposure assessment is based on stale script data and carries elevated uncertainty.',
      invalid: 'Exposure data is structurally invalid; exposure risk cannot be assessed.',
      conflicted: 'Script classification sources disagree; exposure estimates are uncertain.',
      weak_substituted: 'Exposure is estimated from fallback data with reduced confidence.',
      unresolved: 'Current exposure breakdown is unavailable; exposure risk is unresolved.',
    },
  },

  dormantCohorts: {
    fieldName: 'dormantCohorts',
    truthDomain: 'dormant_supply_truth',
    visibilityDescription: 'Dormancy-bucketed BTC supply for latent vulnerability estimation',
    featureTargets: ['dormant_vulnerable_supply'],
    scoreTargets: ['quantum_risk_score'],
    scenarioTargets: ['slow_quantum'],
    severityPenalties: {
      advisory: 0.03,
      partial: 0.08,
      degraded: 0.18,
      critical: 0.30,
      unresolved: 0.50,
    },
    claimRestrictionsAbove: {
      advisory: [],
      partial: ['R2_currentness'],
      degraded: ['R1_exactness', 'R2_currentness'],
      critical: ['R1_exactness', 'R2_currentness', 'R3_directional'],
      unresolved: ['R1_exactness', 'R2_currentness', 'R3_directional', 'R4_structural'],
    },
    calibrationAbove: {
      advisory: 'none',
      partial: 'none',
      degraded: 'downweight',
      critical: 'exclude',
      unresolved: 'exclude',
    },
    forceInsufficientDataAt: 'unresolved',
    disclosureTemplates: {
      missing: 'Dormant supply assessment unavailable: cohort data is missing.',
      stale: 'Dormant supply is estimated from stale cohort data with elevated uncertainty.',
      invalid: 'Dormant cohort data is structurally invalid; latent supply risk cannot be assessed.',
      conflicted: 'Dormant cohort sources disagree; vulnerable supply estimates are uncertain.',
      weak_substituted: 'Dormant supply is estimated from fallback data with widened confidence bands.',
      unresolved: 'No reliable dormant cohort data is available; latent supply risk is unresolved.',
    },
  },

  pqEvidence: {
    fieldName: 'pqEvidence',
    truthDomain: 'migration_truth',
    visibilityDescription: 'Evidence-based PQ migration readiness posture',
    featureTargets: ['pq_migration_progress'],
    scoreTargets: ['quantum_risk_score'],
    scenarioTargets: ['fast_quantum', 'slow_quantum'],
    severityPenalties: {
      advisory: 0.02,
      partial: 0.06,
      degraded: 0.15,
      critical: 0.25,
      unresolved: 0.40,
    },
    claimRestrictionsAbove: {
      advisory: [],
      partial: [],
      degraded: ['R1_exactness'],
      critical: ['R1_exactness', 'R4_structural'],
      unresolved: ['R1_exactness', 'R3_directional', 'R4_structural'],
    },
    calibrationAbove: {
      advisory: 'none',
      partial: 'none',
      degraded: 'none',
      critical: 'downweight',
      unresolved: 'downweight',
    },
    forceInsufficientDataAt: 'critical',
    disclosureTemplates: {
      missing: 'Migration readiness is unavailable: no PQ evidence data exists.',
      stale: 'Migration assessment is based on stale evidence and may not reflect recent protocol activity.',
      invalid: 'PQ evidence data is incoherent; migration posture cannot be assessed.',
      conflicted: 'PQ evidence sources disagree on posture stage; migration confidence is degraded.',
      weak_substituted: 'PQ posture reflects proposal-level evidence only, not deployed mitigation.',
      unresolved: 'Migration readiness is unresolved; no strong posture claim is justified.',
    },
  },

  totalSupply: {
    fieldName: 'totalSupply',
    truthDomain: 'denominator_truth',
    visibilityDescription: 'Reference BTC supply denominator for normalization',
    featureTargets: ['key_exposure_rate', 'dormant_vulnerable_supply'],
    scoreTargets: ['quantum_risk_score'],
    scenarioTargets: [],
    severityPenalties: {
      advisory: 0.01,
      partial: 0.04,
      degraded: 0.12,
      critical: 0.25,
      unresolved: 0.40,
    },
    claimRestrictionsAbove: {
      advisory: [],
      partial: [],
      degraded: ['R1_exactness'],
      critical: ['R1_exactness', 'R3_directional'],
      unresolved: ['R1_exactness', 'R3_directional', 'R4_structural'],
    },
    calibrationAbove: {
      advisory: 'none',
      partial: 'none',
      degraded: 'downweight',
      critical: 'exclude',
      unresolved: 'exclude',
    },
    forceInsufficientDataAt: 'unresolved',
    disclosureTemplates: {
      missing: 'Supply denominator is missing; percentage outputs are unavailable.',
      stale: 'Supply denominator is stale; percentage outputs are approximate.',
      invalid: 'Supply denominator is invalid; normalization is unreliable.',
      conflicted: 'Supply sources disagree on denominator; percentages are uncertain.',
      weak_substituted: 'Supply denominator uses fallback source with reduced precision.',
      unresolved: 'Supply normalization is unresolved; only raw balance estimates apply.',
    },
  },

  btcPriceContext: {
    fieldName: 'btcPriceContext',
    truthDomain: 'market_context_truth',
    visibilityDescription: 'Current BTC market price context for reporting and relevance',
    featureTargets: [],
    scoreTargets: [],
    scenarioTargets: [],
    severityPenalties: {
      advisory: 0.01,
      partial: 0.02,
      degraded: 0.05,
      critical: 0.10,
      unresolved: 0.15,
    },
    claimRestrictionsAbove: {
      advisory: [],
      partial: [],
      degraded: [],
      critical: ['R2_currentness'],
      unresolved: ['R2_currentness', 'R3_directional'],
    },
    calibrationAbove: {
      advisory: 'none',
      partial: 'none',
      degraded: 'none',
      critical: 'downweight',
      unresolved: 'downweight',
    },
    forceInsufficientDataAt: 'unresolved',
    disclosureTemplates: {
      missing: 'Market price context is unavailable; structural assessment continues without market framing.',
      stale: 'Market context is stale; timing interpretations carry reduced relevance.',
      invalid: 'Market price data is invalid; market-context claims are not supported.',
      conflicted: 'Price feeds disagree; market context is uncertain.',
      weak_substituted: 'Market context uses fallback price feed.',
      unresolved: 'Market context is unresolved; market-dependent reasoning is weakened.',
    },
  },

  outcomeMetrics: {
    fieldName: 'outcomeMetrics',
    truthDomain: 'calibration_truth',
    visibilityDescription: 'Post-snapshot realized outcomes for calibration and edge measurement',
    featureTargets: [],
    scoreTargets: [],
    scenarioTargets: [],
    severityPenalties: {
      advisory: 0.01,
      partial: 0.02,
      degraded: 0.05,
      critical: 0.10,
      unresolved: 0.15,
    },
    claimRestrictionsAbove: {
      advisory: [],
      partial: [],
      degraded: ['R5_evaluation'],
      critical: ['R5_evaluation'],
      unresolved: ['R5_evaluation'],
    },
    calibrationAbove: {
      advisory: 'none',
      partial: 'downweight',
      degraded: 'exclude',
      critical: 'exclude',
      unresolved: 'exclude',
    },
    forceInsufficientDataAt: 'unresolved',
    disclosureTemplates: {
      missing: 'Calibration coverage is incomplete due to missing outcome data.',
      stale: 'Calibration data is dated; edge report confidence is reduced.',
      invalid: 'Outcome data is invalid; affected calibration rows are excluded.',
      conflicted: 'Outcome sources conflict; affected rows are excluded from evaluation.',
      weak_substituted: 'Outcome data uses recomputed fallback; calibration confidence reduced.',
      unresolved: 'Outcome data is unresolved; edge report confidence is limited.',
    },
  },
};

export function getDegradationRule(fieldName: string): FieldDegradationRule | undefined {
  return DEGRADATION_RULES[fieldName];
}
