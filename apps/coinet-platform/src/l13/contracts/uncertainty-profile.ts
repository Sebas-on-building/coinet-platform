/**
 * L13.2 — Uncertainty Profile Contract
 *
 * §13.2.8 — Every L13 input package carries an uncertainty profile
 * that names the lower-layer sources of uncertainty and forces the
 * input package to disclose them.
 */

export enum L13UncertaintySource {
  L7_CONTRADICTION = 'L7_CONTRADICTION',
  L8_TRANSITION_RISK = 'L8_TRANSITION_RISK',
  L9_SEQUENCE_AMBIGUITY = 'L9_SEQUENCE_AMBIGUITY',
  L9_DECAY = 'L9_DECAY',
  L10_NARROW_HYPOTHESIS_SPREAD = 'L10_NARROW_HYPOTHESIS_SPREAD',
  L11_MISSING_DATA = 'L11_MISSING_DATA',
  L11_DRIFT = 'L11_DRIFT',
  L12_NARROW_SCENARIO_SPREAD = 'L12_NARROW_SCENARIO_SPREAD',
  L12_ACTIVE_INVALIDATION = 'L12_ACTIVE_INVALIDATION',
  L12_UNRESOLVED_TRIGGER = 'L12_UNRESOLVED_TRIGGER',
  L12_CONFIDENCE_CAP = 'L12_CONFIDENCE_CAP',
}

export const ALL_L13_UNCERTAINTY_SOURCES:
  readonly L13UncertaintySource[] =
  Object.values(L13UncertaintySource);

/**
 * §13.2.8 — Forbidden certainty phrases the AI may not emit when
 * the uncertainty profile demands disclosure. Mirrors §13.1.6
 * prediction-theater scanners but with the explicit role of
 * **forced-rewrite** rather than constitutional rejection.
 */
export const L13_FORBIDDEN_CERTAINTY_PHRASES: readonly string[] = [
  'guaranteed',
  'inevitable',
  'inevitably',
  'no doubt',
  'will go up',
  'will go down',
  'will pump',
  'will dump',
  'cannot fail',
  'locked in',
  'definitely',
  'certain',
  'surely',
];

export interface L13UncertaintyProfile {
  readonly uncertainty_profile_id: string;

  readonly uncertainty_sources: readonly L13UncertaintySource[];

  readonly required_disclosures: readonly string[];

  readonly active_invalidation_present: boolean;
  readonly unresolved_trigger_present: boolean;
  readonly narrow_spread_present: boolean;
  readonly material_missing_data_present: boolean;
  readonly material_drift_present: boolean;
  readonly active_contradiction_present: boolean;

  readonly must_disclose_uncertainty: boolean;

  readonly forbidden_certainty_phrases: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}
