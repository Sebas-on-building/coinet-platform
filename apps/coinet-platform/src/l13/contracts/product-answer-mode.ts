/**
 * L13.7 — Product Answer Mode Contract
 *
 * §13.7.3 / §13.7.4 — Production answer modes that L13.7 supports.
 * Distinct from the L13.2 `L13AnswerMode` (`./explanation-restriction-profile`)
 * which captures the request-handling answer-mode taxonomy used by
 * the input-package layer. L13.7 introduces a product-surface
 * taxonomy: short / standard / deep chat, alerts, reports,
 * comparisons, and a debug surface that is strictly internal.
 *
 * §13.7.4 — Each product answer mode carries a status that
 * controls whether it may emit to end users.
 */

export enum L13ProductAnswerMode {
  SHORT_CHAT = 'SHORT_CHAT',
  STANDARD_CHAT = 'STANDARD_CHAT',
  DEEP_ANALYSIS = 'DEEP_ANALYSIS',
  ALERT = 'ALERT',
  STRUCTURED_REPORT = 'STRUCTURED_REPORT',
  ASSET_COMPARISON = 'ASSET_COMPARISON',
  THESIS_COMPARISON = 'THESIS_COMPARISON',
  SCENARIO_EXPLANATION = 'SCENARIO_EXPLANATION',
  SCORE_EXPLANATION = 'SCORE_EXPLANATION',
  CONTRADICTION_EXPLANATION = 'CONTRADICTION_EXPLANATION',
  DEBUG_EXPLANATION = 'DEBUG_EXPLANATION',
}

export const ALL_L13_PRODUCT_ANSWER_MODES:
  readonly L13ProductAnswerMode[] =
  Object.values(L13ProductAnswerMode);

export enum L13AnswerModeStatus {
  PRODUCTION_ENABLED = 'PRODUCTION_ENABLED',
  PRODUCTION_ENABLED_WITH_RESTRICTIONS = 'PRODUCTION_ENABLED_WITH_RESTRICTIONS',
  INTERNAL_ONLY = 'INTERNAL_ONLY',
  SHADOW_ONLY = 'SHADOW_ONLY',
  DEPRECATED = 'DEPRECATED',
}

export const ALL_L13_ANSWER_MODE_STATUSES:
  readonly L13AnswerModeStatus[] =
  Object.values(L13AnswerModeStatus);

export function isL13UserEmittingModeStatus(
  status: L13AnswerModeStatus,
): boolean {
  return (
    status === L13AnswerModeStatus.PRODUCTION_ENABLED ||
    status ===
      L13AnswerModeStatus.PRODUCTION_ENABLED_WITH_RESTRICTIONS
  );
}

/**
 * §13.7.9 — Raw-metric disclosure policy taxonomy.
 */
export enum L13RawMetricDisclosurePolicy {
  FORBIDDEN_BY_DEFAULT = 'FORBIDDEN_BY_DEFAULT',
  ALLOWED_ONLY_WHEN_USER_REQUESTS = 'ALLOWED_ONLY_WHEN_USER_REQUESTS',
  ALLOWED_FOR_STRUCTURED_REPORT = 'ALLOWED_FOR_STRUCTURED_REPORT',
  ALLOWED_FOR_INTERNAL_DEBUG = 'ALLOWED_FOR_INTERNAL_DEBUG',
}

export const ALL_L13_RAW_METRIC_DISCLOSURE_POLICIES:
  readonly L13RawMetricDisclosurePolicy[] =
  Object.values(L13RawMetricDisclosurePolicy);

/**
 * §13.7.5 — Mode-level verbosity policy.
 */
export enum L13ModeVerbosityPolicy {
  CONCISE = 'CONCISE',
  NORMAL = 'NORMAL',
  DETAILED = 'DETAILED',
  REPORT_GRADE = 'REPORT_GRADE',
  ALERT_GRADE = 'ALERT_GRADE',
  DEBUG_GRADE = 'DEBUG_GRADE',
}

export const ALL_L13_MODE_VERBOSITY_POLICIES:
  readonly L13ModeVerbosityPolicy[] =
  Object.values(L13ModeVerbosityPolicy);

/**
 * §13.7.5 — Rendering policy hint. The product frontend uses this
 * to choose between bubble, banner, panel, modal, etc.
 */
export enum L13ModeRenderingPolicy {
  CHAT_BUBBLE = 'CHAT_BUBBLE',
  CHAT_RICH_CARD = 'CHAT_RICH_CARD',
  ALERT_BANNER = 'ALERT_BANNER',
  REPORT_PANEL = 'REPORT_PANEL',
  COMPARISON_TABLE = 'COMPARISON_TABLE',
  SCENARIO_PANEL = 'SCENARIO_PANEL',
  SCORE_PANEL = 'SCORE_PANEL',
  CONTRADICTION_PANEL = 'CONTRADICTION_PANEL',
  DEBUG_TREE = 'DEBUG_TREE',
}

export const ALL_L13_MODE_RENDERING_POLICIES:
  readonly L13ModeRenderingPolicy[] =
  Object.values(L13ModeRenderingPolicy);

/**
 * §13.7.5 — Required mode-context classes. Coarser than the L13.6
 * `L13PromptRequiredPackageSection`; this is the product-surface
 * level (e.g., "scenario context" rather than "scenario summary").
 */
export enum L13RequiredModeContextClass {
  CANONICAL_ENTITY = 'CANONICAL_ENTITY',
  VALIDATION = 'VALIDATION',
  CONTRADICTION = 'CONTRADICTION',
  REGIME = 'REGIME',
  SEQUENCE = 'SEQUENCE',
  HYPOTHESIS = 'HYPOTHESIS',
  SCORE_CONTEXT = 'SCORE_CONTEXT',
  SCENARIO_CONTEXT = 'SCENARIO_CONTEXT',
  CONFIDENCE_BREAKDOWN = 'CONFIDENCE_BREAKDOWN',
  UNCERTAINTY = 'UNCERTAINTY',
  RESTRICTION = 'RESTRICTION',
  EVIDENCE_DIGEST = 'EVIDENCE_DIGEST',
}

export const ALL_L13_REQUIRED_MODE_CONTEXT_CLASSES:
  readonly L13RequiredModeContextClass[] =
  Object.values(L13RequiredModeContextClass);

/**
 * §13.7.5 — Disclosure obligations attached to a mode.
 */
export enum L13ModeDisclosureRequirement {
  CONTRADICTION_DISCLOSURE = 'CONTRADICTION_DISCLOSURE',
  UNCERTAINTY_DISCLOSURE = 'UNCERTAINTY_DISCLOSURE',
  ACTIVE_INVALIDATION_DISCLOSURE = 'ACTIVE_INVALIDATION_DISCLOSURE',
  UNRESOLVED_TRIGGER_DISCLOSURE = 'UNRESOLVED_TRIGGER_DISCLOSURE',
  MISSING_DATA_DISCLOSURE = 'MISSING_DATA_DISCLOSURE',
  DRIFT_DISCLOSURE = 'DRIFT_DISCLOSURE',
  RESTRICTION_DISCLOSURE = 'RESTRICTION_DISCLOSURE',
  CONFIDENCE_CAP_DISCLOSURE = 'CONFIDENCE_CAP_DISCLOSURE',
  SCENARIO_CONDITIONALITY_DISCLOSURE = 'SCENARIO_CONDITIONALITY_DISCLOSURE',
  COMPARISON_ASYMMETRY_DISCLOSURE = 'COMPARISON_ASYMMETRY_DISCLOSURE',
}

export const ALL_L13_MODE_DISCLOSURE_REQUIREMENTS:
  readonly L13ModeDisclosureRequirement[] =
  Object.values(L13ModeDisclosureRequirement);

/**
 * §13.7.5 / §13.7.18 — Forbidden omissions per mode.
 */
export enum L13ModeForbiddenOmission {
  DIRECT_ANSWER = 'DIRECT_ANSWER',
  ACTIVE_CONTRADICTION = 'ACTIVE_CONTRADICTION',
  ACTIVE_INVALIDATION = 'ACTIVE_INVALIDATION',
  UNRESOLVED_TRIGGER = 'UNRESOLVED_TRIGGER',
  SCENARIO_BASE_CASE = 'SCENARIO_BASE_CASE',
  SCENARIO_ALTERNATIVE = 'SCENARIO_ALTERNATIVE',
  TRIGGER = 'TRIGGER',
  INVALIDATION = 'INVALIDATION',
  CONFIDENCE_CHANGE = 'CONFIDENCE_CHANGE',
  RESTRICTION = 'RESTRICTION',
  UNCERTAINTY = 'UNCERTAINTY',
  EVIDENCE_REFS = 'EVIDENCE_REFS',
  LINEAGE_REFS = 'LINEAGE_REFS',
  EXECUTIVE_SUMMARY = 'EXECUTIVE_SUMMARY',
  CONTRADICTION_SECTION = 'CONTRADICTION_SECTION',
  UNCERTAINTY_SECTION = 'UNCERTAINTY_SECTION',
  TRIGGER_SECTION = 'TRIGGER_SECTION',
  INVALIDATION_SECTION = 'INVALIDATION_SECTION',
  RESTRICTION_SECTION = 'RESTRICTION_SECTION',
  APPENDIX_OR_EVIDENCE_REFS = 'APPENDIX_OR_EVIDENCE_REFS',
  COMPARISON_ASYMMETRY = 'COMPARISON_ASYMMETRY',
  COMPARISON_DRIFT_ASYMMETRY = 'COMPARISON_DRIFT_ASYMMETRY',
  COMPARISON_RESTRICTION_ASYMMETRY = 'COMPARISON_RESTRICTION_ASYMMETRY',
  SCORE_ATTRIBUTION = 'SCORE_ATTRIBUTION',
}

export const ALL_L13_MODE_FORBIDDEN_OMISSIONS:
  readonly L13ModeForbiddenOmission[] =
  Object.values(L13ModeForbiddenOmission);
