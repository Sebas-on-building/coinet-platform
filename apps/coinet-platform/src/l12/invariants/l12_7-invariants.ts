/**
 * L12.7 — Final Ratification Invariants (§12.7.18)
 *
 *   INV-12.7-A — sublayer completion law
 *   INV-12.7-B — certification band law
 *   INV-12.7-C — trigger / invalidation closure law
 *   INV-12.7-D — non-prediction closure law
 *   INV-12.7-E — L11 score-context closure law
 *   INV-12.7-F — persistence / replay / repair closure law
 *   INV-12.7-G — downstream no-rebuild closure law
 *   INV-12.7-H — ratification artifact law
 *   INV-12.7-I — extension safety law
 *   INV-12.7-J — final done-definition law
 */

import {
  L12LayerRatificationArtifact,
  isL12RatificationArtifactStructurallyComplete,
} from '../contracts/l12-ratification-artifact';
import {
  L12CertificationLevel,
} from '../certification/l12-certification-level';
import {
  L12CertificationBand,
  ALL_L12_CERTIFICATION_BANDS,
} from '../certification/l12-certification-band';
import {
  L12CertificationReport,
} from '../certification/l12-certification-report';
import {
  L12FreezeClass,
  L12FreezePolicy,
} from '../contracts/l12-freeze-policy';
import {
  L12DownstreamDependencyContract,
  L12ProhibitedDownstreamPattern,
  isL12DownstreamDependencyContractValid,
} from '../contracts/l12-downstream-dependency';
import {
  L12ExtensionAssessment,
  L12ExtensionClassification,
} from '../contracts/l12-extension-policy';
import {
  L12SublayerId,
  L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
} from '../contracts/l12-final-definition';
import {
  L12FinalCapabilityGroup,
  ALL_L12_FINAL_CAPABILITY_GROUPS,
} from '../contracts/l12-final-definition';

const POLICY = 'l12.7.invariants.v1';

export interface L12_7InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function pass(id: string, name: string, evidence: string): L12_7InvariantResult {
  return { id, name, holds: true, evidence };
}
function fail(id: string, name: string, evidence: string): L12_7InvariantResult {
  return { id, name, holds: false, evidence };
}

// ─── INV-12.7-A — sublayer completion law ─────────────────────────

export interface L12_7AInput {
  readonly sublayer_green:
    Readonly<Partial<Record<L12SublayerId, boolean>>>;
}

export function invariantL12_7_A_sublayerCompletion(
  input: L12_7AInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-A';
  const NAME = 'sublayer completion law';
  for (const s of L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION) {
    if (input.sublayer_green[s] !== true) {
      return fail(ID, NAME, `${s} not green`);
    }
  }
  return pass(ID, NAME,
    `all required sublayers L12.1..L12.6 green ` +
    `(${L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION.length})`);
}

// ─── INV-12.7-B — certification band law ──────────────────────────

export interface L12_7BInput {
  readonly band_green:
    Readonly<Partial<Record<L12CertificationBand, boolean>>>;
  readonly critical_breach_count: number;
}

export function invariantL12_7_B_certificationBand(
  input: L12_7BInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-B';
  const NAME = 'certification band law';
  if (input.critical_breach_count > 0) {
    return fail(ID, NAME,
      `${input.critical_breach_count} critical breach(es) present`);
  }
  for (const b of ALL_L12_CERTIFICATION_BANDS) {
    if (input.band_green[b] !== true) {
      return fail(ID, NAME, `band ${b} not green`);
    }
  }
  return pass(ID, NAME,
    `all ${ALL_L12_CERTIFICATION_BANDS.length} bands green; 0 critical breaches`);
}

// ─── INV-12.7-C — trigger / invalidation closure law ──────────────

export interface L12_7CInput {
  readonly trigger_law_certified: boolean;
  readonly invalidation_law_certified: boolean;
  readonly confidence_cap_law_certified: boolean;
}

export function invariantL12_7_C_triggerInvalidationClosure(
  input: L12_7CInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-C';
  const NAME = 'trigger / invalidation closure law';
  if (!input.trigger_law_certified) {
    return fail(ID, NAME, 'trigger law not certified');
  }
  if (!input.invalidation_law_certified) {
    return fail(ID, NAME, 'invalidation law not certified');
  }
  if (!input.confidence_cap_law_certified) {
    return fail(ID, NAME, 'confidence cap law not certified');
  }
  return pass(ID, NAME,
    'trigger / invalidation / confidence-cap law all certified green');
}

// ─── INV-12.7-D — non-prediction closure law ──────────────────────

export interface L12_7DInput {
  readonly prediction_theater_breach_count: number;
  readonly recommendation_leak_count: number;
  readonly final_judgment_leak_count: number;
  readonly trade_action_leak_count: number;
}

export function invariantL12_7_D_nonPredictionClosure(
  input: L12_7DInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-D';
  const NAME = 'non-prediction closure law';
  if (input.prediction_theater_breach_count > 0) {
    return fail(ID, NAME,
      `${input.prediction_theater_breach_count} prediction theater breach(es)`);
  }
  if (input.recommendation_leak_count > 0) {
    return fail(ID, NAME,
      `${input.recommendation_leak_count} recommendation leak(s)`);
  }
  if (input.final_judgment_leak_count > 0) {
    return fail(ID, NAME,
      `${input.final_judgment_leak_count} final judgment leak(s)`);
  }
  if (input.trade_action_leak_count > 0) {
    return fail(ID, NAME,
      `${input.trade_action_leak_count} trade-action leak(s)`);
  }
  return pass(ID, NAME,
    'no prediction / recommendation / final-judgment / trade-action leakage');
}

// ─── INV-12.7-E — L11 score-context closure law ───────────────────

export interface L12_7EInput {
  readonly naked_score_consumption_rejected: boolean;
  readonly l11_score_context_bundle_certified: boolean;
  readonly attribution_required_certified: boolean;
  readonly drift_required_certified: boolean;
  readonly visibility_required_certified: boolean;
  readonly score_restrictions_required_certified: boolean;
  readonly l11_replay_lineage_required_certified: boolean;
}

export function invariantL12_7_E_l11ScoreContextClosure(
  input: L12_7EInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-E';
  const NAME = 'L11 score-context closure law';
  if (!input.naked_score_consumption_rejected) {
    return fail(ID, NAME, 'naked score consumption not rejected');
  }
  if (!input.l11_score_context_bundle_certified) {
    return fail(ID, NAME, 'L11 score-context bundle not certified');
  }
  if (!input.attribution_required_certified) {
    return fail(ID, NAME, 'attribution requirement not certified');
  }
  if (!input.drift_required_certified) {
    return fail(ID, NAME, 'drift requirement not certified');
  }
  if (!input.visibility_required_certified) {
    return fail(ID, NAME, 'visibility requirement not certified');
  }
  if (!input.score_restrictions_required_certified) {
    return fail(ID, NAME, 'score restrictions not certified');
  }
  if (!input.l11_replay_lineage_required_certified) {
    return fail(ID, NAME, 'L11 replay/lineage requirement not certified');
  }
  return pass(ID, NAME,
    'L11 full score-context bundle (attribution + drift + visibility + ' +
    'restrictions + replay/lineage) certified');
}

// ─── INV-12.7-F — persistence / replay / repair closure law ───────

export interface L12_7FInput {
  readonly l5_only_persistence_certified: boolean;
  readonly replay_safety_certified: boolean;
  readonly repair_safety_certified: boolean;
}

export function invariantL12_7_F_persistenceReplayRepairClosure(
  input: L12_7FInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-F';
  const NAME = 'persistence / replay / repair closure law';
  if (!input.l5_only_persistence_certified) {
    return fail(ID, NAME, 'L5-only persistence not certified');
  }
  if (!input.replay_safety_certified) {
    return fail(ID, NAME, 'replay safety not certified');
  }
  if (!input.repair_safety_certified) {
    return fail(ID, NAME, 'repair safety not certified');
  }
  return pass(ID, NAME,
    'L5-only persistence + replay safety + repair safety certified');
}

// ─── INV-12.7-G — downstream no-rebuild closure law ───────────────

export interface L12_7GInput {
  readonly contract: L12DownstreamDependencyContract;
  readonly l13_handoff_approved: boolean;
}

export function invariantL12_7_G_downstreamNoRebuildClosure(
  input: L12_7GInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-G';
  const NAME = 'downstream no-rebuild closure law';
  const v = isL12DownstreamDependencyContractValid(input.contract);
  if (!v.ok) return fail(ID, NAME, v.reason);

  const required: readonly L12ProhibitedDownstreamPattern[] = [
    L12ProhibitedDownstreamPattern.REBUILD_SCENARIO_FROM_LOWER_LAYERS,
    L12ProhibitedDownstreamPattern.RECOMPUTE_BASE_CASE_FROM_L7_TO_L11,
    L12ProhibitedDownstreamPattern.REBUILD_TRIGGERS_FROM_L7_TO_L11,
    L12ProhibitedDownstreamPattern.REBUILD_INVALIDATIONS_FROM_L7_TO_L11,
    L12ProhibitedDownstreamPattern.IGNORE_INVALIDATIONS,
    L12ProhibitedDownstreamPattern.IGNORE_PATH_CONFIDENCE,
    L12ProhibitedDownstreamPattern.IGNORE_RESTRICTIONS,
    L12ProhibitedDownstreamPattern
      .TREAT_SCENARIO_AS_FINAL_JUDGMENT_WITHOUT_L13_LAYER,
    L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_RECOMMENDATION,
    L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_TRADE_INSTRUCTION,
    L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_PREDICTION_CERTAINTY,
  ];
  const missing = required.filter(p =>
    !input.contract.prohibited_consumption_patterns.includes(p));
  if (missing.length > 0) {
    return fail(ID, NAME,
      `dependency contract missing forbidden patterns: ${missing.join(', ')}`);
  }
  if (!input.l13_handoff_approved) {
    return fail(ID, NAME, 'L13 handoff not approved');
  }
  return pass(ID, NAME,
    'dependency contract bans all rebuild patterns; L13 handoff approved under no-rebuild law');
}

// ─── INV-12.7-H — ratification artifact law ───────────────────────

export interface L12_7HInput {
  readonly artifact: L12LayerRatificationArtifact;
}

export function invariantL12_7_H_ratificationArtifact(
  input: L12_7HInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-H';
  const NAME = 'ratification artifact law';
  const a = input.artifact;
  const c = isL12RatificationArtifactStructurallyComplete(a);
  if (!c.ok) return fail(ID, NAME, c.reason);

  if (a.certification_level !== L12CertificationLevel.PRODUCTION_GREEN
      && a.certification_level !== L12CertificationLevel.FROZEN_LIVE) {
    return fail(ID, NAME,
      `certification_level=${a.certification_level} below PRODUCTION_GREEN`);
  }
  if (a.critical_breach_count !== 0) {
    return fail(ID, NAME,
      `critical_breach_count=${a.critical_breach_count} (must be 0)`);
  }
  if (!a.rollout_recommended) {
    return fail(ID, NAME, 'rollout not recommended');
  }
  if (!a.l13_dependency_approved) {
    return fail(ID, NAME, 'L13 dependency not approved');
  }
  if (!a.combined_layer_fingerprint) {
    return fail(ID, NAME, 'combined_layer_fingerprint missing');
  }
  if (!a.replay_hash) {
    return fail(ID, NAME, 'replay_hash missing');
  }
  if (a.frozen_contract_surfaces.length === 0
      || a.frozen_runtime_surfaces.length === 0
      || a.frozen_persistence_surfaces.length === 0
      || a.frozen_read_surfaces.length === 0) {
    return fail(ID, NAME, 'one or more frozen surface arrays empty');
  }
  return pass(ID, NAME,
    `artifact fingerprint=${a.combined_layer_fingerprint}; production-green; rollout + L13 approved`);
}

// ─── INV-12.7-I — extension safety law ────────────────────────────

export interface L12_7IInput {
  readonly assessments: readonly L12ExtensionAssessment[];
}

export function invariantL12_7_I_extensionSafety(
  input: L12_7IInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-I';
  const NAME = 'extension safety law';
  for (const a of input.assessments ?? []) {
    if (!a.final_classification) {
      return fail(ID, NAME,
        `extension ${a.extension_request_id} unclassified`);
    }
    if (a.final_classification === L12ExtensionClassification.PROHIBITED
        && a.admitted) {
      return fail(ID, NAME,
        `extension ${a.extension_request_id} admitted as PROHIBITED`);
    }
    for (const v of a.violation_codes ?? []) {
      if (v === 'L12F_WEAKENS_TRIGGER_REQUIREMENT' ||
          v === 'L12F_WEAKENS_INVALIDATION_REQUIREMENT' ||
          v === 'L12F_WEAKENS_NO_REBUILD_LAW') {
        if (a.admitted) {
          return fail(ID, NAME,
            `extension ${a.extension_request_id} admitted with weakening (${v})`);
        }
      }
    }
  }
  return pass(ID, NAME,
    `${(input.assessments ?? []).length} extension assessments classified; ` +
    'no PROHIBITED admitted; no trigger / invalidation / no-rebuild weakening admitted');
}

// ─── INV-12.7-J — final done-definition law ───────────────────────

export interface L12_7JInput {
  readonly capability_group_satisfied:
    Readonly<Partial<Record<L12FinalCapabilityGroup, boolean>>>;
  readonly artifact: L12LayerRatificationArtifact;
  readonly freeze_policy: L12FreezePolicy;
  readonly certification_report: L12CertificationReport;
}

export function invariantL12_7_J_finalDoneDefinition(
  input: L12_7JInput,
): L12_7InvariantResult {
  const ID = 'INV-12.7-J';
  const NAME = 'final done-definition law';
  for (const g of ALL_L12_FINAL_CAPABILITY_GROUPS) {
    if (input.capability_group_satisfied[g] !== true) {
      return fail(ID, NAME, `capability group ${g} not satisfied`);
    }
  }
  if (input.artifact.certification_level !==
      L12CertificationLevel.PRODUCTION_GREEN
      && input.artifact.certification_level !==
        L12CertificationLevel.FROZEN_LIVE) {
    return fail(ID, NAME,
      `artifact level=${input.artifact.certification_level} not production-green`);
  }
  if (input.artifact.certification_level ===
      L12CertificationLevel.FROZEN_LIVE
      && input.freeze_policy.freeze_class !== L12FreezeClass.FULL_LAYER_FROZEN) {
    return fail(ID, NAME,
      `FROZEN_LIVE requires freeze_class=FULL_LAYER_FROZEN, got ${input.freeze_policy.freeze_class}`);
  }
  if (input.certification_report.critical_breach_count > 0) {
    return fail(ID, NAME,
      `report has ${input.certification_report.critical_breach_count} critical breach(es)`);
  }
  if (input.certification_report.failed_assertions > 0) {
    return fail(ID, NAME,
      `report has ${input.certification_report.failed_assertions} failed assertion(s)`);
  }
  return pass(ID, NAME,
    'all capability groups satisfied; artifact production-green; ' +
    'freeze policy aligned; report 0 failed assertions');
}

export function runAllL12_7Invariants(args: {
  sublayer_green:
    Readonly<Partial<Record<L12SublayerId, boolean>>>;
  band_green:
    Readonly<Partial<Record<L12CertificationBand, boolean>>>;
  critical_breach_count: number;

  trigger_law_certified: boolean;
  invalidation_law_certified: boolean;
  confidence_cap_law_certified: boolean;

  prediction_theater_breach_count: number;
  recommendation_leak_count: number;
  final_judgment_leak_count: number;
  trade_action_leak_count: number;

  l11_inputs: L12_7EInput;
  persistence_inputs: L12_7FInput;

  dependency_contract: L12DownstreamDependencyContract;
  l13_handoff_approved: boolean;

  artifact: L12LayerRatificationArtifact;
  extension_assessments: readonly L12ExtensionAssessment[];

  capability_group_satisfied:
    Readonly<Partial<Record<L12FinalCapabilityGroup, boolean>>>;
  freeze_policy: L12FreezePolicy;
  certification_report: L12CertificationReport;
}): readonly L12_7InvariantResult[] {
  return [
    invariantL12_7_A_sublayerCompletion({
      sublayer_green: args.sublayer_green,
    }),
    invariantL12_7_B_certificationBand({
      band_green: args.band_green,
      critical_breach_count: args.critical_breach_count,
    }),
    invariantL12_7_C_triggerInvalidationClosure({
      trigger_law_certified: args.trigger_law_certified,
      invalidation_law_certified: args.invalidation_law_certified,
      confidence_cap_law_certified: args.confidence_cap_law_certified,
    }),
    invariantL12_7_D_nonPredictionClosure({
      prediction_theater_breach_count: args.prediction_theater_breach_count,
      recommendation_leak_count: args.recommendation_leak_count,
      final_judgment_leak_count: args.final_judgment_leak_count,
      trade_action_leak_count: args.trade_action_leak_count,
    }),
    invariantL12_7_E_l11ScoreContextClosure(args.l11_inputs),
    invariantL12_7_F_persistenceReplayRepairClosure(args.persistence_inputs),
    invariantL12_7_G_downstreamNoRebuildClosure({
      contract: args.dependency_contract,
      l13_handoff_approved: args.l13_handoff_approved,
    }),
    invariantL12_7_H_ratificationArtifact({ artifact: args.artifact }),
    invariantL12_7_I_extensionSafety({
      assessments: args.extension_assessments,
    }),
    invariantL12_7_J_finalDoneDefinition({
      capability_group_satisfied: args.capability_group_satisfied,
      artifact: args.artifact,
      freeze_policy: args.freeze_policy,
      certification_report: args.certification_report,
    }),
  ];
}

void POLICY;
