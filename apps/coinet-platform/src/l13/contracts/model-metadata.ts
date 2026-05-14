/**
 * L13.3 — Model Metadata Contract
 *
 * §13.3.9 — Every output carries enough provenance for L13.4+ to
 * replay, validate, safety-gate, and audit the model run. L13.3 does
 * not implement the final grounding gate yet, but it must reserve
 * the fields so later sublayers can fill them.
 */

export interface L13ModelMetadata {
  readonly model_metadata_id: string;

  readonly model_provider: string;
  readonly model_name: string;
  readonly model_version?: string;

  readonly prompt_template_id: string;
  readonly prompt_template_version: string;

  readonly input_package_hash: string;
  readonly output_policy_version: string;

  readonly temperature: number;
  readonly max_output_tokens: number;

  readonly generation_started_at: string;
  readonly generation_completed_at: string;

  readonly post_validation_passed: boolean;
  readonly post_validation_issue_refs: readonly string[];

  readonly safety_gate_passed: boolean;
  readonly grounding_gate_passed: boolean;

  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}
