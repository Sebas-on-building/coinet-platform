/**
 * L13.6 — Prompt Template Registry
 *
 * §13.6.9.3 — Production templates for the user-facing intent
 * classes. Each template carries the mandatory policy blocks
 * required by §13.6.10. The registry is keyed by template id;
 * lookup by intent returns the highest-priority production-enabled
 * template.
 *
 * Template content here is intentionally compact and deterministic
 * so that prompt-assembly replay hashes remain stable across
 * runs. Production deployments may override these templates via
 * the registry mutation API while preserving the template_id /
 * version contract.
 */

import { L13AnswerMode } from '../contracts/explanation-restriction-profile';
import { L13AIOutputClass } from '../contracts/ai-output';
import {
  L13PromptRequiredPackageSection,
  L13PromptStyleClass,
  L13PromptTemplate,
  L13PromptTemplateStatus,
  L13_MANDATORY_PROMPT_POLICY_BLOCKS,
  isL13PromptTemplateUsable,
} from '../contracts/prompt-template';
import { L13UserIntentClass } from '../contracts/user-intent-binding';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

const ENGINE_HIERARCHY = [
  'You are the explanation voice of the Coinet judgment engine.',
  'You may only explain governed engine output from L3 through L12.',
  'You may not invent, predict, recommend, or rebuild lower layers.',
].join(' ');

const NO_INVENTION = [
  'You may use only evidence, contradictions, scenarios, scores,',
  'and hypotheses present in the supplied input package. Do not',
  'invent whales, accumulation, support levels, triggers, or',
  'invalidations that are not in the package.',
].join(' ');

const OBSERVATION_INFERENCE = [
  'Observation sections must state engine-reported facts. Inference',
  'sections may interpret those facts but must use hedged language.',
].join(' ');

const CONTRADICTION_DISCLOSURE = [
  'When the package carries active contradiction, you must mention it',
  'and explain how it narrows the interpretation. Do not minimise or',
  'override contradiction with positive evidence.',
].join(' ');

const CONFIDENCE_PHRASING = [
  'Use confidence language no stronger than the package permits.',
  'Never say guaranteed, locked in, will pump, will dump, almost',
  'certainly, or this confirms. Use conditional phrasing for paths.',
].join(' ');

const SCENARIO_CONDITIONALITY = [
  'Treat scenarios as conditional paths bound to triggers and',
  'invalidations. Never present a scenario as a winning outcome.',
].join(' ');

const NON_RECOMMENDATION = [
  'Do not give buy, sell, hold, avoid, entry, exit, position-sizing,',
  'or leverage instructions. You explain engine state; you do not',
  'instruct trades.',
].join(' ');

const BLOCKED_CLAIM = [
  'When the package signals a blocked claim type, refuse that claim',
  'inside the output rather than emitting it.',
].join(' ');

const OUTPUT_SCHEMA_INSTRUCTION = [
  'Return a JSON object with the fields: headline, summary,',
  'observation, inference, uncertainty, contradiction, scenario,',
  'trigger_invalidation. Each field is a string. Optional refusal',
  'string only when refusing.',
].join(' ');

const SYSTEM_ROLE_BASE =
  'Coinet AI Judgment & Explanation Layer (L13). Voice of the engine.';

interface TemplateSpec {
  readonly id: string;
  readonly version: string;
  readonly intents: readonly L13UserIntentClass[];
  readonly outputClasses: readonly L13AIOutputClass[];
  readonly answerModes: readonly L13AnswerMode[];
  readonly styleClasses: readonly L13PromptStyleClass[];
  readonly requiredSections: readonly L13PromptRequiredPackageSection[];
  readonly status: L13PromptTemplateStatus;
}

const SPECS: readonly TemplateSpec[] = [
  {
    id: 'l13.prompt.market_overview.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.WHATS_HAPPENING],
    outputClasses: [L13AIOutputClass.MARKET_EXPLANATION],
    answerModes: [
      L13AnswerMode.SUMMARIZE_MARKET_STATE,
      L13AnswerMode.EXPLAIN,
    ],
    styleClasses: [
      L13PromptStyleClass.NORMAL,
      L13PromptStyleClass.CONCISE,
    ],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.VALIDATION_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.REGIME_SUMMARY,
      L13PromptRequiredPackageSection.SEQUENCE_SUMMARY,
      L13PromptRequiredPackageSection.HYPOTHESIS_SUMMARY,
      L13PromptRequiredPackageSection.SCORE_SUMMARY,
      L13PromptRequiredPackageSection.SCENARIO_SUMMARY,
      L13PromptRequiredPackageSection.CONFIDENCE_BREAKDOWN,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.why_moving.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.WHY_IS_THIS_MOVING],
    outputClasses: [L13AIOutputClass.MARKET_EXPLANATION],
    answerModes: [L13AnswerMode.EXPLAIN],
    styleClasses: [L13PromptStyleClass.NORMAL],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.VALIDATION_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.HYPOTHESIS_SUMMARY,
      L13PromptRequiredPackageSection.SCORE_SUMMARY,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.what_next.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.WHATS_NEXT],
    outputClasses: [L13AIOutputClass.SCENARIO_EXPLANATION],
    answerModes: [L13AnswerMode.EXPLAIN_SCENARIO],
    styleClasses: [L13PromptStyleClass.NORMAL],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.SCENARIO_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.scenario_explanation.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.EXPLAIN_SCENARIO],
    outputClasses: [L13AIOutputClass.SCENARIO_EXPLANATION],
    answerModes: [L13AnswerMode.EXPLAIN_SCENARIO],
    styleClasses: [L13PromptStyleClass.NORMAL],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.SCENARIO_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.score_explanation.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.EXPLAIN_SCORE],
    outputClasses: [L13AIOutputClass.SCORE_EXPLANATION],
    answerModes: [L13AnswerMode.EXPLAIN_SCORE],
    styleClasses: [L13PromptStyleClass.NORMAL],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.SCORE_SUMMARY,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.hypothesis_explanation.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.EXPLAIN_HYPOTHESIS],
    outputClasses: [L13AIOutputClass.MARKET_EXPLANATION],
    answerModes: [L13AnswerMode.EXPLAIN_HYPOTHESIS],
    styleClasses: [L13PromptStyleClass.NORMAL],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.HYPOTHESIS_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.contradiction_explanation.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.CONTRADICTION_INSIGHT],
    outputClasses: [L13AIOutputClass.CONTRADICTION_EXPLANATION],
    answerModes: [L13AnswerMode.DISCLOSE_CONTRADICTION],
    styleClasses: [L13PromptStyleClass.NORMAL],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.alert_text.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.WRITE_ALERT],
    outputClasses: [L13AIOutputClass.ALERT_TEXT],
    answerModes: [L13AnswerMode.WRITE_ALERT],
    styleClasses: [L13PromptStyleClass.ALERT_TEXT],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.SCENARIO_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.asset_comparison.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.COMPARE_ASSETS],
    outputClasses: [L13AIOutputClass.ASSET_COMPARISON],
    answerModes: [L13AnswerMode.COMPARE_ASSETS],
    styleClasses: [L13PromptStyleClass.NORMAL],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.VALIDATION_SUMMARY,
      L13PromptRequiredPackageSection.HYPOTHESIS_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.thesis_comparison.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.COMPARE_THESES],
    outputClasses: [L13AIOutputClass.THESIS_COMPARISON],
    answerModes: [L13AnswerMode.COMPARE_THESES],
    styleClasses: [L13PromptStyleClass.NORMAL],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.HYPOTHESIS_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.structured_report.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.WRITE_REPORT],
    outputClasses: [L13AIOutputClass.STRUCTURED_REPORT],
    answerModes: [L13AnswerMode.WRITE_REPORT],
    styleClasses: [L13PromptStyleClass.STRUCTURED_REPORT],
    requiredSections: [
      L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY,
      L13PromptRequiredPackageSection.VALIDATION_SUMMARY,
      L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY,
      L13PromptRequiredPackageSection.REGIME_SUMMARY,
      L13PromptRequiredPackageSection.SEQUENCE_SUMMARY,
      L13PromptRequiredPackageSection.HYPOTHESIS_SUMMARY,
      L13PromptRequiredPackageSection.SCORE_SUMMARY,
      L13PromptRequiredPackageSection.SCENARIO_SUMMARY,
      L13PromptRequiredPackageSection.CONFIDENCE_BREAKDOWN,
      L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE,
      L13PromptRequiredPackageSection.RESTRICTION_PROFILE,
      L13PromptRequiredPackageSection.EVIDENCE_DIGEST,
    ],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
  {
    id: 'l13.prompt.refusal.v1',
    version: '1.0.0',
    intents: [L13UserIntentClass.REQUESTS_TRADE_ADVICE],
    outputClasses: [L13AIOutputClass.UNCERTAINTY_DISCLOSURE],
    answerModes: [L13AnswerMode.REFUSE_UNSUPPORTED],
    styleClasses: [L13PromptStyleClass.REFUSAL_ONLY],
    requiredSections: [],
    status: L13PromptTemplateStatus.PRODUCTION_ENABLED,
  },
];

function buildTemplate(spec: TemplateSpec): L13PromptTemplate {
  const replayHash = fnv1a(
    [
      spec.id,
      spec.version,
      spec.intents.slice().sort().join(','),
      spec.outputClasses.slice().sort().join(','),
      spec.answerModes.slice().sort().join(','),
      spec.styleClasses.slice().sort().join(','),
      spec.requiredSections.slice().sort().join(','),
      spec.status,
      POLICY_V,
    ].join('|'),
  );
  return {
    prompt_template_id: spec.id,
    prompt_template_version: spec.version,
    supported_intents: spec.intents,
    supported_output_classes: spec.outputClasses,
    supported_answer_modes: spec.answerModes,
    system_role_block: SYSTEM_ROLE_BASE,
    engine_hierarchy_block: ENGINE_HIERARCHY,
    no_invention_block: NO_INVENTION,
    observation_inference_block: OBSERVATION_INFERENCE,
    contradiction_disclosure_block: CONTRADICTION_DISCLOSURE,
    confidence_phrasing_block: CONFIDENCE_PHRASING,
    scenario_conditionality_block: SCENARIO_CONDITIONALITY,
    non_recommendation_block: NON_RECOMMENDATION,
    blocked_claim_block: BLOCKED_CLAIM,
    output_schema_instruction: OUTPUT_SCHEMA_INSTRUCTION,
    response_length_policy_ref: 'l13.length.normal.v1',
    language_tone_policy_ref: 'l13.tone.neutral.v1',
    required_input_package_sections: spec.requiredSections,
    allowed_style_classes: spec.styleClasses,
    template_status: spec.status,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

const REGISTRY: ReadonlyMap<string, L13PromptTemplate> = new Map(
  SPECS.map(s => [s.id, buildTemplate(s)] as const),
);

export function getL13PromptTemplate(
  id: string,
): L13PromptTemplate | undefined {
  return REGISTRY.get(id);
}

export function listL13PromptTemplates(): readonly L13PromptTemplate[] {
  return Array.from(REGISTRY.values());
}

/**
 * §13.6.9 — Select the best template for the given intent. Picks
 * the highest-priority production-enabled template whose
 * supported_intents includes the input intent. Falls back to the
 * refusal template only when intent is adversarial or no rule
 * matches.
 */
export function selectL13PromptTemplate(
  intent: L13UserIntentClass,
): L13PromptTemplate | undefined {
  for (const t of REGISTRY.values()) {
    if (
      isL13PromptTemplateUsable(t.template_status) &&
      t.supported_intents.includes(intent)
    ) {
      return t;
    }
  }
  return REGISTRY.get('l13.prompt.refusal.v1');
}

/**
 * §13.6.10.1 — Return true when every mandatory policy block is
 * present and non-empty on `template`.
 */
export function l13TemplateHasAllMandatoryBlocks(
  template: L13PromptTemplate,
): boolean {
  for (const field of L13_MANDATORY_PROMPT_POLICY_BLOCKS) {
    const value = template[field] as unknown as string;
    if (typeof value !== 'string' || value.trim().length === 0) {
      return false;
    }
  }
  return true;
}
