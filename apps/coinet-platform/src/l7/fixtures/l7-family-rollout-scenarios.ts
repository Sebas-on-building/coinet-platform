/**
 * L7.8 — Family Rollout Scenarios
 *
 * §7.8.4.2 Band H, §7.8.7.4 — Declarative scenarios that exercise family
 * rollout legality: correct order, out-of-order rejection, disable/
 * reenable preservation, critical rollback playbooks.
 *
 * Scenarios are paired with expected gate outcomes so the Band H test
 * can assert the rollout gate behavior end-to-end.
 */

import { L7ValidationFamilyId } from '../contracts/validation-family-definition';

export enum L7FamilyRolloutExpectation {
  ALLOWED = 'ALLOWED',
  BLOCKED = 'BLOCKED',
  ROLLBACK_EXPECTED = 'ROLLBACK_EXPECTED',
  ENABLE_DISABLE_SAFE = 'ENABLE_DISABLE_SAFE',
}

export interface L7FamilyRolloutScenario {
  readonly case_id: string;
  readonly description: string;
  readonly family: L7ValidationFamilyId;
  readonly from_state: string;
  readonly to_state: string;
  readonly prerequisite_families: readonly L7ValidationFamilyId[];
  readonly prerequisite_state: string;
  readonly certification_required: 'CONSTITUTIONAL_GREEN' | 'RUNTIME_GREEN' | 'PRODUCTION_GREEN';
  readonly observability_ok: boolean;
  readonly expected: L7FamilyRolloutExpectation;
}

export const L7_FAMILY_ROLLOUT_SCENARIOS: readonly L7FamilyRolloutScenario[] = Object.freeze([
  {
    case_id: 'fr.market.ok',
    description: 'MARKET family to PRODUCTION with RUNTIME_GREEN certification is allowed.',
    family: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    from_state: 'CANARY', to_state: 'PRODUCTION',
    prerequisite_families: [],
    prerequisite_state: 'PRODUCTION',
    certification_required: 'RUNTIME_GREEN',
    observability_ok: true,
    expected: L7FamilyRolloutExpectation.ALLOWED,
  },
  {
    case_id: 'fr.derivatives.ok_after_market',
    description: 'DERIVATIVES may enable after MARKET reached PRODUCTION.',
    family: L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
    from_state: 'CANARY', to_state: 'PRODUCTION',
    prerequisite_families: [L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION],
    prerequisite_state: 'PRODUCTION',
    certification_required: 'RUNTIME_GREEN',
    observability_ok: true,
    expected: L7FamilyRolloutExpectation.ALLOWED,
  },
  {
    case_id: 'fr.cross_domain.out_of_order',
    description: 'CROSS_DOMAIN cannot enable before its constituent families.',
    family: L7ValidationFamilyId.CROSS_DOMAIN_ALIGNMENT_VALIDATION,
    from_state: 'CANARY', to_state: 'PRODUCTION',
    prerequisite_families: [
      L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
      L7ValidationFamilyId.NARRATIVE_VALIDATION,
      L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
    ],
    prerequisite_state: 'CANARY',
    certification_required: 'PRODUCTION_GREEN',
    observability_ok: true,
    expected: L7FamilyRolloutExpectation.BLOCKED,
  },
  {
    case_id: 'fr.narrative.observability_breach',
    description: 'NARRATIVE blocked when observability critical breach exists.',
    family: L7ValidationFamilyId.NARRATIVE_VALIDATION,
    from_state: 'CANARY', to_state: 'PRODUCTION',
    prerequisite_families: [L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION],
    prerequisite_state: 'PRODUCTION',
    certification_required: 'RUNTIME_GREEN',
    observability_ok: false,
    expected: L7FamilyRolloutExpectation.BLOCKED,
  },
  {
    case_id: 'fr.accumulation.disable_reenable',
    description: 'ACCUMULATION can be disabled and re-enabled without losing lineage.',
    family: L7ValidationFamilyId.ACCUMULATION_VALIDATION,
    from_state: 'PRODUCTION', to_state: 'FROZEN',
    prerequisite_families: [],
    prerequisite_state: 'PRODUCTION',
    certification_required: 'RUNTIME_GREEN',
    observability_ok: true,
    expected: L7FamilyRolloutExpectation.ENABLE_DISABLE_SAFE,
  },
  {
    case_id: 'fr.risk_overhang.rollback_after_breach',
    description: 'RISK_OVERHANG must roll back (not delete history) on live incident.',
    family: L7ValidationFamilyId.RISK_OVERHANG_VALIDATION,
    from_state: 'PRODUCTION', to_state: 'CANARY',
    prerequisite_families: [],
    prerequisite_state: 'PRODUCTION',
    certification_required: 'RUNTIME_GREEN',
    observability_ok: false,
    expected: L7FamilyRolloutExpectation.ROLLBACK_EXPECTED,
  },
]);
