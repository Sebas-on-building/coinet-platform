/**
 * L13.12 — Rollout / Rollback / Failure Playbook Builders
 *
 * §13.12.15 / §13.12.16 / §13.12.17 — Builds rollout gate
 * decisions, the rollback policy, and the failure-playbook
 * catalogue.
 */

import {
  ALL_L13_FAILURE_PLAYBOOK_CLASSES,
  L13FailurePlaybookClass,
  L13RolloutDecision,
  L13RollbackAction,
  L13RollbackTriggerClass,
  type L13FailurePlaybook,
  type L13RollbackPolicy,
  type L13RolloutGateResult,
} from '../contracts/l13-rollout';
import type { L13CertificationReport } from '../contracts/l13-certification-report';
import {
  L13CertificationBand,
} from '../contracts/l13-final-definition';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.rollout.v1';

export interface L13RolloutGateInput {
  readonly certification_report: L13CertificationReport;
  readonly replay_substrate_complete: boolean;
  readonly safety_gate_active: boolean;
  readonly persistence_surfaces_active: boolean;
  readonly l14_handoff_contract_approved: boolean;
  readonly rollback_policy_present: boolean;
  readonly failure_playbooks_present: boolean;
  readonly lineage_refs?: readonly string[];
}

export function runL13RolloutGate(
  input: L13RolloutGateInput,
): L13RolloutGateResult {
  const r = input.certification_report;
  const bandsPreL = r.band_results.filter(
    b => b.band !== L13CertificationBand.BAND_L_FINAL_RATIFICATION,
  );
  const bandL = r.band_results.find(
    b => b.band === L13CertificationBand.BAND_L_FINAL_RATIFICATION,
  );
  const all_bands_green_pre_l = bandsPreL.every(b => b.green);
  const band_l_green = bandL?.green === true;
  const zero_critical_violations = r.critical_violation_count === 0;
  const zero_rollout_blocking_regressions =
    r.rollout_blocking_regression_count === 0;

  const blocking: string[] = [];
  if (!r.all_sublayers_green) blocking.push('SUBLAYERS_NOT_GREEN');
  if (!all_bands_green_pre_l) blocking.push('BANDS_PRE_L_NOT_GREEN');
  if (!band_l_green) blocking.push('BAND_L_NOT_GREEN');
  if (!zero_critical_violations) blocking.push('CRITICAL_VIOLATIONS_PRESENT');
  if (!zero_rollout_blocking_regressions)
    blocking.push('ROLLOUT_BLOCKING_REGRESSIONS_PRESENT');
  if (!input.replay_substrate_complete)
    blocking.push('REPLAY_SUBSTRATE_INCOMPLETE');
  if (!input.safety_gate_active) blocking.push('SAFETY_GATE_INACTIVE');
  if (!input.persistence_surfaces_active)
    blocking.push('PERSISTENCE_SURFACES_INACTIVE');
  if (!input.l14_handoff_contract_approved)
    blocking.push('L14_HANDOFF_NOT_APPROVED');
  if (!input.rollback_policy_present) blocking.push('ROLLBACK_POLICY_MISSING');
  if (!input.failure_playbooks_present)
    blocking.push('FAILURE_PLAYBOOKS_MISSING');

  const decision: L13RolloutDecision = blocking.length === 0
    ? L13RolloutDecision.APPROVED
    : L13RolloutDecision.BLOCKED;

  const lineage = input.lineage_refs ?? ['l13.rollout.lineage'];
  const replayHash = fnv1a(
    [
      r.certification_report_id,
      decision,
      String(r.all_sublayers_green),
      String(all_bands_green_pre_l),
      String(band_l_green),
      String(zero_critical_violations),
      String(zero_rollout_blocking_regressions),
      String(input.replay_substrate_complete),
      String(input.safety_gate_active),
      String(input.persistence_surfaces_active),
      String(input.l14_handoff_contract_approved),
      String(input.rollback_policy_present),
      String(input.failure_playbooks_present),
      blocking.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );

  return {
    rollout_gate_result_id: `l13.rollout.gate.${replayHash}`,
    decision,
    all_sublayers_green: r.all_sublayers_green,
    all_bands_green_pre_l,
    band_l_green,
    zero_critical_violations,
    zero_rollout_blocking_regressions,
    replay_substrate_complete: input.replay_substrate_complete,
    safety_gate_active: input.safety_gate_active,
    persistence_surfaces_active: input.persistence_surfaces_active,
    l14_handoff_contract_approved: input.l14_handoff_contract_approved,
    rollback_policy_present: input.rollback_policy_present,
    failure_playbooks_present: input.failure_playbooks_present,
    blocking_reasons: blocking,
    policy_version: POLICY_V,
    lineage_refs: lineage,
    replay_hash: replayHash,
  };
}

export function buildL13RollbackPolicy(): L13RollbackPolicy {
  const triggers: readonly L13RollbackTriggerClass[] = [
    L13RollbackTriggerClass.CRITICAL_RECOMMENDATION_LEAK,
    L13RollbackTriggerClass.SAFETY_GATE_BYPASS,
    L13RollbackTriggerClass.UNSUPPORTED_CLAIM_EMISSION_INCIDENT,
    L13RollbackTriggerClass.REPLAY_LEGALITY_DRIFT,
    L13RollbackTriggerClass.MAJOR_CONTRADICTION_OMISSION,
    L13RollbackTriggerClass.PERSISTENT_OUTPUT_MATERIALIZATION_FAILURE,
    L13RollbackTriggerClass.ADVERSARIAL_SUITE_REGRESSION,
    L13RollbackTriggerClass.MASTER_CERTIFICATION_DEGRADATION,
  ];
  const actions: readonly L13RollbackAction[] = [
    L13RollbackAction.DISABLE_ROLLOUT,
    L13RollbackAction.ROUTE_TO_REFUSAL_ONLY,
    L13RollbackAction.PRESERVE_AUDIT,
    L13RollbackAction.EMIT_FAILURE_PLAYBOOK,
    L13RollbackAction.FREEZE_NEW_EMISSIONS,
    L13RollbackAction.REQUIRE_RECERTIFICATION,
  ];
  const replayHash = fnv1a(
    ['l13.rollback.policy.default', triggers.join(','), actions.join(','), POLICY_V].join('|'),
  );
  return {
    rollback_policy_id: `l13.rollback.policy.${replayHash}`,
    triggers,
    actions,
    recertification_required_on_trigger: true,
    policy_version: POLICY_V,
    lineage_refs: ['l13.rollback.lineage'],
    replay_hash: replayHash,
  };
}

function playbookFor(cls: L13FailurePlaybookClass): L13FailurePlaybook {
  const replayHash = fnv1a(
    ['l13.playbook', cls, POLICY_V].join('|'),
  );
  return {
    failure_playbook_id: `l13.playbook.${replayHash}`,
    incident_class: cls,
    detection_source: 'L13_AUDIT_OR_REGRESSION_SUITE',
    immediate_action: L13RollbackAction.EMIT_FAILURE_PLAYBOOK,
    degraded_operation_mode: 'ROUTE_TO_REFUSAL_ONLY',
    audit_required: true,
    rollback_required: true,
    recertification_required: true,
    policy_version: POLICY_V,
    lineage_refs: ['l13.rollout.lineage'],
    replay_hash: replayHash,
  };
}

export function buildL13FailurePlaybooks():
  readonly L13FailurePlaybook[] {
  return ALL_L13_FAILURE_PLAYBOOK_CLASSES.map(playbookFor);
}
