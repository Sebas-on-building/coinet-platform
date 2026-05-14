/**
 * L12.7 — Completion Standard Validator (§12.7.15)
 *
 * Pure validator. Never mutates the standard. Never grants
 * "satisfied" if any required certification / band / invariant is
 * missing.
 */

import {
  L12CompletionStandard,
  L12CompletionStandardReport,
  L12SublayerCertificationStatus,
  L12_COMPLETION_STANDARD_V1,
} from '../contracts/l12-completion-standard';
import {
  L12CertificationBand,
  ALL_L12_CERTIFICATION_BANDS,
} from '../certification/l12-certification-band';
import {
  L12FinalViolationCode,
  L12FinalViolationIssue,
  makeL12FinalIssue,
} from './l12-final-violation-codes';

export interface L12CompletionStandardValidatorInput {
  readonly standard: L12CompletionStandard;
  readonly sublayer_statuses:
    readonly L12SublayerCertificationStatus[];
  readonly band_passed: Readonly<Partial<Record<L12CertificationBand, boolean>>>;
  readonly invariants_held: Readonly<Record<string, boolean>>;
  readonly critical_breach_count: number;
  readonly prediction_theater_breach_count: number;
  readonly recommendation_leak_count: number;
  readonly final_judgment_leak_count: number;
  readonly lower_layer_rebuild_breach_count: number;
  readonly l5_persistence_green: boolean;
  readonly replay_green: boolean;
  readonly repair_green: boolean;
  readonly downstream_no_rebuild_green: boolean;
}

export interface L12CompletionStandardValidationResult {
  readonly issues: readonly L12FinalViolationIssue[];
  readonly report: L12CompletionStandardReport;
}

export function validateL12CompletionStandard(
  input: L12CompletionStandardValidatorInput,
): L12CompletionStandardValidationResult {
  const issues: L12FinalViolationIssue[] = [];
  const std = input?.standard ?? L12_COMPLETION_STANDARD_V1;

  if (!input?.sublayer_statuses) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_SUBLAYER_CERTIFICATION_MISSING,
      'sublayer_statuses missing'));
  }

  // Required sublayer certifications must all be green.
  const seenSublayers = new Set(
    (input?.sublayer_statuses ?? []).map(s => s.sublayer));
  for (const req of std.required_sublayer_certifications) {
    if (!seenSublayers.has(req.sublayer)) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_SUBLAYER_CERTIFICATION_MISSING,
        `${req.sublayer} certification missing`,
        req.required_suite_id));
    }
  }
  for (const s of input?.sublayer_statuses ?? []) {
    if (!s.green) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_COMPLETION_CLAUSE_UNSATISFIED,
        `${s.sublayer} sublayer not green: ${s.evidence}`,
        s.suite_id));
    }
  }

  // Required bands must all be passing.
  for (const b of std.required_certification_bands) {
    if (input?.band_passed?.[b] !== true) {
      if (!(b in (input?.band_passed ?? {}))) {
        issues.push(makeL12FinalIssue(
          L12FinalViolationCode.L12F_CERTIFICATION_BAND_MISSING,
          `band ${b} missing`));
      } else {
        issues.push(makeL12FinalIssue(
          L12FinalViolationCode.L12F_CERTIFICATION_BAND_FAILED,
          `band ${b} not passing`));
      }
    }
  }
  // Coverage law: every registered band must appear in band_passed.
  for (const b of ALL_L12_CERTIFICATION_BANDS) {
    if (!(b in (input?.band_passed ?? {}))) {
      // already covered above, but enforce once.
    }
  }

  // Required invariants must all be held.
  for (const inv of std.required_invariants) {
    if (!(inv in (input?.invariants_held ?? {}))) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_INVARIANT_MISSING,
        `invariant ${inv} missing`));
    } else if (input.invariants_held[inv] !== true) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_INVARIANT_FAILED,
        `invariant ${inv} not held`));
    }
  }

  // Tolerances are zero by contract.
  if (input.critical_breach_count > std.critical_breach_tolerance) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_CRITICAL_BREACH_PRESENT,
      `${input.critical_breach_count} critical breach(es); tolerance=${std.critical_breach_tolerance}`));
  }
  if (input.prediction_theater_breach_count >
      std.prediction_theater_tolerance) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_PREDICTION_THEATER_BREACH,
      `${input.prediction_theater_breach_count} prediction theater breach(es)`));
  }
  if (input.recommendation_leak_count > std.recommendation_leak_tolerance) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_RECOMMENDATION_LEAK,
      `${input.recommendation_leak_count} recommendation leak(s)`));
  }
  if (input.final_judgment_leak_count > std.final_judgment_leak_tolerance) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FINAL_JUDGMENT_LEAK,
      `${input.final_judgment_leak_count} final judgment leak(s)`));
  }
  if (input.lower_layer_rebuild_breach_count >
      std.lower_layer_rebuild_tolerance) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_LOWER_LAYER_REBUILD_ALLOWED,
      `${input.lower_layer_rebuild_breach_count} lower-layer rebuild breach(es)`));
  }

  if (std.requires_l5_persistence_green && !input.l5_persistence_green) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_L5_PERSISTENCE_LAW_NOT_CERTIFIED,
      'L5 persistence not green'));
  }
  if (std.requires_replay_green && !input.replay_green) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_REPLAY_LAW_NOT_CERTIFIED,
      'replay law not green'));
  }
  if (std.requires_repair_green && !input.repair_green) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_REPAIR_LAW_NOT_CERTIFIED,
      'repair law not green'));
  }
  if (std.requires_downstream_no_rebuild_green &&
      !input.downstream_no_rebuild_green) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_LOWER_LAYER_REBUILD_ALLOWED,
      'downstream no-rebuild law not green'));
  }

  const report: L12CompletionStandardReport = {
    completion_standard_id: std.completion_standard_id,
    all_satisfied: issues.length === 0,
    sublayer_statuses: input?.sublayer_statuses ?? [],
    missing_invariants: std.required_invariants
      .filter(i => input?.invariants_held?.[i] !== true),
    failing_bands: std.required_certification_bands
      .filter(b => input?.band_passed?.[b] !== true),
    critical_breach_count: input.critical_breach_count,
    policy_version: std.policy_version,
  };

  return { issues, report };
}
