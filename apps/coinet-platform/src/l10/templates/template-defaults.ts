/**
 * L10.6 — Template Defaults
 *
 * §10.6.3.3 — Shared helper constants and builder functions used by
 * every production template. Keeps templates readable and ensures
 * that structural defaults (blocker law, clean-emission criteria, etc.)
 * are identical across templates that should share them.
 */

import {
  L10HypothesisTemplateDefinition,
  L10TemplateBlockerLaw,
  L10TemplateCleanEmissionCriteria,
  L10TemplateRestrictionDefaults,
  L10TemplateShiftConditionRequirement,
} from '../contracts/hypothesis-template-definition';
import {
  L10EvidencePostureClass,
  L10ShiftConditionClass,
} from '../contracts/hypothesis-evidence-semantics-types';
import type { L10FamilyRestrictionPosture } from '../contracts/hypothesis-family-definition';

/**
 * §10.6.3.4 / INV-10.6-D — Default blocker law shared by most
 * templates. Override by spreading and replacing fields.
 */
export const DEFAULT_L10_BLOCKER_LAW: L10TemplateBlockerLaw = {
  blocker_codes: ['SUPPORT_COLLAPSE', 'PRIMARY_CONTRADICTION_ACTIVE'],
  blocked_under_active_invalidation: true,
  blocked_under_blocking_contradiction: true,
  blocked_under_missing_upgrade_critical_confirmation: true,
  blocked_under_hostile_regime_if_required: true,
};

/**
 * §10.6.3.3 — Default clean-emission criteria. Templates may tighten
 * or loosen individual fields.
 */
export const DEFAULT_L10_CLEAN_EMISSION: L10TemplateCleanEmissionCriteria = {
  minimum_primary_support_strength: 0.55,
  minimum_confirmation_coverage: 0.6,
  minimum_candidate_stability_score: 0.55,
  evidence_posture_ceiling: L10EvidencePostureClass.CURRENT,
  requires_competition_live: true,
};

/**
 * §10.6.3.3 — Default shift-condition requirement: every template must
 * declare ≥ 2 shift-condition classes so L10.5 shift semantics cannot
 * be erased.
 */
export const DEFAULT_L10_SHIFT_CONDITION_REQUIREMENT:
  L10TemplateShiftConditionRequirement = {
    required_classes: [
      L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION,
      L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION,
    ],
    minimum_count: 2,
  };

export function makeRestrictionDefaults(
  family_default: L10FamilyRestrictionPosture,
  overrides: readonly L10FamilyRestrictionPosture[] = [],
): L10TemplateRestrictionDefaults {
  return { family_default, template_overrides: overrides };
}

/**
 * §10.6.15.4 — Check: every template definition passes the structural
 * completeness gate.
 */
export function isTemplateStructurallyComplete(
  def: L10HypothesisTemplateDefinition,
): boolean {
  return (
    def.support_requirement.required_support_domains.length > 0 &&
    def.contradiction_requirement.required_contradiction_domains.length > 0 &&
    def.required_confirmations.length > 0 &&
    def.invalidation_signals.length > 0 &&
    def.shift_condition_requirement.required_classes.length >=
      def.shift_condition_requirement.minimum_count &&
    def.required_validation_patterns.length > 0
  );
}
