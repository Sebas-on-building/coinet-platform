/**
 * L9.5 — Change Point Validator
 *
 * §9.5.7 — Enforces materiality thresholds, legal trigger families,
 * required event anchors, and required phase bounds per change-point
 * class.
 */

import {
  L9ChangePoint,
  L9ChangePointClass,
  L9ChangePointSeverity,
} from '../contracts/change-point';
import {
  L9ChangePointTriggerFamily,
  classifyL9ChangePointMateriality,
  isL9ChangePointMaterial,
  isL9LegalChangePointTrigger,
  l9ChangePointRequiresEventAnchor,
  l9ChangePointRequiresPhaseBounds,
  materialityToSeverity,
} from '../contracts/l9-change-point-policy';
import { L9TemporalSemanticTier } from '../contracts/l9-temporal-semantics-types';
import {
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
  violation,
} from './l9-temporal-semantic-violation-codes';

export interface L9ChangePointValidationInput {
  readonly change_point: L9ChangePoint;
  readonly trigger_family: L9ChangePointTriggerFamily;
  readonly event_anchor_ref: string | null;
}

export interface L9ChangePointValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9TemporalSemanticViolation[];
}

export function validateL9ChangePoint(
  input: L9ChangePointValidationInput,
): L9ChangePointValidationResult {
  const violations: L9TemporalSemanticViolation[] = [];
  const cp = input.change_point;

  if (!isL9LegalChangePointTrigger(
    cp.change_point_class, input.trigger_family,
  )) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.CP_ILLEGAL_TRIGGER_FAMILY,
      L9TemporalSemanticTier.CHANGE_POINT,
      `trigger ${input.trigger_family} is illegal for ${cp.change_point_class}`,
    ));
  }

  if (!isL9ChangePointMaterial(
    cp.change_point_class, cp.severity_score,
  )) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.CP_SEVERITY_BELOW_MATERIALITY,
      L9TemporalSemanticTier.CHANGE_POINT,
      `severity ${cp.severity_score} below materiality threshold for ${cp.change_point_class}`,
    ));
  }

  if (l9ChangePointRequiresEventAnchor(cp.change_point_class) &&
      !input.event_anchor_ref) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.CP_MISSING_EVENT_ANCHOR,
      L9TemporalSemanticTier.CHANGE_POINT,
      `${cp.change_point_class} requires an event anchor`,
    ));
  }

  if (l9ChangePointRequiresPhaseBounds(cp.change_point_class)) {
    if (!cp.prior_phase_ref) {
      violations.push(violation(
        L9TemporalSemanticViolationCode.CP_MISSING_PRIOR_POSTURE,
        L9TemporalSemanticTier.CHANGE_POINT,
        `${cp.change_point_class} requires prior_phase_ref`,
      ));
    }
    if (!cp.next_phase_ref) {
      violations.push(violation(
        L9TemporalSemanticViolationCode.CP_MISSING_NEXT_POSTURE,
        L9TemporalSemanticTier.CHANGE_POINT,
        `${cp.change_point_class} requires next_phase_ref`,
      ));
    }
  }

  if (!cp.triggering_refs || cp.triggering_refs.length === 0) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.CP_MISSING_TRIGGERING_REFS,
      L9TemporalSemanticTier.CHANGE_POINT,
      `${cp.change_point_class} missing triggering_refs`,
    ));
  }

  // §9.5.7.3 — severity class must match score banding
  const derived = materialityToSeverity(
    classifyL9ChangePointMateriality(cp.severity_score),
  );
  if (cp.severity_class !== derived) {
    // allow coarser declarations only if higher — engine may be conservative
    const rank: Record<L9ChangePointSeverity, number> = {
      [L9ChangePointSeverity.MINOR]: 0,
      [L9ChangePointSeverity.MODERATE]: 1,
      [L9ChangePointSeverity.MAJOR]: 2,
      [L9ChangePointSeverity.DECISIVE]: 3,
    };
    if (rank[cp.severity_class] < rank[derived]) {
      violations.push(violation(
        L9TemporalSemanticViolationCode.CP_SEVERITY_CLASS_MISMATCH,
        L9TemporalSemanticTier.CHANGE_POINT,
        `severity_class=${cp.severity_class} understates score ${cp.severity_score} (should be >= ${derived})`,
      ));
    }
  }

  return { ok: violations.length === 0, violations };
}
