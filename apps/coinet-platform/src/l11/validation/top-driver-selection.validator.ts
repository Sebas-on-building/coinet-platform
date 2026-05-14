/**
 * L11.4 — Top-Driver Selection Validator (§11.4.10)
 *
 * Verifies that top-N drivers are deterministically selected and
 * that material drivers are not hidden.
 */

import {
  L11ScoreAttribution,
  L11TopDriverSelectionPolicy,
  L11_DEFAULT_TOP_DRIVER_POLICY,
  isL11TopDriverPolicyStructurallyValid,
  L11AttributionMaterialityClass,
} from '../contracts';
import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionViolationCode,
  makeL11ScoreAttributionIssue,
} from './l11-score-attribution-violation-codes';
import {
  driverFromComponent, driverFromCap, driverFromPenalty,
  driverFromModifier, driverFromMissingData,
} from '../attribution/score-attribution-engine';
import { selectL11TopDrivers } from '../attribution/top-driver-selector';

export interface L11TopDriverSelectionValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreAttributionIssue[];
}

export interface ValidateTopDriverArgs {
  readonly attribution: L11ScoreAttribution;
  readonly policy?: L11TopDriverSelectionPolicy;
}

export function validateL11TopDriverSelection(
  args: ValidateTopDriverArgs,
): L11TopDriverSelectionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  const policy = args.policy ?? L11_DEFAULT_TOP_DRIVER_POLICY;
  const policyCheck = isL11TopDriverPolicyStructurallyValid(policy);
  if (!policyCheck.ok) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_TOP_DRIVER_POLICY_INVALID,
      policyCheck.reason));
    return { ok: false, issues };
  }

  // Reconstruct candidate drivers from contributions and re-run the
  // selector. The result must match the recorded top driver lists.
  const a = args.attribution;
  const drivers = [
    ...a.component_contributions.map(driverFromComponent),
    ...a.cap_contributions.map(driverFromCap),
    ...a.penalty_contributions.map(driverFromPenalty),
    ...a.modifier_contributions.map(driverFromModifier),
    ...a.missing_data_contributions.map(driverFromMissingData),
  ];
  const recomputed = selectL11TopDrivers(drivers, policy);
  const expectedPositive = recomputed.top_positive_drivers.map(d => d.driver_id);
  const expectedNegative = recomputed.top_negative_drivers.map(d => d.driver_id);

  if (!arraysEqual(expectedPositive, a.top_positive_driver_refs)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_TOP_DRIVER_SELECTION_NONDETERMINISTIC,
      `top_positive_driver_refs do not match deterministic selector output`,
      { attribution_id: a.attribution_id }));
  }
  if (!arraysEqual(expectedNegative, a.top_negative_driver_refs)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_TOP_DRIVER_SELECTION_NONDETERMINISTIC,
      `top_negative_driver_refs do not match deterministic selector output`,
      { attribution_id: a.attribution_id }));
  }

  // Top driver refs must reference known driver candidates
  const knownDriverIds = new Set(drivers.map(d => d.driver_id));
  for (const ref of [...a.top_positive_driver_refs, ...a.top_negative_driver_refs]) {
    if (!knownDriverIds.has(ref)) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_TOP_DRIVER_REF_UNKNOWN,
        `top driver ref ${ref} not in candidate pool`,
        { attribution_id: a.attribution_id }));
    }
  }

  // Material drivers from non-component sources must be visible
  for (const d of drivers) {
    const material =
      d.materiality_class === L11AttributionMaterialityClass.CRITICAL ||
      d.materiality_class === L11AttributionMaterialityClass.MAJOR ||
      d.materiality_class === L11AttributionMaterialityClass.MATERIAL;
    if (!material) continue;
    const visible = a.top_positive_driver_refs.includes(d.driver_id) ||
                    a.top_negative_driver_refs.includes(d.driver_id) ||
                    a.positive_driver_refs.includes(d.driver_id) ||
                    a.negative_driver_refs.includes(d.driver_id);
    if (!visible) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MATERIAL_DRIVER_HIDDEN,
        `material driver ${d.driver_id} hidden from attribution`,
        { attribution_id: a.attribution_id }));
    }
  }

  return { ok: issues.length === 0, issues };
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
