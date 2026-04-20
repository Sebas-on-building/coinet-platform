/**
 * L10.6 — Template-Definition Validator §10.6.3.4 / §10.6.12.4 / §10.6.15
 *
 * Enforces semantic laws on a single template definition:
 *
 *   - structural completeness                → TEMPLATE_MISSING_* codes
 *   - family mapping matches canon           → TEMPLATE_FAMILY_MISMATCH
 *   - scope types ⊆ family.legal_scope_types → TEMPLATE_ILLEGAL_SCOPE_FOR_FAMILY
 *   - support domains ⊆ family.legal_support_domains
 *                                            → TEMPLATE_SUPPORT_DOMAIN_NOT_IN_FAMILY
 *   - contradiction domains ⊆ family.legal_contradiction_domains
 *                                            → TEMPLATE_CONTRADICTION_DOMAIN_NOT_IN_FAMILY
 *   - rollout priority agrees with family.rollout_phase
 *                                            → TEMPLATE_ROLLOUT_DISAGREES_WITH_FAMILY
 *   - invalidation thresholds within [0,1]
 *   - `is_upgrade_critical` coverage (≥1 critical confirmation)
 *
 * This validator does *not* evaluate runtime state; state legality is
 * decided by `l10-template-state-legality.validator.ts`.
 */

import {
  L10HypothesisFamilyDefinition,
} from '../contracts/hypothesis-family-definition';
import {
  L10HypothesisTemplateDefinition,
  hasAllRequiredL10TemplateSurfaces,
} from '../contracts/hypothesis-template-definition';
import {
  L10FamilyValidationIssue,
  L10FamilyValidationReport,
  L10FamilyViolationCode,
  L10HypothesisTemplateId,
  L10TemplateLegalityClass,
  L10_TEMPLATE_TO_FAMILY,
  foldL10FamilyLegality,
  isL10RegisteredProductionTemplate,
  makeL10FamilyIssue,
} from '../contracts/hypothesis-template-policy';

export interface L10TemplateValidationContext {
  readonly owning_family: L10HypothesisFamilyDefinition;
}

/**
 * §10.6.3.4 — Validate a single template against its owning family.
 */
export function validateL10TemplateDefinition(
  def: L10HypothesisTemplateDefinition,
  ctx: L10TemplateValidationContext,
): L10FamilyValidationReport {
  const issues: L10FamilyValidationIssue[] = [];
  const push = (
    code: L10FamilyViolationCode,
    message: string,
    extras: Partial<L10FamilyValidationIssue> = {},
  ) => {
    issues.push(makeL10FamilyIssue(code, message, {
      template_id: def.template_id,
      family_id: def.hypothesis_family,
      ...extras,
    }));
  };

  if (!isL10RegisteredProductionTemplate(def.template_id)) {
    push(
      L10FamilyViolationCode.TEMPLATE_ID_UNREGISTERED,
      `Template '${def.template_id}' is not a canonical production template.`,
    );
  }

  if (!def.hypothesis_family) {
    push(
      L10FamilyViolationCode.TEMPLATE_MISSING_FAMILY,
      `Template '${def.template_id}' does not declare a family.`,
    );
  } else {
    const expected = L10_TEMPLATE_TO_FAMILY[def.template_id];
    if (expected && expected !== def.hypothesis_family) {
      push(
        L10FamilyViolationCode.TEMPLATE_FAMILY_MISMATCH,
        `Template '${def.template_id}' claims family '${def.hypothesis_family}' ` +
          `but canonical mapping is '${expected}'.`,
      );
    }
    if (def.hypothesis_family !== ctx.owning_family.family_id) {
      push(
        L10FamilyViolationCode.TEMPLATE_FAMILY_MISMATCH,
        `Template '${def.template_id}' claims family '${def.hypothesis_family}' ` +
          `but is being validated against '${ctx.owning_family.family_id}'.`,
      );
    }
  }

  if (!hasAllRequiredL10TemplateSurfaces(def)) {
    if (!def.template_version) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_VERSION,
        `Template '${def.template_id}' missing version.`);
    }
    if (def.applicable_scope_types.length === 0) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_SCOPE_TYPES,
        `Template '${def.template_id}' missing scope types.`);
    }
    if (def.support_requirement.required_support_domains.length === 0) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_SUPPORT_DOMAINS,
        `Template '${def.template_id}' missing support domains.`);
    }
    if (def.contradiction_requirement.required_contradiction_domains.length === 0) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_CONTRADICTION_DOMAINS,
        `Template '${def.template_id}' missing contradiction domains.`);
    }
    if (def.required_confirmations.length === 0) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_CONFIRMATIONS,
        `Template '${def.template_id}' missing required confirmations.`);
    }
    if (def.invalidation_signals.length === 0) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_INVALIDATIONS,
        `Template '${def.template_id}' missing invalidation signals.`);
    }
    if (def.required_validation_patterns.length === 0) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_VALIDATION_PATTERNS,
        `Template '${def.template_id}' missing validation patterns.`);
    }
    if (!def.blocker_law) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_BLOCKER_LAW,
        `Template '${def.template_id}' missing blocker law.`);
    }
    if (!def.restriction_defaults) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_RESTRICTION_DEFAULTS,
        `Template '${def.template_id}' missing restriction defaults.`);
    }
    if (!def.rollout_priority) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_ROLLOUT_PRIORITY,
        `Template '${def.template_id}' missing rollout priority.`);
    }
    if (def.candidate_generation_priority === undefined ||
      def.candidate_generation_priority < 0) {
      push(L10FamilyViolationCode.TEMPLATE_MISSING_CANDIDATE_PRIORITY,
        `Template '${def.template_id}' missing candidate priority.`);
    }
  }

  if (!def.regime_posture) {
    push(L10FamilyViolationCode.TEMPLATE_MISSING_REGIME_POSTURE,
      `Template '${def.template_id}' missing regime posture.`);
  }
  if (!def.sequence_posture) {
    push(L10FamilyViolationCode.TEMPLATE_MISSING_SEQUENCE_POSTURE,
      `Template '${def.template_id}' missing sequence posture.`);
  }

  const legalScopeTypes = new Set(ctx.owning_family.legal_scope_types);
  for (const scope of def.applicable_scope_types) {
    if (!legalScopeTypes.has(scope)) {
      push(
        L10FamilyViolationCode.TEMPLATE_ILLEGAL_SCOPE_FOR_FAMILY,
        `Template '${def.template_id}' scope '${scope}' is not legal for ` +
          `family '${ctx.owning_family.family_id}'.`,
        { context: { scope } },
      );
    }
  }

  const legalSupports = new Set(ctx.owning_family.legal_support_domains);
  for (const dom of def.support_requirement.required_support_domains) {
    if (!legalSupports.has(dom)) {
      push(
        L10FamilyViolationCode.TEMPLATE_SUPPORT_DOMAIN_NOT_IN_FAMILY,
        `Template '${def.template_id}' support domain '${dom}' is not in ` +
          `family '${ctx.owning_family.family_id}'.`,
        { context: { domain: dom } },
      );
    }
  }

  const legalContradictions = new Set(
    ctx.owning_family.legal_contradiction_domains,
  );
  for (const dom of def.contradiction_requirement.required_contradiction_domains) {
    if (!legalContradictions.has(dom)) {
      push(
        L10FamilyViolationCode.TEMPLATE_CONTRADICTION_DOMAIN_NOT_IN_FAMILY,
        `Template '${def.template_id}' contradiction domain '${dom}' not in ` +
          `family '${ctx.owning_family.family_id}'.`,
        { context: { domain: dom } },
      );
    }
  }

  if (def.rollout_priority && def.rollout_priority !== ctx.owning_family.rollout_phase) {
    push(
      L10FamilyViolationCode.TEMPLATE_ROLLOUT_DISAGREES_WITH_FAMILY,
      `Template '${def.template_id}' rollout_priority='${def.rollout_priority}' ` +
        `disagrees with family rollout_phase='${ctx.owning_family.rollout_phase}'.`,
    );
  }

  // §10.6.3.4 — at least one confirmation must be upgrade-critical so
  // that missing it can cap confidence to NARROWED under the state-
  // legality validator (INV-10.6-C).
  if (def.required_confirmations.length > 0 &&
    !def.required_confirmations.some(c => c.is_upgrade_critical)) {
    push(
      L10FamilyViolationCode.TEMPLATE_MISSING_CONFIRMATIONS,
      `Template '${def.template_id}' has no upgrade-critical confirmation; ` +
        `clean emission would be unconditional.`,
    );
  }

  // Invalidation thresholds must be in [0,1].
  for (const inv of def.invalidation_signals) {
    if (inv.active_collapse_threshold < 0 || inv.active_collapse_threshold > 1) {
      push(
        L10FamilyViolationCode.TEMPLATE_MISSING_INVALIDATIONS,
        `Template '${def.template_id}' invalidation '${inv.invalidation_ref}' ` +
          `threshold out of [0,1].`,
        { context: { invalidation_ref: inv.invalidation_ref } },
      );
    }
    if (inv.confidence_cap_on_potential < 0 || inv.confidence_cap_on_potential > 1) {
      push(
        L10FamilyViolationCode.TEMPLATE_MISSING_INVALIDATIONS,
        `Template '${def.template_id}' invalidation '${inv.invalidation_ref}' ` +
          `confidence cap out of [0,1].`,
        { context: { invalidation_ref: inv.invalidation_ref } },
      );
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    legality: issues.length === 0
      ? L10TemplateLegalityClass.CLEAN
      : foldL10FamilyLegality(issues.map(i => i.code)),
  };
}

/**
 * §10.6.3.4 / §10.6.15 — Validate a set of templates against their
 * owning families. Duplicate template ids are flagged once globally.
 */
export function validateL10TemplateDefinitionBatch(
  defs: readonly L10HypothesisTemplateDefinition[],
  families: ReadonlyMap<string, L10HypothesisFamilyDefinition>,
): L10FamilyValidationReport {
  const issues: L10FamilyValidationIssue[] = [];
  const seen = new Set<L10HypothesisTemplateId>();
  for (const def of defs) {
    if (seen.has(def.template_id)) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.TEMPLATE_DUPLICATE_ID,
          `Duplicate template definition '${def.template_id}'.`,
          { template_id: def.template_id, family_id: def.hypothesis_family },
        ),
      );
      continue;
    }
    seen.add(def.template_id);
    const owningFamily = families.get(def.hypothesis_family);
    if (!owningFamily) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.TEMPLATE_MISSING_FAMILY,
          `Template '${def.template_id}' references missing family ` +
            `'${def.hypothesis_family}'.`,
          { template_id: def.template_id, family_id: def.hypothesis_family },
        ),
      );
      continue;
    }
    issues.push(...validateL10TemplateDefinition(def, {
      owning_family: owningFamily,
    }).issues);
  }
  return {
    ok: issues.length === 0,
    issues,
    legality: issues.length === 0
      ? L10TemplateLegalityClass.CLEAN
      : foldL10FamilyLegality(issues.map(i => i.code)),
  };
}
