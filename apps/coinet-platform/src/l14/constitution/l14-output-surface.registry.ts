/**
 * L14.1 — Output Surface Registry
 *
 * §14.1.12 / §14.1.13 / §14.1.14 — Frozen registry of legal
 * output surfaces. Each surface declares its claim-scope
 * (evaluation, calibration evidence, review proposal) plus the
 * non-mutation guarantees every later L14 sublayer must honor.
 */

import {
  L14OutputSurfaceClass,
  type L14OutputSurfaceDefinition,
} from '../contracts/l14-output-surfaces';

const POLICY_V = 'l14.constitution.v1';

function def(
  output_surface_id: L14OutputSurfaceClass,
  may_claim_evaluation: boolean,
  may_claim_calibration_evidence: boolean,
  may_generate_review_proposal: boolean,
): L14OutputSurfaceDefinition {
  return {
    output_surface_id,
    may_mutate_lower_layers: false,
    may_claim_truth: false,
    may_claim_evaluation,
    may_claim_calibration_evidence,
    may_generate_review_proposal,
    lower_layer_rebuild_forbidden: true,
    engagement_as_truth_forbidden: true,
    lineage_required: true,
    replay_hash_required: true,
    l5_route_required: true,
    policy_version: POLICY_V,
  };
}

const REGISTRY: ReadonlyArray<L14OutputSurfaceDefinition> = [
  def(L14OutputSurfaceClass.DELIVERY_POLICY_SURFACE, false, false, false),
  def(L14OutputSurfaceClass.DELIVERY_ELIGIBILITY_SURFACE, false, false, false),
  def(L14OutputSurfaceClass.DELIVERY_ROUTING_SURFACE, false, false, false),
  def(L14OutputSurfaceClass.DELIVERY_SUPPRESSION_SURFACE, false, false, false),
  def(L14OutputSurfaceClass.USER_INTERACTION_EVENT_SURFACE, false, false, false),
  def(L14OutputSurfaceClass.FEEDBACK_INTERPRETATION_SURFACE, false, false, false),
  def(L14OutputSurfaceClass.OUTCOME_EVALUATION_SURFACE, true, false, false),
  def(L14OutputSurfaceClass.ALERT_EFFECTIVENESS_SURFACE, true, false, false),
  def(L14OutputSurfaceClass.CALIBRATION_EVIDENCE_SURFACE, true, true, false),
  def(L14OutputSurfaceClass.CALIBRATION_PROPOSAL_SURFACE, true, true, true),
  def(L14OutputSurfaceClass.ANALYST_REVIEW_SURFACE, true, false, true),
  def(L14OutputSurfaceClass.OPERATIONAL_HEALTH_SURFACE, false, false, false),
];

const INDEX: ReadonlyMap<L14OutputSurfaceClass, L14OutputSurfaceDefinition> =
  new Map(REGISTRY.map(d => [d.output_surface_id, d]));

export function getL14OutputSurfaceDefinitions():
  readonly L14OutputSurfaceDefinition[] {
  return REGISTRY;
}

export function getL14OutputSurfaceDefinition(
  cls: L14OutputSurfaceClass,
): L14OutputSurfaceDefinition | undefined {
  return INDEX.get(cls);
}

export function l14OutputSurfaceRegistered(
  cls: L14OutputSurfaceClass,
): boolean {
  return INDEX.has(cls);
}
