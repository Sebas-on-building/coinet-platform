/**
 * L13.6 — Prompt Assembly Contract
 *
 * §13.6.11 — The prompt assembler deterministically combines the
 * selected template with the L13.2 input package, the answer mode,
 * the language/tone policy, the response-length policy, the
 * restriction policy, and the grounding policy into a provider-
 * ready prompt assembly.
 *
 * §13.6.11.3 — Prompt assembly law: package content must be
 * serialized deterministically; unordered refs sorted; sections
 * included follow intent requirements; no raw lower-layer surfaces
 * injected; all policy blocks attached.
 */

export interface L13PromptAssembly {
  readonly prompt_assembly_id: string;
  readonly request_id: string;

  readonly input_package_id: string;
  readonly prompt_template_id: string;
  readonly prompt_template_version: string;

  readonly assembled_system_instructions: string;
  readonly assembled_developer_instructions: string;
  readonly assembled_user_context_block: string;

  readonly output_schema_ref: string;
  readonly prompt_budget_ref: string;

  readonly estimated_input_tokens: number;
  readonly estimated_output_tokens: number;

  readonly package_sections_included: readonly string[];
  readonly package_sections_excluded: readonly string[];

  readonly restriction_policy_ref: string;
  readonly grounding_policy_ref: string;
  readonly style_policy_ref: string;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
