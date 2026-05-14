/**
 * L13.2 — Uncertainty Profile Builder
 *
 * §13.2.8 — Builds the uncertainty profile by inspecting which
 * adverse states are present and forcing required disclosures.
 */

import {
  L13_FORBIDDEN_CERTAINTY_PHRASES,
  L13UncertaintySource,
  type L13UncertaintyProfile,
} from '../contracts/uncertainty-profile';
import {
  L13RequiredDisclosure,
} from '../contracts/explanation-restriction-profile';
import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.input-package.v1';

export interface L13UncertaintyProfileInput {
  readonly request_id: string;
  readonly active_contradiction_present: boolean;
  readonly active_invalidation_present: boolean;
  readonly unresolved_trigger_present: boolean;
  readonly narrow_scenario_spread_present: boolean;
  readonly narrow_hypothesis_spread_present: boolean;
  readonly material_missing_data_present: boolean;
  readonly material_drift_present: boolean;
  readonly transition_risk_present: boolean;
  readonly sequence_decay_present: boolean;
  readonly confidence_cap_present: boolean;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

export function buildL13UncertaintyProfile(
  input: L13UncertaintyProfileInput,
): L13UncertaintyProfile {
  const sources: L13UncertaintySource[] = [];
  const disclosures: L13RequiredDisclosure[] = [];

  if (input.active_contradiction_present) {
    sources.push(L13UncertaintySource.L7_CONTRADICTION);
    disclosures.push(L13RequiredDisclosure.CONTRADICTION);
  }
  if (input.active_invalidation_present) {
    sources.push(L13UncertaintySource.L12_ACTIVE_INVALIDATION);
    disclosures.push(L13RequiredDisclosure.ACTIVE_INVALIDATION);
  }
  if (input.unresolved_trigger_present) {
    sources.push(L13UncertaintySource.L12_UNRESOLVED_TRIGGER);
    disclosures.push(L13RequiredDisclosure.UNRESOLVED_TRIGGER);
  }
  if (input.narrow_scenario_spread_present) {
    sources.push(L13UncertaintySource.L12_NARROW_SCENARIO_SPREAD);
    disclosures.push(L13RequiredDisclosure.NARROW_SCENARIO_SPREAD);
  }
  if (input.narrow_hypothesis_spread_present) {
    sources.push(L13UncertaintySource.L10_NARROW_HYPOTHESIS_SPREAD);
    disclosures.push(L13RequiredDisclosure.NARROW_HYPOTHESIS_SPREAD);
  }
  if (input.material_missing_data_present) {
    sources.push(L13UncertaintySource.L11_MISSING_DATA);
    disclosures.push(L13RequiredDisclosure.MISSING_DATA);
  }
  if (input.material_drift_present) {
    sources.push(L13UncertaintySource.L11_DRIFT);
    disclosures.push(L13RequiredDisclosure.DRIFT);
  }
  if (input.transition_risk_present) {
    sources.push(L13UncertaintySource.L8_TRANSITION_RISK);
    disclosures.push(L13RequiredDisclosure.TRANSITION_RISK);
  }
  if (input.sequence_decay_present) {
    sources.push(L13UncertaintySource.L9_DECAY);
    disclosures.push(L13RequiredDisclosure.SEQUENCE_DECAY);
  }
  if (input.confidence_cap_present) {
    sources.push(L13UncertaintySource.L12_CONFIDENCE_CAP);
    disclosures.push(L13RequiredDisclosure.CONFIDENCE_CAP);
  }

  const mustDisclose = sources.length > 0;
  const profileId = `l13d.uncertainty.${fnv1a(
    [
      input.request_id,
      [...sources].sort().join(','),
    ].join('|'),
  )}`;

  return {
    uncertainty_profile_id: profileId,
    uncertainty_sources: [...sources].sort(),
    required_disclosures: [...disclosures].sort(),
    active_invalidation_present: input.active_invalidation_present,
    unresolved_trigger_present: input.unresolved_trigger_present,
    narrow_spread_present:
      input.narrow_scenario_spread_present ||
      input.narrow_hypothesis_spread_present,
    material_missing_data_present: input.material_missing_data_present,
    material_drift_present: input.material_drift_present,
    active_contradiction_present: input.active_contradiction_present,
    must_disclose_uncertainty: mustDisclose,
    forbidden_certainty_phrases: [...L13_FORBIDDEN_CERTAINTY_PHRASES],
    evidence_refs: [...(input.evidence_refs ?? [])].sort(),
    lineage_refs: [...(input.lineage_refs ?? [])].sort(),
    policy_version: POLICY_V,
  };
}
