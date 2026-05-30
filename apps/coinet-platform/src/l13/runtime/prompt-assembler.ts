/**
 * L13.6 — Prompt Assembler
 *
 * §13.6.11 — Combines a registered prompt template with the L13.2
 * input package, the answer mode, and the four policy refs into a
 * deterministic prompt assembly. Package content is serialised in
 * a stable, sorted form so the replay hash is stable across runs.
 *
 * §13.6.10.1 — A template missing any mandatory policy block is
 * rejected (caller validates via `l13TemplateHasAllMandatoryBlocks`).
 * §13.6.11.3 — Raw lower-layer surfaces never enter the assembled
 * prompt.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import {
  L13PromptRequiredPackageSection,
  type L13PromptTemplate,
} from '../contracts/prompt-template';
import type { L13PromptAssembly } from '../contracts/prompt-assembly';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

const SECTION_FIELD_MAP: Readonly<
  Record<L13PromptRequiredPackageSection, keyof L13AIInputPackage>
> = {
  [L13PromptRequiredPackageSection.CANONICAL_ENTITY_SUMMARY]:
    'canonical_entity_summary',
  [L13PromptRequiredPackageSection.VALIDATION_SUMMARY]:
    'validation_summary',
  [L13PromptRequiredPackageSection.CONTRADICTION_SUMMARY]:
    'contradiction_summary',
  [L13PromptRequiredPackageSection.REGIME_SUMMARY]: 'regime_summary',
  [L13PromptRequiredPackageSection.SEQUENCE_SUMMARY]:
    'sequence_summary',
  [L13PromptRequiredPackageSection.HYPOTHESIS_SUMMARY]:
    'hypothesis_summary',
  [L13PromptRequiredPackageSection.SCORE_SUMMARY]: 'score_summary',
  [L13PromptRequiredPackageSection.SCENARIO_SUMMARY]:
    'scenario_summary',
  [L13PromptRequiredPackageSection.CONFIDENCE_BREAKDOWN]:
    'confidence_breakdown',
  [L13PromptRequiredPackageSection.UNCERTAINTY_PROFILE]:
    'uncertainty_profile',
  [L13PromptRequiredPackageSection.RESTRICTION_PROFILE]:
    'restriction_profile',
  [L13PromptRequiredPackageSection.EVIDENCE_DIGEST]:
    'strongest_positive_evidence',
};

/**
 * Deterministically stringify any package value using sorted keys.
 * Arrays are not re-sorted (their order is part of L13.2 contract).
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys
      .map(k => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  );
}

/**
 * Token estimator (heuristic): rough 4 chars per token. Used only
 * for the assembly's `estimated_*_tokens` fields; provider-specific
 * tokenisation is left to the gateway.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface L13PromptAssemblyInput {
  readonly request_id: string;
  readonly template: L13PromptTemplate;
  readonly input_package: L13AIInputPackage;
  readonly response_length_token_target?: number;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

export interface L13PromptAssemblyResult {
  readonly assembly: L13PromptAssembly;
  readonly missing_required_sections:
    readonly L13PromptRequiredPackageSection[];
}

/**
 * §13.6.11 — Assemble a prompt. Returns the assembly even when
 * required sections are missing; the caller decides whether to
 * proceed or to mark the runtime BLOCKED_PRE_MODEL.
 */
export function assembleL13Prompt(
  input: L13PromptAssemblyInput,
): L13PromptAssemblyResult {
  const { template, input_package } = input;
  const includedSections: string[] = [];
  const excludedSections: string[] = [];
  const missing: L13PromptRequiredPackageSection[] = [];
  const userBlocks: string[] = [];

  for (const section of template.required_input_package_sections) {
    const field = SECTION_FIELD_MAP[section];
    const value = input_package[field];
    if (value === undefined || value === null) {
      missing.push(section);
      excludedSections.push(section);
      continue;
    }
    includedSections.push(section);
    userBlocks.push(`[${section}] ${stableStringify(value)}`);
  }

  // System block — concatenate every mandatory policy block in a
  // stable order.
  const systemInstructions = [
    template.system_role_block,
    template.engine_hierarchy_block,
    template.no_invention_block,
    template.observation_inference_block,
    template.contradiction_disclosure_block,
    template.confidence_phrasing_block,
    template.scenario_conditionality_block,
    template.non_recommendation_block,
    template.blocked_claim_block,
  ].join('\n\n');

  const developerInstructions = [
    template.output_schema_instruction,
    `response_length_policy=${template.response_length_policy_ref}`,
    `language_tone_policy=${template.language_tone_policy_ref}`,
  ].join('\n');

  const assembledUserContextBlock = userBlocks.join('\n');

  const responseLengthTarget =
    input.response_length_token_target ?? 600;

  const replayHash = fnv1a(
    [
      input.request_id,
      input_package.input_package_id,
      template.prompt_template_id,
      template.prompt_template_version,
      template.replay_hash,
      includedSections.slice().sort().join(','),
      excludedSections.slice().sort().join(','),
      String(responseLengthTarget),
      systemInstructions,
      developerInstructions,
      assembledUserContextBlock,
      POLICY_V,
    ].join('|'),
  );

  const assembly: L13PromptAssembly = {
    prompt_assembly_id: `l13.prompt.assembly.${replayHash}`,
    request_id: input.request_id,
    input_package_id: input_package.input_package_id,
    prompt_template_id: template.prompt_template_id,
    prompt_template_version: template.prompt_template_version,
    assembled_system_instructions: systemInstructions,
    assembled_developer_instructions: developerInstructions,
    assembled_user_context_block: assembledUserContextBlock,
    output_schema_ref: 'l13.draft.schema.v1',
    prompt_budget_ref: 'l13.budget.normal.v1',
    estimated_input_tokens:
      estimateTokens(systemInstructions) +
      estimateTokens(developerInstructions) +
      estimateTokens(assembledUserContextBlock),
    estimated_output_tokens: responseLengthTarget,
    package_sections_included: includedSections,
    package_sections_excluded: excludedSections,
    restriction_policy_ref: 'l13.restriction.policy.v1',
    grounding_policy_ref: 'l13.grounding.policy.v1',
    style_policy_ref: 'l13.style.policy.v1',
    lineage_refs: input.lineage_refs ?? ['l13.runtime.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  return {
    assembly,
    missing_required_sections: missing,
  };
}

/**
 * §13.6.11.3 / §13.6.16 — Detect raw lower-layer leakage. The
 * gateway validator uses this to reject any assembled prompt that
 * smuggles in raw L7+ surface payloads (table rows, raw evidence
 * objects, internal-only ids).
 *
 * Heuristic: any token beginning with `__raw_` or `__internal_`
 * is treated as a leak.
 */
const RAW_LEAK_PATTERNS: readonly RegExp[] = [
  /__raw_\w+/i,
  /__internal_\w+/i,
  /\bl[3-9]\.raw\.\w+/i,
  /\bl1[0-2]\.raw\.\w+/i,
];

export function l13DetectRawLowerLayerLeakInPrompt(
  assembly: L13PromptAssembly,
): readonly string[] {
  const corpus =
    assembly.assembled_system_instructions +
    '\n' +
    assembly.assembled_developer_instructions +
    '\n' +
    assembly.assembled_user_context_block;
  const hits: string[] = [];
  for (const pattern of RAW_LEAK_PATTERNS) {
    const match = corpus.match(pattern);
    if (match) hits.push(match[0]);
  }
  return hits;
}
