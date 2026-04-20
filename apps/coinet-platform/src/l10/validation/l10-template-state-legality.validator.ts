/**
 * L10.6 — Template State-Legality Validator
 * §10.6.3.5 / §10.6.15.1 / INV-10.6-D
 *
 * Given a runtime evaluation snapshot, decide whether a template's
 * current state is CLEAN, NARROWED, BLOCKED, UNSUPPORTED, or INVALID.
 *
 * This is the live counterpart of `l10-template-definition.validator.ts`:
 *   - definition validator catches *malformed templates*
 *   - state-legality validator catches *malformed live states*
 *
 * Consumed by:
 *   - L10.4 runtime spine (to decide whether to emit the candidate)
 *   - L10.3 output contract (to cap clean emission)
 *   - L10.6 audit (Phase E) for post-hoc explanation
 */

import {
  L10HypothesisTemplateDefinition,
} from '../contracts/hypothesis-template-definition';
import {
  L10FamilyValidationIssue,
  L10FamilyValidationReport,
  L10FamilyViolationCode,
  L10TemplateContradictionDomain,
  L10TemplateLegalityClass,
  foldL10FamilyLegality,
  makeL10FamilyIssue,
} from '../contracts/hypothesis-template-policy';

/**
 * §10.6.3.5 — Runtime evaluation state input for a single template.
 *
 * All scalars are already normalised into [0,1]; the caller (L10.4
 * runtime) is responsible for computing these from the governed
 * L10.5 evidence semantics surface.
 */
export interface L10TemplateStateInput {
  /** §10.6.3.5 — live snapshot of the family runtime. */
  readonly template: L10HypothesisTemplateDefinition;

  /** §10.6.3.5 — rollout says the template is enabled for production. */
  readonly is_production_enabled: boolean;

  /** §10.6.3.5 — primary support strength ∈ [0,1]. */
  readonly primary_support_strength: number;
  /** §10.6.3.5 — count of support domains currently present. */
  readonly support_domains_present: number;

  /** §10.6.3.5 — active blocking contradiction domains, if any. */
  readonly active_blocking_contradiction_domains:
    readonly L10TemplateContradictionDomain[];
  /** §10.6.3.5 — active narrowing contradiction domains, if any. */
  readonly active_narrowing_contradiction_domains:
    readonly L10TemplateContradictionDomain[];

  /**
   * §10.6.3.5 — refs of confirmations currently present. Absence of
   * any `is_upgrade_critical` confirmation forces NARROWED unless the
   * template blocker law elevates to BLOCKED.
   */
  readonly present_confirmation_refs: ReadonlySet<string>;

  /** §10.6.3.5 — refs of invalidations flagged ACTIVE this tick. */
  readonly active_invalidation_refs: ReadonlySet<string>;

  /** §10.6.3.5 — L8 regime class currently observed (or null). */
  readonly observed_regime_class: string | null;
  /** §10.6.3.5 — L9 sequence class currently observed (or null). */
  readonly observed_sequence_class: string | null;

  /** §10.6.3.5 — L10.5 posture: competition still live. */
  readonly competition_live: boolean;
  /** §10.6.3.5 — minimum confirmation coverage ∈ [0,1]. */
  readonly confirmation_coverage: number;
  /** §10.6.3.5 — candidate stability score ∈ [0,1]. */
  readonly candidate_stability_score: number;
}

/**
 * §10.6.3.5 / INV-10.6-D — Decide template state legality.
 */
export function validateL10TemplateStateLegality(
  input: L10TemplateStateInput,
): L10FamilyValidationReport {
  const issues: L10FamilyValidationIssue[] = [];
  const tpl = input.template;
  const push = (code: L10FamilyViolationCode, message: string) =>
    issues.push(makeL10FamilyIssue(code, message, {
      template_id: tpl.template_id,
      family_id: tpl.hypothesis_family,
    }));

  // §10.6.11.4 — rollout must have enabled this template.
  if (!input.is_production_enabled) {
    return {
      ok: false,
      issues: [
        makeL10FamilyIssue(
          L10FamilyViolationCode.ROLLOUT_FAMILY_NOT_READY,
          `Template '${tpl.template_id}' is not production-enabled.`,
          { template_id: tpl.template_id, family_id: tpl.hypothesis_family },
        ),
      ],
      legality: L10TemplateLegalityClass.UNSUPPORTED,
    };
  }

  // §10.6.3.5 — primary support must meet the clean-emission floor or
  // the candidate must at least be narrowed.
  if (input.primary_support_strength < tpl.clean_emission.minimum_primary_support_strength) {
    push(
      L10FamilyViolationCode.STATE_SUPPORT_GAP_UNDER_CLEAN,
      `Primary support ${input.primary_support_strength.toFixed(2)} is below ` +
        `minimum ${tpl.clean_emission.minimum_primary_support_strength.toFixed(2)}.`,
    );
  }
  if (input.support_domains_present < tpl.support_requirement.minimum_domains_present) {
    push(
      L10FamilyViolationCode.STATE_SUPPORT_GAP_UNDER_CLEAN,
      `Only ${input.support_domains_present} support domains present, ` +
        `need ≥${tpl.support_requirement.minimum_domains_present}.`,
    );
  }

  // §10.6.3.5 / INV-10.6-D — any active blocking contradiction is BLOCKED.
  const blockingDoms = new Set(tpl.contradiction_requirement.blocking_domains);
  for (const dom of input.active_blocking_contradiction_domains) {
    if (blockingDoms.has(dom)) {
      push(
        L10FamilyViolationCode.STATE_BLOCKER_CONDITION_PRESENT,
        `Blocking contradiction domain '${dom}' is active.`,
      );
    }
  }

  // §10.6.3.5 — narrowing contradictions drop to NARROWED.
  const narrowingDoms = new Set(tpl.contradiction_requirement.narrowing_domains);
  for (const dom of input.active_narrowing_contradiction_domains) {
    if (narrowingDoms.has(dom)) {
      push(
        L10FamilyViolationCode.STATE_CONTRADICTION_FORCES_NARROW,
        `Narrowing contradiction domain '${dom}' is active.`,
      );
    }
  }

  // §10.6.3.5 — missing upgrade-critical confirmation forces NARROWED
  // unless blocker law elevates to BLOCKED.
  for (const c of tpl.required_confirmations) {
    if (!c.is_upgrade_critical) continue;
    if (!input.present_confirmation_refs.has(c.confirmation_ref)) {
      if (tpl.blocker_law.blocked_under_missing_upgrade_critical_confirmation) {
        push(
          L10FamilyViolationCode.STATE_BLOCKER_CONDITION_PRESENT,
          `Missing upgrade-critical confirmation '${c.confirmation_ref}' ` +
            `blocks template emission.`,
        );
      } else {
        push(
          L10FamilyViolationCode.STATE_MISSING_REQUIRED_CONFIRMATION,
          `Missing upgrade-critical confirmation '${c.confirmation_ref}'.`,
        );
      }
    }
  }

  // §10.6.3.5 — active invalidation either blocks or narrows.
  if (input.active_invalidation_refs.size > 0) {
    if (tpl.blocker_law.blocked_under_active_invalidation) {
      push(
        L10FamilyViolationCode.STATE_ACTIVE_INVALIDATION,
        `Active invalidations: [${[...input.active_invalidation_refs].join(',')}].`,
      );
    } else {
      push(
        L10FamilyViolationCode.STATE_CONTRADICTION_FORCES_NARROW,
        `Active invalidations narrow template emission.`,
      );
    }
  }

  // §10.6.3.5 — regime posture enforcement.
  const rp = tpl.regime_posture;
  const regime = input.observed_regime_class;
  const regimeForbidden = regime !== null &&
    rp.forbidden_regime_classes.includes(regime);
  const regimeMissingRequirement = rp.required_regime_classes.length > 0 && (
    regime === null || !rp.required_regime_classes.includes(regime)
  );
  if (regimeForbidden || regimeMissingRequirement) {
    if (rp.hostile_regime_blocks ||
      tpl.blocker_law.blocked_under_hostile_regime_if_required) {
      push(
        L10FamilyViolationCode.STATE_BLOCKER_CONDITION_PRESENT,
        `Regime '${regime ?? 'none'}' is hostile to '${tpl.template_id}'.`,
      );
    } else if (rp.hostile_regime_narrows) {
      push(
        L10FamilyViolationCode.STATE_REGIME_HOSTILE_FORCES_NARROW,
        `Regime '${regime ?? 'none'}' narrows '${tpl.template_id}'.`,
      );
    }
  }

  // §10.6.3.5 — sequence posture enforcement.
  const sp = tpl.sequence_posture;
  const seq = input.observed_sequence_class;
  const seqForbidden = seq !== null &&
    sp.forbidden_sequence_classes.includes(seq);
  const seqMissingRequirement = sp.required_sequence_classes.length > 0 && (
    seq === null || !sp.required_sequence_classes.includes(seq)
  );
  if (seqForbidden || seqMissingRequirement) {
    if (sp.incompatible_sequence_blocks) {
      push(
        L10FamilyViolationCode.STATE_BLOCKER_CONDITION_PRESENT,
        `Sequence '${seq ?? 'none'}' blocks '${tpl.template_id}'.`,
      );
    } else if (sp.incompatible_sequence_narrows) {
      push(
        L10FamilyViolationCode.STATE_SEQUENCE_INCOMPATIBLE_FORCES_NARROW,
        `Sequence '${seq ?? 'none'}' narrows '${tpl.template_id}'.`,
      );
    }
  }

  // §10.6.3.5 — clean-emission secondary gates.
  if (tpl.clean_emission.requires_competition_live && !input.competition_live) {
    push(
      L10FamilyViolationCode.STATE_CONTRADICTION_FORCES_NARROW,
      `Clean emission requires live competition but competition has closed.`,
    );
  }
  if (input.confirmation_coverage < tpl.clean_emission.minimum_confirmation_coverage) {
    push(
      L10FamilyViolationCode.STATE_MISSING_REQUIRED_CONFIRMATION,
      `Confirmation coverage ${input.confirmation_coverage.toFixed(2)} below ` +
        `minimum ${tpl.clean_emission.minimum_confirmation_coverage.toFixed(2)}.`,
    );
  }
  if (input.candidate_stability_score < tpl.clean_emission.minimum_candidate_stability_score) {
    push(
      L10FamilyViolationCode.STATE_CONTRADICTION_FORCES_NARROW,
      `Candidate stability ${input.candidate_stability_score.toFixed(2)} below ` +
        `minimum ${tpl.clean_emission.minimum_candidate_stability_score.toFixed(2)}.`,
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    legality: issues.length === 0
      ? L10TemplateLegalityClass.CLEAN
      : foldL10FamilyLegality(issues.map(i => i.code)),
  };
}
