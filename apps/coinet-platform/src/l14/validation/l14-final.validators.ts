/**
 * L14.10 — Final Validators
 *
 * §14.10.48 — Consolidated final validators using L14F_* codes.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import {
  ALL_L14_FINAL_REQUIRED_PROPERTIES,
  ALL_L14_SUBLAYERS,
  type L14FinalDefinition,
} from '../contracts/l14-final-definition';
import {
  ALL_L14_CERTIFICATION_BANDS,
  ALL_L14_FINAL_INVARIANTS,
  L14_REQUIRED_GREEN_SUBLAYERS,
  type L14CompletionStandard,
} from '../contracts/l14-completion-standard';
import {
  L14CertificationLevel,
  type L14CertificationReport,
  type L14FinalInvariantResult,
  type L14SublayerCertificationSnapshot,
} from '../contracts/l14-certification-report';
import {
  ALL_L14_PROHIBITED_POST_FREEZE_CHANGES,
  L14ExtensionClassification,
  L14_EXTENSION_CLASSIFICATION_MAP,
  type L14ExtensionRequest,
  type L14FreezePolicy,
  type L14ProposedChangeClass,
} from '../contracts/l14-freeze-policy';
import {
  CoinetArchitectureCompletionStatus,
  type CoinetArchitectureCompletionArtifact,
  type L14LayerRatificationArtifact,
} from '../contracts/l14-ratification-artifact';
import {
  type L14FinalFailurePlaybook,
  type L14RollbackPolicy,
  type L14RolloutGateResult,
} from '../contracts/l14-rollout-gate';
import { L14FinalViolationCode as C } from './l14-final-violation-codes';

const SEV = L14ConstitutionalAuditSeverity;

export interface L14FinalIssue {
  readonly code: C;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
}

export interface L14FinalValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14FinalIssue[];
}

function result(issues: readonly L14FinalIssue[]): L14FinalValidationResult {
  return { clean: issues.length === 0, issues };
}

function err(code: C, severity: L14ConstitutionalAuditSeverity, message: string): L14FinalIssue {
  return { code, severity, message };
}

// 1. Final definition
export function validateL14FinalDefinition(d: L14FinalDefinition): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if (!d.final_definition_id) issues.push(err(C.L14F_FINAL_DEFINITION_MISSING, SEV.CRITICAL, 'final_definition_id missing'));
  if (!d.canonical_mission || d.canonical_mission.trim().length === 0) {
    issues.push(err(C.L14F_FINAL_DEFINITION_MISSING, SEV.ERROR, 'canonical_mission empty'));
  }
  if (!d.first_principle || d.first_principle.trim().length === 0) {
    issues.push(err(C.L14F_FINAL_DEFINITION_MISSING, SEV.ERROR, 'first_principle empty'));
  }
  if (d.canonical_sublayers.length !== ALL_L14_SUBLAYERS.length) {
    issues.push(err(C.L14F_FINAL_DEFINITION_MISSING, SEV.ERROR, `canonical_sublayers count mismatch: ${d.canonical_sublayers.length}`));
  }
  // Hard-pin honesty.
  if ((d.lower_layer_rebuild_allowed as unknown) !== false ||
      (d.engagement_as_truth_allowed as unknown) !== false ||
      (d.silent_auto_mutation_allowed as unknown) !== false ||
      (d.calibration_auto_apply_allowed as unknown) !== false) {
    issues.push(err(C.L14F_FINAL_DEFINITION_MISSING, SEV.CRITICAL, 'final definition honesty pin violated'));
  }
  // Required properties.
  for (const p of ALL_L14_FINAL_REQUIRED_PROPERTIES) {
    if (!d.final_required_properties.includes(p)) {
      issues.push(err(C.L14F_FINAL_DEFINITION_MISSING, SEV.ERROR, `required property missing: ${p}`));
    }
  }
  return result(issues);
}

// 2. Completion standard
export function validateL14CompletionStandard(s: L14CompletionStandard): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if (!s.completion_standard_id) issues.push(err(C.L14F_COMPLETION_STANDARD_MISSING, SEV.CRITICAL, 'completion_standard_id missing'));
  if (s.required_green_sublayers.length !== L14_REQUIRED_GREEN_SUBLAYERS.length) {
    issues.push(err(C.L14F_COMPLETION_STANDARD_MISSING, SEV.ERROR, 'required_green_sublayers count mismatch'));
  }
  if (s.required_certification_bands.length !== ALL_L14_CERTIFICATION_BANDS.length) {
    issues.push(err(C.L14F_COMPLETION_STANDARD_MISSING, SEV.ERROR, 'required_certification_bands count mismatch'));
  }
  if (s.required_final_invariants.length !== ALL_L14_FINAL_INVARIANTS.length) {
    issues.push(err(C.L14F_COMPLETION_STANDARD_MISSING, SEV.ERROR, 'required_final_invariants count mismatch'));
  }
  // Hard pins
  if ((s.zero_tolerance_critical_breaches as unknown) !== true ||
      (s.zero_tolerance_failed_final_invariants as unknown) !== true ||
      (s.zero_tolerance_failed_certification_bands as unknown) !== true ||
      (s.zero_tolerance_rollout_gate_failure as unknown) !== true ||
      (s.ratification_artifact_required as unknown) !== true ||
      (s.freeze_activation_required as unknown) !== true ||
      (s.rollout_gate_required as unknown) !== true ||
      (s.full_14_layer_architecture_completion_required as unknown) !== true) {
    issues.push(err(C.L14F_COMPLETION_STANDARD_MISSING, SEV.CRITICAL, 'completion standard hard-pin violated'));
  }
  return result(issues);
}

// 3. Certification report
export function validateL14CertificationReport(r: L14CertificationReport): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  for (const s of r.sublayer_results) {
    if (!s.sublayer_green) {
      issues.push(err(C.L14F_REQUIRED_SUBLAYER_NOT_GREEN, SEV.ERROR, `sublayer ${s.sublayer_id} not green`));
    }
  }
  for (const b of r.band_results) {
    if (!b.green) {
      issues.push(err(C.L14F_REQUIRED_BAND_NOT_GREEN, SEV.ERROR, `band ${b.band} not green`));
    }
  }
  for (const inv of r.invariant_results) {
    if (!inv.holds) {
      issues.push(err(C.L14F_FINAL_INVARIANT_FAILED, SEV.CRITICAL, `invariant ${inv.invariant_id} failed`));
    }
  }
  for (const e of r.external_regression_results) {
    if (!e.satisfied) {
      issues.push(err(C.L14F_EXTERNAL_REGRESSION_FAILED, SEV.ERROR, `external regression ${e.requirement} not satisfied`));
    }
  }
  if (r.critical_breach_count > 0) {
    issues.push(err(C.L14F_CRITICAL_BREACH_PRESENT, SEV.CRITICAL, `critical breach count ${r.critical_breach_count}`));
  }
  if (!r.final_combined_fingerprint || !r.final_combined_fingerprint.startsWith('l14.fp.')) {
    issues.push(err(C.L14F_FINAL_FINGERPRINT_UNSTABLE, SEV.ERROR, 'final fingerprint missing or malformed'));
  }
  return result(issues);
}

// 4. Certification level
export function validateL14CertificationLevel(
  level: L14CertificationLevel,
  expected: L14CertificationLevel,
): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if (level !== expected) {
    issues.push(err(C.L14F_FINAL_FINGERPRINT_UNSTABLE, SEV.CRITICAL,
      `certification level ${level} != expected ${expected}`));
  }
  return result(issues);
}

// 5. Freeze policy
export function validateL14FreezePolicy(p: L14FreezePolicy): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if (!p.freeze_activated) issues.push(err(C.L14F_FREEZE_NOT_ACTIVATED, SEV.CRITICAL, 'freeze not activated'));
  for (const r of ALL_L14_PROHIBITED_POST_FREEZE_CHANGES) {
    if (!p.prohibited_post_freeze_changes.includes(r)) {
      issues.push(err(C.L14F_PROHIBITED_POST_FREEZE_CHANGE, SEV.CRITICAL,
        `freeze policy missing prohibition: ${r}`));
    }
  }
  return result(issues);
}

// 6. Extension classification
export function validateL14ExtensionClassification(
  req: L14ExtensionRequest,
  expected: L14ExtensionClassification,
): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  const cls = L14_EXTENSION_CLASSIFICATION_MAP[req.proposed_change_class as L14ProposedChangeClass];
  if (!cls) {
    issues.push(err(C.L14F_EXTENSION_CLASSIFICATION_MISSING, SEV.ERROR, `unknown change class: ${req.proposed_change_class}`));
    return result(issues);
  }
  if (cls !== expected) {
    issues.push(err(C.L14F_EXTENSION_CLASSIFICATION_MISSING, SEV.ERROR,
      `extension classification ${cls} != expected ${expected}`));
  }
  return result(issues);
}

// 7. Rollout gate result
export function validateL14RolloutGateResult(r: L14RolloutGateResult): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  for (const c of r.gate_checks) {
    if (!c.passed && r.rollout_approved) {
      issues.push(err(C.L14F_ROLLOUT_GATE_NOT_APPROVED, SEV.CRITICAL,
        `gate check ${c.check} failed but rollout still approved`));
    }
  }
  return result(issues);
}

// 8. Rollback policy
export function validateL14RollbackPolicy(p: L14RollbackPolicy): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if ((p.may_mutate_lower_layer_truth as unknown) !== false ||
      (p.may_rewrite_history as unknown) !== false) {
    issues.push(err(C.L14F_PROHIBITED_POST_FREEZE_CHANGE, SEV.CRITICAL,
      'rollback policy honesty pin violated'));
  }
  if ((p.may_pause_external_delivery as unknown) !== true ||
      (p.may_downgrade_alert_classes_to_digest as unknown) !== true ||
      (p.may_restrict_experiments as unknown) !== true) {
    issues.push(err(C.L14F_PROHIBITED_POST_FREEZE_CHANGE, SEV.ERROR,
      'rollback policy capability pin malformed'));
  }
  return result(issues);
}

// 9. Failure playbook
export function validateL14FailurePlaybook(p: L14FinalFailurePlaybook): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if (!p.triggering_violation) {
    issues.push(err(C.L14F_PROHIBITED_POST_FREEZE_CHANGE, SEV.ERROR, 'failure playbook missing triggering violation'));
  }
  return result(issues);
}

// 10. Ratification artifact
export function validateL14RatificationArtifact(
  a: L14LayerRatificationArtifact,
): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if (a.bands_green !== a.total_bands) {
    issues.push(err(C.L14F_REQUIRED_BAND_NOT_GREEN, SEV.CRITICAL,
      `bands_green ${a.bands_green} != total_bands ${a.total_bands}`));
  }
  if (a.sublayers_green !== a.total_sublayers) {
    issues.push(err(C.L14F_REQUIRED_SUBLAYER_NOT_GREEN, SEV.CRITICAL,
      `sublayers_green ${a.sublayers_green} != total_sublayers ${a.total_sublayers}`));
  }
  if (a.final_invariants_green !== a.total_final_invariants) {
    issues.push(err(C.L14F_FINAL_INVARIANT_FAILED, SEV.CRITICAL,
      `invariants ${a.final_invariants_green} != ${a.total_final_invariants}`));
  }
  if (a.critical_breaches > 0) {
    issues.push(err(C.L14F_CRITICAL_BREACH_PRESENT, SEV.CRITICAL,
      `ratification with ${a.critical_breaches} critical breaches`));
  }
  if (!a.rollout_approved) {
    issues.push(err(C.L14F_ROLLOUT_GATE_NOT_APPROVED, SEV.CRITICAL, 'rollout not approved at ratification'));
  }
  if (!a.freeze_activated) {
    issues.push(err(C.L14F_FREEZE_NOT_ACTIVATED, SEV.CRITICAL, 'freeze not activated at ratification'));
  }
  if (!a.combined_fingerprint || !a.combined_fingerprint.startsWith('l14.fp.')) {
    issues.push(err(C.L14F_FINAL_FINGERPRINT_UNSTABLE, SEV.ERROR, 'combined fingerprint malformed'));
  }
  if (!a.upstream_dependency_fingerprints || a.upstream_dependency_fingerprints.length === 0) {
    issues.push(err(C.L14F_UPSTREAM_FINGERPRINT_MISSING, SEV.ERROR, 'upstream fingerprints missing'));
  }
  return result(issues);
}

// 11. Architecture completion artifact
export function validateL14ArchitectureCompletionArtifact(
  a: CoinetArchitectureCompletionArtifact,
): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if (a.completion_status !== CoinetArchitectureCompletionStatus.COMPLETE_14_LAYER_ARCHITECTURE) {
    issues.push(err(C.L14F_ARCHITECTURE_COMPLETION_BLOCKED, SEV.CRITICAL,
      `architecture status ${a.completion_status}`));
  }
  if (a.total_layers_declared !== 14) {
    issues.push(err(C.L14F_ARCHITECTURE_COMPLETION_BLOCKED, SEV.CRITICAL, 'total_layers_declared must be 14'));
  }
  if (a.terminal_layer !== 'L14') {
    issues.push(err(C.L14F_ARCHITECTURE_COMPLETION_BLOCKED, SEV.CRITICAL, 'terminal_layer must be L14'));
  }
  if (!a.combined_architecture_fingerprint || !a.combined_architecture_fingerprint.startsWith('l14.fp.architecture.')) {
    issues.push(err(C.L14F_FINAL_FINGERPRINT_UNSTABLE, SEV.ERROR, 'combined_architecture_fingerprint malformed'));
  }
  return result(issues);
}

// 12. Final invariant result
export function validateL14FinalInvariantResult(r: L14FinalInvariantResult): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if (!r.holds && r.blocking) {
    issues.push(err(C.L14F_FINAL_INVARIANT_FAILED, SEV.CRITICAL, `invariant ${r.invariant_id} failed`));
  }
  return result(issues);
}

// Sublayer snapshot legality
export function validateL14SublayerSnapshot(s: L14SublayerCertificationSnapshot): L14FinalValidationResult {
  const issues: L14FinalIssue[] = [];
  if (s.failed_assertions > 0 && s.sublayer_green) {
    issues.push(err(C.L14F_REQUIRED_SUBLAYER_NOT_GREEN, SEV.CRITICAL,
      `sublayer ${s.sublayer_id} green claim contradicts failed_assertions=${s.failed_assertions}`));
  }
  return result(issues);
}
