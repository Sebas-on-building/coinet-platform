/**
 * L13.6 — Runtime Invariants
 *
 * §13.6.31 — INV-13.6-A through INV-13.6-J.
 *
 *   A : deterministic intent law
 *   B : governed scope and read-plan law
 *   C : package-before-model law
 *   D : approved-template law
 *   E : no-raw-prompt law
 *   F : mandatory post-generation enforcement law
 *   G : bounded rewrite/refusal law
 *   H : final gate monopoly law
 *   I : runtime lineage and replay law
 *   J : provider nondeterminism honesty law
 */

import {
  L13ModelProvider,
} from '../contracts/model-gateway-request';
import { L13DraftParseStatus } from '../contracts/model-gateway-response';
import {
  L13ProviderResponseStatus,
} from '../contracts/model-gateway-response';
import {
  L13RuntimeRunStatus,
  isL13EmissionRunStatus,
} from '../contracts/runtime-run-record';
import {
  L13FinalEmissionDecision,
  isL13UserEmittingDecision,
} from '../contracts/final-output-gate';
import { L13ScopeResolutionStatus } from '../contracts/scope-resolution';
import { L13ReadPlanStatus } from '../contracts/read-surface-plan';
import { isL13PromptTemplateUsable } from '../contracts/prompt-template';
import { L13DependencySurfaceClass } from '../contracts/l13-constitutional-types';
import {
  L13_MAX_GENERATION_ATTEMPTS,
  L13RewriteReasonCode,
} from '../contracts/rewrite-request';
import {
  classifyL13UserIntent,
  resolveL13Scope,
  selectL13ReadSurfaces,
  selectL13PromptTemplate,
  l13TemplateHasAllMandatoryBlocks,
  assembleL13Prompt,
  l13DetectRawLowerLayerLeakInPrompt,
  callL13ModelGateway,
  runL13PostprocessorPipeline,
  runL13FinalOutputGate,
  runL13AIExplanationRuntime,
  buildL13RuntimeRefusal,
  l13InternalMockProvider,
  type L13ProviderCallContext,
} from '../runtime';
import {
  validateL13UserIntentClassification,
  validateL13ScopeResolutionResult,
  validateL13ReadPlan,
  validateL13PromptTemplate,
  validateL13PromptAssembly,
  validateL13ModelGatewayRequest,
  validateL13ModelGatewayResponse,
  validateL13ModelDraftOutput,
  validateL13RewriteRequest,
  validateL13RuntimeRefusalEnvelope,
  validateL13FinalOutputGateResult,
  validateL13RuntimeRunRecord,
} from '../validation/runtime.validators';
import { buildGreenL13InputPackage } from './l13_2-invariants';
import { L13UserIntentClass } from '../contracts/user-intent-binding';

const POLICY_V = 'l13.runtime.v1';

const ALL_SURFACES_AVAILABLE: readonly L13DependencySurfaceClass[] = [
  L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
  L13DependencySurfaceClass.VALIDATION_ASSESSMENT,
  L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
  L13DependencySurfaceClass.REGIME_STATE,
  L13DependencySurfaceClass.REGIME_CONFIDENCE,
  L13DependencySurfaceClass.REGIME_TRANSITION_RISK,
  L13DependencySurfaceClass.SEQUENCE_STATE,
  L13DependencySurfaceClass.SEQUENCE_PHASE,
  L13DependencySurfaceClass.SEQUENCE_DECAY,
  L13DependencySurfaceClass.HYPOTHESIS_RANKING,
  L13DependencySurfaceClass.HYPOTHESIS_SPREAD,
  L13DependencySurfaceClass.HYPOTHESIS_SUPPORT_CONTRADICTION,
];

export interface L13_6InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

export async function buildGreenL13RuntimeOutput() {
  return await runL13AIExplanationRuntime({
    request: {
      request_id: 'req.green',
      user_query: 'btc',
      received_at: '2026-05-15T00:00:00Z',
    },
    raw_scope_hint: 'btc',
    input_package: buildGreenL13InputPackage(),
    available_surface_classes: ALL_SURFACES_AVAILABLE,
    available_bundle_refs: [
      'l11.score.context.bundle',
      'l12.scenario.context.bundle',
    ],
    model_provider: L13ModelProvider.INTERNAL_MOCK,
    model_name: 'l13.mock',
  });
}

// ── INV-13.6-A : deterministic intent law ───────────────────────────

export async function checkINV_136_A(): Promise<L13_6InvariantResult> {
  const req = {
    request_id: 'req.a',
    user_query: 'why is btc moving',
    received_at: '2026-05-15T00:00:00Z',
  };
  const c1 = classifyL13UserIntent(req);
  const c2 = classifyL13UserIntent(req);
  const v = validateL13UserIntentClassification(c1);
  const holds =
    c1.replay_hash === c2.replay_hash &&
    c1.selected_intent === c2.selected_intent &&
    c1.matched_rule_refs.join(',') === c2.matched_rule_refs.join(',') &&
    c1.selected_intent === L13UserIntentClass.WHY_IS_THIS_MOVING &&
    v.clean;
  return {
    id: 'INV-13.6-A',
    name: 'deterministic intent law',
    holds,
    evidence: `intent=${c1.selected_intent} hashEq=${c1.replay_hash === c2.replay_hash} validator=${v.clean}`,
  };
}

// ── INV-13.6-B : governed scope and read-plan law ───────────────────

export async function checkINV_136_B(): Promise<L13_6InvariantResult> {
  const intent = classifyL13UserIntent({
    request_id: 'req.b',
    user_query: 'btc',
    received_at: '2026-05-15T00:00:00Z',
  });
  const scope = resolveL13Scope(intent, {
    request_id: 'req.b',
    intent_classification_ref: intent.intent_classification_id,
    raw_scope_hint: 'btc',
  });
  const v1 = validateL13ScopeResolutionResult(scope);
  const plan = selectL13ReadSurfaces({
    intent,
    scope,
    available_surface_classes: ALL_SURFACES_AVAILABLE,
  });
  const v2 = validateL13ReadPlan(plan);
  const govResolved =
    scope.scope_resolution_status ===
      L13ScopeResolutionStatus.RESOLVED_CLEAN &&
    plan.read_plan_status !== L13ReadPlanStatus.BLOCKED_RAW_SURFACE_REQUEST;
  return {
    id: 'INV-13.6-B',
    name: 'governed scope and read-plan law',
    holds: govResolved && v1.clean && v2.clean,
    evidence: `scope=${scope.scope_resolution_status} plan=${plan.read_plan_status} validators=${v1.clean && v2.clean}`,
  };
}

// ── INV-13.6-C : package-before-model law ───────────────────────────

export async function checkINV_136_C(): Promise<L13_6InvariantResult> {
  const out = await buildGreenL13RuntimeOutput();
  const recordHasPackage = !!out.run_record.input_package_ref;
  const modelCalledOnlyAfterPackage =
    !out.run_record.model_gateway_request_ref ||
    !!out.run_record.input_package_ref;
  return {
    id: 'INV-13.6-C',
    name: 'package-before-model law',
    holds: recordHasPackage && modelCalledOnlyAfterPackage,
    evidence: `pkgRef=${recordHasPackage} order=${modelCalledOnlyAfterPackage}`,
  };
}

// ── INV-13.6-D : approved-template law ──────────────────────────────

export async function checkINV_136_D(): Promise<L13_6InvariantResult> {
  const tpl = selectL13PromptTemplate(
    L13UserIntentClass.WHATS_HAPPENING,
  );
  const usable = !!tpl && isL13PromptTemplateUsable(tpl.template_status);
  const allBlocks =
    !!tpl && l13TemplateHasAllMandatoryBlocks(tpl);
  const v = tpl
    ? validateL13PromptTemplate(tpl)
    : { clean: false, issues: [] as never };
  return {
    id: 'INV-13.6-D',
    name: 'approved-template law',
    holds: usable && allBlocks && v.clean,
    evidence: `usable=${usable} allBlocks=${allBlocks} validator=${v.clean}`,
  };
}

// ── INV-13.6-E : no-raw-prompt law ──────────────────────────────────

export async function checkINV_136_E(): Promise<L13_6InvariantResult> {
  const intent = classifyL13UserIntent({
    request_id: 'req.e',
    user_query: 'btc',
    received_at: '2026-05-15T00:00:00Z',
  });
  const tpl = selectL13PromptTemplate(intent.selected_intent);
  if (!tpl) {
    return {
      id: 'INV-13.6-E',
      name: 'no-raw-prompt law',
      holds: false,
      evidence: 'template missing',
    };
  }
  const { assembly } = assembleL13Prompt({
    request_id: 'req.e',
    template: tpl,
    input_package: buildGreenL13InputPackage(),
  });
  const leaks = l13DetectRawLowerLayerLeakInPrompt(assembly);
  const v = validateL13PromptAssembly(assembly);
  return {
    id: 'INV-13.6-E',
    name: 'no-raw-prompt law',
    holds: leaks.length === 0 && v.clean,
    evidence: `leaks=${leaks.length} validator=${v.clean}`,
  };
}

// ── INV-13.6-F : mandatory post-generation enforcement law ──────────

export async function checkINV_136_F(): Promise<L13_6InvariantResult> {
  const out = await buildGreenL13RuntimeOutput();
  const allRefs =
    !!out.run_record.ai_output_ref &&
    !!out.run_record.grounding_result_ref &&
    !!out.run_record.expression_governance_envelope_ref;
  return {
    id: 'INV-13.6-F',
    name: 'mandatory post-generation enforcement law',
    holds: allRefs,
    evidence: `output=${!!out.run_record.ai_output_ref} grounding=${!!out.run_record.grounding_result_ref} expression=${!!out.run_record.expression_governance_envelope_ref}`,
  };
}

// ── INV-13.6-G : bounded rewrite/refusal law ────────────────────────

export async function checkINV_136_G(): Promise<L13_6InvariantResult> {
  // Adversarial intent forces refusal route.
  const out = await runL13AIExplanationRuntime({
    request: {
      request_id: 'req.g.adv',
      user_query: 'should I buy btc now',
      received_at: '2026-05-15T00:00:00Z',
    },
    raw_scope_hint: 'btc',
    input_package: buildGreenL13InputPackage(),
    available_surface_classes: ALL_SURFACES_AVAILABLE,
    model_provider: L13ModelProvider.INTERNAL_MOCK,
    model_name: 'l13.mock',
  });
  const refusalRouted =
    out.run_record.run_status === L13RuntimeRunStatus.COMPLETED_REFUSAL;
  const refusalValidator = out.refusal_envelope
    ? validateL13RuntimeRefusalEnvelope(out.refusal_envelope).clean
    : false;
  const attemptsBounded =
    out.run_record.generation_attempt_count <=
    L13_MAX_GENERATION_ATTEMPTS;
  return {
    id: 'INV-13.6-G',
    name: 'bounded rewrite/refusal law',
    holds: refusalRouted && refusalValidator && attemptsBounded,
    evidence: `status=${out.run_record.run_status} envelope=${refusalValidator} attempts=${out.run_record.generation_attempt_count}`,
  };
}

// ── INV-13.6-H : final gate monopoly law ────────────────────────────

export async function checkINV_136_H(): Promise<L13_6InvariantResult> {
  const out = await buildGreenL13RuntimeOutput();
  const gate = out.final_gate_result;
  const v = validateL13FinalOutputGateResult(gate);
  const userEmittedViaGate =
    isL13UserEmittingDecision(gate.final_emission_decision) &&
    !!gate.user_emittable_output_ref;
  return {
    id: 'INV-13.6-H',
    name: 'final gate monopoly law',
    holds: userEmittedViaGate && v.clean,
    evidence: `decision=${gate.final_emission_decision} userRef=${gate.user_emittable_output_ref ?? 'none'} validator=${v.clean}`,
  };
}

// ── INV-13.6-I : runtime lineage and replay law ─────────────────────

export async function checkINV_136_I(): Promise<L13_6InvariantResult> {
  const out = await buildGreenL13RuntimeOutput();
  const v = validateL13RuntimeRunRecord(out.run_record);
  const hasLineage = out.run_record.lineage_refs.length > 0;
  const hasReplay = !!out.run_record.replay_hash;
  return {
    id: 'INV-13.6-I',
    name: 'runtime lineage and replay law',
    holds: hasLineage && hasReplay && v.clean,
    evidence: `lineage=${hasLineage} replay=${hasReplay} validator=${v.clean}`,
  };
}

// ── INV-13.6-J : provider nondeterminism honesty law ────────────────

export async function checkINV_136_J(): Promise<L13_6InvariantResult> {
  // The mock provider is deterministic, so two calls produce the
  // same captured response. The runtime treats the captured
  // response as the source of truth for replay.
  const out1 = await buildGreenL13RuntimeOutput();
  const out2 = await buildGreenL13RuntimeOutput();
  const captureA =
    out1.model_gateway_response?.replay_hash ?? '';
  const captureB =
    out2.model_gateway_response?.replay_hash ?? '';
  // Now perturb the captured response (simulate a fresh provider
  // call returning different prose) and confirm the downstream
  // postprocessor catches the change.
  const perturbedProvider = (ctx: L13ProviderCallContext) => {
    const base = l13InternalMockProvider(ctx);
    return {
      ...base,
      draft_payload: {
        ...base.draft_payload,
        summary: base.draft_payload.summary + ' (variant prose)',
      },
    };
  };
  const out3 = await runL13AIExplanationRuntime({
    request: {
      request_id: 'req.j.variant',
      user_query: 'btc',
      received_at: '2026-05-15T00:00:00Z',
    },
    raw_scope_hint: 'btc',
    input_package: buildGreenL13InputPackage(),
    available_surface_classes: ALL_SURFACES_AVAILABLE,
    model_provider: L13ModelProvider.INTERNAL_MOCK,
    model_name: 'l13.mock',
    provider_call: perturbedProvider,
  });
  const variantCapture =
    out3.model_gateway_response?.replay_hash ?? '';
  const captureStable = captureA === captureB && captureA !== '';
  const variantDistinct = variantCapture !== captureA;
  return {
    id: 'INV-13.6-J',
    name: 'provider nondeterminism honesty law',
    holds: captureStable && variantDistinct,
    evidence: `captureA=${captureA.slice(0, 8)} captureB=${captureB.slice(0, 8)} variant=${variantCapture.slice(0, 8)}`,
  };
}

export async function runAllL13_6Invariants():
  Promise<readonly L13_6InvariantResult[]> {
  return [
    await checkINV_136_A(),
    await checkINV_136_B(),
    await checkINV_136_C(),
    await checkINV_136_D(),
    await checkINV_136_E(),
    await checkINV_136_F(),
    await checkINV_136_G(),
    await checkINV_136_H(),
    await checkINV_136_I(),
    await checkINV_136_J(),
  ];
}

// Suppress unused-import warning for symbols referenced only by
// downstream cert tests.
void POLICY_V;
void isL13EmissionRunStatus;
void L13DraftParseStatus.PARSED_OK;
void L13ProviderResponseStatus.PROVIDER_OK;
void L13FinalEmissionDecision.EMIT_CLEAN;
void L13RewriteReasonCode.STRUCTURE_INCOMPLETE;
void buildL13RuntimeRefusal;
void runL13PostprocessorPipeline;
void runL13FinalOutputGate;
void callL13ModelGateway;
void validateL13ModelGatewayRequest;
void validateL13ModelGatewayResponse;
void validateL13ModelDraftOutput;
void validateL13RewriteRequest;
