/**
 * L13.11 — Replay Equivalence Engine
 *
 * §13.11.9 — Pure function that compares two replay-substrate
 * snapshots (source vs replay) across the legal axes.
 */

import {
  L13ReplayEquivalenceClass,
  L13ReplayMismatchReasonCode,
} from '../contracts/l13-replay-result';

export interface L13ReplaySubstrateSnapshot {
  readonly input_package_hash: string;
  readonly prompt_template_hash: string;
  readonly prompt_assembly_hash: string;
  readonly model_gateway_config_hash: string;
  readonly policy_hash: string;
  readonly captured_provider_artifact_hash?: string;

  readonly grounded_claim_ids: readonly string[];
  readonly blocked_claim_ids: readonly string[];
  readonly unsupported_claim_ids: readonly string[];

  readonly disclosed_contradiction: boolean;
  readonly disclosed_uncertainty: boolean;
  readonly disclosed_trigger: boolean;
  readonly disclosed_invalidation: boolean;
  readonly disclosed_restriction: boolean;

  readonly safety_decision: string;
  readonly highest_safety_risk_class: string;

  readonly restriction_level: string;

  readonly conditional_scenarios_preserved: boolean;
  readonly observation_inference_separated: boolean;

  readonly mode_required_sections_satisfied: boolean;
  readonly style_required_anchors_preserved: boolean;

  readonly summary_fingerprint: string;
}

export interface L13ReplayEquivalenceResult {
  readonly identity_match: boolean;
  readonly prompt_match: boolean;
  readonly policy_match: boolean;
  readonly grounding_equivalence: L13ReplayEquivalenceClass;
  readonly safety_equivalence: L13ReplayEquivalenceClass;
  readonly restriction_equivalence: L13ReplayEquivalenceClass;
  readonly disclosure_equivalence: L13ReplayEquivalenceClass;
  readonly conditionality_equivalence: L13ReplayEquivalenceClass;
  readonly mode_equivalence: L13ReplayEquivalenceClass;
  readonly style_equivalence: L13ReplayEquivalenceClass;
  readonly mismatch_reason_codes: readonly L13ReplayMismatchReasonCode[];
  readonly wording_drift_detected: boolean;
  readonly semantic_drift_detected: boolean;
  readonly legal_drift_detected: boolean;
}

function setsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
  return true;
}

export function evaluateL13ReplayEquivalence(
  source: L13ReplaySubstrateSnapshot,
  replay: L13ReplaySubstrateSnapshot,
): L13ReplayEquivalenceResult {
  const mismatch: L13ReplayMismatchReasonCode[] = [];

  const identity_match =
    source.input_package_hash === replay.input_package_hash;
  if (!identity_match) {
    mismatch.push(L13ReplayMismatchReasonCode.INPUT_PACKAGE_HASH_CHANGED);
  }
  if (source.prompt_template_hash !== replay.prompt_template_hash) {
    mismatch.push(L13ReplayMismatchReasonCode.PROMPT_TEMPLATE_HASH_CHANGED);
  }
  if (source.prompt_assembly_hash !== replay.prompt_assembly_hash) {
    mismatch.push(L13ReplayMismatchReasonCode.PROMPT_ASSEMBLY_HASH_CHANGED);
  }
  if (source.model_gateway_config_hash !== replay.model_gateway_config_hash) {
    mismatch.push(L13ReplayMismatchReasonCode.MODEL_GATEWAY_CONFIG_CHANGED);
  }
  if (source.policy_hash !== replay.policy_hash) {
    mismatch.push(L13ReplayMismatchReasonCode.POLICY_VERSION_CHANGED);
  }
  const prompt_match =
    source.prompt_template_hash === replay.prompt_template_hash &&
    source.prompt_assembly_hash === replay.prompt_assembly_hash;
  const policy_match = source.policy_hash === replay.policy_hash;

  // Grounding equivalence.
  let grounding: L13ReplayEquivalenceClass = L13ReplayEquivalenceClass.EXACT_MATCH;
  if (!setsEqual(source.grounded_claim_ids, replay.grounded_claim_ids)) {
    grounding = L13ReplayEquivalenceClass.GROUNDING_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.GROUNDED_CLAIM_SET_CHANGED);
  }
  if (!setsEqual(source.blocked_claim_ids, replay.blocked_claim_ids)) {
    grounding = L13ReplayEquivalenceClass.GROUNDING_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.BLOCKED_CLAIM_SET_CHANGED);
  }
  if (replay.unsupported_claim_ids.length > source.unsupported_claim_ids.length) {
    grounding = L13ReplayEquivalenceClass.GROUNDING_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.UNSUPPORTED_CLAIM_EMERGED);
  }

  // Disclosure equivalence.
  let disclosure: L13ReplayEquivalenceClass = L13ReplayEquivalenceClass.EXACT_MATCH;
  if (source.disclosed_contradiction && !replay.disclosed_contradiction) {
    disclosure = L13ReplayEquivalenceClass.DISCLOSURE_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.CONTRADICTION_DISCLOSURE_LOST);
  }
  if (source.disclosed_uncertainty && !replay.disclosed_uncertainty) {
    disclosure = L13ReplayEquivalenceClass.DISCLOSURE_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.UNCERTAINTY_DISCLOSURE_LOST);
  }
  if (source.disclosed_trigger && !replay.disclosed_trigger) {
    disclosure = L13ReplayEquivalenceClass.DISCLOSURE_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.TRIGGER_DISCLOSURE_LOST);
  }
  if (source.disclosed_invalidation && !replay.disclosed_invalidation) {
    disclosure = L13ReplayEquivalenceClass.DISCLOSURE_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.INVALIDATION_DISCLOSURE_LOST);
  }
  if (source.disclosed_restriction && !replay.disclosed_restriction) {
    disclosure = L13ReplayEquivalenceClass.DISCLOSURE_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.RESTRICTION_DISCLOSURE_LOST);
  }

  // Safety equivalence.
  let safety: L13ReplayEquivalenceClass = L13ReplayEquivalenceClass.EXACT_MATCH;
  if (source.safety_decision !== replay.safety_decision) {
    safety = L13ReplayEquivalenceClass.SAFETY_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.SAFETY_CLASS_ESCALATED);
  }
  if (
    source.highest_safety_risk_class !== replay.highest_safety_risk_class
  ) {
    safety = L13ReplayEquivalenceClass.SAFETY_CHANGED;
    mismatch.push(L13ReplayMismatchReasonCode.SAFETY_CLASS_ESCALATED);
  }

  // Restriction equivalence.
  const restriction: L13ReplayEquivalenceClass =
    source.restriction_level === replay.restriction_level
      ? L13ReplayEquivalenceClass.EXACT_MATCH
      : L13ReplayEquivalenceClass.LEGALLY_EQUIVALENT;

  // Conditionality equivalence.
  let conditionality: L13ReplayEquivalenceClass = L13ReplayEquivalenceClass.EXACT_MATCH;
  if (
    source.conditional_scenarios_preserved &&
    !replay.conditional_scenarios_preserved
  ) {
    conditionality = L13ReplayEquivalenceClass.BLOCKED;
    mismatch.push(
      L13ReplayMismatchReasonCode.CONDITIONAL_SCENARIO_BECAME_PREDICTION,
    );
  }
  if (
    source.observation_inference_separated &&
    !replay.observation_inference_separated
  ) {
    conditionality = L13ReplayEquivalenceClass.BLOCKED;
    mismatch.push(L13ReplayMismatchReasonCode.OBSERVATION_INFERENCE_MIXED);
  }

  // Mode + style equivalence.
  const mode: L13ReplayEquivalenceClass = replay.mode_required_sections_satisfied
    ? L13ReplayEquivalenceClass.LEGALLY_EQUIVALENT
    : L13ReplayEquivalenceClass.BLOCKED;
  if (!replay.mode_required_sections_satisfied) {
    mismatch.push(L13ReplayMismatchReasonCode.MODE_REQUIRED_SECTION_MISSING);
  }
  const style: L13ReplayEquivalenceClass = replay.style_required_anchors_preserved
    ? L13ReplayEquivalenceClass.LEGALLY_EQUIVALENT
    : L13ReplayEquivalenceClass.BLOCKED;
  if (!replay.style_required_anchors_preserved) {
    mismatch.push(L13ReplayMismatchReasonCode.STYLE_REMOVED_REQUIRED_ANCHOR);
  }

  const wording_drift_detected =
    source.summary_fingerprint !== replay.summary_fingerprint;
  const legal_drift_detected =
    grounding !== L13ReplayEquivalenceClass.EXACT_MATCH ||
    safety !== L13ReplayEquivalenceClass.EXACT_MATCH ||
    disclosure !== L13ReplayEquivalenceClass.EXACT_MATCH ||
    conditionality === L13ReplayEquivalenceClass.BLOCKED;
  const semantic_drift_detected = legal_drift_detected || wording_drift_detected;

  return {
    identity_match,
    prompt_match,
    policy_match,
    grounding_equivalence: grounding,
    safety_equivalence: safety,
    restriction_equivalence: restriction,
    disclosure_equivalence: disclosure,
    conditionality_equivalence: conditionality,
    mode_equivalence: mode,
    style_equivalence: style,
    mismatch_reason_codes: mismatch,
    wording_drift_detected,
    semantic_drift_detected,
    legal_drift_detected,
  };
}
