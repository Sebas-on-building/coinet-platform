/**
 * L10.6 — Family-Definition Validator §10.6.3.5 / §10.6.12.4 / §10.6.15
 *
 * Enforces semantic laws that the registry (`hypothesis-family-
 * definition.registry.ts`) cannot check cheaply:
 *
 *   - structural completeness   →  FAMILY_MISSING_* codes
 *   - canonical template roster →  FAMILY_TEMPLATE_LIST_DRIFT
 *   - canonical rollout phase   →  FAMILY_MISSING_ROLLOUT_PHASE
 *   - coexists / incompatible mutual exclusion → FAMILY_SEMANTIC_OVERLAP
 *   - regime / sequence requirement declared → FAMILY_MISSING_*
 *
 * Every issue collected by this validator is consumed by:
 *   - `l10_6-family-audit` (Phase E)
 *   - the L10.6 certification band suite (Phase F)
 */

import {
  L10HypothesisFamilyDefinition,
  hasAllRequiredL10FamilySurfaces,
} from '../contracts/hypothesis-family-definition';
import {
  L10FamilyValidationIssue,
  L10FamilyValidationReport,
  L10FamilyViolationCode,
  L10HypothesisFamilyId,
  L10TemplateLegalityClass,
  L10TemplateRegimeRequirement,
  L10TemplateSequenceRequirement,
  L10_PRODUCTION_FAMILY_ROLLOUT_PHASE,
  foldL10FamilyLegality,
  getL10ProductionTemplatesForFamily,
  isL10RegisteredProductionFamily,
  makeL10FamilyIssue,
} from '../contracts/hypothesis-template-policy';

/**
 * §10.6.3.5 / §10.6.15 — Validate a single family definition.
 *
 * The validator runs even if `hasAllRequiredL10FamilySurfaces` fails,
 * so that callers always get a full issue set instead of halting on the
 * first missing surface.
 */
export function validateL10FamilyDefinition(
  def: L10HypothesisFamilyDefinition,
): L10FamilyValidationReport {
  const issues: L10FamilyValidationIssue[] = [];

  if (!isL10RegisteredProductionFamily(def.family_id)) {
    issues.push(
      makeL10FamilyIssue(
        L10FamilyViolationCode.FAMILY_ID_UNREGISTERED,
        `Family '${def.family_id}' is not a canonical production family.`,
        { family_id: def.family_id },
      ),
    );
  }

  if (!hasAllRequiredL10FamilySurfaces(def)) {
    if (def.legal_scope_types.length === 0) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.FAMILY_MISSING_LEGAL_SCOPE_TYPES,
          `Family '${def.family_id}' declares no legal scope types.`,
          { family_id: def.family_id },
        ),
      );
    }
    if (def.legal_support_domains.length === 0) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.FAMILY_MISSING_SUPPORT_DOMAINS,
          `Family '${def.family_id}' declares no support domains.`,
          { family_id: def.family_id },
        ),
      );
    }
    if (def.legal_contradiction_domains.length === 0) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.FAMILY_MISSING_CONTRADICTION_DOMAINS,
          `Family '${def.family_id}' declares no contradiction domains.`,
          { family_id: def.family_id },
        ),
      );
    }
    if (!def.rollout_phase) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.FAMILY_MISSING_ROLLOUT_PHASE,
          `Family '${def.family_id}' is missing a rollout phase.`,
          { family_id: def.family_id },
        ),
      );
    }
    if (!def.default_restriction_posture) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.FAMILY_MISSING_RESTRICTION_DEFAULT,
          `Family '${def.family_id}' is missing a default restriction posture.`,
          { family_id: def.family_id },
        ),
      );
    }
  }

  if (!def.regime_requirement ||
    !(def.regime_requirement in L10TemplateRegimeRequirement)) {
    issues.push(
      makeL10FamilyIssue(
        L10FamilyViolationCode.FAMILY_MISSING_REGIME_REQUIREMENT,
        `Family '${def.family_id}' regime requirement is not declared.`,
        { family_id: def.family_id },
      ),
    );
  }

  if (!def.sequence_requirement ||
    !(def.sequence_requirement in L10TemplateSequenceRequirement)) {
    issues.push(
      makeL10FamilyIssue(
        L10FamilyViolationCode.FAMILY_MISSING_SEQUENCE_REQUIREMENT,
        `Family '${def.family_id}' sequence requirement is not declared.`,
        { family_id: def.family_id },
      ),
    );
  }

  // §10.6.3.5 — canonical rollout phase must match canonical mapping.
  const canonicalPhase = L10_PRODUCTION_FAMILY_ROLLOUT_PHASE[def.family_id];
  if (canonicalPhase && def.rollout_phase !== canonicalPhase) {
    issues.push(
      makeL10FamilyIssue(
        L10FamilyViolationCode.FAMILY_MISSING_ROLLOUT_PHASE,
        `Family '${def.family_id}' rollout phase '${def.rollout_phase}' ` +
          `disagrees with canonical '${canonicalPhase}'.`,
        { family_id: def.family_id },
      ),
    );
  }

  // §10.6.3.5 — template roster must match canonical mapping exactly.
  if (def.legal_templates.length === 0) {
    issues.push(
      makeL10FamilyIssue(
        L10FamilyViolationCode.FAMILY_TEMPLATE_LIST_EMPTY,
        `Family '${def.family_id}' declares no legal templates.`,
        { family_id: def.family_id },
      ),
    );
  } else {
    const canonical = new Set(getL10ProductionTemplatesForFamily(def.family_id));
    const declared = new Set(def.legal_templates);
    const missing = [...canonical].filter(t => !declared.has(t));
    const extraneous = [...declared].filter(t => !canonical.has(t));
    if (missing.length > 0 || extraneous.length > 0) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.FAMILY_TEMPLATE_LIST_DRIFT,
          `Family '${def.family_id}' template roster drifts from canonical ` +
            `mapping. missing=[${missing.join(',')}] extra=[${extraneous.join(',')}]`,
          {
            family_id: def.family_id,
            context: { missing, extraneous },
          },
        ),
      );
    }
  }

  // §10.6.2.4 — a family may not be in both `coexists_with` and
  // `incompatible_with` for the same counterparty.
  const coexists = new Set<L10HypothesisFamilyId>(def.coexists_with);
  for (const incompat of def.incompatible_with) {
    if (coexists.has(incompat)) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.FAMILY_SEMANTIC_OVERLAP,
          `Family '${def.family_id}' lists '${incompat}' as both coexist ` +
            `and incompatible.`,
          { family_id: def.family_id, context: { counterparty: incompat } },
        ),
      );
    }
  }
  if (coexists.has(def.family_id) || def.incompatible_with.includes(def.family_id)) {
    issues.push(
      makeL10FamilyIssue(
        L10FamilyViolationCode.FAMILY_SEMANTIC_OVERLAP,
        `Family '${def.family_id}' cannot list itself in coexists/incompatible.`,
        { family_id: def.family_id },
      ),
    );
  }

  const legality = foldL10FamilyLegality(issues.map(i => i.code));
  return {
    ok: issues.length === 0,
    issues,
    legality: issues.length === 0
      ? L10TemplateLegalityClass.CLEAN
      : legality,
  };
}

/**
 * §10.6.3.5 / §10.6.15 — Validate the full production family roster
 * in a single pass. Returns a merged report.
 */
export function validateL10FamilyDefinitionBatch(
  defs: readonly L10HypothesisFamilyDefinition[],
): L10FamilyValidationReport {
  const issues: L10FamilyValidationIssue[] = [];
  const seen = new Set<L10HypothesisFamilyId>();
  for (const def of defs) {
    if (seen.has(def.family_id)) {
      issues.push(
        makeL10FamilyIssue(
          L10FamilyViolationCode.FAMILY_DUPLICATE_ID,
          `Duplicate family definition for '${def.family_id}'.`,
          { family_id: def.family_id },
        ),
      );
    }
    seen.add(def.family_id);
    issues.push(...validateL10FamilyDefinition(def).issues);
  }
  return {
    ok: issues.length === 0,
    issues,
    legality: issues.length === 0
      ? L10TemplateLegalityClass.CLEAN
      : foldL10FamilyLegality(issues.map(i => i.code)),
  };
}
