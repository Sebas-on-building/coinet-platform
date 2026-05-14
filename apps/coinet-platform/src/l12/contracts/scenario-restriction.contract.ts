/**
 * L12.3 — Restriction contract (§12.3.12).
 */

import {
  L12ScenarioAllowedUse,
  L12ScenarioBlockedUse,
  L12ScenarioDisclosureRequirement,
} from './scenario-restriction-profile';

/** Reason codes documenting *why* a restriction was imposed. */
export enum L12ScenarioRestrictionReasonCode {
  CONSTITUTIONAL_BASELINE = 'CONSTITUTIONAL_BASELINE',
  CONTRADICTION_UNRESOLVED = 'CONTRADICTION_UNRESOLVED',
  MISSING_VISIBILITY_MATERIAL = 'MISSING_VISIBILITY_MATERIAL',
  DRIFT_MATERIAL = 'DRIFT_MATERIAL',
  DRIFT_CRITICAL = 'DRIFT_CRITICAL',
  L7_RESTRICTION_INHERITED = 'L7_RESTRICTION_INHERITED',
  L11_RESTRICTION_INHERITED = 'L11_RESTRICTION_INHERITED',
  ACTIVE_INVALIDATION = 'ACTIVE_INVALIDATION',
  CLOSE_SCENARIO_COMPETITION = 'CLOSE_SCENARIO_COMPETITION',
  INSUFFICIENT_INPUT_COMPETITION = 'INSUFFICIENT_INPUT_COMPETITION',
}

export const ALL_L12_SCENARIO_RESTRICTION_REASON_CODES: readonly L12ScenarioRestrictionReasonCode[] =
  Object.values(L12ScenarioRestrictionReasonCode);

/** Downstream consumer / scope where a scenario set may be consumed. */
export enum L12DownstreamScenarioConsumer {
  L13_JUDGMENT_LAYER = 'L13_JUDGMENT_LAYER',
  L14_DELIVERY_LAYER = 'L14_DELIVERY_LAYER',
  L15_MONITORING_LAYER = 'L15_MONITORING_LAYER',
  L16_DISCLOSURE_LAYER = 'L16_DISCLOSURE_LAYER',
  INTERNAL_AUDIT = 'INTERNAL_AUDIT',
}

export const ALL_L12_DOWNSTREAM_SCENARIO_CONSUMERS: readonly L12DownstreamScenarioConsumer[] =
  Object.values(L12DownstreamScenarioConsumer);

/** Per-consumer consumption limit. */
export interface L12DownstreamScenarioConsumptionLimit {
  readonly consumer: L12DownstreamScenarioConsumer;
  readonly allowed_uses: readonly L12ScenarioAllowedUse[];
  readonly required_disclosures: readonly L12ScenarioDisclosureRequirement[];
  readonly blocked_uses: readonly L12ScenarioBlockedUse[];
  readonly policy_version: string;
}

export interface L12RestrictionContract {
  readonly restriction_contract_id: string;

  readonly restriction_profile_id: string;
  readonly scenario_set_id: string;

  readonly allowed_uses: readonly L12ScenarioAllowedUse[];
  readonly blocked_uses: readonly L12ScenarioBlockedUse[];

  readonly required_disclosures: readonly L12ScenarioDisclosureRequirement[];

  readonly restriction_reason_codes: readonly L12ScenarioRestrictionReasonCode[];

  readonly downstream_consumption_limits: readonly L12DownstreamScenarioConsumptionLimit[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
