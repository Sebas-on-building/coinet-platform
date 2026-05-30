/**
 * L14.10 — Master Certification, Ratification, Freeze, Architecture engines
 *
 * §14.10.39 / §14.10.50 / §14.10.51 / §14.10.52
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  ALL_L14_FINAL_CAPABILITY_GROUPS,
  ALL_L14_FINAL_FORBIDDEN_SEMANTICS,
  ALL_L14_FINAL_REQUIRED_PROPERTIES,
  ALL_L14_SUBLAYERS,
  L14_FINAL_FIRST_PRINCIPLE,
  L14_FINAL_MISSION,
  L14SublayerId,
  type L14FinalDefinition,
  type L14UpstreamDependency,
} from '../contracts/l14-final-definition';
import {
  ALL_L14_CERTIFICATION_BANDS,
  ALL_L14_EXTERNAL_REGRESSION_REQUIREMENTS,
  ALL_L14_FINAL_INVARIANTS,
  L14_REQUIRED_GREEN_SUBLAYERS,
  type L14CertificationBand,
  type L14CompletionStandard,
} from '../contracts/l14-completion-standard';
import {
  L14CertificationLevel,
  type L14BandCertificationSnapshot,
  type L14CertificationReport,
  type L14ExternalRegressionSnapshot,
  type L14FinalInvariantResult,
  type L14SublayerCertificationSnapshot,
} from '../contracts/l14-certification-report';
import {
  ALL_L14_PROHIBITED_POST_FREEZE_CHANGES,
  L14ExtensionClassification,
  L14FreezeClass,
  L14ProposedChangeClass,
  L14RecertificationRequiredChange,
  L14_EXTENSION_CLASSIFICATION_MAP,
  type L14FreezePolicy,
} from '../contracts/l14-freeze-policy';
import {
  COINET_FINAL_OPERATIONAL_CLAIM,
  CoinetArchitectureCompletionStatus,
  type CoinetArchitectureCompletionArtifact,
  type L14LayerRatificationArtifact,
} from '../contracts/l14-ratification-artifact';
import {
  L14RollbackAction,
  L14RollbackTrigger,
  L14RolloutGateCheck,
  type L14FinalFailurePlaybook,
  type L14FinalFailurePlaybookClass,
  type L14RollbackPolicy,
  type L14RolloutGateCheckResult,
  type L14RolloutGateResult,
} from '../contracts/l14-rollout-gate';

const POLICY_V = 'l14.final.v1';

// ── Final definition builder ─────────────────────────────────────

export function buildL14FinalDefinition(): L14FinalDefinition {
  const upstream: readonly L14UpstreamDependency[] = [
    'L10_HYPOTHESES', 'L11_SCORES', 'L12_SCENARIOS', 'L13_EXPLANATIONS',
  ];
  const id = `l14.final.definition.${fnv1a([
    'DELIVERY_FEEDBACK_CALIBRATION_LAYER',
    L14_FINAL_MISSION, L14_FINAL_FIRST_PRINCIPLE,
    ALL_L14_SUBLAYERS.slice().sort().join(','),
    ALL_L14_FINAL_CAPABILITY_GROUPS.slice().sort().join(','),
    ALL_L14_FINAL_FORBIDDEN_SEMANTICS.slice().sort().join(','),
    ALL_L14_FINAL_REQUIRED_PROPERTIES.slice().sort().join(','),
    upstream.slice().sort().join(','),
    POLICY_V,
  ].join('|'))}`;
  return {
    final_definition_id: id,
    canonical_layer_name: 'DELIVERY_FEEDBACK_CALIBRATION_LAYER',
    canonical_mission: L14_FINAL_MISSION,
    first_principle: L14_FINAL_FIRST_PRINCIPLE,
    canonical_sublayers: ALL_L14_SUBLAYERS,
    final_capability_groups: ALL_L14_FINAL_CAPABILITY_GROUPS,
    final_forbidden_semantics: ALL_L14_FINAL_FORBIDDEN_SEMANTICS,
    final_required_properties: ALL_L14_FINAL_REQUIRED_PROPERTIES,
    upstream_dependencies: upstream,
    lower_layer_rebuild_allowed: false,
    engagement_as_truth_allowed: false,
    silent_auto_mutation_allowed: false,
    calibration_auto_apply_allowed: false,
    lineage_refs: ['l14.final.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Completion standard builder ──────────────────────────────────

export function buildL14CompletionStandard(): L14CompletionStandard {
  const id = `l14.final.standard.${fnv1a([
    L14_REQUIRED_GREEN_SUBLAYERS.slice().sort().join(','),
    ALL_L14_CERTIFICATION_BANDS.slice().sort().join(','),
    ALL_L14_FINAL_INVARIANTS.slice().sort().join(','),
    ALL_L14_EXTERNAL_REGRESSION_REQUIREMENTS.slice().sort().join(','),
    POLICY_V,
  ].join('|'))}`;
  return {
    completion_standard_id: id,
    zero_tolerance_critical_breaches: true,
    zero_tolerance_failed_final_invariants: true,
    zero_tolerance_failed_certification_bands: true,
    zero_tolerance_rollout_gate_failure: true,
    required_green_sublayers: L14_REQUIRED_GREEN_SUBLAYERS,
    required_certification_bands: ALL_L14_CERTIFICATION_BANDS,
    required_final_invariants: ALL_L14_FINAL_INVARIANTS,
    required_external_regressions: ALL_L14_EXTERNAL_REGRESSION_REQUIREMENTS,
    ratification_artifact_required: true,
    freeze_activation_required: true,
    rollout_gate_required: true,
    full_14_layer_architecture_completion_required: true,
    lineage_refs: ['l14.final.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Certification report builder ─────────────────────────────────

export interface L14CertificationReportInput {
  readonly sublayer_results: readonly L14SublayerCertificationSnapshot[];
  readonly band_results: readonly L14BandCertificationSnapshot[];
  readonly invariant_results: readonly L14FinalInvariantResult[];
  readonly external_regression_results: readonly L14ExternalRegressionSnapshot[];
  readonly critical_breach_count: number;
  readonly error_count: number;
  readonly warning_count: number;
}

export function deriveL14CertificationLevel(input: {
  sublayer_results: readonly L14SublayerCertificationSnapshot[];
  band_results: readonly L14BandCertificationSnapshot[];
  invariant_results: readonly L14FinalInvariantResult[];
  external_regression_results: readonly L14ExternalRegressionSnapshot[];
  critical_breach_count: number;
  rollout_approved: boolean;
  freeze_activated: boolean;
  architecture_completion_approved: boolean;
}): L14CertificationLevel {
  const allSubGreen = input.sublayer_results.length === L14_REQUIRED_GREEN_SUBLAYERS.length &&
    input.sublayer_results.every(s => s.sublayer_green);
  const allBandsGreen = input.band_results.length === ALL_L14_CERTIFICATION_BANDS.length &&
    input.band_results.every(b => b.green);
  const allInvariantsHold = input.invariant_results.length === ALL_L14_FINAL_INVARIANTS.length &&
    input.invariant_results.every(i => i.holds);
  const allExternalGreen = input.external_regression_results.every(r => r.satisfied);
  const noCriticalBreach = input.critical_breach_count === 0;

  if (input.architecture_completion_approved && input.freeze_activated && input.rollout_approved &&
      allSubGreen && allBandsGreen && allInvariantsHold && allExternalGreen && noCriticalBreach) {
    return L14CertificationLevel.ARCHITECTURE_COMPLETE;
  }
  if (input.freeze_activated && input.rollout_approved &&
      allSubGreen && allBandsGreen && allInvariantsHold && noCriticalBreach) {
    return L14CertificationLevel.FROZEN_LIVE;
  }
  if (input.rollout_approved &&
      allSubGreen && allBandsGreen && allInvariantsHold && noCriticalBreach) {
    return L14CertificationLevel.ROLLOUT_READY;
  }
  if (allSubGreen && allBandsGreen && allInvariantsHold && noCriticalBreach) {
    return L14CertificationLevel.PRODUCTION_GREEN;
  }
  if (input.sublayer_results.every(s => s.sublayer_green) &&
      input.sublayer_results.length >= L14_REQUIRED_GREEN_SUBLAYERS.length - 1) {
    return L14CertificationLevel.SUBLAYER_GREEN;
  }
  return L14CertificationLevel.NOT_CERTIFIED;
}

export function buildL14CertificationReport(input: L14CertificationReportInput & {
  rollout_approved: boolean;
  freeze_activated: boolean;
  architecture_completion_approved: boolean;
}): L14CertificationReport {
  const level = deriveL14CertificationLevel(input);
  const fingerprintInputs = [
    input.sublayer_results.map(s => `${s.sublayer_id}:${s.passed_assertions}/${s.failed_assertions}`).sort().join(';'),
    input.band_results.map(b => `${b.band}:${b.green ? 'G' : 'R'}`).sort().join(';'),
    input.invariant_results.map(i => `${i.invariant_id}:${i.holds ? 'H' : 'F'}`).sort().join(';'),
    input.external_regression_results.map(r => `${r.requirement}:${r.satisfied ? 'S' : 'U'}`).sort().join(';'),
    String(input.critical_breach_count), level, POLICY_V,
  ];
  const fingerprint = `l14.fp.${fnv1a(fingerprintInputs.join('|'))}`;
  const replayHash = fnv1a([fingerprint, 'report', POLICY_V].join('|'));
  return {
    certification_report_id: `l14.final.report.${replayHash}`,
    certification_level: level,
    sublayer_results: input.sublayer_results,
    band_results: input.band_results,
    invariant_results: input.invariant_results,
    external_regression_results: input.external_regression_results,
    critical_breach_count: input.critical_breach_count,
    error_count: input.error_count,
    warning_count: input.warning_count,
    rollout_recommended: input.rollout_approved &&
      level === L14CertificationLevel.PRODUCTION_GREEN ||
      level === L14CertificationLevel.ROLLOUT_READY ||
      level === L14CertificationLevel.FROZEN_LIVE ||
      level === L14CertificationLevel.ARCHITECTURE_COMPLETE,
    freeze_activation_recommended: input.freeze_activated &&
      (level === L14CertificationLevel.ROLLOUT_READY ||
       level === L14CertificationLevel.FROZEN_LIVE ||
       level === L14CertificationLevel.ARCHITECTURE_COMPLETE),
    architecture_completion_recommended: input.architecture_completion_approved &&
      level === L14CertificationLevel.ARCHITECTURE_COMPLETE,
    final_combined_fingerprint: fingerprint,
    lineage_refs: ['l14.final.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Rollout gate engine ──────────────────────────────────────────

export interface L14RolloutGateInput {
  readonly all_sublayers_green: boolean;
  readonly all_bands_green: boolean;
  readonly all_final_invariants_green: boolean;
  readonly critical_breach_count: number;
  readonly push_remains_reserved: boolean;
  readonly telegram_gate_valid: boolean;
  readonly user_control_law_valid: boolean;
  readonly experiment_non_corruption_valid: boolean;
  readonly persistence_replay_repair_valid: boolean;
  readonly calibration_non_auto_mutation_valid: boolean;
  readonly upstream_regressions_green: boolean;
}

export function buildL14RolloutGateResult(input: L14RolloutGateInput): L14RolloutGateResult {
  const checks: L14RolloutGateCheckResult[] = [
    { check: L14RolloutGateCheck.ALL_SUBLAYERS_GREEN, passed: input.all_sublayers_green, evidence: String(input.all_sublayers_green) },
    { check: L14RolloutGateCheck.ALL_BANDS_GREEN, passed: input.all_bands_green, evidence: String(input.all_bands_green) },
    { check: L14RolloutGateCheck.ALL_FINAL_INVARIANTS_GREEN, passed: input.all_final_invariants_green, evidence: String(input.all_final_invariants_green) },
    { check: L14RolloutGateCheck.NO_CRITICAL_BREACHES, passed: input.critical_breach_count === 0, evidence: String(input.critical_breach_count) },
    { check: L14RolloutGateCheck.PUSH_REMAINS_RESERVED, passed: input.push_remains_reserved, evidence: String(input.push_remains_reserved) },
    { check: L14RolloutGateCheck.TELEGRAM_GATE_VALID, passed: input.telegram_gate_valid, evidence: String(input.telegram_gate_valid) },
    { check: L14RolloutGateCheck.USER_CONTROL_LAW_VALID, passed: input.user_control_law_valid, evidence: String(input.user_control_law_valid) },
    { check: L14RolloutGateCheck.EXPERIMENT_NON_CORRUPTION_VALID, passed: input.experiment_non_corruption_valid, evidence: String(input.experiment_non_corruption_valid) },
    { check: L14RolloutGateCheck.PERSISTENCE_REPLAY_REPAIR_VALID, passed: input.persistence_replay_repair_valid, evidence: String(input.persistence_replay_repair_valid) },
    { check: L14RolloutGateCheck.CALIBRATION_NON_AUTO_MUTATION_VALID, passed: input.calibration_non_auto_mutation_valid, evidence: String(input.calibration_non_auto_mutation_valid) },
    { check: L14RolloutGateCheck.UPSTREAM_REGRESSIONS_GREEN, passed: input.upstream_regressions_green, evidence: String(input.upstream_regressions_green) },
  ];
  const blocking = checks.filter(c => !c.passed).map(c => c.check);
  const approved = blocking.length === 0;
  let recommended: L14RolloutGateResult['recommended_rollout_status'];
  if (approved) recommended = 'PRODUCTION_ENABLED_GOVERNED';
  else if (blocking.length === 1 && blocking[0] === L14RolloutGateCheck.UPSTREAM_REGRESSIONS_GREEN) recommended = 'LIMITED_OPT_IN_ONLY';
  else recommended = 'BLOCKED';
  const replayHash = fnv1a([
    checks.map(c => `${c.check}:${c.passed}`).join('|'), recommended, POLICY_V,
  ].join('|'));
  return {
    rollout_gate_result_id: `l14.final.rollout.gate.${replayHash}`,
    gate_checks: checks,
    rollout_approved: approved,
    rollout_blocking_reason_codes: blocking,
    recommended_rollout_status: recommended,
    lineage_refs: ['l14.final.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Rollback policy + failure playbook builders ──────────────────

export function buildL14RollbackPolicy(input?: {
  triggers?: readonly L14RollbackTrigger[];
  actions?: readonly L14RollbackAction[];
}): L14RollbackPolicy {
  const tr = input?.triggers ?? defaultRollbackTriggers();
  const ac = input?.actions ?? defaultRollbackActions();
  const id = `l14.final.rollback.policy.${fnv1a([
    tr.slice().sort().join(','), ac.slice().sort().join(','), POLICY_V,
  ].join('|'))}`;
  return {
    rollback_policy_id: id,
    rollback_triggers: tr,
    rollback_actions: ac,
    may_pause_external_delivery: true,
    may_downgrade_alert_classes_to_digest: true,
    may_restrict_experiments: true,
    may_mutate_lower_layer_truth: false,
    may_rewrite_history: false,
    lineage_refs: ['l14.final.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

function defaultRollbackTriggers(): readonly L14RollbackTrigger[] {
  return Object.values(L14RollbackTrigger) as L14RollbackTrigger[];
}
function defaultRollbackActions(): readonly L14RollbackAction[] {
  return Object.values(L14RollbackAction) as L14RollbackAction[];
}

export interface L14FinalFailurePlaybookInput {
  readonly playbook_class: L14FinalFailurePlaybookClass;
  readonly triggering_violation: string;
  readonly operational_severity: L14FinalFailurePlaybook['operational_severity'];
  readonly immediate_containment_action: L14RollbackAction;
  readonly rollout_impact: L14FinalFailurePlaybook['rollout_impact'];
  readonly required_recertification_scope: L14FinalFailurePlaybook['required_recertification_scope'];
  readonly architecture_completion_revoked: boolean;
  readonly lower_layer_review_required: boolean;
}

export function buildL14FinalFailurePlaybook(input: L14FinalFailurePlaybookInput): L14FinalFailurePlaybook {
  const id = `l14.final.failure.playbook.${fnv1a([
    input.playbook_class, input.triggering_violation, input.operational_severity,
    input.immediate_containment_action, input.rollout_impact,
    input.required_recertification_scope,
    String(input.architecture_completion_revoked),
    String(input.lower_layer_review_required),
    POLICY_V,
  ].join('|'))}`;
  return {
    final_failure_playbook_id: id,
    ...input,
    lineage_refs: ['l14.final.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Freeze activator ─────────────────────────────────────────────

export interface L14FreezePolicyInput {
  readonly freeze_activated: boolean;
  readonly frozen_surface_refs: readonly string[];
}

export function buildL14FreezePolicy(input: L14FreezePolicyInput): L14FreezePolicy {
  const freezeClasses: readonly L14FreezeClass[] = [
    L14FreezeClass.CONTRACT_FROZEN,
    L14FreezeClass.POLICY_FROZEN,
    L14FreezeClass.GOVERNANCE_FROZEN,
    L14FreezeClass.OUTPUT_SURFACE_FROZEN,
    L14FreezeClass.LIVE_ROLLOUT_FROZEN,
  ];
  const id = `l14.final.freeze.policy.${fnv1a([
    String(input.freeze_activated),
    input.frozen_surface_refs.slice().sort().join(','),
    freezeClasses.slice().sort().join(','), POLICY_V,
  ].join('|'))}`;
  return {
    freeze_policy_id: id,
    freeze_activated: input.freeze_activated,
    freeze_activation_level_required: 'FROZEN_LIVE',
    frozen_surface_refs: input.frozen_surface_refs,
    frozen_freeze_classes: freezeClasses,
    prohibited_post_freeze_changes: ALL_L14_PROHIBITED_POST_FREEZE_CHANGES,
    recertification_required_changes: Object.values(L14RecertificationRequiredChange),
    lineage_refs: ['l14.final.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function activateL14FreezePolicy(input: {
  rollout_approved: boolean;
  all_sublayers_green: boolean;
  all_final_invariants_green: boolean;
  frozen_surface_refs: readonly string[];
}): L14FreezePolicy {
  const ok = input.rollout_approved && input.all_sublayers_green && input.all_final_invariants_green;
  return buildL14FreezePolicy({
    freeze_activated: ok,
    frozen_surface_refs: input.frozen_surface_refs,
  });
}

// ── Extension classifier ─────────────────────────────────────────

export function classifyL14ExtensionRequest(
  cls: L14ProposedChangeClass,
): L14ExtensionClassification {
  return L14_EXTENSION_CLASSIFICATION_MAP[cls];
}

// ── Ratification builder ─────────────────────────────────────────

export interface L14LayerRatificationArtifactInput {
  readonly report: L14CertificationReport;
  readonly freeze: L14FreezePolicy;
  readonly rollout: L14RolloutGateResult;
  readonly completion_standard: L14CompletionStandard;
  readonly upstream_dependency_fingerprints: readonly string[];
  readonly architecture_completion_approved: boolean;
  readonly ratified_at?: string;
}

export interface L14LayerRatificationArtifactResult {
  readonly artifact?: L14LayerRatificationArtifact;
  readonly blocked: boolean;
  readonly blocking_reasons: readonly string[];
}

export function emitL14LayerRatificationArtifact(
  input: L14LayerRatificationArtifactInput,
): L14LayerRatificationArtifactResult {
  const reasons: string[] = [];
  const bandsGreen = input.report.band_results.filter(b => b.green).length;
  const totalBands = input.report.band_results.length;
  const sublayersGreen = input.report.sublayer_results.filter(s => s.sublayer_green).length;
  const totalSublayers = input.report.sublayer_results.length;
  const invariantsGreen = input.report.invariant_results.filter(i => i.holds).length;
  const totalInvariants = input.report.invariant_results.length;
  const externalsGreen = input.report.external_regression_results.every(r => r.satisfied);

  if (bandsGreen !== totalBands) reasons.push('BAND_NOT_GREEN');
  if (sublayersGreen !== totalSublayers) reasons.push('SUBLAYER_NOT_GREEN');
  if (invariantsGreen !== totalInvariants) reasons.push('FINAL_INVARIANT_FAILED');
  if (input.report.critical_breach_count > 0) reasons.push('CRITICAL_BREACH_PRESENT');
  if (!input.rollout.rollout_approved) reasons.push('ROLLOUT_NOT_APPROVED');
  if (!input.freeze.freeze_activated) reasons.push('FREEZE_NOT_ACTIVATED');
  if (!externalsGreen) reasons.push('EXTERNAL_REGRESSION_FAILED');

  if (reasons.length > 0) {
    return { blocked: true, blocking_reasons: reasons };
  }

  const combinedFingerprint = `l14.fp.combined.${fnv1a([
    input.report.final_combined_fingerprint,
    input.freeze.replay_hash, input.rollout.replay_hash,
    input.completion_standard.replay_hash,
    input.upstream_dependency_fingerprints.slice().sort().join(','),
    POLICY_V,
  ].join('|'))}`;

  const replayHash = fnv1a([
    input.report.certification_report_id, input.freeze.freeze_policy_id,
    input.rollout.rollout_gate_result_id, input.completion_standard.completion_standard_id,
    String(input.architecture_completion_approved),
    combinedFingerprint, POLICY_V,
  ].join('|'));

  const artifact: L14LayerRatificationArtifact = {
    ratification_artifact_id: `l14.final.ratification.${replayHash}`,
    layer_id: 'L14',
    layer_name: 'DELIVERY_FEEDBACK_CALIBRATION_LAYER',
    certification_level: input.architecture_completion_approved
      ? L14CertificationLevel.ARCHITECTURE_COMPLETE
      : L14CertificationLevel.FROZEN_LIVE,
    completion_standard_ref: input.completion_standard.completion_standard_id,
    certification_report_ref: input.report.certification_report_id,
    freeze_policy_ref: input.freeze.freeze_policy_id,
    rollout_gate_ref: input.rollout.rollout_gate_result_id,
    sublayers_green: sublayersGreen,
    total_sublayers: totalSublayers,
    bands_green: bandsGreen,
    total_bands: totalBands,
    final_invariants_green: invariantsGreen,
    total_final_invariants: totalInvariants,
    critical_breaches: input.report.critical_breach_count,
    rollout_approved: true,
    freeze_activated: true,
    architecture_completion_approved: input.architecture_completion_approved,
    combined_fingerprint: combinedFingerprint,
    upstream_dependency_fingerprints: input.upstream_dependency_fingerprints,
    l14_sublayer_fingerprints: input.report.sublayer_results.map(s => s.fingerprint_ref ?? ''),
    ratified_at: input.ratified_at ?? new Date().toISOString(),
    lineage_refs: ['l14.final.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
  return { artifact, blocked: false, blocking_reasons: [] };
}

// ── Architecture completion builder ──────────────────────────────

export interface CoinetArchitectureCompletionInput {
  readonly ratification?: L14LayerRatificationArtifact;
  readonly upstream_ratification_refs: readonly string[];
  readonly upstream_fingerprints_satisfied: boolean;
}

export interface CoinetArchitectureCompletionResult {
  readonly artifact?: CoinetArchitectureCompletionArtifact;
  readonly blocked: boolean;
  readonly blocking_reasons: readonly string[];
  readonly status: CoinetArchitectureCompletionStatus;
}

export function emitCoinetArchitectureCompletionArtifact(
  input: CoinetArchitectureCompletionInput,
): CoinetArchitectureCompletionResult {
  const reasons: string[] = [];
  let status: CoinetArchitectureCompletionStatus;
  if (!input.ratification) {
    status = CoinetArchitectureCompletionStatus.NOT_COMPLETE;
    reasons.push('RATIFICATION_ARTIFACT_MISSING');
    return { blocked: true, blocking_reasons: reasons, status };
  }
  if (!input.upstream_fingerprints_satisfied) {
    status = CoinetArchitectureCompletionStatus.NOT_COMPLETE;
    reasons.push('UPSTREAM_FINGERPRINTS_NOT_SATISFIED');
    return { blocked: true, blocking_reasons: reasons, status };
  }
  if (!input.ratification.freeze_activated) {
    status = CoinetArchitectureCompletionStatus.L14_GREEN_BUT_NOT_FROZEN;
    reasons.push('FREEZE_NOT_ACTIVATED');
    return { blocked: true, blocking_reasons: reasons, status };
  }
  if (!input.ratification.rollout_approved) {
    status = CoinetArchitectureCompletionStatus.L14_FROZEN_BUT_ROLLOUT_BLOCKED;
    reasons.push('ROLLOUT_NOT_APPROVED');
    return { blocked: true, blocking_reasons: reasons, status };
  }
  if (input.ratification.certification_level !== L14CertificationLevel.ARCHITECTURE_COMPLETE &&
      input.ratification.certification_level !== L14CertificationLevel.FROZEN_LIVE) {
    status = CoinetArchitectureCompletionStatus.L14_GREEN_BUT_NOT_FROZEN;
    reasons.push('CERTIFICATION_LEVEL_INSUFFICIENT');
    return { blocked: true, blocking_reasons: reasons, status };
  }
  status = CoinetArchitectureCompletionStatus.COMPLETE_14_LAYER_ARCHITECTURE;
  const combined = `l14.fp.architecture.${fnv1a([
    input.ratification.combined_fingerprint,
    input.upstream_ratification_refs.slice().sort().join(','),
    POLICY_V,
  ].join('|'))}`;
  const replayHash = fnv1a([
    input.ratification.ratification_artifact_id,
    input.upstream_ratification_refs.slice().sort().join(','),
    combined, POLICY_V,
  ].join('|'));
  const artifact: CoinetArchitectureCompletionArtifact = {
    architecture_completion_artifact_id: `l14.final.architecture.${replayHash}`,
    architecture_name: 'COINET_14_LAYER_INTELLIGENCE_ARCHITECTURE',
    completion_status: status,
    terminal_layer_ratification_ref: input.ratification.ratification_artifact_id,
    upstream_ratification_refs: input.upstream_ratification_refs,
    total_layers_declared: 14,
    terminal_layer: 'L14',
    final_operational_claim: COINET_FINAL_OPERATIONAL_CLAIM,
    combined_architecture_fingerprint: combined,
    lineage_refs: ['l14.final.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
  return { artifact, blocked: false, blocking_reasons: [], status };
}

// ── Helpers ──────────────────────────────────────────────────────

export function buildSublayerSnapshot(input: {
  sublayer_id: L14SublayerId;
  passed_assertions: number;
  failed_assertions: number;
  certification_script_ref: string;
  fingerprint_ref?: string;
}): L14SublayerCertificationSnapshot {
  return {
    sublayer_id: input.sublayer_id,
    passed_assertions: input.passed_assertions,
    failed_assertions: input.failed_assertions,
    sublayer_green: input.failed_assertions === 0 && input.passed_assertions > 0,
    certification_script_ref: input.certification_script_ref,
    fingerprint_ref: input.fingerprint_ref ?? `l14.fp.${input.sublayer_id}.${fnv1a([input.sublayer_id, String(input.passed_assertions), String(input.failed_assertions), POLICY_V].join('|'))}`,
    lineage_refs: ['l14.final.lineage'],
  };
}

export function buildBandSnapshot(input: {
  band: L14CertificationBand;
  passed_assertions: number;
  failed_assertions: number;
  linked_sublayers: readonly L14SublayerId[];
}): L14BandCertificationSnapshot {
  const green = input.failed_assertions === 0 && input.passed_assertions > 0;
  return {
    band: input.band,
    passed_assertions: input.passed_assertions,
    failed_assertions: input.failed_assertions,
    green,
    blocking: !green,
    linked_sublayers: input.linked_sublayers,
    lineage_refs: ['l14.final.lineage'],
  };
}
