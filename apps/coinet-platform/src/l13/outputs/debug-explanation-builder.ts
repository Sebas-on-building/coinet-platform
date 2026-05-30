/**
 * L13.7 — Debug Explanation Builder
 *
 * §13.7.4 / §13.7.8 — Internal-only mode. Pulls every L13.6 stage
 * ref into a single developer-facing payload. The final gate
 * refuses to emit this payload to the end-user product surface.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import type { L13RuntimeRunRecord } from '../contracts/runtime-run-record';
import type { L13DebugExplanationOutput } from '../contracts/debug-explanation-output';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13DebugExplanationBuilderInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly expression: L13ExpressionGovernanceResult;
  readonly runtime_run: L13RuntimeRunRecord;
  readonly developer_narrative?: string;
}

export function buildL13DebugExplanation(
  args: L13DebugExplanationBuilderInput,
): L13DebugExplanationOutput {
  const { output, input_package, runtime_run } = args;
  const narrative =
    args.developer_narrative ??
    `Runtime ${runtime_run.runtime_run_id} completed with status ${runtime_run.run_status} and ${runtime_run.generation_attempt_count} generation attempts.`;

  const blocked_claim_refs =
    args.grounding_result.blocked_claim_refs;
  const critical = runtime_run.critical_violation_refs;

  const replayHash = fnv1a(
    [
      output.output_id,
      input_package.input_package_id,
      runtime_run.runtime_run_id,
      narrative,
      blocked_claim_refs.slice().sort().join(','),
      critical.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );

  return {
    debug_explanation_id: `l13.debug.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    runtime_run_id: runtime_run.runtime_run_id,
    developer_narrative: narrative,
    intent_classification_ref:
      runtime_run.intent_classification_ref,
    scope_resolution_ref: runtime_run.scope_resolution_ref,
    read_plan_ref: runtime_run.read_plan_ref,
    prompt_template_ref: runtime_run.prompt_template_ref,
    prompt_assembly_ref: runtime_run.prompt_assembly_ref,
    model_gateway_request_ref:
      runtime_run.model_gateway_request_ref,
    model_gateway_response_ref:
      runtime_run.model_gateway_response_ref,
    grounding_result_ref: runtime_run.grounding_result_ref,
    expression_governance_envelope_ref:
      runtime_run.expression_governance_envelope_ref,
    final_gate_result_ref: runtime_run.final_gate_result_ref,
    blocked_claim_refs,
    critical_violation_refs: critical,
    internal_only: true,
    evidence_refs: input_package.evidence_refs,
    lineage_refs:
      input_package.lineage_refs.length > 0
        ? input_package.lineage_refs
        : ['l13.outputs.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
