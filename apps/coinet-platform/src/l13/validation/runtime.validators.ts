/**
 * L13.6 — Runtime Validators
 *
 * §13.6.25 — Per-stage validators. All return `{clean, issues}`
 * and never mutate inputs. Severity follows the runtime audit
 * mapping (§13.6.24): missing artifacts and bypassed stages are
 * CRITICAL; missing optional refs are ERROR or WARNING.
 *
 * The validators are collected here (rather than one file each)
 * so they share the issue shape and stay in lock-step with the
 * `L13R_*` violation code namespace.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13UserIntentClassification } from '../contracts/user-intent';
import { L13IntentConfidenceClass } from '../contracts/user-intent';
import {
  L13ScopeResolutionStatus,
  type L13ScopeResolutionResult,
} from '../contracts/scope-resolution';
import {
  L13ReadPlanStatus,
  type L13RuntimeReadPlan,
  isL13BlockingReadPlanStatus,
} from '../contracts/read-surface-plan';
import {
  L13_MANDATORY_PROMPT_POLICY_BLOCKS,
  type L13PromptTemplate,
  L13PromptTemplateStatus,
  isL13PromptTemplateUsable,
} from '../contracts/prompt-template';
import type { L13PromptAssembly } from '../contracts/prompt-assembly';
import {
  L13_DEFAULT_MAX_TEMPERATURE,
  L13_MAX_TEMPERATURE_BY_PURPOSE,
  type L13ModelGatewayRequest,
} from '../contracts/model-gateway-request';
import {
  L13DraftParseStatus,
  isL13ProviderFailure,
  type L13ModelGatewayResponse,
} from '../contracts/model-gateway-response';
import type { L13ModelDraftOutput } from '../contracts/model-draft-output';
import type { L13RewriteRequest } from '../contracts/rewrite-request';
import {
  L13_MAX_GENERATION_ATTEMPTS,
} from '../contracts/rewrite-request';
import type { L13RuntimeRefusalEnvelope } from '../contracts/runtime-refusal-envelope';
import {
  L13FinalEmissionDecision,
  type L13FinalOutputGateResult,
} from '../contracts/final-output-gate';
import {
  L13RuntimeRunStatus,
  type L13RuntimeRunRecord,
  isL13EmissionRunStatus,
} from '../contracts/runtime-run-record';
import { L13RuntimeViolationCode } from './l13-runtime-violation-codes';
import {
  l13RuntimeResult,
  type L13RuntimeIssue,
  type L13RuntimeValidationResult,
} from './_l13-runtime-issue';

const SEV = L13ViolationSeverity;

// ── Intent classification validator ─────────────────────────────────

export function validateL13UserIntentClassification(
  classification: L13UserIntentClassification,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!classification.intent_classification_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_INTENT_CLASSIFICATION_MISSING,
      severity: SEV.CRITICAL,
      message: 'intent_classification_id missing',
    });
  }
  if (!classification.replay_hash) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_RUNTIME_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (
    classification.intent_confidence_class ===
      L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH &&
    classification.out_of_scope_reason_codes.length === 0
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_OUT_OF_SCOPE_CONTINUED_TO_MODEL,
      severity: SEV.CRITICAL,
      message:
        'OUT_OF_SCOPE_MATCH classification missing out_of_scope_reason_codes',
    });
  }
  return l13RuntimeResult(issues);
}

// ── Scope resolution validator ──────────────────────────────────────

export function validateL13ScopeResolutionResult(
  scope: L13ScopeResolutionResult,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!scope.scope_resolution_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_SCOPE_RESOLUTION_MISSING,
      severity: SEV.CRITICAL,
      message: 'scope_resolution_id missing',
    });
  }
  if (
    scope.scope_resolution_status ===
      L13ScopeResolutionStatus.AMBIGUOUS_NEEDS_CLARIFICATION &&
    !scope.requires_clarification_output
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_AMBIGUOUS_SCOPE_CONTINUED,
      severity: SEV.CRITICAL,
      message:
        'AMBIGUOUS_NEEDS_CLARIFICATION but requires_clarification_output=false',
    });
  }
  return l13RuntimeResult(issues);
}

// ── Read-surface selection validator ────────────────────────────────

export function validateL13ReadPlan(
  plan: L13RuntimeReadPlan,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!plan.read_plan_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_READ_PLAN_MISSING,
      severity: SEV.CRITICAL,
      message: 'read_plan_id missing',
    });
  }
  if (
    isL13BlockingReadPlanStatus(plan.read_plan_status) &&
    plan.required_surface_classes.length > 0 &&
    plan.missing_required_surface_classes.length === 0
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_REQUIRED_SURFACE_MISSING,
      severity: SEV.CRITICAL,
      message:
        'blocking status but missing_required_surface_classes empty',
    });
  }
  if (
    plan.read_plan_status ===
      L13ReadPlanStatus.BLOCKED_RAW_SURFACE_REQUEST
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_ILLEGAL_READ_SURFACE_SELECTED,
      severity: SEV.CRITICAL,
      message: 'BLOCKED_RAW_SURFACE_REQUEST status',
    });
  }
  return l13RuntimeResult(issues);
}

// ── Prompt template validator ───────────────────────────────────────

export function validateL13PromptTemplate(
  template: L13PromptTemplate,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!template.prompt_template_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_PROMPT_TEMPLATE_MISSING,
      severity: SEV.CRITICAL,
      message: 'prompt_template_id missing',
    });
  }
  if (!isL13PromptTemplateUsable(template.template_status)) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_PROMPT_TEMPLATE_UNAPPROVED,
      severity: SEV.CRITICAL,
      message: `template_status=${template.template_status} not usable`,
    });
  }
  for (const field of L13_MANDATORY_PROMPT_POLICY_BLOCKS) {
    const value = template[field] as unknown as string;
    if (typeof value !== 'string' || value.trim().length === 0) {
      issues.push({
        code: L13RuntimeViolationCode.L13R_PROMPT_POLICY_BLOCK_MISSING,
        severity: SEV.CRITICAL,
        message: `mandatory policy block ${String(field)} missing or empty`,
      });
    }
  }
  return l13RuntimeResult(issues);
}

// ── Prompt assembly validator ───────────────────────────────────────

export function validateL13PromptAssembly(
  assembly: L13PromptAssembly,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!assembly.prompt_assembly_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_PROMPT_ASSEMBLY_MISSING,
      severity: SEV.CRITICAL,
      message: 'prompt_assembly_id missing',
    });
  }
  if (!assembly.replay_hash) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_RUNTIME_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (assembly.lineage_refs.length === 0) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_RUNTIME_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'lineage_refs empty',
    });
  }
  if (
    !assembly.assembled_system_instructions ||
    !assembly.assembled_developer_instructions ||
    !assembly.assembled_user_context_block
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_PROMPT_POLICY_BLOCK_MISSING,
      severity: SEV.CRITICAL,
      message: 'assembled prompt blocks must all be non-empty',
    });
  }
  return l13RuntimeResult(issues);
}

// ── Model gateway request validator ─────────────────────────────────

export interface L13ModelGatewayRequestValidationContext {
  readonly purpose?: keyof typeof L13_MAX_TEMPERATURE_BY_PURPOSE;
}

export function validateL13ModelGatewayRequest(
  request: L13ModelGatewayRequest,
  ctx: L13ModelGatewayRequestValidationContext = {},
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!request.input_package_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_MODEL_GATEWAY_INPUT_PACKAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'input_package_id missing',
    });
  }
  if (
    !request.system_policy_ref ||
    !request.grounding_policy_ref ||
    !request.restriction_policy_ref ||
    !request.style_policy_ref
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_MODEL_GATEWAY_POLICY_REF_MISSING,
      severity: SEV.CRITICAL,
      message:
        'system/grounding/restriction/style policy refs must all be set',
    });
  }
  const maxTemp =
    (ctx.purpose && L13_MAX_TEMPERATURE_BY_PURPOSE[ctx.purpose]) ??
    L13_DEFAULT_MAX_TEMPERATURE;
  if (request.temperature > maxTemp) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_MODEL_GATEWAY_TEMPERATURE_ILLEGAL,
      severity: SEV.CRITICAL,
      message: `temperature ${request.temperature} exceeds max ${maxTemp}`,
    });
  }
  if (!request.replay_hash) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_RUNTIME_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  return l13RuntimeResult(issues);
}

// ── Model gateway response / draft validator ────────────────────────

export function validateL13ModelGatewayResponse(
  response: L13ModelGatewayResponse,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!response.model_gateway_response_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_MODEL_RESPONSE_NOT_CAPTURED,
      severity: SEV.CRITICAL,
      message: 'model_gateway_response_id missing',
    });
  }
  if (!response.raw_provider_response_ref) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_MODEL_RESPONSE_NOT_CAPTURED,
      severity: SEV.CRITICAL,
      message: 'raw_provider_response_ref missing',
    });
  }
  if (
    response.parse_status === L13DraftParseStatus.PARSE_FAILED ||
    response.parse_status === L13DraftParseStatus.SCHEMA_MISMATCH
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_DRAFT_PARSE_FAILED,
      severity: SEV.ERROR,
      message: `parse_status=${response.parse_status}`,
    });
  }
  if (isL13ProviderFailure(response.provider_status)) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_MODEL_RESPONSE_NOT_CAPTURED,
      severity: SEV.ERROR,
      message: `provider_status=${response.provider_status}`,
    });
  }
  return l13RuntimeResult(issues);
}

export function validateL13ModelDraftOutput(
  draft: L13ModelDraftOutput,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!draft.model_draft_output_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_DRAFT_PARSE_FAILED,
      severity: SEV.CRITICAL,
      message: 'model_draft_output_id missing',
    });
  }
  if (!draft.replay_hash) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_RUNTIME_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  return l13RuntimeResult(issues);
}

// ── Rewrite request validator ───────────────────────────────────────

export function validateL13RewriteRequest(
  request: L13RewriteRequest,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (request.maximum_additional_attempts < 0) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_REWRITE_ATTEMPT_LIMIT_EXCEEDED,
      severity: SEV.CRITICAL,
      message: 'maximum_additional_attempts negative',
    });
  }
  if (
    request.maximum_additional_attempts >=
    L13_MAX_GENERATION_ATTEMPTS
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_REWRITE_ATTEMPT_LIMIT_EXCEEDED,
      severity: SEV.CRITICAL,
      message:
        'maximum_additional_attempts must be < L13_MAX_GENERATION_ATTEMPTS',
    });
  }
  if (request.rewrite_reason_codes.length === 0) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_REWRITE_REQUIRED_BUT_SKIPPED,
      severity: SEV.CRITICAL,
      message: 'rewrite_reason_codes empty',
    });
  }
  return l13RuntimeResult(issues);
}

// ── Refusal envelope validator ──────────────────────────────────────

export function validateL13RuntimeRefusalEnvelope(
  envelope: L13RuntimeRefusalEnvelope,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!envelope.refusal_envelope_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_REFUSAL_ENVELOPE_INVALID,
      severity: SEV.CRITICAL,
      message: 'refusal_envelope_id missing',
    });
  }
  if (!envelope.refusal_output_ref) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_REFUSAL_ENVELOPE_INVALID,
      severity: SEV.CRITICAL,
      message: 'refusal_output_ref missing',
    });
  }
  if (envelope.refusal_reason_codes.length === 0) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_REFUSAL_ENVELOPE_INVALID,
      severity: SEV.CRITICAL,
      message: 'refusal_reason_codes empty',
    });
  }
  if (!envelope.may_emit_refusal) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_REFUSAL_REQUIRED_BUT_NOT_EMITTED,
      severity: SEV.CRITICAL,
      message: 'may_emit_refusal=false on envelope',
    });
  }
  return l13RuntimeResult(issues);
}

// ── Final gate validator ────────────────────────────────────────────

export function validateL13FinalOutputGateResult(
  gate: L13FinalOutputGateResult,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!gate.final_gate_result_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_FINAL_GATE_BYPASSED,
      severity: SEV.CRITICAL,
      message: 'final_gate_result_id missing',
    });
  }
  if (
    gate.final_emission_decision ===
      L13FinalEmissionDecision.BLOCK_OUTPUT &&
    gate.user_emittable_output_ref
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_FINAL_GATE_EMITTED_BLOCKED_OUTPUT,
      severity: SEV.CRITICAL,
      message:
        'BLOCK_OUTPUT but user_emittable_output_ref is set',
    });
  }
  if (
    (gate.final_emission_decision ===
      L13FinalEmissionDecision.EMIT_CLEAN ||
      gate.final_emission_decision ===
        L13FinalEmissionDecision.EMIT_WITH_DISCLOSURE) &&
    !gate.user_emittable_output_ref
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_FINAL_GATE_EMITTED_BLOCKED_OUTPUT,
      severity: SEV.CRITICAL,
      message:
        'EMIT_* decision without user_emittable_output_ref',
    });
  }
  return l13RuntimeResult(issues);
}

// ── Runtime run record validator ────────────────────────────────────

export function validateL13RuntimeRunRecord(
  record: L13RuntimeRunRecord,
): L13RuntimeValidationResult {
  const issues: L13RuntimeIssue[] = [];
  if (!record.runtime_run_id) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_FINAL_GATE_BYPASSED,
      severity: SEV.CRITICAL,
      message: 'runtime_run_id missing',
    });
  }
  if (!record.replay_hash) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_RUNTIME_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (record.lineage_refs.length === 0) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_RUNTIME_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'lineage_refs empty',
    });
  }
  // Emission statuses require final_gate_result_ref.
  if (
    isL13EmissionRunStatus(record.run_status) &&
    !record.final_gate_result_ref
  ) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_FINAL_GATE_BYPASSED,
      severity: SEV.CRITICAL,
      message: 'emission run_status but final_gate_result_ref missing',
    });
  }
  // Successful emissions must reference grounding + expression.
  if (
    record.run_status === L13RuntimeRunStatus.COMPLETED_EMITTED ||
    record.run_status ===
      L13RuntimeRunStatus.COMPLETED_EMITTED_WITH_DISCLOSURE
  ) {
    if (!record.grounding_result_ref) {
      issues.push({
        code: L13RuntimeViolationCode.L13R_GROUNDING_PASS_SKIPPED,
        severity: SEV.CRITICAL,
        message: 'emission status without grounding_result_ref',
      });
    }
    if (!record.expression_governance_envelope_ref) {
      issues.push({
        code: L13RuntimeViolationCode.L13R_EXPRESSION_PASS_SKIPPED,
        severity: SEV.CRITICAL,
        message:
          'emission status without expression_governance_envelope_ref',
      });
    }
  }
  if (record.generation_attempt_count > L13_MAX_GENERATION_ATTEMPTS) {
    issues.push({
      code: L13RuntimeViolationCode.L13R_REWRITE_ATTEMPT_LIMIT_EXCEEDED,
      severity: SEV.CRITICAL,
      message: `generation_attempt_count ${record.generation_attempt_count} exceeds max`,
    });
  }
  // Suppress unused-import warning by referencing the enum once.
  void L13PromptTemplateStatus.PRODUCTION_ENABLED;
  return l13RuntimeResult(issues);
}
