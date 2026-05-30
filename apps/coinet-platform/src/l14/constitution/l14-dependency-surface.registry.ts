/**
 * L14.1 — Dependency Surface Registry
 *
 * §14.1.9 / §14.1.10 — Frozen registry of governed lower-layer
 * surfaces Layer 14 may consume. Direct raw lower-layer reads
 * are forbidden — every dependency must route through one of
 * these registered surfaces.
 */

import {
  L14DependencySurfaceClass,
  type L14DependencySourceLayer,
  type L14DependencySurfaceDefinition,
} from '../contracts/l14-dependency-surfaces';

const POLICY_V = 'l14.constitution.v1';

function def(
  surface_class: L14DependencySurfaceClass,
  source_layer: L14DependencySourceLayer,
  semantic_purpose: string,
  current_authority_required: boolean,
  historical_surface_allowed: boolean,
  restriction_posture_required = false,
): L14DependencySurfaceDefinition {
  return {
    dependency_surface_id: `l14.dep.${surface_class}`,
    source_layer,
    surface_class,
    semantic_purpose,
    current_authority_required,
    historical_surface_allowed,
    raw_lower_layer_bypass_forbidden: true,
    restriction_posture_required,
    lineage_required: true,
    replay_hash_required: true,
    policy_version: POLICY_V,
  };
}

const REGISTRY: ReadonlyArray<L14DependencySurfaceDefinition> = [
  // L5
  def(L14DependencySurfaceClass.L5_CURRENT_AUTHORITY_READ, 'L5', 'Read current-authority artifacts for active outputs.', true, false),
  def(L14DependencySurfaceClass.L5_HISTORICAL_FACT_READ, 'L5', 'Append-safe historical-fact reads for outcome evaluation.', false, true),
  def(L14DependencySurfaceClass.L5_REPLAY_SUBSTRATE, 'L5', 'Read replay substrate (input package, prompt assembly, provider artifact refs, etc.).', false, true),
  // L10
  def(L14DependencySurfaceClass.L10_CURRENT_HYPOTHESIS_RANKING, 'L10', 'Read current hypothesis ranking for delivery and evaluation context.', true, false),
  def(L14DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_PROFILE, 'L10', 'Read hypothesis reliance profile.', true, false),
  def(L14DependencySurfaceClass.L10_HYPOTHESIS_SHIFT_CONDITIONS, 'L10', 'Read shift conditions to evaluate later hypothesis evolution.', true, false),
  def(L14DependencySurfaceClass.L10_HYPOTHESIS_HISTORICAL_FACTS, 'L10', 'Read historical hypothesis facts for success-rate evaluation.', false, true),
  // L11
  def(L14DependencySurfaceClass.L11_CURRENT_SCORE_SET, 'L11', 'Read current score set governing deliveries.', true, false),
  def(L14DependencySurfaceClass.L11_SCORE_ATTRIBUTION, 'L11', 'Read score attribution for explanation linkage.', true, false),
  def(L14DependencySurfaceClass.L11_CALIBRATION_TARGETS, 'L11', 'Read L11 calibration targets for outcome comparison.', true, false),
  def(L14DependencySurfaceClass.L11_SCORE_DRIFT_REPORTS, 'L11', 'Read score-drift reports.', true, true),
  def(L14DependencySurfaceClass.L11_HISTORICAL_SCORE_FACTS, 'L11', 'Read historical score facts for calibration evidence.', false, true),
  // L12
  def(L14DependencySurfaceClass.L12_CURRENT_SCENARIO_SET, 'L12', 'Read current scenario set.', true, false),
  def(L14DependencySurfaceClass.L12_SCENARIO_TRIGGERS, 'L12', 'Read scenario triggers.', true, false),
  def(L14DependencySurfaceClass.L12_SCENARIO_INVALIDATIONS, 'L12', 'Read scenario invalidations.', true, false),
  def(L14DependencySurfaceClass.L12_PATH_CONFIDENCE, 'L12', 'Read scenario path confidence.', true, false),
  def(L14DependencySurfaceClass.L12_SCENARIO_HISTORICAL_FACTS, 'L12', 'Read historical scenario alignment facts.', false, true),
  // L13
  def(L14DependencySurfaceClass.L13_FINAL_OUTPUT_ARTIFACT, 'L13', 'Read durable L13 final output artifacts.', true, true, true),
  def(L14DependencySurfaceClass.L13_ALERT_PAYLOAD, 'L13', 'Read durable L13 alert payloads.', true, true, true),
  def(L14DependencySurfaceClass.L13_REPORT_PAYLOAD, 'L13', 'Read durable L13 report payloads.', true, true, true),
  def(L14DependencySurfaceClass.L13_COMPARISON_PAYLOAD, 'L13', 'Read durable L13 comparison payloads.', true, true, true),
  def(L14DependencySurfaceClass.L13_FEEDBACK_RECORDS, 'L13', 'Read durable user feedback records.', false, true),
  def(L14DependencySurfaceClass.L13_OUTPUT_QUALITY_METRICS, 'L13', 'Read L13 output-quality metrics.', false, true),
  def(L14DependencySurfaceClass.L13_SAFETY_EVENT_FACTS, 'L13', 'Read historical L13 safety event facts.', false, true),
];

const INDEX: ReadonlyMap<L14DependencySurfaceClass, L14DependencySurfaceDefinition> =
  new Map(REGISTRY.map(d => [d.surface_class, d]));

export function getL14DependencySurfaceDefinitions():
  readonly L14DependencySurfaceDefinition[] {
  return REGISTRY;
}

export function getL14DependencySurfaceDefinition(
  cls: L14DependencySurfaceClass,
): L14DependencySurfaceDefinition | undefined {
  return INDEX.get(cls);
}

export function l14DependencySurfaceRegistered(
  cls: L14DependencySurfaceClass,
): boolean {
  return INDEX.has(cls);
}
