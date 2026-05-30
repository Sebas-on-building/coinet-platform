/**
 * L13.12 — Final / Freeze / Rollout / Handoff Validators
 *
 * §13.12.19 — Per-shape validators for the closure artifacts.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13CertificationLevel } from '../contracts/l13-final-definition';
import type { L13CompletionStandard } from '../contracts/l13-completion-standard';
import type { L13CertificationReport } from '../contracts/l13-certification-report';
import type { L13LayerRatificationArtifact } from '../contracts/l13-ratification-artifact';
import {
  L13ExtensionClassification,
  L13FreezeClass,
  type L13ExtensionPolicy,
  type L13FreezePolicy,
} from '../contracts/l13-freeze-policy';
import {
  L13DownstreamProhibitedAction,
  type L13DownstreamDependencyContract,
} from '../contracts/l13-downstream-dependency';
import {
  L13RolloutDecision,
  type L13RolloutGateResult,
} from '../contracts/l13-rollout';
import { L13FinalViolationCode } from './l13-final-violation-codes';

const SEV = L13ViolationSeverity;
const C = L13FinalViolationCode;

export interface L13FinalIssue {
  readonly code: L13FinalViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
}

export interface L13FinalValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13FinalIssue[];
}

function result(issues: readonly L13FinalIssue[]): L13FinalValidationResult {
  return { clean: issues.length === 0, issues };
}

export function validateL13CompletionStandard(
  s: L13CompletionStandard,
): L13FinalValidationResult {
  const issues: L13FinalIssue[] = [];
  if (!s.completion_standard_id) {
    issues.push({ code: C.L13F_COMPLETION_STANDARD_MISSING, severity: SEV.CRITICAL, message: 'completion_standard_id missing' });
  }
  if (!s.replay_hash) {
    issues.push({ code: C.L13F_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'completion standard replay_hash missing' });
  }
  if (s.required_sublayers_green.length !== 12) {
    issues.push({ code: C.L13F_COMPLETION_STANDARD_MISSING, severity: SEV.CRITICAL, message: 'completion standard must require all 12 sublayers green' });
  }
  return result(issues);
}

export function validateL13CertificationReport(
  r: L13CertificationReport,
): L13FinalValidationResult {
  const issues: L13FinalIssue[] = [];
  if (!r.certification_report_id) {
    issues.push({ code: C.L13F_CERTIFICATION_REPORT_MISSING, severity: SEV.CRITICAL, message: 'certification_report_id missing' });
  }
  if (!r.replay_hash) {
    issues.push({ code: C.L13F_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'report replay_hash missing' });
  }
  if (r.lineage_refs.length === 0) {
    issues.push({ code: C.L13F_LINEAGE_MISSING, severity: SEV.ERROR, message: 'report lineage_refs empty' });
  }
  if (
    r.certification_level === L13CertificationLevel.FROZEN_LIVE &&
    (!r.all_sublayers_green || !r.all_bands_green || !r.all_final_invariants_green)
  ) {
    issues.push({ code: C.L13F_CERTIFICATION_LEVEL_ILLEGAL, severity: SEV.CRITICAL, message: 'FROZEN_LIVE requires every green flag' });
  }
  if (r.critical_violation_count !== 0) {
    issues.push({ code: C.L13F_CRITICAL_VIOLATION_COUNT_NONZERO, severity: SEV.CRITICAL, message: `critical_violation_count=${r.critical_violation_count}` });
  }
  if (r.rollout_blocking_regression_count !== 0) {
    issues.push({ code: C.L13F_ROLLOUT_BLOCKING_REGRESSION_NONZERO, severity: SEV.CRITICAL, message: `rollout_blocking_regression_count=${r.rollout_blocking_regression_count}` });
  }
  // Each required-band entry must be green if rollout is recommended.
  if (r.rollout_recommended && r.band_results.some(b => !b.green)) {
    issues.push({ code: C.L13F_REQUIRED_BAND_NOT_GREEN, severity: SEV.CRITICAL, message: 'rollout_recommended but a band is not green' });
  }
  // Final invariants green-flag must agree with per-result aggregation.
  const computed = r.final_invariant_results.every(i => i.holds);
  if (computed !== r.all_final_invariants_green) {
    issues.push({ code: C.L13F_FINAL_INVARIANT_NOT_GREEN, severity: SEV.CRITICAL, message: 'all_final_invariants_green inconsistent with per-result holds' });
  }
  return result(issues);
}

export function validateL13RatificationArtifact(
  a: L13LayerRatificationArtifact,
): L13FinalValidationResult {
  const issues: L13FinalIssue[] = [];
  if (!a.ratification_artifact_id) {
    issues.push({ code: C.L13F_RATIFICATION_ARTIFACT_MISSING, severity: SEV.CRITICAL, message: 'ratification_artifact_id missing' });
  }
  if (!a.combined_layer_fingerprint) {
    issues.push({ code: C.L13F_RATIFICATION_FINGERPRINT_MISSING, severity: SEV.CRITICAL, message: 'combined_layer_fingerprint missing' });
  }
  if (!a.replay_hash) {
    issues.push({ code: C.L13F_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'ratification replay_hash missing' });
  }
  if (
    a.certification_level === L13CertificationLevel.FROZEN_LIVE &&
    (!a.rollout_approved || !a.freeze_activated || !a.l14_handoff_approved ||
      !a.all_sublayers_green || !a.all_bands_green || !a.all_final_invariants_green)
  ) {
    issues.push({ code: C.L13F_RATIFICATION_EMITTED_BEFORE_GREEN, severity: SEV.CRITICAL, message: 'FROZEN_LIVE requires all approvals + green flags' });
  }
  return result(issues);
}

export function validateL13RolloutGateResult(
  g: L13RolloutGateResult,
): L13FinalValidationResult {
  const issues: L13FinalIssue[] = [];
  if (g.decision === L13RolloutDecision.APPROVED && g.blocking_reasons.length > 0) {
    issues.push({ code: C.L13F_ROLLOUT_GATE_NOT_APPROVED, severity: SEV.CRITICAL, message: 'rollout APPROVED but blocking reasons present' });
  }
  if (!g.replay_hash) {
    issues.push({ code: C.L13F_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'rollout gate replay_hash missing' });
  }
  return result(issues);
}

export function validateL13FreezePolicy(
  p: L13FreezePolicy,
): L13FinalValidationResult {
  const issues: L13FinalIssue[] = [];
  if (!p.freeze_policy_id) {
    issues.push({ code: C.L13F_FREEZE_POLICY_MISSING, severity: SEV.CRITICAL, message: 'freeze_policy_id missing' });
  }
  if (
    p.freeze_class === L13FreezeClass.FROZEN_LIVE &&
    p.frozen_surfaces.length < 12
  ) {
    issues.push({ code: C.L13F_FREEZE_ACTIVATED_WITHOUT_GREEN, severity: SEV.CRITICAL, message: 'FROZEN_LIVE without full frozen-surface coverage' });
  }
  if (!p.replay_hash) {
    issues.push({ code: C.L13F_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'freeze policy replay_hash missing' });
  }
  return result(issues);
}

export function validateL13ExtensionPolicy(
  p: L13ExtensionPolicy,
): L13FinalValidationResult {
  const issues: L13FinalIssue[] = [];
  if (
    p.classification === L13ExtensionClassification.PROHIBITED &&
    !p.rollout_blocking
  ) {
    issues.push({ code: C.L13F_PROHIBITED_EXTENSION_ALLOWED, severity: SEV.CRITICAL, message: 'PROHIBITED extension must be rollout_blocking' });
  }
  return result(issues);
}

export function validateL13L14HandoffContract(
  c: L13DownstreamDependencyContract,
): L13FinalValidationResult {
  const issues: L13FinalIssue[] = [];
  if (!c.approved) {
    issues.push({ code: C.L13F_L14_HANDOFF_NOT_APPROVED, severity: SEV.CRITICAL, message: 'L14 handoff not approved' });
  }
  if (!c.prohibited_actions.includes(L13DownstreamProhibitedAction.REBUILD_L13_OUTPUT_FROM_RAW)) {
    issues.push({ code: C.L13F_L14_REBUILD_ALLOWANCE_DETECTED, severity: SEV.CRITICAL, message: 'L14 handoff missing rebuild prohibition' });
  }
  return result(issues);
}
