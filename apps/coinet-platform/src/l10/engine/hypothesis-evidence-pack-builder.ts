/**
 * L10.4 — HypothesisEvidencePackBuilder
 *
 * §10.4.15.1 — Composes the deterministic `L10HypothesisEvidencePack`
 * fed into L5 materialization. The pack is the *complete* lineage the
 * replay adapter hashes against; omissions here become replay-hash
 * divergences.
 */

import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';
import { L10EngineResult, fail, ok } from './engine-types';
import type {
  L10HypothesisConfirmationSet,
  L10HypothesisContradictionSet,
  L10HypothesisEvidencePack,
  L10HypothesisInvalidationSet,
  L10HypothesisRankingOutput,
  L10HypothesisShiftConditionOutput,
  L10HypothesisSpreadOutput,
  L10HypothesisSubjectInstance,
  L10HypothesisSupportSet,
} from '../runtime/hypothesis-execution-context';

export interface L10EvidencePackInput {
  readonly subject_instance: L10HypothesisSubjectInstance;
  readonly supports: readonly L10HypothesisSupportSet[];
  readonly contradictions: readonly L10HypothesisContradictionSet[];
  readonly confirmations: readonly L10HypothesisConfirmationSet[];
  readonly invalidations: readonly L10HypothesisInvalidationSet[];
  readonly ranking: L10HypothesisRankingOutput;
  readonly spread: L10HypothesisSpreadOutput;
  readonly shift: L10HypothesisShiftConditionOutput | null;
  readonly restriction_profile_refs: readonly string[];
  readonly consumed: {
    readonly validation_refs: readonly string[];
    readonly contradiction_refs: readonly string[];
    readonly confidence_refs: readonly string[];
    readonly restriction_refs: readonly string[];
    readonly regime_refs: readonly string[];
    readonly sequence_refs: readonly string[];
  };
  readonly compute_run_lineage: readonly string[];
}

export function buildHypothesisEvidencePack(
  input: L10EvidencePackInput,
): L10EngineResult<L10HypothesisEvidencePack> {
  const violations: L10RuntimeViolation[] = [];
  const si = input.subject_instance;
  const r = input.ranking;
  const v = (
    code: L10RuntimeViolationCode, detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'HypothesisEvidencePackBuilder',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: si.hypothesis_subject_id,
    hypothesis_candidate_id: null,
    detail,
    context: { subject_instance: si.subject_instance_id },
  });

  if (input.supports.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_SUPPORT,
      'no support sets',
    ));
  }
  if (input.contradictions.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_CONTRADICTION,
      'no contradiction sets',
    ));
  }
  if (input.confirmations.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_CONFIRMATION,
      'no confirmation sets',
    ));
  }
  if (input.invalidations.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_INVALIDATION,
      'no invalidation sets',
    ));
  }
  if (!r) {
    violations.push(v(
      L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_RANKING,
      'ranking missing',
    ));
  }
  if (!input.spread) {
    violations.push(v(
      L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_SPREAD,
      'spread missing',
    ));
  }
  if (input.spread?.narrow_spread_flag && !input.shift) {
    violations.push(v(
      L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_SHIFT_CONDITIONS,
      'narrow spread without shift conditions',
    ));
  }
  const anyConsumed =
    input.consumed.validation_refs.length +
    input.consumed.contradiction_refs.length +
    input.consumed.confidence_refs.length +
    input.consumed.restriction_refs.length +
    input.consumed.regime_refs.length +
    input.consumed.sequence_refs.length;
  if (anyConsumed === 0) {
    violations.push(v(
      L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_CONSUMED_REFS,
      'no lower-layer consumption refs',
    ));
  }
  if (!si.lineage_refs?.trace_id || !si.lineage_refs?.manifest_id) {
    violations.push(v(
      L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_LINEAGE,
      'subject instance lineage incomplete',
    ));
  }

  if (violations.length > 0) return fail(violations);

  const candidate_refs =
    [...new Set(input.supports.map(s => s.hypothesis_candidate_id))].sort();

  const pack: L10HypothesisEvidencePack = {
    evidence_pack_id: `lhep:${si.hypothesis_subject_id}:${si.as_of}`,
    hypothesis_subject_id: si.hypothesis_subject_id,
    subject_instance_ref: si.subject_instance_id,
    candidate_refs,
    support_set_refs:
      input.supports.map(s => s.support_set_id).sort(),
    contradiction_set_refs:
      input.contradictions.map(s => s.contradiction_set_id).sort(),
    confirmation_set_refs:
      input.confirmations.map(s => s.confirmation_set_id).sort(),
    invalidation_set_refs:
      input.invalidations.map(s => s.invalidation_set_id).sort(),
    ranking_ref: r.ranking_id,
    spread_profile_ref: input.spread.spread_profile_id,
    shift_condition_set_ref:
      input.shift?.shift_condition_set_id ?? null,
    restriction_profile_refs:
      [...input.restriction_profile_refs].sort(),
    lower_layer_consumed_refs: {
      validation_refs: [...input.consumed.validation_refs].sort(),
      contradiction_refs: [...input.consumed.contradiction_refs].sort(),
      confidence_refs: [...input.consumed.confidence_refs].sort(),
      restriction_refs: [...input.consumed.restriction_refs].sort(),
      regime_refs: [...input.consumed.regime_refs].sort(),
      sequence_refs: [...input.consumed.sequence_refs].sort(),
    },
    input_snapshot_ref: si.replay_identity_inputs.as_of,
    compute_run_lineage: [...input.compute_run_lineage].sort(),
    replay_hash: buildReplayHash(si, r, input),
  };
  return ok(pack);
}

function buildReplayHash(
  si: L10HypothesisSubjectInstance,
  r: L10HypothesisRankingOutput,
  input: L10EvidencePackInput,
): string {
  const components = [
    si.subject_instance_id,
    si.replay_identity_inputs.subject_contract_version,
    si.replay_identity_inputs.policy_version,
    si.replay_identity_inputs.schema_version,
    si.replay_identity_inputs.as_of,
    r.primary_hypothesis_ref,
    r.secondary_hypothesis_ref ?? '',
    r.ordered_hypothesis_refs.join('|'),
    String(r.confidence_spread),
    String(r.narrow_spread_flag),
    r.ranking_stability_class,
    ...input.supports.map(s => s.support_set_id).sort(),
    ...input.contradictions.map(s => s.contradiction_set_id).sort(),
    ...input.confirmations.map(s => s.confirmation_set_id).sort(),
    ...input.invalidations.map(s => s.invalidation_set_id).sort(),
  ];
  let h = 2166136261 >>> 0;
  for (const c of components.join('::')) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `rh:${h.toString(16).padStart(8, '0')}`;
}
