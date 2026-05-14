/**
 * L12.7 — Certification Report Validator (§12.7.6, §12.7.15)
 *
 * Pure validator. Reject incomplete reports, reject inconsistent
 * totals, reject "rollout recommended" while critical breaches
 * remain, reject "freeze recommended" without an artifact fingerprint.
 */

import {
  L12CertificationReport,
} from '../certification/l12-certification-report';
import {
  ALL_L12_CERTIFICATION_BANDS,
} from '../certification/l12-certification-band';
import { L12CertificationLevel } from '../certification/l12-certification-level';
import {
  L12FinalViolationCode,
  L12FinalViolationIssue,
  makeL12FinalIssue,
} from './l12-final-violation-codes';

export function validateL12CertificationReport(
  r: L12CertificationReport,
): readonly L12FinalViolationIssue[] {
  const issues: L12FinalViolationIssue[] = [];
  const ref = r?.certification_report_id;
  if (!r) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_RATIFICATION_ARTIFACT_INCOMPLETE,
      'certification report null'));
    return issues;
  }
  if (!r.certification_level) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_RATIFICATION_ARTIFACT_INCOMPLETE,
      'certification_level missing', ref));
  }
  if (r.layer_id !== 'L12_SCENARIO_ENGINE') {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_RATIFICATION_ARTIFACT_INCOMPLETE,
      `layer_id must be L12_SCENARIO_ENGINE (got ${r.layer_id})`, ref));
  }

  // All bands must be present.
  const seenBands = new Set(r.band_results?.map(b => b.band_id) ?? []);
  for (const b of ALL_L12_CERTIFICATION_BANDS) {
    if (!seenBands.has(b)) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_CERTIFICATION_BAND_MISSING,
        `band ${b} missing from report`, ref));
    }
  }

  // No invariant ids may be empty.
  for (const inv of r.invariant_results ?? []) {
    if (!inv.invariant_id) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_INVARIANT_MISSING,
        'invariant_id empty', ref));
    }
  }

  // Assertion totals must add up.
  const expected = r.passed_assertions + r.failed_assertions;
  if (expected !== r.total_assertions) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_RATIFICATION_ARTIFACT_INCOMPLETE,
      `total_assertions=${r.total_assertions} != passed+failed=${expected}`,
      ref));
  }

  // Critical breach must be zero for production-green / frozen.
  if ((r.certification_level === L12CertificationLevel.PRODUCTION_GREEN ||
       r.certification_level === L12CertificationLevel.FROZEN_LIVE) &&
      r.critical_breach_count > 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_CRITICAL_BREACH_PRESENT,
      `${r.certification_level} with ${r.critical_breach_count} critical breach(es)`,
      ref));
  }

  // Rollout recommended requires zero critical breaches.
  if (r.rollout_recommended && r.critical_breach_count > 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_ROLLOUT_GATE_ILLEGAL,
      'rollout_recommended=true with critical breaches', ref));
  }

  // Freeze recommended requires fingerprint ref.
  if (r.freeze_recommended && !r.artifact_fingerprint_ref) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FINGERPRINT_MISSING,
      'freeze_recommended=true without artifact_fingerprint_ref', ref));
  }

  if (!r.replay_hash) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_REPLAY_HASH_MISSING,
      'replay_hash missing', ref));
  }

  if (r.prediction_theater_breach_count > 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_PREDICTION_THEATER_BREACH,
      `${r.prediction_theater_breach_count} prediction theater breach(es)`, ref));
  }
  if (r.recommendation_leak_count > 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_RECOMMENDATION_LEAK,
      `${r.recommendation_leak_count} recommendation leak(s)`, ref));
  }
  if (r.final_judgment_leak_count > 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FINAL_JUDGMENT_LEAK,
      `${r.final_judgment_leak_count} final judgment leak(s)`, ref));
  }
  if (r.lower_layer_rebuild_breach_count > 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_LOWER_LAYER_REBUILD_ALLOWED,
      `${r.lower_layer_rebuild_breach_count} lower-layer rebuild breach(es)`, ref));
  }
  return issues;
}
