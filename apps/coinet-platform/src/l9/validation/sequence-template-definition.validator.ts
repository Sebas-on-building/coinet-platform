/**
 * L9.6 — Sequence Template Definition Validator
 *
 * §9.6.4 — Validates a template definition against template law:
 * family binding, primary-state ownership, required surface presence,
 * scope legality, phase envelope alignment, decay posture legality
 * against the owning family, post-event anchor legality, regime
 * requirement presence, clean-emission numeric ranges, rollout
 * priority, and forbidden-surface leakage (§9.6.14.1 INV-9.6-G).
 */

import { L9SequenceTemplateDefinition } from '../contracts/sequence-template-definition';
import {
  L9SequenceFamilyDefinition,
} from '../contracts/sequence-family-definition';
import {
  ALL_L9_PRODUCTION_FAMILY_IDS,
  L9SequenceRolloutPhase,
  L9_PRODUCTION_FAMILY_ROLLOUT_PHASE,
} from '../contracts/sequence-template-policy';
import {
  ALL_L9_SEQUENCE_SCOPE_TYPES,
} from '../contracts/sequence-family';
import {
  ALL_L9_POST_EVENT_ANCHOR_CLASSES,
} from '../contracts/l9-post-event-window-policy';
import {
  ALL_L9_DECAY_DOMINANCES,
  L9DecayDominance,
} from '../contracts/l9-decay-policy';
import {
  L9FamilyValidationError,
  L9FamilyViolation,
  L9FamilyViolationCode,
  L9FamilyViolationTier,
} from './l9-family-violation-codes';

const L9F_TPL_FORBIDDEN_SURFACE = /(should|buy|sell|recommend|target|entry|exit|final scenario|trade)/i;

const DECAY_LEVEL: Readonly<Record<L9DecayDominance, number>> = {
  [L9DecayDominance.LOW_DECAY]: 0,
  [L9DecayDominance.MODERATE_DECAY]: 1,
  [L9DecayDominance.HIGH_DECAY]: 2,
  [L9DecayDominance.DOMINANT_DECAY]: 3,
  [L9DecayDominance.UNRESOLVED_DECAY]: 2,
};

export interface L9SequenceTemplateValidationInput {
  readonly template: L9SequenceTemplateDefinition;
  /**
   * §9.6.4.4 — Definition of the owning family (already validated).
   * Required for phase-envelope / scope / decay-ceiling cross-checks.
   */
  readonly owning_family: L9SequenceFamilyDefinition;
}

export interface L9SequenceTemplateValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9FamilyViolation[];
}

function v(
  code: L9FamilyViolationCode,
  detail: string,
  refs?: readonly string[],
): L9FamilyViolation {
  return {
    code,
    tier: L9FamilyViolationTier.TEMPLATE,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL9SequenceTemplateDefinition(
  input: L9SequenceTemplateValidationInput,
): L9SequenceTemplateValidationResult {
  const tpl = input.template;
  const fam = input.owning_family;
  const violations: L9FamilyViolation[] = [];

  if (!ALL_L9_PRODUCTION_FAMILY_IDS.includes(tpl.production_family)) {
    violations.push(
      v(L9FamilyViolationCode.TPL_UNREGISTERED,
        `template ${tpl.template_id} declares unknown production family ` +
          `${tpl.production_family}`,
        [String(tpl.production_family)]));
  }
  if (tpl.production_family !== fam.family_id) {
    violations.push(
      v(L9FamilyViolationCode.TPL_FAMILY_MISMATCH,
        `template ${tpl.template_id} claims family ${tpl.production_family} ` +
          `but is being validated against ${fam.family_id}`,
        [String(tpl.production_family), String(fam.family_id)]));
  }

  const ownership = fam.state_ownership.find(
    o => o.state === tpl.primary_sequence_state,
  );
  if (!ownership) {
    violations.push(
      v(L9FamilyViolationCode.TPL_PRIMARY_STATE_NOT_OWNED,
        `template ${tpl.template_id} primary state ` +
          `${tpl.primary_sequence_state} is not owned by family ${fam.family_id}`,
        [String(tpl.primary_sequence_state)]));
  }

  if (!tpl.template_version || tpl.template_version.trim() === '') {
    violations.push(
      v(L9FamilyViolationCode.TPL_VERSION_MISSING,
        `template ${tpl.template_id} missing template_version`));
  }

  if (tpl.applicable_scope_types.length === 0) {
    violations.push(
      v(L9FamilyViolationCode.TPL_APPLICABLE_SCOPES_EMPTY,
        `template ${tpl.template_id} declares no applicable scope types`));
  }
  for (const s of tpl.applicable_scope_types) {
    if (!ALL_L9_SEQUENCE_SCOPE_TYPES.includes(s)) {
      violations.push(
        v(L9FamilyViolationCode.TPL_APPLICABLE_SCOPES_EMPTY,
          `template ${tpl.template_id} scope ${s} not a registered scope type`,
          [String(s)]));
    }
    if (!fam.legal_scope_types.includes(s)) {
      violations.push(
        v(L9FamilyViolationCode.TPL_SCOPE_NOT_LEGAL_FOR_FAMILY,
          `template ${tpl.template_id} scope ${s} not legal for family ` +
            `${fam.family_id}`,
          [String(s)]));
    }
  }

  if (tpl.support_domains.length === 0) {
    violations.push(
      v(L9FamilyViolationCode.TPL_SUPPORT_DOMAINS_EMPTY,
        `template ${tpl.template_id} declares no support domains`));
  }
  if (tpl.challenge_domains.length === 0) {
    violations.push(
      v(L9FamilyViolationCode.TPL_CHALLENGE_DOMAINS_EMPTY,
        `template ${tpl.template_id} declares no challenge domains ` +
          `(INV-9.6-C)`));
  }

  if (!tpl.lead_lag_requirement) {
    violations.push(
      v(L9FamilyViolationCode.TPL_LEAD_LAG_REQUIREMENT_MISSING,
        `template ${tpl.template_id} missing lead_lag_requirement`));
  }
  if (!tpl.phase_requirement) {
    violations.push(
      v(L9FamilyViolationCode.TPL_PHASE_REQUIREMENT_MISSING,
        `template ${tpl.template_id} missing phase_requirement`));
  } else {
    for (const p of tpl.phase_requirement.allowed_primary_phases) {
      if (!fam.legal_phase_envelope.includes(p)) {
        violations.push(
          v(L9FamilyViolationCode.TPL_PHASE_NOT_IN_FAMILY_ENVELOPE,
            `template ${tpl.template_id} allowed phase ${p} not in family ` +
              `${fam.family_id} legal_phase_envelope`,
            [String(p)]));
      }
    }
  }

  if (!tpl.decay_requirement) {
    violations.push(
      v(L9FamilyViolationCode.TPL_DECAY_REQUIREMENT_MISSING,
        `template ${tpl.template_id} missing decay_requirement`));
  } else {
    if (!ALL_L9_DECAY_DOMINANCES.includes(
      tpl.decay_requirement.max_tolerated_dominance,
    )) {
      violations.push(
        v(L9FamilyViolationCode.TPL_DECAY_REQUIREMENT_MISSING,
          `template ${tpl.template_id} max_tolerated_dominance not a ` +
            `registered decay dominance`));
    }
    if (
      DECAY_LEVEL[tpl.decay_requirement.max_tolerated_dominance] >
      DECAY_LEVEL[fam.decay_tolerance_ceiling]
    ) {
      violations.push(
        v(L9FamilyViolationCode.TPL_DECAY_EXCEEDS_FAMILY_CEILING,
          `template ${tpl.template_id} max_tolerated_dominance ` +
            `${tpl.decay_requirement.max_tolerated_dominance} exceeds ` +
            `family ${fam.family_id} ceiling ${fam.decay_tolerance_ceiling}`));
    }
  }

  if (!tpl.contradiction_requirement) {
    violations.push(
      v(L9FamilyViolationCode.TPL_CONTRADICTION_REQUIREMENT_MISSING,
        `template ${tpl.template_id} missing contradiction_requirement ` +
          `(INV-9.6-C)`));
  }

  if (!tpl.post_event_requirement) {
    violations.push(
      v(L9FamilyViolationCode.TPL_POST_EVENT_REQUIREMENT_MISSING,
        `template ${tpl.template_id} missing post_event_requirement`));
  } else {
    for (const cls of tpl.post_event_requirement.required_anchor_classes) {
      if (!ALL_L9_POST_EVENT_ANCHOR_CLASSES.includes(cls)) {
        violations.push(
          v(L9FamilyViolationCode.TPL_POST_EVENT_ANCHOR_ILLEGAL_FOR_FAMILY,
            `template ${tpl.template_id} required anchor class ${cls} not ` +
              `registered`,
            [String(cls)]));
      }
      if (
        fam.legal_post_event_anchor_classes.length > 0 &&
        !fam.legal_post_event_anchor_classes.includes(cls)
      ) {
        violations.push(
          v(L9FamilyViolationCode.TPL_POST_EVENT_ANCHOR_ILLEGAL_FOR_FAMILY,
            `template ${tpl.template_id} required anchor class ${cls} not ` +
              `legal for family ${fam.family_id}`,
            [String(cls)]));
      }
    }
  }

  if (!tpl.regime_requirement) {
    violations.push(
      v(L9FamilyViolationCode.TPL_REGIME_REQUIREMENT_MISSING,
        `template ${tpl.template_id} missing regime_requirement`));
  }

  if (!tpl.clean_emission) {
    violations.push(
      v(L9FamilyViolationCode.TPL_CLEAN_EMISSION_MISSING,
        `template ${tpl.template_id} missing clean_emission`));
  } else {
    const c = tpl.clean_emission;
    if (
      !Number.isFinite(c.sequence_completeness_minimum) ||
      c.sequence_completeness_minimum < 0 ||
      c.sequence_completeness_minimum > 1
    ) {
      violations.push(
        v(L9FamilyViolationCode.TPL_CLEAN_COMPLETENESS_OUT_OF_RANGE,
          `template ${tpl.template_id} sequence_completeness_minimum must ` +
            `be in [0,1]`,
          [String(c.sequence_completeness_minimum)]));
    }
    if (
      !Number.isFinite(c.requires_support_domain_coverage_minimum) ||
      c.requires_support_domain_coverage_minimum < 0 ||
      c.requires_support_domain_coverage_minimum > 1
    ) {
      violations.push(
        v(L9FamilyViolationCode.TPL_CLEAN_SUPPORT_COVERAGE_OUT_OF_RANGE,
          `template ${tpl.template_id} requires_support_domain_coverage_minimum ` +
            `must be in [0,1]`,
          [String(c.requires_support_domain_coverage_minimum)]));
    }
  }

  const expectedPhase: L9SequenceRolloutPhase | undefined =
    L9_PRODUCTION_FAMILY_ROLLOUT_PHASE[tpl.production_family];
  if (expectedPhase && tpl.rollout_priority !== expectedPhase) {
    violations.push(
      v(L9FamilyViolationCode.TPL_ROLLOUT_PRIORITY_MISMATCH,
        `template ${tpl.template_id} rollout_priority ${tpl.rollout_priority} ` +
          `does not match family ${tpl.production_family} canonical ` +
          `${expectedPhase}`));
  }

  const surfaceText = [
    tpl.description,
    ...tpl.template_invariants,
  ].join(' ');
  if (L9F_TPL_FORBIDDEN_SURFACE.test(surfaceText)) {
    violations.push(
      v(L9FamilyViolationCode.TPL_LEAKAGE_JUDGMENT,
        `template ${tpl.template_id} leaks judgment/recommendation ` +
          `surface (INV-9.6-G)`));
  }

  return { ok: violations.length === 0, violations };
}

export function assertL9SequenceTemplateDefinitionLegal(
  input: L9SequenceTemplateValidationInput,
): void {
  const r = validateL9SequenceTemplateDefinition(input);
  if (!r.ok) throw new L9FamilyValidationError(r.violations);
}
