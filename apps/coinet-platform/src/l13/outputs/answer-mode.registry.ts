/**
 * L13.7 — Answer Mode Registry
 *
 * §13.7.6 — Canonical registry of all production answer modes.
 * Every L13.7 mode is registered exactly once with its supported
 * intents, output classes, required context, required output
 * sections, required disclosures, forbidden omissions, raw-metric
 * policy, verbosity, rendering policy, and status.
 *
 * The validator enforces that production-enabled modes carry all
 * mandatory metadata and that DEBUG_EXPLANATION remains
 * INTERNAL_ONLY.
 */

import { L13AIOutputClass } from '../contracts/ai-output';
import {
  L13OutputSectionClass,
} from '../contracts/output-section';
import { L13UserIntentClass } from '../contracts/user-intent-binding';
import {
  L13AnswerModeStatus,
  L13ModeDisclosureRequirement,
  L13ModeForbiddenOmission,
  L13ModeRenderingPolicy,
  L13ModeVerbosityPolicy,
  L13ProductAnswerMode,
  L13RawMetricDisclosurePolicy,
  L13RequiredModeContextClass,
} from '../contracts/product-answer-mode';
import type { L13AnswerModeDefinition } from '../contracts/answer-mode-definition';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

interface ModeSpec {
  readonly answer_mode: L13ProductAnswerMode;
  readonly status: L13AnswerModeStatus;
  readonly intents: readonly L13UserIntentClass[];
  readonly output_classes: readonly L13AIOutputClass[];
  readonly required_context:
    readonly L13RequiredModeContextClass[];
  readonly optional_context:
    readonly L13RequiredModeContextClass[];
  readonly required_sections: readonly L13OutputSectionClass[];
  readonly disclosures: readonly L13ModeDisclosureRequirement[];
  readonly forbidden: readonly L13ModeForbiddenOmission[];
  readonly raw_metric_policy: L13RawMetricDisclosurePolicy;
  readonly verbosity: L13ModeVerbosityPolicy;
  readonly rendering: L13ModeRenderingPolicy;
  readonly watchpoints: boolean;
  readonly forward_paths: boolean;
  readonly comparison_conclusion: boolean;
  readonly directional_language: boolean;
}

const SPECS: readonly ModeSpec[] = [
  {
    answer_mode: L13ProductAnswerMode.SHORT_CHAT,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [
      L13UserIntentClass.WHATS_HAPPENING,
      L13UserIntentClass.WHY_IS_THIS_MOVING,
    ],
    output_classes: [L13AIOutputClass.MARKET_EXPLANATION],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.CONTRADICTION,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
    ],
    optional_context: [
      L13RequiredModeContextClass.SCENARIO_CONTEXT,
      L13RequiredModeContextClass.HYPOTHESIS,
    ],
    required_sections: [
      L13OutputSectionClass.SUMMARY,
      L13OutputSectionClass.OBSERVATION,
      L13OutputSectionClass.UNCERTAINTY,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.CONTRADICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.DIRECT_ANSWER,
      L13ModeForbiddenOmission.ACTIVE_CONTRADICTION,
      L13ModeForbiddenOmission.UNCERTAINTY,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.FORBIDDEN_BY_DEFAULT,
    verbosity: L13ModeVerbosityPolicy.CONCISE,
    rendering: L13ModeRenderingPolicy.CHAT_BUBBLE,
    watchpoints: false,
    forward_paths: false,
    comparison_conclusion: false,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [
      L13UserIntentClass.WHATS_HAPPENING,
      L13UserIntentClass.WHATS_NEXT,
      L13UserIntentClass.WHY_IS_THIS_MOVING,
      L13UserIntentClass.EXPLAIN_HYPOTHESIS,
      L13UserIntentClass.EXPLAIN_REGIME,
      L13UserIntentClass.EXPLAIN_SEQUENCE,
    ],
    output_classes: [
      L13AIOutputClass.MARKET_EXPLANATION,
      L13AIOutputClass.SCENARIO_EXPLANATION,
    ],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.CONTRADICTION,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
      L13RequiredModeContextClass.HYPOTHESIS,
    ],
    optional_context: [
      L13RequiredModeContextClass.SCENARIO_CONTEXT,
      L13RequiredModeContextClass.SCORE_CONTEXT,
    ],
    required_sections: [
      L13OutputSectionClass.SUMMARY,
      L13OutputSectionClass.OBSERVATION,
      L13OutputSectionClass.INFERENCE,
      L13OutputSectionClass.UNCERTAINTY,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.CONTRADICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.SCENARIO_CONDITIONALITY_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.DIRECT_ANSWER,
      L13ModeForbiddenOmission.ACTIVE_CONTRADICTION,
      L13ModeForbiddenOmission.UNCERTAINTY,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.FORBIDDEN_BY_DEFAULT,
    verbosity: L13ModeVerbosityPolicy.NORMAL,
    rendering: L13ModeRenderingPolicy.CHAT_RICH_CARD,
    watchpoints: true,
    forward_paths: true,
    comparison_conclusion: false,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.DEEP_ANALYSIS,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [
      L13UserIntentClass.WHATS_HAPPENING,
      L13UserIntentClass.WHATS_NEXT,
      L13UserIntentClass.WHY_IS_THIS_MOVING,
      L13UserIntentClass.EXPLAIN_SCENARIO,
      L13UserIntentClass.EXPLAIN_SCORE,
      L13UserIntentClass.EXPLAIN_HYPOTHESIS,
    ],
    output_classes: [
      L13AIOutputClass.MARKET_EXPLANATION,
      L13AIOutputClass.SCENARIO_EXPLANATION,
      L13AIOutputClass.SCORE_EXPLANATION,
    ],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.VALIDATION,
      L13RequiredModeContextClass.CONTRADICTION,
      L13RequiredModeContextClass.REGIME,
      L13RequiredModeContextClass.SEQUENCE,
      L13RequiredModeContextClass.HYPOTHESIS,
      L13RequiredModeContextClass.SCORE_CONTEXT,
      L13RequiredModeContextClass.SCENARIO_CONTEXT,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
    ],
    optional_context: [
      L13RequiredModeContextClass.EVIDENCE_DIGEST,
    ],
    required_sections: [
      L13OutputSectionClass.SUMMARY,
      L13OutputSectionClass.OBSERVATION,
      L13OutputSectionClass.INFERENCE,
      L13OutputSectionClass.UNCERTAINTY,
      L13OutputSectionClass.SCENARIO,
      L13OutputSectionClass.TRIGGER_INVALIDATION,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.CONTRADICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.SCENARIO_CONDITIONALITY_DISCLOSURE,
      L13ModeDisclosureRequirement.CONFIDENCE_CAP_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.DIRECT_ANSWER,
      L13ModeForbiddenOmission.ACTIVE_CONTRADICTION,
      L13ModeForbiddenOmission.UNCERTAINTY,
      L13ModeForbiddenOmission.RESTRICTION,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.ALLOWED_ONLY_WHEN_USER_REQUESTS,
    verbosity: L13ModeVerbosityPolicy.DETAILED,
    rendering: L13ModeRenderingPolicy.CHAT_RICH_CARD,
    watchpoints: true,
    forward_paths: true,
    comparison_conclusion: false,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.ALERT,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [L13UserIntentClass.WRITE_ALERT],
    output_classes: [L13AIOutputClass.ALERT_TEXT],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.SCENARIO_CONTEXT,
      L13RequiredModeContextClass.CONTRADICTION,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
    ],
    optional_context: [
      L13RequiredModeContextClass.SCORE_CONTEXT,
      L13RequiredModeContextClass.HYPOTHESIS,
    ],
    required_sections: [
      L13OutputSectionClass.HEADLINE,
      L13OutputSectionClass.SUMMARY,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.CONFIDENCE_CAP_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.CONFIDENCE_CHANGE,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.FORBIDDEN_BY_DEFAULT,
    verbosity: L13ModeVerbosityPolicy.ALERT_GRADE,
    rendering: L13ModeRenderingPolicy.ALERT_BANNER,
    watchpoints: true,
    forward_paths: false,
    comparison_conclusion: false,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.STRUCTURED_REPORT,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [L13UserIntentClass.WRITE_REPORT],
    output_classes: [L13AIOutputClass.STRUCTURED_REPORT],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.VALIDATION,
      L13RequiredModeContextClass.CONTRADICTION,
      L13RequiredModeContextClass.REGIME,
      L13RequiredModeContextClass.SEQUENCE,
      L13RequiredModeContextClass.HYPOTHESIS,
      L13RequiredModeContextClass.SCORE_CONTEXT,
      L13RequiredModeContextClass.SCENARIO_CONTEXT,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
      L13RequiredModeContextClass.EVIDENCE_DIGEST,
    ],
    optional_context: [],
    required_sections: [
      L13OutputSectionClass.HEADLINE,
      L13OutputSectionClass.SUMMARY,
      L13OutputSectionClass.OBSERVATION,
      L13OutputSectionClass.INFERENCE,
      L13OutputSectionClass.UNCERTAINTY,
      L13OutputSectionClass.CONTRADICTION,
      L13OutputSectionClass.SCENARIO,
      L13OutputSectionClass.TRIGGER_INVALIDATION,
      L13OutputSectionClass.RESTRICTION,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.CONTRADICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.SCENARIO_CONDITIONALITY_DISCLOSURE,
      L13ModeDisclosureRequirement.CONFIDENCE_CAP_DISCLOSURE,
      L13ModeDisclosureRequirement.MISSING_DATA_DISCLOSURE,
      L13ModeDisclosureRequirement.DRIFT_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.EXECUTIVE_SUMMARY,
      L13ModeForbiddenOmission.CONTRADICTION_SECTION,
      L13ModeForbiddenOmission.UNCERTAINTY_SECTION,
      L13ModeForbiddenOmission.TRIGGER_SECTION,
      L13ModeForbiddenOmission.INVALIDATION_SECTION,
      L13ModeForbiddenOmission.RESTRICTION_SECTION,
      L13ModeForbiddenOmission.APPENDIX_OR_EVIDENCE_REFS,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.ALLOWED_FOR_STRUCTURED_REPORT,
    verbosity: L13ModeVerbosityPolicy.REPORT_GRADE,
    rendering: L13ModeRenderingPolicy.REPORT_PANEL,
    watchpoints: true,
    forward_paths: true,
    comparison_conclusion: false,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.ASSET_COMPARISON,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [L13UserIntentClass.COMPARE_ASSETS],
    output_classes: [L13AIOutputClass.ASSET_COMPARISON],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.VALIDATION,
      L13RequiredModeContextClass.CONTRADICTION,
      L13RequiredModeContextClass.HYPOTHESIS,
      L13RequiredModeContextClass.SCORE_CONTEXT,
      L13RequiredModeContextClass.SCENARIO_CONTEXT,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
    ],
    optional_context: [],
    required_sections: [
      L13OutputSectionClass.SUMMARY,
      L13OutputSectionClass.OBSERVATION,
      L13OutputSectionClass.INFERENCE,
      L13OutputSectionClass.UNCERTAINTY,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.CONTRADICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.COMPARISON_ASYMMETRY_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.COMPARISON_ASYMMETRY,
      L13ModeForbiddenOmission.COMPARISON_DRIFT_ASYMMETRY,
      L13ModeForbiddenOmission.COMPARISON_RESTRICTION_ASYMMETRY,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.ALLOWED_ONLY_WHEN_USER_REQUESTS,
    verbosity: L13ModeVerbosityPolicy.DETAILED,
    rendering: L13ModeRenderingPolicy.COMPARISON_TABLE,
    watchpoints: false,
    forward_paths: false,
    comparison_conclusion: true,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.THESIS_COMPARISON,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [L13UserIntentClass.COMPARE_THESES],
    output_classes: [L13AIOutputClass.THESIS_COMPARISON],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.HYPOTHESIS,
      L13RequiredModeContextClass.CONTRADICTION,
      L13RequiredModeContextClass.SCENARIO_CONTEXT,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
    ],
    optional_context: [],
    required_sections: [
      L13OutputSectionClass.SUMMARY,
      L13OutputSectionClass.OBSERVATION,
      L13OutputSectionClass.INFERENCE,
      L13OutputSectionClass.UNCERTAINTY,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.CONTRADICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.ACTIVE_CONTRADICTION,
      L13ModeForbiddenOmission.UNCERTAINTY,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.FORBIDDEN_BY_DEFAULT,
    verbosity: L13ModeVerbosityPolicy.DETAILED,
    rendering: L13ModeRenderingPolicy.COMPARISON_TABLE,
    watchpoints: false,
    forward_paths: false,
    comparison_conclusion: true,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.SCENARIO_EXPLANATION,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [L13UserIntentClass.EXPLAIN_SCENARIO],
    output_classes: [L13AIOutputClass.SCENARIO_EXPLANATION],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.SCENARIO_CONTEXT,
      L13RequiredModeContextClass.CONTRADICTION,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
    ],
    optional_context: [],
    required_sections: [
      L13OutputSectionClass.SUMMARY,
      L13OutputSectionClass.SCENARIO,
      L13OutputSectionClass.TRIGGER_INVALIDATION,
      L13OutputSectionClass.UNCERTAINTY,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.SCENARIO_CONDITIONALITY_DISCLOSURE,
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.CONFIDENCE_CAP_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.SCENARIO_BASE_CASE,
      L13ModeForbiddenOmission.TRIGGER,
      L13ModeForbiddenOmission.INVALIDATION,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.FORBIDDEN_BY_DEFAULT,
    verbosity: L13ModeVerbosityPolicy.DETAILED,
    rendering: L13ModeRenderingPolicy.SCENARIO_PANEL,
    watchpoints: true,
    forward_paths: true,
    comparison_conclusion: false,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.SCORE_EXPLANATION,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [L13UserIntentClass.EXPLAIN_SCORE],
    output_classes: [L13AIOutputClass.SCORE_EXPLANATION],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.SCORE_CONTEXT,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
    ],
    optional_context: [
      L13RequiredModeContextClass.CONTRADICTION,
    ],
    required_sections: [
      L13OutputSectionClass.SUMMARY,
      L13OutputSectionClass.SCORE,
      L13OutputSectionClass.UNCERTAINTY,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.MISSING_DATA_DISCLOSURE,
      L13ModeDisclosureRequirement.DRIFT_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.SCORE_ATTRIBUTION,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.ALLOWED_ONLY_WHEN_USER_REQUESTS,
    verbosity: L13ModeVerbosityPolicy.DETAILED,
    rendering: L13ModeRenderingPolicy.SCORE_PANEL,
    watchpoints: false,
    forward_paths: false,
    comparison_conclusion: false,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.CONTRADICTION_EXPLANATION,
    status: L13AnswerModeStatus.PRODUCTION_ENABLED,
    intents: [L13UserIntentClass.CONTRADICTION_INSIGHT],
    output_classes: [
      L13AIOutputClass.CONTRADICTION_EXPLANATION,
    ],
    required_context: [
      L13RequiredModeContextClass.CANONICAL_ENTITY,
      L13RequiredModeContextClass.CONTRADICTION,
      L13RequiredModeContextClass.HYPOTHESIS,
      L13RequiredModeContextClass.SCENARIO_CONTEXT,
      L13RequiredModeContextClass.UNCERTAINTY,
      L13RequiredModeContextClass.RESTRICTION,
    ],
    optional_context: [],
    required_sections: [
      L13OutputSectionClass.SUMMARY,
      L13OutputSectionClass.CONTRADICTION,
      L13OutputSectionClass.UNCERTAINTY,
    ],
    disclosures: [
      L13ModeDisclosureRequirement.CONTRADICTION_DISCLOSURE,
      L13ModeDisclosureRequirement.UNCERTAINTY_DISCLOSURE,
      L13ModeDisclosureRequirement.RESTRICTION_DISCLOSURE,
    ],
    forbidden: [
      L13ModeForbiddenOmission.ACTIVE_CONTRADICTION,
      L13ModeForbiddenOmission.LINEAGE_REFS,
    ],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.FORBIDDEN_BY_DEFAULT,
    verbosity: L13ModeVerbosityPolicy.DETAILED,
    rendering: L13ModeRenderingPolicy.CONTRADICTION_PANEL,
    watchpoints: false,
    forward_paths: false,
    comparison_conclusion: false,
    directional_language: false,
  },
  {
    answer_mode: L13ProductAnswerMode.DEBUG_EXPLANATION,
    status: L13AnswerModeStatus.INTERNAL_ONLY,
    intents: [],
    output_classes: [L13AIOutputClass.UNCERTAINTY_DISCLOSURE],
    required_context: [],
    optional_context: [],
    required_sections: [],
    disclosures: [],
    forbidden: [L13ModeForbiddenOmission.LINEAGE_REFS],
    raw_metric_policy:
      L13RawMetricDisclosurePolicy.ALLOWED_FOR_INTERNAL_DEBUG,
    verbosity: L13ModeVerbosityPolicy.DEBUG_GRADE,
    rendering: L13ModeRenderingPolicy.DEBUG_TREE,
    watchpoints: false,
    forward_paths: false,
    comparison_conclusion: false,
    directional_language: false,
  },
];

function buildDefinition(spec: ModeSpec): L13AnswerModeDefinition {
  const replayHash = fnv1a(
    [
      spec.answer_mode,
      spec.status,
      spec.intents.slice().sort().join(','),
      spec.output_classes.slice().sort().join(','),
      spec.required_context.slice().sort().join(','),
      spec.optional_context.slice().sort().join(','),
      spec.required_sections.slice().sort().join(','),
      spec.disclosures.slice().sort().join(','),
      spec.forbidden.slice().sort().join(','),
      spec.raw_metric_policy,
      spec.verbosity,
      spec.rendering,
      String(spec.watchpoints),
      String(spec.forward_paths),
      String(spec.comparison_conclusion),
      String(spec.directional_language),
      POLICY_V,
    ].join('|'),
  );
  return {
    answer_mode: spec.answer_mode,
    answer_mode_status: spec.status,
    supported_intents: spec.intents,
    supported_output_classes: spec.output_classes,
    required_input_package_sections: spec.required_context,
    optional_input_package_sections: spec.optional_context,
    required_l13_output_sections: spec.required_sections,
    required_disclosure_classes: spec.disclosures,
    forbidden_omissions: spec.forbidden,
    raw_metric_disclosure_policy: spec.raw_metric_policy,
    verbosity_policy: spec.verbosity,
    rendering_policy: spec.rendering,
    may_include_watchpoints: spec.watchpoints,
    may_include_forward_paths: spec.forward_paths,
    may_include_comparison_conclusion: spec.comparison_conclusion,
    may_include_directional_language: spec.directional_language,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

const REGISTRY: ReadonlyMap<
  L13ProductAnswerMode,
  L13AnswerModeDefinition
> = new Map(
  SPECS.map(s => [s.answer_mode, buildDefinition(s)] as const),
);

export function getL13AnswerModeDefinition(
  mode: L13ProductAnswerMode,
): L13AnswerModeDefinition | undefined {
  return REGISTRY.get(mode);
}

export function listL13AnswerModeDefinitions():
  readonly L13AnswerModeDefinition[] {
  return Array.from(REGISTRY.values());
}

export function listL13ProductionAnswerModes():
  readonly L13ProductAnswerMode[] {
  return SPECS.filter(
    s =>
      s.status === L13AnswerModeStatus.PRODUCTION_ENABLED ||
      s.status ===
        L13AnswerModeStatus.PRODUCTION_ENABLED_WITH_RESTRICTIONS,
  ).map(s => s.answer_mode);
}

export function l13AnswerModeMatchesIntent(
  mode: L13ProductAnswerMode,
  intent: L13UserIntentClass,
): boolean {
  const def = REGISTRY.get(mode);
  if (!def) return false;
  return def.supported_intents.includes(intent);
}
