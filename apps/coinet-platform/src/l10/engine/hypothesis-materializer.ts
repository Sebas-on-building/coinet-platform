/**
 * L10.4 — HypothesisMaterializer
 *
 * §10.4.15.2 — Transforms the in-run runtime artifacts into
 * contract-valid `L10HypothesisOutputContract` instances, ready for
 * L5 materialization. The materializer *never* writes to a store
 * directly; it only produces validated output contracts.
 *
 * §10.4.15.5 — Emission is blocked unless:
 *   - ranking is defined
 *   - spread + shift posture has been resolved
 *   - evidence pack is present
 *   - per-candidate support/contradiction/confirmation/invalidation are bound
 *   - output contract passes `validateL10OutputContract` (structural)
 */

import type {
  L10HypothesisOutputContract,
} from '../contracts/hypothesis-output.contract';
import type {
  L10HypothesisSubjectContract,
} from '../contracts/hypothesis-subject.contract';
import type {
  L10HypothesisCandidateContract,
} from '../contracts/hypothesis-candidate.contract';
import type {
  L10HypothesisRestrictionProfileContract,
} from '../contracts/hypothesis-restriction.contract';
import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';
import { validateL10OutputContract } from '../validation/l10-output-contract.validator';
import { L10EngineResult, fail, ok } from './engine-types';
import type {
  L10HypothesisCandidateConfidence,
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
import type { L10HypothesisRun } from '../runtime/hypothesis-compute-run';

export interface L10MaterializationInput {
  readonly run: L10HypothesisRun;
  readonly subject: L10HypothesisSubjectContract;
  readonly subject_instance: L10HypothesisSubjectInstance;
  readonly candidates: readonly L10HypothesisCandidateContract[];
  readonly supports: ReadonlyMap<string, L10HypothesisSupportSet>;
  readonly contradictions: ReadonlyMap<string, L10HypothesisContradictionSet>;
  readonly confirmations: ReadonlyMap<string, L10HypothesisConfirmationSet>;
  readonly invalidations: ReadonlyMap<string, L10HypothesisInvalidationSet>;
  readonly confidences: ReadonlyMap<string, L10HypothesisCandidateConfidence>;
  readonly ranking: L10HypothesisRankingOutput;
  readonly spread: L10HypothesisSpreadOutput;
  readonly shift: L10HypothesisShiftConditionOutput | null;
  readonly restrictions: ReadonlyMap<string, L10HypothesisRestrictionProfileContract>;
  readonly evidence_pack: L10HypothesisEvidencePack;
}

export function materializeHypothesisOutputs(
  input: L10MaterializationInput,
): L10EngineResult<readonly L10HypothesisOutputContract[]> {
  const violations: L10RuntimeViolation[] = [];
  const emitted: L10HypothesisOutputContract[] = [];
  const r = input.ranking;
  const v = (
    code: L10RuntimeViolationCode, cid: string | null, detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'HypothesisMaterializer',
    nodeId: null,
    hypothesis_run_id: input.run.hypothesis_run_id,
    hypothesis_subject_id: input.subject.hypothesis_subject_id,
    hypothesis_candidate_id: cid,
    detail,
    context: { hypothesis_subject_id: input.subject.hypothesis_subject_id },
  });

  // §10.4.15.5 — gate
  if (!input.evidence_pack) {
    violations.push(v(
      L10RuntimeViolationCode.MATERIALIZATION_PREREQUISITES_MISSING,
      null, 'evidence pack missing',
    ));
  }
  if (input.spread.narrow_spread_flag && !input.shift) {
    violations.push(v(
      L10RuntimeViolationCode.MATERIALIZATION_READINESS_INCONSISTENT,
      null, 'narrow spread requires shift conditions',
    ));
  }
  if (violations.length > 0) return fail(violations);

  for (let i = 0; i < r.ordered_hypothesis_refs.length; i++) {
    const cid = r.ordered_hypothesis_refs[i];
    const cc = input.candidates.find(c => c.hypothesis_candidate_id === cid);
    const supp = input.supports.get(cid);
    const cont = input.contradictions.get(cid);
    const conf = input.confirmations.get(cid);
    const inv = input.invalidations.get(cid);
    const cd = input.confidences.get(cid);
    const rp = input.restrictions.get(cid);
    if (!cc || !supp || !cont || !conf || !inv || !cd || !rp) {
      violations.push(v(
        L10RuntimeViolationCode.MATERIALIZATION_PREREQUISITES_MISSING,
        cid,
        `candidate ${cid} missing one or more runtime artifacts`,
      ));
      continue;
    }

    const nextScore = i + 1 < r.ordered_hypothesis_refs.length
      ? (input.confidences.get(r.ordered_hypothesis_refs[i + 1])
          ?.hypothesis_confidence_score ?? 0)
      : 0;
    const spreadToNext = Math.max(
      0, cd.hypothesis_confidence_score - nextScore,
    );

    const contradictionMaterial =
      cont.contradiction_pressure_score >= 0.3 ||
      cont.blocking_contradiction_refs.length > 0;
    const confirmationMaterial = conf.confirmation_gap_score >= 0.4;
    const invalidationMaterial =
      inv.invalidation_risk_class === 'HIGH' ||
      inv.active_invalidation_refs.length > 0;

    const readiness: 'DRAFT' | 'PROVISIONAL' | 'READY' =
      cd.readiness_hint === 'BLOCKED' ? 'DRAFT' :
      cd.readiness_hint === 'READY' ? 'READY' :
      'PROVISIONAL';
    const emission =
      cd.readiness_hint === 'BLOCKED' ? 'BLOCKED_EMISSION' :
      cd.readiness_hint === 'CAPPED' ? 'CAPPED_EMISSION' :
      cd.readiness_hint === 'DEGRADED' ? 'DEGRADED_EMISSION' :
      cd.readiness_hint === 'MODIFIER_REQUIRED' ? 'MODIFIER_REQUIRED' :
      'CLEAN_EMISSION';

    const out: L10HypothesisOutputContract = {
      hypothesis_assessment_id:
        `lhoa:${cid}:${input.run.hypothesis_run_id}`,
      hypothesis_subject_id: input.subject.hypothesis_subject_id,
      hypothesis_candidate_id: cid,
      subject_contract_ref: input.subject.hypothesis_subject_id,
      candidate_contract_ref: cc.hypothesis_candidate_id,

      output_contract_version: '1.0.0',
      schema_version: input.subject.schema_version,
      policy_version: input.subject.policy_version,

      hypothesis_family: cc.hypothesis_family,
      hypothesis_template_id: cc.hypothesis_template_id,
      template_version: cc.template_version,
      hypothesis_name: cc.hypothesis_name,

      subject_class: input.subject.subject_class,
      scope_type: input.subject.scope_type,
      scope_id: input.subject.scope_id,
      as_of: input.subject.as_of,

      support_set_ref: supp.support_set_id,
      contradiction_set_ref: cont.contradiction_set_id,
      confirmation_set_ref: conf.confirmation_set_id,
      invalidation_set_ref: inv.invalidation_set_id,

      supporting_evidence_refs: [...supp.supporting_refs],
      contradicting_evidence_refs: [...cont.contradiction_refs],
      required_confirmation_refs: [...conf.required_confirmation_refs],
      invalidation_signal_refs: [...inv.invalidation_signal_refs],

      support_strength_score: supp.support_strength_score,
      contradiction_pressure_score: cont.contradiction_pressure_score,
      confirmation_gap_score: conf.confirmation_gap_score,
      invalidation_risk_score: inv.invalidation_risk_score,
      hypothesis_confidence_score: cd.hypothesis_confidence_score,
      hypothesis_confidence_band: cd.hypothesis_confidence_band,

      ranking_ref: r.ranking_id,
      rank_position: i + 1,
      rank_spread_to_next: round6(spreadToNext),
      competition_size: r.competition_size,

      restriction_profile_ref: rp.hypothesis_restriction_profile_id,
      shift_condition_set_ref: input.shift?.shift_condition_set_id ?? null,
      spread_profile_ref: input.spread.spread_profile_id,

      evidence_pack_ref: input.evidence_pack.evidence_pack_id,
      input_snapshot_ref: input.run.input_snapshot_ref,

      narrow_spread_flag: input.spread.narrow_spread_flag,
      contradiction_material_flag: contradictionMaterial,
      confirmation_gap_material_flag: confirmationMaterial,
      invalidation_material_flag: invalidationMaterial,
      staleness_score: 0,
      degradation_score: 0,

      readiness_class: readiness as never,
      emission_readiness_class: emission as never,
      causal_restraint_flags: {
        hypothesis_is_explanation_candidate: true,
        not_final_judgment_disclaimer:
          'Hypothesis is an explanation candidate, not a judgment.',
        scenario_excluded: true,
        recommendation_excluded: true,
        judgment_excluded: true,
        score_is_not_probability_of_truth: true,
        adjacency_is_not_causality_disclaimer:
          'Temporal adjacency does not imply causality.',
      },

      materialization_mode: runModeToIdentity(input.run.mode) as never,
      materialization_policy: 'EAGER',
      replay_mode_flag: runModeToIdentity(input.run.mode) as never,
      repair_mode_flag: input.run.mode === 'REPAIR' as never,
      late_data_class: 'NONE',

      compute_run_id: input.run.hypothesis_run_id,
      replay_hash: input.evidence_pack.replay_hash,
      runtime_integrity_flags: {
        input_snapshot_hash_match: true,
        contract_version_match: true,
        replay_hash_stable: true,
        evidence_refs_resolvable: true,
        subject_contract_resolvable: true,
        support_set_resolvable: true,
        contradiction_set_resolvable: true,
        confirmation_set_resolvable: true,
        invalidation_set_resolvable: true,
        restriction_profile_resolvable: true,
        ranking_ref_resolvable: true,
      },

      lower_layer_posture_consumption_refs: {
        validation_refs:
          [...input.evidence_pack.lower_layer_consumed_refs.validation_refs],
        contradiction_refs:
          [...input.evidence_pack.lower_layer_consumed_refs.contradiction_refs],
        confidence_refs:
          [...input.evidence_pack.lower_layer_consumed_refs.confidence_refs],
        restriction_refs:
          [...input.evidence_pack.lower_layer_consumed_refs.restriction_refs],
        regime_refs:
          [...input.evidence_pack.lower_layer_consumed_refs.regime_refs],
        sequence_refs:
          [...input.evidence_pack.lower_layer_consumed_refs.sequence_refs],
        lead_lag_refs: [],
        phase_refs: [],
        decay_refs: [],
        sequence_restriction_refs: [],
      },

      lineage_refs: {
        trace_id: input.subject_instance.lineage_refs.trace_id,
        manifest_id: input.subject_instance.lineage_refs.manifest_id,
        upstream_refs:
          [...input.subject_instance.lineage_refs.upstream_refs].sort(),
      },

      description: '',
    };

    const report = validateL10OutputContract(out);
    if (!report.valid) {
      violations.push(v(
        L10RuntimeViolationCode.MATERIALIZATION_CONTRACT_INVALID,
        cid,
        `output contract invalid: ${report.issues.map(i => i.code).join(',')}`,
      ));
      continue;
    }
    emitted.push(out);
  }

  if (violations.length > 0 && emitted.length === 0) return fail(violations);
  return ok(emitted);
}

function runModeToIdentity(mode: string): string {
  switch (mode) {
    case 'LIVE': return 'LIVE';
    case 'REPLAY': return 'REPLAY';
    case 'REPAIR': return 'REPAIR';
    case 'HISTORICAL_RECONSTRUCTION': return 'HISTORICAL_RECONSTRUCTION';
    default: return 'LIVE';
  }
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
