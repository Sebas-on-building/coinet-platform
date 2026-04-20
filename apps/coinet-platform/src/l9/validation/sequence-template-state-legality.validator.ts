/**
 * L9.6 — Sequence Template State Legality Validator
 *
 * §9.6.2 / §9.6.4 — Runtime-facing validator. Given a template
 * definition, the owning family, and a typed evaluation input, decides
 * whether the state may emit as `CLEAN`, must `NARROW`, or is
 * `BLOCKED` (§9.6.4.4).
 *
 * This is the validator the L9 runtime actually calls when deciding
 * whether a template match is production-emissible.
 */

import {
  L9SequenceFamilyDefinition,
  L9StateOwnershipPosture,
} from '../contracts/sequence-family-definition';
import {
  L9SequenceTemplateDefinition,
} from '../contracts/sequence-template-definition';
import {
  L9TemplateChallengeDomain,
  L9TemplateLegalityClass,
  L9TemplateRegimeRequirement,
  L9TemplateSupportDomain,
} from '../contracts/sequence-template-policy';
import { L9SequenceScopeType } from '../contracts/sequence-family';
import { L9PhaseClass } from '../contracts/phase-state';
import { L9DecayDominance } from '../contracts/l9-decay-policy';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
} from '../contracts/l9-lead-lag-policy';
import {
  L9PostEventAnchorClass,
  L9PostEventLifecycle,
} from '../contracts/l9-post-event-window-policy';
import { L9ChangePointTriggerFamily } from '../contracts/l9-change-point-policy';
import {
  L9FamilyViolation,
  L9FamilyViolationCode,
  L9FamilyViolationTier,
} from './l9-family-violation-codes';

const DECAY_LEVEL: Readonly<Record<L9DecayDominance, number>> = {
  [L9DecayDominance.LOW_DECAY]: 0,
  [L9DecayDominance.MODERATE_DECAY]: 1,
  [L9DecayDominance.HIGH_DECAY]: 2,
  [L9DecayDominance.DOMINANT_DECAY]: 3,
  [L9DecayDominance.UNRESOLVED_DECAY]: 2,
};

const LL_QUALITY_RANK: Readonly<Record<L9LeadLagQualityClass, number>> = {
  [L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL]: 0,
  [L9LeadLagQualityClass.WEAK_BUT_USABLE]: 1,
  [L9LeadLagQualityClass.NARROWED_BY_CONTRADICTION]: 2,
  [L9LeadLagQualityClass.NARROWED_BY_DECAY]: 3,
  [L9LeadLagQualityClass.SEMANTICALLY_VOID]: 4,
  [L9LeadLagQualityClass.BLOCKED]: 5,
};

/**
 * §9.6.4 — Runtime evaluation input. Every field is typed so L9's
 * deterministic runtime can replay cleanly.
 */
export interface L9TemplateEvaluationInput {
  readonly scope_type: L9SequenceScopeType;
  readonly primary_phase: L9PhaseClass;
  readonly secondary_phase?: L9PhaseClass;
  readonly declared_ambiguity_explicit: boolean;

  readonly lead_lag_quality: L9LeadLagQualityClass;
  readonly lead_lag_lag_class: L9SemanticLagClass;

  readonly decay_dominance: L9DecayDominance;

  readonly post_event_anchor_class?: L9PostEventAnchorClass;
  readonly post_event_lifecycle?: L9PostEventLifecycle;

  readonly contradiction_trigger_families: readonly L9ChangePointTriggerFamily[];

  readonly regime_hostile: boolean;
  readonly regime_present: boolean;

  readonly present_support_domains: readonly L9TemplateSupportDomain[];
  readonly present_challenge_domains: readonly L9TemplateChallengeDomain[];

  /** 0..1 — chain completeness as computed upstream. */
  readonly sequence_completeness: number;

  /**
   * §9.6.2.5 — whether the runtime claims this is a clean emission.
   * The validator never rewrites this itself; it rejects if clean is
   * claimed while blockers or ambiguity are present.
   */
  readonly claims_clean_emission: boolean;
}

export interface L9TemplateStateLegalityResult {
  readonly legality: L9TemplateLegalityClass;
  readonly violations: readonly L9FamilyViolation[];
  readonly narrowing_reasons: readonly string[];
  readonly support_domain_coverage: number;
}

function v(
  code: L9FamilyViolationCode,
  detail: string,
  refs?: readonly string[],
): L9FamilyViolation {
  return {
    code,
    tier: L9FamilyViolationTier.STATE_LEGALITY,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL9TemplateStateLegality(input: {
  readonly template: L9SequenceTemplateDefinition;
  readonly owning_family: L9SequenceFamilyDefinition;
  readonly evaluation: L9TemplateEvaluationInput;
}): L9TemplateStateLegalityResult {
  const { template: tpl, owning_family: fam, evaluation: e } = input;
  const violations: L9FamilyViolation[] = [];
  const narrowing: string[] = [];

  const ownership = fam.state_ownership.find(
    o => o.state === tpl.primary_sequence_state,
  );
  if (!ownership) {
    violations.push(
      v(L9FamilyViolationCode.STATE_NOT_OWNED_BY_FAMILY,
        `primary state ${tpl.primary_sequence_state} not owned by family ` +
          `${fam.family_id}`));
  }

  if (!tpl.applicable_scope_types.includes(e.scope_type)) {
    violations.push(
      v(L9FamilyViolationCode.STATE_SCOPE_ILLEGAL_FOR_FAMILY,
        `scope ${e.scope_type} not in template applicable_scope_types`));
  }

  if (
    tpl.phase_requirement.forbidden_phases.includes(e.primary_phase) ||
    !tpl.phase_requirement.allowed_primary_phases.includes(e.primary_phase)
  ) {
    violations.push(
      v(L9FamilyViolationCode.STATE_PHASE_OUT_OF_FAMILY_ENVELOPE,
        `phase ${e.primary_phase} not allowed by template ${tpl.template_id}`));
  }

  if (!tpl.lead_lag_requirement) {
    violations.push(
      v(L9FamilyViolationCode.STATE_LEAD_LAG_POSTURE_MISSING,
        `template ${tpl.template_id} missing lead_lag_requirement`));
  } else {
    const ceilingRank = LL_QUALITY_RANK[
      tpl.lead_lag_requirement.required_quality_ceiling
    ];
    const floorRank = LL_QUALITY_RANK[
      tpl.lead_lag_requirement.required_quality_floor
    ];
    const actualRank = LL_QUALITY_RANK[e.lead_lag_quality];
    if (actualRank < ceilingRank) {
      narrowing.push(
        `lead-lag quality ${e.lead_lag_quality} tighter than ceiling ` +
          `${tpl.lead_lag_requirement.required_quality_ceiling}; ok`);
    }
    if (actualRank > floorRank) {
      violations.push(
        v(L9FamilyViolationCode.STATE_LEAD_LAG_POSTURE_MISSING,
          `lead-lag quality ${e.lead_lag_quality} weaker than template ` +
            `floor ${tpl.lead_lag_requirement.required_quality_floor}`));
    }
    if (
      !tpl.lead_lag_requirement.allowed_lag_classes.includes(e.lead_lag_lag_class)
    ) {
      if (tpl.lead_lag_requirement.narrow_on_off_window_lag) {
        narrowing.push(
          `lag class ${e.lead_lag_lag_class} outside allowed set; narrow`);
      } else {
        violations.push(
          v(L9FamilyViolationCode.STATE_LEAD_LAG_POSTURE_MISSING,
            `lag class ${e.lead_lag_lag_class} outside allowed set and ` +
              `template does not permit narrowing`));
      }
    }
  }

  const needsAnchor =
    tpl.post_event_requirement.required_anchor_classes.length > 0;
  if (needsAnchor) {
    if (!e.post_event_anchor_class) {
      violations.push(
        v(L9FamilyViolationCode.STATE_POST_EVENT_ANCHOR_MISSING,
          `template ${tpl.template_id} requires a post-event anchor but ` +
            `none supplied`));
    } else if (
      !tpl.post_event_requirement.required_anchor_classes.includes(
        e.post_event_anchor_class,
      )
    ) {
      violations.push(
        v(L9FamilyViolationCode.STATE_POST_EVENT_ANCHOR_MISSING,
          `post-event anchor ${e.post_event_anchor_class} not in allowed ` +
            `set for template ${tpl.template_id}`));
    }
    if (
      tpl.post_event_requirement.required_lifecycle.length > 0 &&
      (!e.post_event_lifecycle ||
        !tpl.post_event_requirement.required_lifecycle.includes(
          e.post_event_lifecycle,
        ))
    ) {
      violations.push(
        v(L9FamilyViolationCode.STATE_POST_EVENT_ANCHOR_MISSING,
          `post-event lifecycle ${e.post_event_lifecycle} not in template ` +
            `required_lifecycle`));
    }
  }

  if (
    tpl.post_event_requirement.blocked_while_active_shock &&
    e.post_event_lifecycle === L9PostEventLifecycle.ACTIVE_SHOCK
  ) {
    violations.push(
      v(L9FamilyViolationCode.STATE_ACTIVE_SHOCK_BLOCKS_CLEAN,
        `template ${tpl.template_id} is blocked while ACTIVE_SHOCK ` +
          `(§9.5.9.7)`));
  }

  if (
    DECAY_LEVEL[e.decay_dominance] >
    DECAY_LEVEL[tpl.decay_requirement.max_tolerated_dominance]
  ) {
    violations.push(
      v(L9FamilyViolationCode.STATE_DECAY_EXCEEDS_TEMPLATE_TOLERANCE,
        `decay ${e.decay_dominance} exceeds template max ` +
          `${tpl.decay_requirement.max_tolerated_dominance}`));
  }

  for (const blocker of tpl.contradiction_requirement.blocking_families) {
    if (e.contradiction_trigger_families.includes(blocker)) {
      violations.push(
        v(L9FamilyViolationCode.STATE_BLOCKER_PRESENT_CLEAN_CLAIMED,
          `blocking contradiction family ${blocker} present; template ` +
            `${tpl.template_id} blocked`));
    }
  }
  for (const narrower of tpl.contradiction_requirement.narrowing_families) {
    if (e.contradiction_trigger_families.includes(narrower)) {
      narrowing.push(
        `contradiction family ${narrower} present; narrow`);
    }
  }

  if (tpl.clean_emission.requires_ambiguity_resolved) {
    const ambiguityMaterial =
      e.secondary_phase !== undefined ||
      e.declared_ambiguity_explicit;
    if (ambiguityMaterial && e.claims_clean_emission) {
      violations.push(
        v(L9FamilyViolationCode.STATE_AMBIGUITY_UNRESOLVED_CLEAN_CLAIMED,
          `template ${tpl.template_id} claims clean emission under ` +
            `unresolved ambiguity`));
    }
    if (ambiguityMaterial) narrowing.push('ambiguity material; narrow');
  }

  if (tpl.clean_emission.requires_regime_not_hostile && e.regime_hostile) {
    if (e.claims_clean_emission) {
      violations.push(
        v(L9FamilyViolationCode.STATE_HOSTILE_REGIME_CLEAN_CLAIMED,
          `template ${tpl.template_id} claims clean emission under ` +
            `hostile regime`));
    }
    narrowing.push('regime hostile; narrow');
  }

  if (
    (tpl.regime_requirement === L9TemplateRegimeRequirement.REQUIRED_PRESENT ||
      tpl.regime_requirement ===
        L9TemplateRegimeRequirement.REQUIRED_COMPATIBLE ||
      tpl.regime_requirement ===
        L9TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE) &&
    !e.regime_present
  ) {
    violations.push(
      v(L9FamilyViolationCode.STATE_HOSTILE_REGIME_CLEAN_CLAIMED,
        `template ${tpl.template_id} requires regime posture but none ` +
          `present`));
  }

  const supportCoverage =
    tpl.support_domains.length === 0
      ? 0
      : tpl.support_domains.filter(d =>
          e.present_support_domains.includes(d),
        ).length / tpl.support_domains.length;
  if (
    supportCoverage < tpl.clean_emission.requires_support_domain_coverage_minimum
  ) {
    if (e.claims_clean_emission) {
      violations.push(
        v(L9FamilyViolationCode.STATE_SUPPORT_COVERAGE_BELOW_MINIMUM,
          `support coverage ${supportCoverage.toFixed(2)} below template ` +
            `minimum ${tpl.clean_emission.requires_support_domain_coverage_minimum}`));
    }
    narrowing.push(
      `support coverage ${supportCoverage.toFixed(2)} below clean min; narrow`);
  }

  if (
    e.sequence_completeness < tpl.clean_emission.sequence_completeness_minimum
  ) {
    if (e.claims_clean_emission) {
      violations.push(
        v(L9FamilyViolationCode.STATE_COMPLETENESS_BELOW_MINIMUM,
          `sequence_completeness ${e.sequence_completeness} below ` +
            `template minimum ${tpl.clean_emission.sequence_completeness_minimum}`));
    }
    narrowing.push(
      `completeness below clean min (${e.sequence_completeness}); narrow`);
  }

  let legality: L9TemplateLegalityClass;
  if (violations.length > 0) {
    if (
      violations.some(
        vi =>
          vi.code ===
            L9FamilyViolationCode.STATE_BLOCKER_PRESENT_CLEAN_CLAIMED ||
          vi.code ===
            L9FamilyViolationCode.STATE_ACTIVE_SHOCK_BLOCKS_CLEAN ||
          vi.code ===
            L9FamilyViolationCode.STATE_DECAY_EXCEEDS_TEMPLATE_TOLERANCE ||
          vi.code ===
            L9FamilyViolationCode.STATE_PHASE_OUT_OF_FAMILY_ENVELOPE ||
          vi.code ===
            L9FamilyViolationCode.STATE_POST_EVENT_ANCHOR_MISSING ||
          vi.code === L9FamilyViolationCode.STATE_NOT_OWNED_BY_FAMILY ||
          vi.code ===
            L9FamilyViolationCode.STATE_SCOPE_ILLEGAL_FOR_FAMILY,
      )
    ) {
      legality = L9TemplateLegalityClass.BLOCKED;
    } else {
      legality = L9TemplateLegalityClass.NARROWED;
    }
  } else if (narrowing.length > 0) {
    legality = e.claims_clean_emission
      ? L9TemplateLegalityClass.NARROWED
      : L9TemplateLegalityClass.NARROWED;
  } else {
    legality = L9TemplateLegalityClass.CLEAN;
  }

  if (
    ownership &&
    ownership.posture === L9StateOwnershipPosture.NEGATIVE_LATE_POSTURE &&
    legality === L9TemplateLegalityClass.CLEAN
  ) {
    narrowing.push(
      `state is NEGATIVE_LATE_POSTURE for family ${fam.family_id}; narrow`);
    legality = L9TemplateLegalityClass.NARROWED;
  }

  return {
    legality,
    violations,
    narrowing_reasons: narrowing,
    support_domain_coverage: supportCoverage,
  };
}
