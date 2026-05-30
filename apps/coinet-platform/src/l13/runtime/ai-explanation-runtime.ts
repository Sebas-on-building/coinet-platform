/**
 * L13.6 — AI Explanation Runtime Orchestrator
 *
 * §13.6.26 — Forward-only deterministic execution of the runtime
 * DAG (§13.6.3.1). Stages run in fixed order:
 *
 *   R1  Request Intake
 *   R2  Intent Classification
 *   R3  Scope Resolution
 *   R4  Read Surface Selection
 *   R5  Input Package Build (caller-provided)
 *   R6  Prompt Template Selection
 *   R7  Prompt Assembly
 *   R8  Model Gateway Request
 *   R9  Provider Response Capture
 *   R10 Draft Output Parse
 *   R11 Output Object Build
 *   R12 Grounding Verification (L13.4)
 *   R13 Expression Governance (L13.5)
 *   R14 Style/Length Pass
 *   R15 Rewrite/Refusal/Block Decision
 *   R16 Final Output Gate
 *   R17 Audit Hook (caller-emitted)
 *
 * No stage may be skipped. The orchestrator returns a
 * `L13RuntimeRunRecord` and the optional emittable output ref.
 */

import type { L13DependencySurfaceClass } from '../contracts/l13-constitutional-types';
import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13RawUserRequest } from '../contracts/user-intent';
import type { L13UserIntentClassification } from '../contracts/user-intent';
import type { L13ScopeResolutionResult } from '../contracts/scope-resolution';
import { L13ScopeResolutionStatus } from '../contracts/scope-resolution';
import type { L13RuntimeReadPlan } from '../contracts/read-surface-plan';
import {
  L13ReadPlanStatus,
  isL13BlockingReadPlanStatus,
} from '../contracts/read-surface-plan';
import type { L13PromptTemplate } from '../contracts/prompt-template';
import type { L13PromptAssembly } from '../contracts/prompt-assembly';
import type { L13ModelGatewayRequest } from '../contracts/model-gateway-request';
import { L13ModelProvider } from '../contracts/model-gateway-request';
import type { L13ModelGatewayResponse } from '../contracts/model-gateway-response';
import type { L13ModelDraftOutput } from '../contracts/model-draft-output';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import { L13AIOutputClass } from '../contracts/ai-output';
import { L13AnswerMode } from '../contracts/explanation-restriction-profile';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceEnvelope } from '../contracts/expression-governance-envelope';
import type { L13FinalOutputGateResult } from '../contracts/final-output-gate';
import { L13FinalEmissionDecision } from '../contracts/final-output-gate';
import type { L13RuntimeRefusalEnvelope } from '../contracts/runtime-refusal-envelope';
import { L13RuntimeRefusalReasonCode } from '../contracts/runtime-refusal-envelope';
import {
  L13_MAX_GENERATION_ATTEMPTS,
  type L13RewriteRequest,
} from '../contracts/rewrite-request';
import {
  L13RuntimeRunMode,
  L13RuntimeRunStatus,
  type L13RuntimeRunRecord,
} from '../contracts/runtime-run-record';
import { fnv1a } from '../context/_fnv1a';

import { classifyL13UserIntent } from './user-intent-classifier';
import { resolveL13Scope } from './scope-resolution-engine';
import { selectL13ReadSurfaces } from './read-surface-selection-engine';
import {
  selectL13PromptTemplate,
  l13TemplateHasAllMandatoryBlocks,
} from './prompt-template.registry';
import { assembleL13Prompt, l13DetectRawLowerLayerLeakInPrompt } from './prompt-assembler';
import {
  callL13ModelGateway,
  type L13ProviderCall,
} from './model-gateway';
import {
  runL13PostprocessorPipeline,
  runL13StyleLengthPass,
} from './output-postprocessor';
import { runL13FinalOutputGate } from './final-output-gate';
import { buildL13RuntimeRefusal } from './refusal-builder';

const POLICY_V = 'l13.runtime.v1';

export interface L13RuntimeInput {
  readonly request: L13RawUserRequest;
  readonly raw_scope_hint?: string;
  readonly raw_comparison_scope_hints?: readonly string[];
  /**
   * Caller-provided L13.2 input package. The runtime does not
   * build the package itself; it consumes it from the upstream
   * builder so that the package's own determinism/replay is
   * preserved.
   */
  readonly input_package: L13AIInputPackage;
  /**
   * Surfaces actually available from upstream read services.
   */
  readonly available_surface_classes:
    readonly L13DependencySurfaceClass[];
  readonly available_bundle_refs?: readonly string[];
  /** Optional override for the model provider. */
  readonly model_provider?: L13ModelProvider;
  readonly model_name?: string;
  readonly model_version?: string;
  /** Optional injected provider call (defaults to INTERNAL_MOCK). */
  readonly provider_call?: L13ProviderCall;
  readonly run_mode?: L13RuntimeRunMode;
}

export interface L13RuntimeOutput {
  readonly run_record: L13RuntimeRunRecord;
  readonly intent: L13UserIntentClassification;
  readonly scope?: L13ScopeResolutionResult;
  readonly read_plan?: L13RuntimeReadPlan;
  readonly prompt_template?: L13PromptTemplate;
  readonly prompt_assembly?: L13PromptAssembly;
  readonly model_gateway_request?: L13ModelGatewayRequest;
  readonly model_gateway_response?: L13ModelGatewayResponse;
  readonly model_draft?: L13ModelDraftOutput;
  readonly ai_output?: L13AIExplanationOutput;
  readonly grounding?: L13ClaimGroundingResult;
  readonly expression_envelope?: L13ExpressionGovernanceEnvelope;
  readonly refusal_envelope?: L13RuntimeRefusalEnvelope;
  readonly refusal_output?: L13AIExplanationOutput;
  readonly final_gate_result: L13FinalOutputGateResult;
  readonly rewrite_requests: readonly L13RewriteRequest[];
}

interface RunStateRefs {
  intent_classification_ref?: string;
  scope_resolution_ref?: string;
  read_plan_ref?: string;
  input_package_ref?: string;
  prompt_template_ref?: string;
  prompt_assembly_ref?: string;
  model_gateway_request_ref?: string;
  model_gateway_response_ref?: string;
  model_draft_output_ref?: string;
  ai_output_ref?: string;
  grounding_result_ref?: string;
  grounded_output_envelope_ref?: string;
  expression_governance_envelope_ref?: string;
  refusal_envelope_ref?: string;
  final_gate_result_ref?: string;
  rewrite_request_refs: string[];
  generation_attempt_count: number;
  rewrite_attempt_count: number;
  critical_violation_refs: string[];
}

function buildRunRecord(
  request_id: string,
  run_mode: L13RuntimeRunMode,
  status: L13RuntimeRunStatus,
  refs: RunStateRefs,
  started_at: string,
): L13RuntimeRunRecord {
  const completed_at = '2026-05-15T00:00:00Z';
  const replayHash = fnv1a(
    [
      request_id,
      run_mode,
      status,
      refs.intent_classification_ref ?? '',
      refs.scope_resolution_ref ?? '',
      refs.read_plan_ref ?? '',
      refs.input_package_ref ?? '',
      refs.prompt_template_ref ?? '',
      refs.prompt_assembly_ref ?? '',
      refs.model_gateway_request_ref ?? '',
      refs.model_gateway_response_ref ?? '',
      refs.model_draft_output_ref ?? '',
      refs.ai_output_ref ?? '',
      refs.grounding_result_ref ?? '',
      refs.expression_governance_envelope_ref ?? '',
      refs.refusal_envelope_ref ?? '',
      refs.final_gate_result_ref ?? '',
      String(refs.generation_attempt_count),
      String(refs.rewrite_attempt_count),
      refs.rewrite_request_refs.slice().sort().join(','),
      refs.critical_violation_refs.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  return {
    runtime_run_id: `l13.run.${replayHash}`,
    request_id,
    run_mode,
    run_status: status,
    intent_classification_ref: refs.intent_classification_ref,
    scope_resolution_ref: refs.scope_resolution_ref,
    read_plan_ref: refs.read_plan_ref,
    input_package_ref: refs.input_package_ref,
    prompt_template_ref: refs.prompt_template_ref,
    prompt_assembly_ref: refs.prompt_assembly_ref,
    model_gateway_request_ref: refs.model_gateway_request_ref,
    model_gateway_response_ref: refs.model_gateway_response_ref,
    model_draft_output_ref: refs.model_draft_output_ref,
    ai_output_ref: refs.ai_output_ref,
    grounding_result_ref: refs.grounding_result_ref,
    grounded_output_envelope_ref:
      refs.grounded_output_envelope_ref,
    expression_governance_envelope_ref:
      refs.expression_governance_envelope_ref,
    rewrite_request_refs: refs.rewrite_request_refs,
    refusal_envelope_ref: refs.refusal_envelope_ref,
    final_gate_result_ref: refs.final_gate_result_ref,
    generation_attempt_count: refs.generation_attempt_count,
    rewrite_attempt_count: refs.rewrite_attempt_count,
    critical_violation_refs: refs.critical_violation_refs,
    started_at,
    completed_at,
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

function intentToOutputClass(
  intent: L13UserIntentClassification,
): L13AIOutputClass {
  switch (intent.answer_mode_hint) {
    case L13AnswerMode.EXPLAIN_SCENARIO:
      return L13AIOutputClass.SCENARIO_EXPLANATION;
    case L13AnswerMode.EXPLAIN_SCORE:
      return L13AIOutputClass.SCORE_EXPLANATION;
    case L13AnswerMode.WRITE_ALERT:
      return L13AIOutputClass.ALERT_TEXT;
    case L13AnswerMode.COMPARE_ASSETS:
      return L13AIOutputClass.ASSET_COMPARISON;
    case L13AnswerMode.COMPARE_THESES:
      return L13AIOutputClass.THESIS_COMPARISON;
    case L13AnswerMode.WRITE_REPORT:
      return L13AIOutputClass.STRUCTURED_REPORT;
    case L13AnswerMode.DISCLOSE_CONTRADICTION:
      return L13AIOutputClass.CONTRADICTION_EXPLANATION;
    case L13AnswerMode.REFUSE_UNSUPPORTED:
      return L13AIOutputClass.UNCERTAINTY_DISCLOSURE;
    default:
      return L13AIOutputClass.MARKET_EXPLANATION;
  }
}

/**
 * §13.6.26 — Run the full runtime.
 */
export async function runL13AIExplanationRuntime(
  input: L13RuntimeInput,
): Promise<L13RuntimeOutput> {
  const started_at = '2026-05-15T00:00:00Z';
  const refs: RunStateRefs = {
    rewrite_request_refs: [],
    generation_attempt_count: 0,
    rewrite_attempt_count: 0,
    critical_violation_refs: [],
  };
  const run_mode = input.run_mode ?? L13RuntimeRunMode.LIVE_GENERATION;

  // R1 + R2 — intent.
  const intent = classifyL13UserIntent(input.request);
  refs.intent_classification_ref = intent.intent_classification_id;

  // Out-of-scope short-circuit → refusal route.
  if (intent.out_of_scope_reason_codes.length > 0) {
    const { refusal_envelope, refusal_output } = buildL13RuntimeRefusal({
      request_id: input.request.request_id,
      reason_codes: [
        L13RuntimeRefusalReasonCode.OUT_OF_SCOPE_REQUEST,
        L13RuntimeRefusalReasonCode.PROHIBITED_TRADE_INSTRUCTION_REQUEST,
      ],
    });
    refs.refusal_envelope_ref = refusal_envelope.refusal_envelope_id;
    const gate = runL13FinalOutputGate({
      request_id: input.request.request_id,
      refusal_envelope,
      refusal_output,
    });
    refs.final_gate_result_ref = gate.final_gate_result_id;
    return {
      intent,
      refusal_envelope,
      refusal_output,
      final_gate_result: gate,
      rewrite_requests: [],
      run_record: buildRunRecord(
        input.request.request_id,
        L13RuntimeRunMode.REFUSAL_ROUTE,
        L13RuntimeRunStatus.COMPLETED_REFUSAL,
        refs,
        started_at,
      ),
    };
  }

  // R3 — scope.
  const scope = resolveL13Scope(intent, {
    request_id: input.request.request_id,
    intent_classification_ref: intent.intent_classification_id,
    raw_scope_hint: input.raw_scope_hint,
    raw_comparison_scope_hints: input.raw_comparison_scope_hints,
  });
  refs.scope_resolution_ref = scope.scope_resolution_id;

  if (
    scope.scope_resolution_status ===
    L13ScopeResolutionStatus.BLOCKED_ILLEGAL_SCOPE_REQUEST
  ) {
    const { refusal_envelope, refusal_output } = buildL13RuntimeRefusal({
      request_id: input.request.request_id,
      reason_codes: [
        L13RuntimeRefusalReasonCode.UNRESOLVED_SCOPE,
      ],
    });
    refs.refusal_envelope_ref = refusal_envelope.refusal_envelope_id;
    const gate = runL13FinalOutputGate({
      request_id: input.request.request_id,
      refusal_envelope,
      refusal_output,
    });
    refs.final_gate_result_ref = gate.final_gate_result_id;
    return {
      intent,
      scope,
      refusal_envelope,
      refusal_output,
      final_gate_result: gate,
      rewrite_requests: [],
      run_record: buildRunRecord(
        input.request.request_id,
        L13RuntimeRunMode.REFUSAL_ROUTE,
        L13RuntimeRunStatus.COMPLETED_REFUSAL,
        refs,
        started_at,
      ),
    };
  }

  // R4 — read plan.
  const read_plan = selectL13ReadSurfaces({
    intent,
    scope,
    available_surface_classes: input.available_surface_classes,
    available_bundle_refs: input.available_bundle_refs,
  });
  refs.read_plan_ref = read_plan.read_plan_id;

  if (isL13BlockingReadPlanStatus(read_plan.read_plan_status)) {
    const { refusal_envelope, refusal_output } = buildL13RuntimeRefusal({
      request_id: input.request.request_id,
      input_package_id: input.input_package.input_package_id,
      reason_codes: [
        L13RuntimeRefusalReasonCode.INSUFFICIENT_CONTEXT,
      ],
    });
    refs.refusal_envelope_ref = refusal_envelope.refusal_envelope_id;
    const gate = runL13FinalOutputGate({
      request_id: input.request.request_id,
      refusal_envelope,
      refusal_output,
    });
    refs.final_gate_result_ref = gate.final_gate_result_id;
    return {
      intent,
      scope,
      read_plan,
      refusal_envelope,
      refusal_output,
      final_gate_result: gate,
      rewrite_requests: [],
      run_record: buildRunRecord(
        input.request.request_id,
        L13RuntimeRunMode.REFUSAL_ROUTE,
        L13RuntimeRunStatus.BLOCKED_PRE_MODEL,
        refs,
        started_at,
      ),
    };
  }

  // R5 — input package gate.
  refs.input_package_ref = input.input_package.input_package_id;

  // R6 — prompt template.
  const template = selectL13PromptTemplate(intent.selected_intent);
  if (!template || !l13TemplateHasAllMandatoryBlocks(template)) {
    refs.critical_violation_refs.push(
      'L13R_PROMPT_TEMPLATE_MISSING',
    );
    const { refusal_envelope, refusal_output } = buildL13RuntimeRefusal({
      request_id: input.request.request_id,
      input_package_id: input.input_package.input_package_id,
      reason_codes: [
        L13RuntimeRefusalReasonCode.INSUFFICIENT_CONTEXT,
      ],
    });
    refs.refusal_envelope_ref = refusal_envelope.refusal_envelope_id;
    const gate = runL13FinalOutputGate({
      request_id: input.request.request_id,
      refusal_envelope,
      refusal_output,
    });
    refs.final_gate_result_ref = gate.final_gate_result_id;
    return {
      intent,
      scope,
      read_plan,
      refusal_envelope,
      refusal_output,
      final_gate_result: gate,
      rewrite_requests: [],
      run_record: buildRunRecord(
        input.request.request_id,
        L13RuntimeRunMode.REFUSAL_ROUTE,
        L13RuntimeRunStatus.BLOCKED_PRE_MODEL,
        refs,
        started_at,
      ),
    };
  }
  refs.prompt_template_ref = template.prompt_template_id;

  // R7 — prompt assembly.
  const { assembly, missing_required_sections } = assembleL13Prompt({
    request_id: input.request.request_id,
    template,
    input_package: input.input_package,
  });
  refs.prompt_assembly_ref = assembly.prompt_assembly_id;
  if (missing_required_sections.length > 0) {
    refs.critical_violation_refs.push(
      'L13R_REQUIRED_SURFACE_MISSING',
    );
  }
  const leaks = l13DetectRawLowerLayerLeakInPrompt(assembly);
  if (leaks.length > 0) {
    refs.critical_violation_refs.push(
      'L13R_RAW_LOWER_LAYER_DATA_IN_PROMPT',
    );
    const { refusal_envelope, refusal_output } = buildL13RuntimeRefusal({
      request_id: input.request.request_id,
      input_package_id: input.input_package.input_package_id,
      reason_codes: [
        L13RuntimeRefusalReasonCode.BLOCKED_BY_RESTRICTION,
      ],
    });
    refs.refusal_envelope_ref = refusal_envelope.refusal_envelope_id;
    const gate = runL13FinalOutputGate({
      request_id: input.request.request_id,
      refusal_envelope,
      refusal_output,
    });
    refs.final_gate_result_ref = gate.final_gate_result_id;
    return {
      intent,
      scope,
      read_plan,
      prompt_template: template,
      prompt_assembly: assembly,
      refusal_envelope,
      refusal_output,
      final_gate_result: gate,
      rewrite_requests: [],
      run_record: buildRunRecord(
        input.request.request_id,
        L13RuntimeRunMode.REFUSAL_ROUTE,
        L13RuntimeRunStatus.BLOCKED_PRE_MODEL,
        refs,
        started_at,
      ),
    };
  }

  const output_class = intentToOutputClass(intent);
  const provider =
    input.model_provider ?? L13ModelProvider.INTERNAL_MOCK;
  const model_name =
    input.model_name ??
    (provider === L13ModelProvider.INTERNAL_MOCK
      ? 'l13.mock'
      : 'grok-4');

  // R8 / R9 / R10 — model gateway + capture + parse.
  refs.generation_attempt_count = 1;
  const gatewayResult = await callL13ModelGateway({
    request_id: input.request.request_id,
    assembly,
    model_provider: provider,
    model_name,
    model_version: input.model_version,
    answer_mode: intent.answer_mode_hint,
    output_class_hint: output_class,
    purpose: 'market_explanation',
    provider_call: input.provider_call,
  });
  refs.model_gateway_request_ref =
    gatewayResult.request.model_gateway_request_id;
  refs.model_gateway_response_ref =
    gatewayResult.response.model_gateway_response_id;
  refs.model_draft_output_ref =
    gatewayResult.draft.model_draft_output_id;

  // R11 / R12 / R13 — output build + grounding + expression.
  const post = runL13PostprocessorPipeline({
    request_id: input.request.request_id,
    draft: gatewayResult.draft,
    input_package: input.input_package,
    model_gateway_request: gatewayResult.request,
    model_gateway_response: gatewayResult.response,
    output_class,
    answer_mode: intent.answer_mode_hint,
    scope_type: scope.resolved_scope_type,
    scope_id: scope.resolved_scope_id,
  });
  refs.ai_output_ref = post.output.output_id;
  refs.grounding_result_ref = post.grounding.grounding_result_id;
  refs.expression_governance_envelope_ref =
    post.expression.envelope.expression_governance_id;

  // R14 — style/length pass (non-semantic).
  runL13StyleLengthPass(post.output);

  // R15 — rewrite/refusal/block decision (single-attempt logic;
  // attempt budget honored: no real model retry inside the
  // INTERNAL_MOCK runtime).
  const expressionEnvelope = post.expression.envelope;
  const requiresRewrite =
    expressionEnvelope.rewrite_required && refs.rewrite_attempt_count <
      L13_MAX_GENERATION_ATTEMPTS - 1;
  const requiresRefusal =
    expressionEnvelope.refusal_required ||
    expressionEnvelope.block_required;

  if (requiresRefusal) {
    const { refusal_envelope, refusal_output } = buildL13RuntimeRefusal({
      request_id: input.request.request_id,
      input_package_id: input.input_package.input_package_id,
      reason_codes: [
        L13RuntimeRefusalReasonCode.EXPRESSION_GOVERNANCE_FAILED_AFTER_REWRITE,
      ],
    });
    refs.refusal_envelope_ref = refusal_envelope.refusal_envelope_id;
    const gate = runL13FinalOutputGate({
      request_id: input.request.request_id,
      output_candidate: post.output,
      grounding_result: post.grounding,
      expression_envelope: expressionEnvelope,
      refusal_envelope,
      refusal_output,
    });
    refs.final_gate_result_ref = gate.final_gate_result_id;
    return {
      intent,
      scope,
      read_plan,
      prompt_template: template,
      prompt_assembly: assembly,
      model_gateway_request: gatewayResult.request,
      model_gateway_response: gatewayResult.response,
      model_draft: gatewayResult.draft,
      ai_output: post.output,
      grounding: post.grounding,
      expression_envelope: expressionEnvelope,
      refusal_envelope,
      refusal_output,
      final_gate_result: gate,
      rewrite_requests: [],
      run_record: buildRunRecord(
        input.request.request_id,
        run_mode,
        L13RuntimeRunStatus.COMPLETED_REFUSAL,
        refs,
        started_at,
      ),
    };
  }

  // (Rewrite would loop here in a real provider integration. With
  // INTERNAL_MOCK there is no fresh draft to obtain, so we route
  // any rewrite-required state to a refusal.)
  if (requiresRewrite) {
    const { refusal_envelope, refusal_output } = buildL13RuntimeRefusal({
      request_id: input.request.request_id,
      input_package_id: input.input_package.input_package_id,
      reason_codes: [
        L13RuntimeRefusalReasonCode.REWRITE_ATTEMPTS_EXHAUSTED,
      ],
    });
    refs.refusal_envelope_ref = refusal_envelope.refusal_envelope_id;
    const gate = runL13FinalOutputGate({
      request_id: input.request.request_id,
      output_candidate: post.output,
      grounding_result: post.grounding,
      expression_envelope: expressionEnvelope,
      refusal_envelope,
      refusal_output,
    });
    refs.final_gate_result_ref = gate.final_gate_result_id;
    return {
      intent,
      scope,
      read_plan,
      prompt_template: template,
      prompt_assembly: assembly,
      model_gateway_request: gatewayResult.request,
      model_gateway_response: gatewayResult.response,
      model_draft: gatewayResult.draft,
      ai_output: post.output,
      grounding: post.grounding,
      expression_envelope: expressionEnvelope,
      refusal_envelope,
      refusal_output,
      final_gate_result: gate,
      rewrite_requests: [],
      run_record: buildRunRecord(
        input.request.request_id,
        run_mode,
        L13RuntimeRunStatus.BLOCKED_AFTER_REWRITE_EXHAUSTION,
        refs,
        started_at,
      ),
    };
  }

  // R16 — final output gate.
  const gate = runL13FinalOutputGate({
    request_id: input.request.request_id,
    output_candidate: post.output,
    grounding_result: post.grounding,
    expression_envelope: expressionEnvelope,
  });
  refs.final_gate_result_ref = gate.final_gate_result_id;

  let runStatus: L13RuntimeRunStatus;
  switch (gate.final_emission_decision) {
    case L13FinalEmissionDecision.EMIT_CLEAN:
      runStatus = L13RuntimeRunStatus.COMPLETED_EMITTED;
      break;
    case L13FinalEmissionDecision.EMIT_WITH_DISCLOSURE:
      runStatus =
        L13RuntimeRunStatus.COMPLETED_EMITTED_WITH_DISCLOSURE;
      break;
    case L13FinalEmissionDecision.EMIT_REFUSAL:
      runStatus = L13RuntimeRunStatus.COMPLETED_REFUSAL;
      break;
    case L13FinalEmissionDecision.BLOCK_OUTPUT:
    default:
      runStatus = L13RuntimeRunStatus.BLOCKED_POST_MODEL;
      break;
  }

  return {
    intent,
    scope,
    read_plan,
    prompt_template: template,
    prompt_assembly: assembly,
    model_gateway_request: gatewayResult.request,
    model_gateway_response: gatewayResult.response,
    model_draft: gatewayResult.draft,
    ai_output: post.output,
    grounding: post.grounding,
    expression_envelope: expressionEnvelope,
    final_gate_result: gate,
    rewrite_requests: [],
    run_record: buildRunRecord(
      input.request.request_id,
      run_mode,
      runStatus,
      refs,
      started_at,
    ),
  };
}
