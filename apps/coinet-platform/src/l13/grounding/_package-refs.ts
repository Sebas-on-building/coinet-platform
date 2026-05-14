/**
 * L13.4 — Input Package Reference Index
 *
 * Helper that collects every governed ref carried by the L13.2
 * input package into a single lookup index. The evidence matcher,
 * contradiction matcher, and citation pack builder all rely on
 * this index to verify that emitted refs are governed
 * (§13.4.7 / §13.4.13).
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import { L13DependencyLayer } from '../contracts/l13-constitutional-types';

export interface L13PackageRefIndex {
  readonly all_refs: ReadonlySet<string>;
  readonly evidence_refs: ReadonlySet<string>;
  readonly contradiction_refs: ReadonlySet<string>;
  readonly scenario_refs: ReadonlySet<string>;
  readonly trigger_refs: ReadonlySet<string>;
  readonly invalidation_refs: ReadonlySet<string>;
  readonly score_refs: ReadonlySet<string>;
  readonly hypothesis_refs: ReadonlySet<string>;
  readonly regime_refs: ReadonlySet<string>;
  readonly sequence_refs: ReadonlySet<string>;
  readonly validation_refs: ReadonlySet<string>;
  readonly confidence_cap_refs: ReadonlySet<string>;
  readonly missing_data_refs: ReadonlySet<string>;
  readonly drift_refs: ReadonlySet<string>;
  readonly restriction_refs: ReadonlySet<string>;
  /** refs grouped per source layer */
  readonly refs_by_layer: ReadonlyMap<L13DependencyLayer, ReadonlySet<string>>;
}

function add(s: Set<string>, refs: readonly string[] | undefined): void {
  if (!refs) return;
  for (const r of refs) {
    if (r && r.length > 0) s.add(r);
  }
}

function addOne(s: Set<string>, ref: string | undefined): void {
  if (ref && ref.length > 0) s.add(ref);
}

export function buildL13PackageRefIndex(
  pkg: L13AIInputPackage,
): L13PackageRefIndex {
  const evidence = new Set<string>();
  const contradictions = new Set<string>();
  const scenarios = new Set<string>();
  const triggers = new Set<string>();
  const invalidations = new Set<string>();
  const scores = new Set<string>();
  const hypotheses = new Set<string>();
  const regimes = new Set<string>();
  const sequences = new Set<string>();
  const validations = new Set<string>();
  const confidenceCaps = new Set<string>();
  const missingData = new Set<string>();
  const drift = new Set<string>();
  const restrictions = new Set<string>();

  // Validation summary.
  if (pkg.validation_summary) {
    addOne(validations, pkg.validation_summary.validation_summary_id);
    add(validations, pkg.validation_summary.strongest_validated_claim_refs);
    add(
      restrictions,
      pkg.validation_summary.validation_restriction_refs,
    );
    add(evidence, pkg.validation_summary.evidence_refs);
  }

  // Contradiction summary.
  if (pkg.contradiction_summary) {
    addOne(contradictions, pkg.contradiction_summary.contradiction_summary_id);
    add(contradictions, pkg.contradiction_summary.active_contradiction_refs);
    add(
      contradictions,
      pkg.contradiction_summary.strongest_contradiction_refs,
    );
    add(evidence, pkg.contradiction_summary.evidence_refs);
  }

  // Regime summary.
  if (pkg.regime_summary) {
    addOne(regimes, pkg.regime_summary.regime_summary_id);
    add(restrictions, pkg.regime_summary.regime_restriction_refs);
    add(evidence, pkg.regime_summary.evidence_refs);
  }

  // Sequence summary.
  if (pkg.sequence_summary) {
    addOne(sequences, pkg.sequence_summary.sequence_summary_id);
    add(restrictions, pkg.sequence_summary.sequence_restriction_refs);
    add(evidence, pkg.sequence_summary.evidence_refs);
  }

  // Hypothesis summary.
  if (pkg.hypothesis_summary) {
    addOne(hypotheses, pkg.hypothesis_summary.hypothesis_summary_id);
    if (pkg.hypothesis_summary.primary_hypothesis_ref)
      hypotheses.add(pkg.hypothesis_summary.primary_hypothesis_ref);
    if (pkg.hypothesis_summary.secondary_hypothesis_ref)
      hypotheses.add(pkg.hypothesis_summary.secondary_hypothesis_ref);
    add(hypotheses, pkg.hypothesis_summary.support_refs);
    add(contradictions, pkg.hypothesis_summary.contradiction_refs);
    add(hypotheses, pkg.hypothesis_summary.missing_confirmation_refs);
    add(invalidations, pkg.hypothesis_summary.invalidation_signal_refs);
    add(hypotheses, pkg.hypothesis_summary.shift_condition_refs);
    add(restrictions, pkg.hypothesis_summary.hypothesis_restriction_refs);
    add(evidence, pkg.hypothesis_summary.evidence_refs);
  }

  // Score summary.
  if (pkg.score_summary) {
    addOne(scores, pkg.score_summary.score_summary_id);
    if (pkg.score_summary.score_snapshot_ref)
      scores.add(pkg.score_summary.score_snapshot_ref);
    add(scores, pkg.score_summary.active_score_refs);
    add(scores, pkg.score_summary.top_positive_attribution_refs);
    add(scores, pkg.score_summary.top_negative_attribution_refs);
    add(missingData, pkg.score_summary.score_missing_data_profile_refs);
    add(drift, pkg.score_summary.score_drift_refs);
    add(restrictions, pkg.score_summary.score_restriction_refs);
    add(evidence, pkg.score_summary.evidence_refs);
  }

  // Scenario summary.
  if (pkg.scenario_summary) {
    addOne(scenarios, pkg.scenario_summary.scenario_summary_id);
    if (pkg.scenario_summary.scenario_set_ref)
      scenarios.add(pkg.scenario_summary.scenario_set_ref);
    if (pkg.scenario_summary.base_case_ref)
      scenarios.add(pkg.scenario_summary.base_case_ref);
    add(scenarios, pkg.scenario_summary.bullish_path_refs);
    add(scenarios, pkg.scenario_summary.bearish_path_refs);
    add(scenarios, pkg.scenario_summary.neutral_chop_path_refs);
    add(triggers, pkg.scenario_summary.trigger_refs);
    add(invalidations, pkg.scenario_summary.invalidation_refs);
    add(scenarios, pkg.scenario_summary.path_confidence_refs);
    add(confidenceCaps, pkg.scenario_summary.confidence_cap_refs);
    add(scenarios, pkg.scenario_summary.shift_condition_refs);
    add(restrictions, pkg.scenario_summary.scenario_restriction_refs);
    if (pkg.scenario_summary.scenario_spread_ref)
      scenarios.add(pkg.scenario_summary.scenario_spread_ref);
    add(evidence, pkg.scenario_summary.evidence_refs);
  }

  // Evidence digests.
  for (const d of pkg.strongest_positive_evidence ?? []) {
    evidence.add(d.evidence_digest_id);
    add(evidence, d.lineage_refs);
  }
  for (const d of pkg.strongest_contradictions ?? []) {
    evidence.add(d.evidence_digest_id);
    contradictions.add(d.evidence_digest_id);
  }

  // Top-level package refs.
  add(evidence, pkg.evidence_refs);

  // Confidence breakdown.
  if (pkg.confidence_breakdown) {
    add(confidenceCaps, pkg.confidence_breakdown.confidence_cap_refs);
    add(evidence, pkg.confidence_breakdown.evidence_refs);
  }

  // Missing data + drift disclosures.
  for (const md of pkg.missing_data_disclosures ?? []) {
    if (md && (md as { disclosure_id?: string }).disclosure_id) {
      missingData.add((md as { disclosure_id: string }).disclosure_id);
    }
  }
  for (const dd of pkg.drift_disclosures ?? []) {
    if (dd && (dd as { disclosure_id?: string }).disclosure_id) {
      drift.add((dd as { disclosure_id: string }).disclosure_id);
    }
  }

  // Restriction profile.
  if (pkg.restriction_profile) {
    add(
      restrictions,
      (pkg.restriction_profile as { lower_layer_restriction_refs?: readonly string[] })
        .lower_layer_restriction_refs,
    );
    add(
      restrictions,
      (pkg.restriction_profile as { applied_restriction_codes?: readonly string[] })
        .applied_restriction_codes,
    );
  }

  // Build per-layer index.
  const refsByLayer = new Map<L13DependencyLayer, Set<string>>();
  function bind(layer: L13DependencyLayer, refs: ReadonlySet<string>): void {
    const existing = refsByLayer.get(layer) ?? new Set<string>();
    for (const r of refs) existing.add(r);
    refsByLayer.set(layer, existing);
  }
  bind(L13DependencyLayer.L7_VALIDATION, validations);
  bind(L13DependencyLayer.L7_VALIDATION, contradictions);
  bind(L13DependencyLayer.L8_REGIME, regimes);
  bind(L13DependencyLayer.L9_SEQUENCE, sequences);
  bind(L13DependencyLayer.L10_HYPOTHESIS, hypotheses);
  bind(L13DependencyLayer.L11_SCORE, scores);
  bind(L13DependencyLayer.L11_SCORE, missingData);
  bind(L13DependencyLayer.L11_SCORE, drift);
  bind(L13DependencyLayer.L12_SCENARIO, scenarios);
  bind(L13DependencyLayer.L12_SCENARIO, triggers);
  bind(L13DependencyLayer.L12_SCENARIO, invalidations);
  bind(L13DependencyLayer.L12_SCENARIO, confidenceCaps);

  const all = new Set<string>([
    ...evidence,
    ...contradictions,
    ...scenarios,
    ...triggers,
    ...invalidations,
    ...scores,
    ...hypotheses,
    ...regimes,
    ...sequences,
    ...validations,
    ...confidenceCaps,
    ...missingData,
    ...drift,
    ...restrictions,
  ]);

  return {
    all_refs: all,
    evidence_refs: evidence,
    contradiction_refs: contradictions,
    scenario_refs: scenarios,
    trigger_refs: triggers,
    invalidation_refs: invalidations,
    score_refs: scores,
    hypothesis_refs: hypotheses,
    regime_refs: regimes,
    sequence_refs: sequences,
    validation_refs: validations,
    confidence_cap_refs: confidenceCaps,
    missing_data_refs: missingData,
    drift_refs: drift,
    restriction_refs: restrictions,
    refs_by_layer: refsByLayer as ReadonlyMap<
      L13DependencyLayer,
      ReadonlySet<string>
    >,
  };
}
