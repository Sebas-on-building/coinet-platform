/**
 * L12.7 — Freeze Policy Validator (§12.7.9, §12.7.15)
 */

import {
  L12FreezePolicy,
  L12FreezeClass,
  L12_FREEZE_POLICY_VERSION,
  ALL_L12_PROHIBITED_POST_FREEZE_CHANGES,
} from '../contracts/l12-freeze-policy';
import { L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION } from '../contracts/l12-final-definition';
import {
  L12FinalViolationCode,
  L12FinalViolationIssue,
  makeL12FinalIssue,
} from './l12-final-violation-codes';

export function validateL12FreezePolicy(
  p: L12FreezePolicy,
): readonly L12FinalViolationIssue[] {
  const issues: L12FinalViolationIssue[] = [];
  const ref = p?.freeze_policy_id;
  if (!p) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FREEZE_POLICY_INACTIVE,
      'freeze policy null'));
    return issues;
  }
  if (p.layer_id !== 'L12_SCENARIO_ENGINE') {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FREEZE_ACTIVATION_ILLEGAL,
      `layer_id must be L12_SCENARIO_ENGINE (got ${p.layer_id})`, ref));
  }
  if (!p.freeze_class) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FREEZE_ACTIVATION_ILLEGAL,
      'freeze_class missing', ref));
  }
  if (p.policy_version !== L12_FREEZE_POLICY_VERSION) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_FREEZE_ACTIVATION_ILLEGAL,
      `policy_version mismatch: got ${p.policy_version}`, ref));
  }
  // FULL_LAYER_FROZEN must enumerate all required sublayers.
  if (p.freeze_class === L12FreezeClass.FULL_LAYER_FROZEN) {
    const seen = new Set(p.frozen_sublayers);
    for (const s of L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION) {
      if (!seen.has(s)) {
        issues.push(makeL12FinalIssue(
          L12FinalViolationCode.L12F_FREEZE_ACTIVATION_ILLEGAL,
          `FULL_LAYER_FROZEN missing required sublayer ${s}`, ref));
      }
    }
    if (p.frozen_surfaces.length === 0) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_FROZEN_SURFACES_MISSING,
        'FULL_LAYER_FROZEN with empty frozen_surfaces', ref));
    }
  }
  // Prohibited list must contain at least the canonical core bans.
  const prohibitedList = new Set(p.prohibited_post_freeze_changes);
  for (const bad of ALL_L12_PROHIBITED_POST_FREEZE_CHANGES) {
    if (!prohibitedList.has(bad)) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_PROHIBITED_EXTENSION,
        `freeze policy missing prohibited entry ${bad}`, ref));
    }
  }
  return issues;
}
