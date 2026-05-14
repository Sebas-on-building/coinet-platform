/**
 * L13.3 — Output Readiness Engine
 *
 * §13.3.10 / §13.3.11 — Derives `L13OutputReadinessAssessment` from
 * an output object. Used by the readiness validator and by the
 * output emitter to decide whether the output may emit to the user.
 *
 * Derivation rules (§13.3.10.1):
 *   - CLEAN_GROUNDED_OUTPUT     : no disclosure required, no caps,
 *                                  no contradictions, no blocked
 *                                  claims, complete sections, clean
 *                                  semantic surface.
 *   - GROUNDED_WITH_DISCLOSURE  : disclosure required by L13.2 but
 *                                  attached and complete.
 *   - NARROWED_BY_UNCERTAINTY   : active uncertainty sources material
 *                                  to the answer.
 *   - NARROWED_BY_RESTRICTION   : restriction profile blocks modes.
 *   - PARTIAL_ANSWER            : intent broader than context.
 *   - REFUSAL_REQUIRED          : prohibited request.
 *   - BLOCKED_UNGROUNDED        : evidence missing / invented support.
 */

import type { L13AIExplanationOutput } from '../contracts/ai-output';
import {
  isL13BlockedOutputReadiness,
  L13OutputReadinessClass,
  type L13OutputReadinessAssessment,
} from '../contracts/output-readiness';
import { L13_ALWAYS_BLOCKED_ANSWER_MODES } from '../contracts/explanation-restriction-profile';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.output.v1';

export interface L13OutputReadinessInput {
  readonly output: L13AIExplanationOutput;
  /**
   * Whether the input package (L13.2) flagged disclosure as required.
   * Defaults to inspecting the output's restriction & confidence
   * disclosures.
   */
  readonly disclosure_required?: boolean;
  /**
   * Whether the user request is for a prohibited mode (e.g. trade
   * advice).
   */
  readonly prohibited_request?: boolean;
  /**
   * Whether the input package is missing required context for the
   * user intent.
   */
  readonly context_insufficient?: boolean;
  /**
   * Optional disclosure refs from L13.2 the readiness assessment
   * carries forward.
   */
  readonly l13_2_disclosure_refs?: readonly string[];
  /**
   * Optional restriction refs from L13.2 carried forward.
   */
  readonly l13_2_restriction_refs?: readonly string[];
  /**
   * Optional uncertainty refs from L13.2 carried forward.
   */
  readonly l13_2_uncertainty_refs?: readonly string[];
}

/**
 * §13.3.11 — Derive the readiness assessment for an output.
 */
export function deriveL13OutputReadiness(
  input: L13OutputReadinessInput,
): L13OutputReadinessAssessment {
  const o = input.output;
  const reasonCodes: string[] = [];
  const blockingIssues: string[] = [];

  // §13.3.10.1 BLOCKED_UNGROUNDED — missing critical evidence.
  const ungrounded =
    !o.evidence_refs ||
    o.evidence_refs.length === 0 ||
    !o.input_package_id ||
    !o.replay_hash;
  if (ungrounded) {
    blockingIssues.push('UNGROUNDED_OUTPUT');
    reasonCodes.push('UNGROUNDED_OUTPUT');
  }

  // §13.3.10.1 REFUSAL_REQUIRED — prohibited request or always-
  // blocked answer mode in use.
  const usedBlockedMode = (
    L13_ALWAYS_BLOCKED_ANSWER_MODES as readonly string[]
  ).includes(o.answer_mode);
  const refusalRequired =
    input.prohibited_request === true || usedBlockedMode;

  // §13.3.10.1 NARROWED_BY_RESTRICTION — lower-layer restrictions
  // block requested modes.
  const restrictionRefs = input.l13_2_restriction_refs ?? [];
  const hasRestrictionBlocks =
    o.restriction_disclosure?.blocked_answer_modes.length > 0 ||
    o.restriction_disclosure?.lower_layer_restriction_refs.length > 0;
  const restrictionNarrowed =
    hasRestrictionBlocks &&
    (restrictionRefs.length > 0 ||
      o.restriction_disclosure.lower_layer_restriction_refs.length > 0);

  // §13.3.10.1 NARROWED_BY_UNCERTAINTY — active uncertainty sources.
  const uncertaintyRefs = input.l13_2_uncertainty_refs ?? [];
  const hasUncertainty =
    o.confidence_disclosure?.must_use_uncertainty_language === true ||
    o.confidence_disclosure?.confidence_cap_refs.length > 0 ||
    o.confidence_disclosure?.confidence_narrowing_reasons.length > 0 ||
    o.contradiction_refs.length > 0 ||
    uncertaintyRefs.length > 0;

  // §13.3.10.1 PARTIAL_ANSWER — intent broader than context.
  const partial = input.context_insufficient === true;

  // §13.3.10.1 GROUNDED_WITH_DISCLOSURE
  const disclosureRequired =
    input.disclosure_required === true ||
    o.restriction_disclosure?.required_disclosures.length > 0;

  let readiness: L13OutputReadinessClass;

  if (ungrounded) {
    readiness = L13OutputReadinessClass.BLOCKED_UNGROUNDED;
  } else if (refusalRequired) {
    readiness = L13OutputReadinessClass.REFUSAL_REQUIRED;
    reasonCodes.push('REFUSAL_REQUIRED');
  } else if (partial) {
    readiness = L13OutputReadinessClass.PARTIAL_ANSWER;
    reasonCodes.push('PARTIAL_CONTEXT');
  } else if (hasUncertainty && o.confidence_disclosure.confidence_cap_refs.length > 0) {
    readiness = L13OutputReadinessClass.NARROWED_BY_UNCERTAINTY;
    reasonCodes.push('UNCERTAINTY_NARROWED');
  } else if (restrictionNarrowed && !o.restriction_disclosure.may_include_directional_language) {
    readiness = L13OutputReadinessClass.NARROWED_BY_RESTRICTION;
    reasonCodes.push('RESTRICTION_NARROWED');
  } else if (disclosureRequired || hasUncertainty) {
    readiness = L13OutputReadinessClass.GROUNDED_WITH_DISCLOSURE;
    reasonCodes.push('DISCLOSURE_REQUIRED');
  } else {
    readiness = L13OutputReadinessClass.CLEAN_GROUNDED_OUTPUT;
    reasonCodes.push('CLEAN');
  }

  // BLOCKED band invalidates confident emission.
  if (
    o.confidence_disclosure?.explanation_confidence_band ===
    L13ExplanationConfidenceBand.BLOCKED
  ) {
    readiness = L13OutputReadinessClass.BLOCKED_UNGROUNDED;
    reasonCodes.push('BLOCKED_CONFIDENCE_BAND');
    blockingIssues.push('BLOCKED_CONFIDENCE_BAND');
  }

  const mayEmit =
    !isL13BlockedOutputReadiness(readiness) &&
    readiness !== L13OutputReadinessClass.REFUSAL_REQUIRED;
  const requiresRefusal =
    readiness === L13OutputReadinessClass.REFUSAL_REQUIRED;
  const requiresRewrite = blockingIssues.length > 0 && !requiresRefusal;

  const disclosureRefs = input.l13_2_disclosure_refs ?? [];

  const replayHash = fnv1a(
    [
      'L13_OUTPUT_READINESS',
      o.output_id,
      readiness,
      [...reasonCodes].sort().join(','),
      [...blockingIssues].sort().join(','),
      [...disclosureRefs].sort().join(','),
      [...restrictionRefs].sort().join(','),
      [...uncertaintyRefs].sort().join(','),
    ].join('|'),
  );

  return {
    readiness_assessment_id: `l13.readiness.${replayHash}`,
    output_id: o.output_id,
    readiness_class: readiness,
    readiness_reason_codes: [...reasonCodes].sort(),
    blocking_issue_refs: [...blockingIssues].sort(),
    disclosure_required_refs: [...disclosureRefs].sort(),
    restriction_refs: [...restrictionRefs].sort(),
    uncertainty_refs: [...uncertaintyRefs].sort(),
    may_emit_to_user: mayEmit,
    requires_rewrite: requiresRewrite,
    requires_refusal: requiresRefusal,
    evidence_refs: [...o.evidence_refs].sort(),
    lineage_refs: [...o.lineage_refs].sort(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
