/**
 * L12.2 — Scenario family validator (§12.2.8).
 */

import {
  ALL_L12_SCENARIO_FAMILIES,
  L12_SCENARIO_FAMILY_DESCRIPTORS,
  L12ScenarioFamilyDescriptor,
  L12ScenarioFamilyProductionStatus,
} from '../contracts/scenario-family';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

export function validateL12FamilyDescriptor(
  d: L12ScenarioFamilyDescriptor,
): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = d.scenario_family;

  if (d.legal_scenario_types.length === 0) {
    v.push({
      code: L12ObjectViolationCode.L12O_FAMILY_LEGAL_TYPES_EMPTY,
      subject_id: sid,
      detail: 'legal_scenario_types must not be empty',
    });
  }
  if (d.required_lower_layer_contexts.length === 0) {
    v.push({
      code: L12ObjectViolationCode.L12O_FAMILY_REQUIRED_CONTEXTS_EMPTY,
      subject_id: sid,
      detail: 'required_lower_layer_contexts must not be empty',
    });
  }
  if (!d.requires_invalidation_profile) {
    v.push({
      code: L12ObjectViolationCode.L12O_FAMILY_NO_INVALIDATION_REQUIREMENT,
      subject_id: sid,
      detail: 'every family must require an invalidation profile',
    });
  }
  if (!d.requires_l11_score_context) {
    v.push({
      code: L12ObjectViolationCode.L12O_FAMILY_NO_SCORE_CONTEXT_REQUIREMENT,
      subject_id: sid,
      detail: 'every family must require L11 score context',
    });
  }
  return v;
}

export function validateL12FamilyRegistration(): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const seen = new Set<string>();

  for (const f of ALL_L12_SCENARIO_FAMILIES) {
    if (
      !L12_SCENARIO_FAMILY_DESCRIPTORS.some(d => d.scenario_family === f)
    ) {
      v.push({
        code: L12ObjectViolationCode.L12O_FAMILY_UNREGISTERED,
        subject_id: f,
        detail: `family ${f} has no descriptor`,
      });
    }
  }

  for (const d of L12_SCENARIO_FAMILY_DESCRIPTORS) {
    if (seen.has(d.scenario_family)) {
      v.push({
        code: L12ObjectViolationCode.L12O_FAMILY_DUPLICATE,
        subject_id: d.scenario_family,
        detail: `duplicate descriptor for family ${d.scenario_family}`,
      });
    }
    seen.add(d.scenario_family);

    if (d.production_status === L12ScenarioFamilyProductionStatus.BLOCKED) {
      v.push({
        code: L12ObjectViolationCode.L12O_FAMILY_BLOCKED,
        subject_id: d.scenario_family,
        detail: 'family is BLOCKED',
      });
    }

    v.push(...validateL12FamilyDescriptor(d));
  }
  return v;
}
