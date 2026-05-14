/**
 * L12.7 — Ratification Artifact Validator (§12.7.8, §12.7.15)
 */

import {
  L12LayerRatificationArtifact,
  isL12RatificationArtifactStructurallyComplete,
} from '../contracts/l12-ratification-artifact';
import { L12CertificationLevel } from '../certification/l12-certification-level';
import { L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION } from '../contracts/l12-final-definition';
import {
  L12FinalViolationCode,
  L12FinalViolationIssue,
  makeL12FinalIssue,
} from './l12-final-violation-codes';

export function validateL12RatificationArtifact(
  a: L12LayerRatificationArtifact,
): readonly L12FinalViolationIssue[] {
  const issues: L12FinalViolationIssue[] = [];
  const ref = a?.ratification_artifact_id;
  const c = isL12RatificationArtifactStructurallyComplete(a);
  if (!c.ok) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_RATIFICATION_ARTIFACT_INCOMPLETE,
      c.reason, ref));
    return issues;
  }
  // Required sublayers must be in frozen_sublayers.
  const seen = new Set(a.frozen_sublayers);
  for (const s of L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION) {
    if (!seen.has(s)) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_SUBLAYER_CERTIFICATION_MISSING,
        `frozen_sublayers missing required ${s}`, ref));
    }
  }

  // Certification level must be production-green or frozen-live for
  // a "ratifying" artifact.
  if (a.certification_level !== L12CertificationLevel.PRODUCTION_GREEN
      && a.certification_level !== L12CertificationLevel.FROZEN_LIVE) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_RATIFICATION_ARTIFACT_INCOMPLETE,
      `certification_level=${a.certification_level} is not production-green or frozen-live`,
      ref));
  }

  if (a.critical_breach_count > 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_CRITICAL_BREACH_PRESENT,
      `${a.critical_breach_count} critical breach(es) on ratification artifact`,
      ref));
  }

  // L13 dependency approved requires no-rebuild law to hold (validator
  // here only checks structural truth: artifact must claim approval
  // explicitly).
  if (!a.l13_dependency_approved) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_L13_HANDOFF_NOT_APPROVED,
      'l13_dependency_approved=false on ratification artifact', ref));
  }

  if (a.frozen_contract_surfaces.length === 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FROZEN_SURFACES_MISSING,
      'frozen_contract_surfaces empty', ref));
  }
  if (a.frozen_runtime_surfaces.length === 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FROZEN_SURFACES_MISSING,
      'frozen_runtime_surfaces empty', ref));
  }
  if (a.frozen_persistence_surfaces.length === 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FROZEN_SURFACES_MISSING,
      'frozen_persistence_surfaces empty', ref));
  }
  if (a.frozen_read_surfaces.length === 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FROZEN_SURFACES_MISSING,
      'frozen_read_surfaces empty', ref));
  }

  return issues;
}
