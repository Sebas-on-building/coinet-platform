/**
 * L11.8 — Downstream Consumption Validator (§11.8.13 / §11.8.14)
 */

import {
  L11DownstreamConsumptionRequest,
  L11_RECOMPUTE_ALLOWED_CONSUMERS,
  L11_RECOMPUTE_ALLOWED_READ_MODES,
  L11_SCORING_SENSITIVE_USES,
  isL11DownstreamConsumptionStructurallyValid,
} from '../contracts/l11-downstream-consumption';
import {
  L11ConsumerClass,
  L11ReadSurfaceId,
} from '../contracts/l11-read-surface';
import {
  L11PersistenceViolationCode,
  L11PersistenceIssue,
  makeL11PersistenceIssue,
} from '../persistence/l11-persistence-violation-codes';
import {
  getL11ReadSurfaceDescriptor,
} from '../registry/l11-read-surface.registry';

const LATER_LAYERS: ReadonlySet<L11ConsumerClass> = new Set([
  L11ConsumerClass.L12_SCENARIO_ENGINE,
  L11ConsumerClass.L13_AI_JUDGMENT_LAYER,
  L11ConsumerClass.L14_DELIVERY_LAYER,
]);

export function validateL11DownstreamConsumption(
  r: L11DownstreamConsumptionRequest,
): L11PersistenceIssue[] {
  const issues: L11PersistenceIssue[] = [];
  const ctx = { downstream_request_id: r?.request_id };

  if (!r) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_DOWNSTREAM_REQUEST_INCOMPLETE,
      'downstream request is null/undefined'));
    return issues;
  }

  const struct = isL11DownstreamConsumptionStructurallyValid(r);
  if (!struct.ok) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_DOWNSTREAM_REQUEST_INCOMPLETE,
      struct.reason, ctx));
  }

  // Recompute attempt rules (§11.8.13.3)
  if (r.attempts_recompute) {
    if (!L11_RECOMPUTE_ALLOWED_CONSUMERS.has(r.consumer_class)) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_ATTEMPT,
        `consumer ${r.consumer_class} may not attempt score recompute`, ctx));
    }
    if (!L11_RECOMPUTE_ALLOWED_READ_MODES.has(r.read_mode)) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_NOT_REPLAY_OR_REPAIR,
        `recompute requires REPLAY_HISTORICAL or REPAIR_VIEW; got ${r.read_mode}`,
        ctx));
    }
    if (!r.recompute_reason) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_REASON_MISSING,
        'recompute_reason missing', ctx));
    }
  }

  // Score-value users must surface attribution & missing-data
  if (r.uses_score_value) {
    if (!r.requested_surfaces.includes(L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID) &&
        !r.uses_attribution) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_DOWNSTREAM_USES_SCORE_WITHOUT_ATTRIBUTION,
        'score value used without attribution surface', ctx));
    }
    if (!r.requested_surfaces.includes(L11ReadSurfaceId.SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID) &&
        !r.uses_missing_data_profile) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_DOWNSTREAM_USES_SCORE_WITHOUT_MISSING_DATA,
        'score value used without missing-data profile surface', ctx));
    }
  }

  // Scoring-sensitive use requires drift surface
  if (L11_SCORING_SENSITIVE_USES.has(r.intended_use) && !r.uses_drift_reports &&
      !r.requested_surfaces.includes(L11ReadSurfaceId.DRIFT_REPORT_BY_FORMULA_VERSION)) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_DOWNSTREAM_SCORING_USE_WITHOUT_DRIFT,
      `scoring-sensitive use ${r.intended_use} requires drift report surface`,
      ctx));
  }

  // Validate every requested surface is admissible
  for (const sid of r.requested_surfaces) {
    const desc = getL11ReadSurfaceDescriptor(sid);
    if (!desc) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_READ_SURFACE_UNREGISTERED,
        `requested read surface ${sid} not registered`, ctx));
      continue;
    }
    if (!desc.consumer_classes_allowed.includes(r.consumer_class)) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_DOWNSTREAM_CONSUMER_NOT_ALLOWED,
        `consumer ${r.consumer_class} not allowed on surface ${sid}`,
        ctx));
    }
    if (!desc.read_modes_allowed.includes(r.read_mode)) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_DOWNSTREAM_READ_MODE_NOT_ALLOWED,
        `read_mode ${r.read_mode} not allowed on surface ${sid}`,
        ctx));
    }
  }

  // Later layers may not run live recompute — additional guard
  if (LATER_LAYERS.has(r.consumer_class) && r.attempts_recompute) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_ATTEMPT,
      `later layer ${r.consumer_class} attempted recompute`, ctx));
  }

  return issues;
}
