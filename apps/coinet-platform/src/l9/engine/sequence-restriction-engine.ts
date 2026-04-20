/**
 * L9.4 — SequenceRestrictionEngine
 *
 * §9.4.14 — Builds the `L9SequenceRestrictionProfileContract` + the
 * restriction handoff bundle. Strongly decides reliance band from
 * classification posture: decisive reliance is forbidden when
 * ambiguity, decay, or staleness is material.
 */

import type {
  L9ClassificationOutput,
  L9RestrictionHandoffBundle,
} from '../runtime/sequence-execution-context';
import type {
  L9SequenceRestrictionProfileContract,
} from '../contracts/sequence-restriction.contract';
import type { L9SequenceSubjectContract } from '../contracts/sequence-subject.contract';
import {
  L9SequenceRelianceBand,
  L9AllowedDownstreamUse,
  L9SequenceNarrowingReason,
} from '../contracts/sequence-restriction-profile';
import { L9SequenceCoexistenceClass } from '../contracts/sequence-coexistence';
import { L9DecayClass } from '../contracts/decay-profile';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';

export interface L9RestrictionEngineInput {
  readonly subject: L9SequenceSubjectContract;
  readonly classification: L9ClassificationOutput;
  readonly sequence_result_id: string;
  readonly contradiction_refs: readonly string[];
  readonly regime_refs: readonly string[];
  readonly evidence_refs: readonly string[];
  readonly restriction_required_refs: readonly string[];
  readonly contract_versions: {
    readonly restriction_contract_version: string;
    readonly schema_version: string;
    readonly policy_version: string;
  };
  readonly compute_run_id: string;
}

export interface L9RestrictionEngineResult {
  readonly profile: L9SequenceRestrictionProfileContract;
  readonly handoff: L9RestrictionHandoffBundle;
}

export function buildRestrictionProfile(
  input: L9RestrictionEngineInput,
): L9EngineResult<L9RestrictionEngineResult> {
  const violations: L9RuntimeViolation[] = [];
  const subjectId = input.subject.sequence_subject_id;
  const c = input.classification;

  if (!c) {
    violations.push(v(
      L9RuntimeViolationCode.RESTRICTION_BEFORE_CLASSIFICATION,
      subjectId, 'restriction before classification'));
  }

  const narrowing: L9SequenceNarrowingReason[] = [];
  if (c.ambiguity_score >= 0.3) {
    narrowing.push(L9SequenceNarrowingReason.HIGH_AMBIGUITY);
  }
  if (c.sequence_decay_score >= 0.6 ||
      c.sequence_decay_class === L9DecayClass.DECAYING ||
      c.sequence_decay_class === L9DecayClass.DEPRECATED) {
    narrowing.push(L9SequenceNarrowingReason.HIGH_DECAY);
  }
  if (c.staleness_score >= 0.3) {
    narrowing.push(L9SequenceNarrowingReason.STALENESS);
  }
  if (input.contradiction_refs.length > 0) {
    narrowing.push(L9SequenceNarrowingReason.MATERIAL_CONTRADICTION);
  }
  if (c.sequence_completeness_score < 0.6) {
    narrowing.push(L9SequenceNarrowingReason.INCOMPLETE_CHAIN);
  }

  let band: L9SequenceRelianceBand = L9SequenceRelianceBand.PRIMARY;
  if (c.coexistence_class === L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE ||
      c.coexistence_class === L9SequenceCoexistenceClass.TRANSITIONAL_OVERLAP) {
    band = L9SequenceRelianceBand.SUPPORTING;
  }
  if (narrowing.length >= 2) band = L9SequenceRelianceBand.CORROBORATING;
  if (narrowing.includes(L9SequenceNarrowingReason.MATERIAL_CONTRADICTION) &&
      narrowing.includes(L9SequenceNarrowingReason.HIGH_AMBIGUITY)) {
    band = L9SequenceRelianceBand.EVIDENCE_ONLY;
  }
  if (c.sequence_decay_class === L9DecayClass.DEPRECATED) {
    band = L9SequenceRelianceBand.EVIDENCE_ONLY;
  }

  // §9.4.14.2 — forbidden: DECISIVE under ambiguity
  if ((band as L9SequenceRelianceBand) === L9SequenceRelianceBand.DECISIVE &&
      (c.ambiguity_score >= 0.3 || c.sequence_decay_score >= 0.6)) {
    violations.push(v(
      L9RuntimeViolationCode.RESTRICTION_DECISIVE_UNDER_AMBIGUITY,
      subjectId,
      'DECISIVE reliance under material ambiguity/decay',
    ));
  }

  // §9.4.14.2 — blocked allows strong
  if ((band as L9SequenceRelianceBand) === L9SequenceRelianceBand.BLOCKED) {
    violations.push(v(
      L9RuntimeViolationCode.RESTRICTION_BLOCKED_ALLOWS_STRONG,
      subjectId, 'BLOCKED band may not allow strong downstream uses'));
  }

  const blocked: L9AllowedDownstreamUse[] = [];
  if (band === L9SequenceRelianceBand.EVIDENCE_ONLY) {
    blocked.push(
      L9AllowedDownstreamUse.JUDGMENT_INPUT,
      L9AllowedDownstreamUse.RECOMMENDATION_CONTEXT,
      L9AllowedDownstreamUse.RISK_CONDITIONING,
    );
  }

  const allowed: L9AllowedDownstreamUse[] = [
    L9AllowedDownstreamUse.AUDIT_REFERENCE,
    L9AllowedDownstreamUse.SCENARIO_INPUT,
  ];
  if (band === L9SequenceRelianceBand.PRIMARY ||
      (band as L9SequenceRelianceBand) === L9SequenceRelianceBand.DECISIVE) {
    allowed.push(
      L9AllowedDownstreamUse.JUDGMENT_INPUT,
      L9AllowedDownstreamUse.RECOMMENDATION_CONTEXT,
      L9AllowedDownstreamUse.RISK_CONDITIONING,
    );
  } else if (band === L9SequenceRelianceBand.SUPPORTING ||
             band === L9SequenceRelianceBand.CORROBORATING) {
    allowed.push(L9AllowedDownstreamUse.RISK_CONDITIONING);
  }

  if (violations.length > 0) return fail(violations);

  const profile: L9SequenceRestrictionProfileContract = {
    sequence_restriction_profile_id:
      `srp:${subjectId}:${input.sequence_result_id}`,
    sequence_result_id: input.sequence_result_id,
    sequence_subject_id: subjectId,
    restriction_contract_version:
      input.contract_versions.restriction_contract_version,
    schema_version: input.contract_versions.schema_version,
    policy_version: input.contract_versions.policy_version,
    reliance_band: band,
    allowed_downstream_uses: uniqSort(allowed),
    blocked_uses: uniqSort(blocked),
    required_disclosures: [
      'causal_restraint', 'ambiguity_explicit',
    ],
    narrowing_reasons: uniqSort(narrowing),
    lineage_refs: {
      trace_id: input.subject.lineage_refs?.trace_id ?? '',
      manifest_id: input.subject.lineage_refs?.manifest_id ?? '',
      upstream_refs: [...input.evidence_refs].sort(),
    },
    compute_run_id: input.compute_run_id,
    replay_hash: `h:srp:${subjectId}:${band}:${narrowing.join('+')}`,
    description:
      'Sequence restriction profile governing downstream reliance on this assessment.',
  };

  const handoff: L9RestrictionHandoffBundle = {
    sequence_subject_id: subjectId,
    classification_ref: `cls:${subjectId}:${c.primary_sequence_state}`,
    coexistence_class: c.coexistence_class,
    ambiguity_score: c.ambiguity_score,
    decay_class: c.sequence_decay_class,
    restriction_required_refs: [...input.restriction_required_refs].sort(),
    contradiction_refs: [...input.contradiction_refs].sort(),
    regime_refs: [...input.regime_refs].sort(),
    evidence_refs: [...input.evidence_refs].sort(),
  };

  return ok({ profile, handoff });
}

function uniqSort<T extends string>(xs: readonly T[]): T[] {
  return [...new Set(xs)].sort();
}

function v(
  code: L9RuntimeViolationCode,
  subjectId: string,
  detail: string,
): L9RuntimeViolation {
  return {
    code,
    source: 'sequence-restriction-engine',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
