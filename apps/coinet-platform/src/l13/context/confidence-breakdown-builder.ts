/**
 * L13.2 — Confidence Breakdown Builder
 *
 * §13.2.7 — Derives the L13 explanation confidence band by clamping
 * to the narrowest lower-layer band and applying narrowing reasons
 * (active invalidation, narrow spread, missing data, drift,
 * transition risk, decay, unresolved triggers, contradictions,
 * restrictions). L13 may NEVER raise confidence above lower layers.
 */

import {
  ALL_L13_EXPLANATION_CONFIDENCE_BANDS,
  L13ConfidenceNarrowingReason,
  L13ExplanationConfidenceBand,
  rankL13ExplanationConfidenceBand,
  type L13ConfidenceBreakdown,
} from '../contracts/confidence-breakdown';
import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.input-package.v1';

/**
 * §13.2.7 — Lower-layer band in the same vocabulary the engines use
 * (e.g. L8/L9/L10/L11/L12 confidence bands). The builder maps the
 * narrowest into the L13 band.
 */
export interface L13LowerLayerConfidenceBands {
  readonly validation_band: string;
  readonly regime_band: string;
  readonly sequence_band: string;
  readonly hypothesis_band: string;
  readonly score_band: string;
  readonly scenario_band: string;
}

function normalizeBand(s: string): L13ExplanationConfidenceBand {
  const upper = s.toUpperCase();
  if (upper === 'BLOCKED' || upper === 'REJECTED') {
    return L13ExplanationConfidenceBand.BLOCKED;
  }
  if (upper === 'VERY_HIGH') return L13ExplanationConfidenceBand.VERY_HIGH;
  if (upper === 'HIGH') return L13ExplanationConfidenceBand.HIGH;
  if (upper === 'MEDIUM') return L13ExplanationConfidenceBand.MEDIUM;
  if (upper === 'LOW') return L13ExplanationConfidenceBand.LOW;
  if (upper === 'VERY_LOW') return L13ExplanationConfidenceBand.VERY_LOW;
  return L13ExplanationConfidenceBand.LOW;
}

function narrowestBand(
  bands: readonly L13ExplanationConfidenceBand[],
): L13ExplanationConfidenceBand {
  let result = L13ExplanationConfidenceBand.VERY_HIGH;
  let resultRank = rankL13ExplanationConfidenceBand(result);
  for (const b of bands) {
    if (b === L13ExplanationConfidenceBand.BLOCKED) {
      return L13ExplanationConfidenceBand.BLOCKED;
    }
    const r = rankL13ExplanationConfidenceBand(b);
    if (r < resultRank) {
      result = b;
      resultRank = r;
    }
  }
  return result;
}

function applyNarrowing(
  band: L13ExplanationConfidenceBand,
  reasons: readonly L13ConfidenceNarrowingReason[],
): L13ExplanationConfidenceBand {
  if (band === L13ExplanationConfidenceBand.BLOCKED) return band;
  if (reasons.length === 0) return band;

  // Active invalidation forces at most LOW.
  if (
    reasons.includes(L13ConfidenceNarrowingReason.ACTIVE_INVALIDATION)
  ) {
    if (
      rankL13ExplanationConfidenceBand(band) >
      rankL13ExplanationConfidenceBand(L13ExplanationConfidenceBand.LOW)
    ) {
      band = L13ExplanationConfidenceBand.LOW;
    }
  }

  // Active contradiction or narrow spread caps at MEDIUM.
  if (
    reasons.includes(L13ConfidenceNarrowingReason.ACTIVE_CONTRADICTION) ||
    reasons.includes(
      L13ConfidenceNarrowingReason.NARROW_SCENARIO_SPREAD,
    ) ||
    reasons.includes(
      L13ConfidenceNarrowingReason.NARROW_HYPOTHESIS_SPREAD,
    )
  ) {
    if (
      rankL13ExplanationConfidenceBand(band) >
      rankL13ExplanationConfidenceBand(L13ExplanationConfidenceBand.MEDIUM)
    ) {
      band = L13ExplanationConfidenceBand.MEDIUM;
    }
  }

  // Missing data, drift, decay, transition risk drop one step.
  const stepDownReasons = [
    L13ConfidenceNarrowingReason.MISSING_DATA,
    L13ConfidenceNarrowingReason.DRIFT,
    L13ConfidenceNarrowingReason.SEQUENCE_DECAY,
    L13ConfidenceNarrowingReason.TRANSITION_RISK,
    L13ConfidenceNarrowingReason.UNRESOLVED_TRIGGER,
  ];
  for (const r of reasons) {
    if (stepDownReasons.includes(r)) {
      const rank = rankL13ExplanationConfidenceBand(band);
      if (rank > 0) {
        band =
          ALL_L13_EXPLANATION_CONFIDENCE_BANDS.find(
            x => rankL13ExplanationConfidenceBand(x) === rank - 1,
          ) ?? band;
      }
    }
  }

  // RESTRICTION blocks confident language.
  if (reasons.includes(L13ConfidenceNarrowingReason.RESTRICTION)) {
    if (
      rankL13ExplanationConfidenceBand(band) >
      rankL13ExplanationConfidenceBand(L13ExplanationConfidenceBand.MEDIUM)
    ) {
      band = L13ExplanationConfidenceBand.MEDIUM;
    }
  }

  return band;
}

export interface L13ConfidenceBreakdownInput {
  readonly request_id: string;
  readonly lower_layer_bands: L13LowerLayerConfidenceBands;
  readonly narrowing_reasons:
    readonly L13ConfidenceNarrowingReason[];
  readonly confidence_cap_refs?: readonly string[];
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

export function buildL13ConfidenceBreakdown(
  input: L13ConfidenceBreakdownInput,
): L13ConfidenceBreakdown {
  const layerBands: L13ExplanationConfidenceBand[] = [
    normalizeBand(input.lower_layer_bands.validation_band),
    normalizeBand(input.lower_layer_bands.regime_band),
    normalizeBand(input.lower_layer_bands.sequence_band),
    normalizeBand(input.lower_layer_bands.hypothesis_band),
    normalizeBand(input.lower_layer_bands.score_band),
    normalizeBand(input.lower_layer_bands.scenario_band),
  ];

  const narrowest = narrowestBand(layerBands);
  const overall = applyNarrowing(narrowest, input.narrowing_reasons);

  const mayUseConfidentLanguage =
    rankL13ExplanationConfidenceBand(overall) >=
    rankL13ExplanationConfidenceBand(L13ExplanationConfidenceBand.HIGH);
  const mustUseUncertaintyLanguage =
    overall === L13ExplanationConfidenceBand.BLOCKED ||
    rankL13ExplanationConfidenceBand(overall) <=
      rankL13ExplanationConfidenceBand(L13ExplanationConfidenceBand.LOW) ||
    input.narrowing_reasons.length > 0;

  const breakdownId = `l13d.confidence.${fnv1a(
    [
      input.request_id,
      input.lower_layer_bands.validation_band,
      input.lower_layer_bands.regime_band,
      input.lower_layer_bands.sequence_band,
      input.lower_layer_bands.hypothesis_band,
      input.lower_layer_bands.score_band,
      input.lower_layer_bands.scenario_band,
      [...input.narrowing_reasons].sort().join(','),
    ].join('|'),
  )}`;

  return {
    confidence_breakdown_id: breakdownId,
    overall_explanation_confidence_band: overall,
    validation_confidence_band: input.lower_layer_bands.validation_band,
    regime_confidence_band: input.lower_layer_bands.regime_band,
    sequence_confidence_band: input.lower_layer_bands.sequence_band,
    hypothesis_confidence_band: input.lower_layer_bands.hypothesis_band,
    score_confidence_band: input.lower_layer_bands.score_band,
    scenario_confidence_band: input.lower_layer_bands.scenario_band,
    confidence_cap_refs: [...(input.confidence_cap_refs ?? [])].sort(),
    confidence_narrowing_reasons: [...input.narrowing_reasons].sort(),
    may_use_confident_language: mayUseConfidentLanguage,
    must_use_uncertainty_language: mustUseUncertaintyLanguage,
    evidence_refs: [...(input.evidence_refs ?? [])].sort(),
    lineage_refs: [...(input.lineage_refs ?? [])].sort(),
    policy_version: POLICY_V,
  };
}
