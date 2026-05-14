/**
 * L12.7 — L13 Handoff Validator (§12.7.11)
 *
 * Pure validator: inspects an L13+ consumption attempt and either
 * admits it (governed L12 surfaces only) or rejects it with one or
 * more L12F_ violation codes. Never grants approval if the no-rebuild
 * law is violated or any required disclosure is missing.
 */

import {
  L12DownstreamDependencyContract,
  L12ProhibitedDownstreamPattern,
  L12DownstreamDisclosureRequirement,
  isL12DownstreamDependencyContractValid,
  L12_DOWNSTREAM_DEPENDENCY_POLICY_VERSION,
} from '../contracts/l12-downstream-dependency';
import {
  L12DownstreamLayer,
  L12ScenarioDownstreamUse,
} from '../contracts/l12-downstream-consumption';
import { L12ReadSurfaceId } from '../contracts/l12-read-surface';

/** Concrete L13+ handoff request as it would arrive at runtime. */
export interface L12HandoffRequest {
  readonly handoff_request_id: string;
  readonly consumer_layer: L12DownstreamLayer;
  readonly consumed_surfaces: readonly L12ReadSurfaceId[];

  readonly attempted_use: L12ScenarioDownstreamUse;

  /** Patterns the requester admits to. */
  readonly attempted_prohibited_patterns:
    readonly L12ProhibitedDownstreamPattern[];

  /** Disclosures the requester promises to honor. */
  readonly disclosures_honored:
    readonly L12DownstreamDisclosureRequirement[];

  readonly respects_restrictions: boolean;
  readonly shows_invalidations: boolean;
  readonly shows_path_confidence: boolean;
  readonly shows_evidence: boolean;
  readonly shows_lineage: boolean;
}

export interface L12HandoffAssessment {
  readonly handoff_request_id: string;
  readonly approved: boolean;
  readonly violation_codes: readonly string[];
  readonly reason: string;
  readonly policy_version: string;
}

export function validateL12Handoff(
  contract: L12DownstreamDependencyContract,
  req: L12HandoffRequest,
): L12HandoffAssessment {
  const violations: string[] = [];

  const cv = isL12DownstreamDependencyContractValid(contract);
  if (!cv.ok) {
    violations.push('L12F_LOWER_LAYER_REBUILD_ALLOWED');
  }

  if (!req || !req.consumer_layer) {
    return {
      handoff_request_id: req?.handoff_request_id ?? '',
      approved: false,
      violation_codes: ['L12F_L13_HANDOFF_NOT_APPROVED'],
      reason: 'request null or missing consumer_layer',
      policy_version: L12_DOWNSTREAM_DEPENDENCY_POLICY_VERSION,
    };
  }

  if (!contract.allowed_consumer_layers.includes(req.consumer_layer)) {
    violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
  }

  // Any attempted prohibited pattern → rejection.
  const banned = new Set(contract.prohibited_consumption_patterns);
  for (const p of req.attempted_prohibited_patterns) {
    if (banned.has(p)) {
      switch (p) {
        case L12ProhibitedDownstreamPattern.REBUILD_SCENARIO_FROM_LOWER_LAYERS:
        case L12ProhibitedDownstreamPattern.RECOMPUTE_BASE_CASE_FROM_L7_TO_L11:
        case L12ProhibitedDownstreamPattern.REBUILD_TRIGGERS_FROM_L7_TO_L11:
        case L12ProhibitedDownstreamPattern.REBUILD_INVALIDATIONS_FROM_L7_TO_L11:
          violations.push('L12F_LOWER_LAYER_REBUILD_ALLOWED');
          break;
        case L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_RECOMMENDATION:
          violations.push('L12F_RECOMMENDATION_LEAK');
          break;
        case L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_FINAL_JUDGMENT_WITHOUT_L13_LAYER:
          violations.push('L12F_FINAL_JUDGMENT_LEAK');
          break;
        case L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_TRADE_INSTRUCTION:
        case L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_PREDICTION_CERTAINTY:
          violations.push('L12F_PREDICTION_THEATER_BREACH');
          break;
        default:
          violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
      }
    }
  }

  // Required visibility / disclosure must be honored.
  const requiredDisclosures = new Set(
    contract.required_disclosures_for_later_layers);
  const honored = new Set(req.disclosures_honored);
  for (const d of requiredDisclosures) {
    if (!honored.has(d)) {
      violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
      break;
    }
  }

  if (contract.required_restriction_respect && !req.respects_restrictions) {
    violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
  }
  if (contract.required_invalidation_visibility && !req.shows_invalidations) {
    violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
  }
  if (contract.required_path_confidence_visibility &&
      !req.shows_path_confidence) {
    violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
  }
  if (contract.required_evidence_visibility && !req.shows_evidence) {
    violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
  }
  if (contract.required_lineage_visibility && !req.shows_lineage) {
    violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
  }

  // Required surfaces must be a subset of consumed_surfaces or
  // optional surfaces. Required surfaces missing → still admit, since
  // L13 may legitimately ask for a subset; but request must consume
  // *only* allowed surfaces.
  const allowed = new Set<L12ReadSurfaceId>([
    ...contract.required_consumed_surfaces,
    ...contract.optional_consumed_surfaces,
  ]);
  for (const s of req.consumed_surfaces) {
    if (!allowed.has(s)) {
      violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
      break;
    }
  }

  // Attempted use must be in the allowed-uses set.
  if (!contract.allowed_downstream_uses.includes(req.attempted_use)) {
    if (req.attempted_use ===
        L12ScenarioDownstreamUse.JUDGMENT_SUPPORT) {
      violations.push('L12F_FINAL_JUDGMENT_LEAK');
    } else {
      violations.push('L12F_L13_HANDOFF_NOT_APPROVED');
    }
  }

  const dedup = Array.from(new Set(violations));
  const approved = dedup.length === 0;
  return {
    handoff_request_id: req.handoff_request_id,
    approved,
    violation_codes: dedup,
    reason: approved
      ? 'L13 handoff approved (no-rebuild + restrictions honored)'
      : `L13 handoff rejected: ${dedup.join(', ')}`,
    policy_version: L12_DOWNSTREAM_DEPENDENCY_POLICY_VERSION,
  };
}
