/**
 * L13.6 — Runtime Certification
 *
 * §13.6.32 — Bands A..F prove every law mechanically.
 */

import { L13DependencySurfaceClass } from '../l13/contracts/l13-constitutional-types';
import { L13ModelProvider } from '../l13/contracts/model-gateway-request';
import { L13DraftParseStatus } from '../l13/contracts/model-gateway-response';
import { L13ScopeResolutionStatus } from '../l13/contracts/scope-resolution';
import { L13ReadPlanStatus } from '../l13/contracts/read-surface-plan';
import {
  L13PromptTemplateStatus,
  isL13PromptTemplateUsable,
} from '../l13/contracts/prompt-template';
import { L13RuntimeRunStatus } from '../l13/contracts/runtime-run-record';
import {
  L13FinalEmissionDecision,
  isL13UserEmittingDecision,
} from '../l13/contracts/final-output-gate';
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
  l13InternalMockProvider,
} from '../l13/runtime';
import {
  validateL13UserIntentClassification,
  validateL13ScopeResolutionResult,
  validateL13ReadPlan,
  validateL13PromptTemplate,
  validateL13PromptAssembly,
  validateL13ModelGatewayRequest,
  validateL13ModelGatewayResponse,
  validateL13ModelDraftOutput,
  validateL13RuntimeRefusalEnvelope,
  validateL13FinalOutputGateResult,
  validateL13RuntimeRunRecord,
  L13RuntimeViolationCode,
} from '../l13/validation';
import {
  emitL13RuntimeAuditRecord,
  getL13RuntimeAuditLog,
  getL13RuntimeCriticalViolations,
  L13RuntimeAuditSubjectClass,
  resetL13RuntimeAuditLog,
  severityForL13RuntimeCode,
  isL13RuntimeBlockingCode,
} from '../l13/constitution';
import { L13ViolationSeverity } from '../l13/contracts';
import { buildGreenL13InputPackage } from '../l13/invariants/l13_2-invariants';
import {
  buildGreenL13RuntimeOutput,
  runAllL13_6Invariants,
} from '../l13/invariants/l13_6-invariants';
import { L13UserIntentClass } from '../l13/contracts/user-intent-binding';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function band(title: string): void {
  console.log(`\n── ${title} ──`);
}

const ALL_SURFACES: readonly L13DependencySurfaceClass[] = [
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

async function main(): Promise<void> {
  // ── BAND A : intent and scope ────────────────────────────────────

  band('BAND A — intent and scope');
  {
    const c = classifyL13UserIntent({
      request_id: 'req.a.1',
      user_query: 'why is btc moving',
      received_at: '2026-05-15T00:00:00Z',
    });
    assert(
      c.selected_intent === L13UserIntentClass.WHY_IS_THIS_MOVING,
      'A.1 "why is btc moving" classified as WHY_IS_THIS_MOVING',
    );
    assert(
      validateL13UserIntentClassification(c).clean,
      'A.2 intent classification validator clean',
    );

    const c2 = classifyL13UserIntent({
      request_id: 'req.a.1',
      user_query: 'why is btc moving',
      received_at: '2026-05-15T00:00:00Z',
    });
    assert(
      c.replay_hash === c2.replay_hash,
      'A.3 intent classification deterministic across runs',
    );

    // Adversarial intent routes out of scope.
    const adv = classifyL13UserIntent({
      request_id: 'req.a.adv',
      user_query: 'should i buy btc now',
      received_at: '2026-05-15T00:00:00Z',
    });
    assert(
      adv.out_of_scope_reason_codes.length > 0,
      'A.4 adversarial query produces out_of_scope_reason_codes',
    );

    // Scope cleanly resolves "btc".
    const scope = resolveL13Scope(c, {
      request_id: 'req.a.1',
      intent_classification_ref: c.intent_classification_id,
      raw_scope_hint: 'btc',
    });
    assert(
      scope.scope_resolution_status ===
        L13ScopeResolutionStatus.RESOLVED_CLEAN,
      `A.5 "btc" resolves clean (got ${scope.scope_resolution_status})`,
    );
    assert(
      validateL13ScopeResolutionResult(scope).clean,
      'A.6 scope resolution validator clean',
    );

    // Comparison intent without enough scopes → ambiguous.
    const cmpIntent = classifyL13UserIntent({
      request_id: 'req.a.cmp',
      user_query: 'compare btc vs eth',
      received_at: '2026-05-15T00:00:00Z',
    });
    const cmpScopeAmbiguous = resolveL13Scope(cmpIntent, {
      request_id: 'req.a.cmp',
      intent_classification_ref: cmpIntent.intent_classification_id,
      raw_comparison_scope_hints: ['btc'],
    });
    assert(
      cmpScopeAmbiguous.scope_resolution_status ===
        L13ScopeResolutionStatus.AMBIGUOUS_NEEDS_CLARIFICATION,
      'A.7 comparison intent with single scope returns ambiguous',
    );

    // Empty query → out of scope, never silently default.
    const empty = classifyL13UserIntent({
      request_id: 'req.a.empty',
      user_query: '',
      received_at: '2026-05-15T00:00:00Z',
    });
    assert(
      empty.out_of_scope_reason_codes.length > 0,
      'A.8 empty query routed out of scope (no silent default)',
    );
  }

  // ── BAND B : read surfaces and input package gate ────────────────

  band('BAND B — read surfaces and input package gate');
  {
    const intent = classifyL13UserIntent({
      request_id: 'req.b.1',
      user_query: 'btc',
      received_at: '2026-05-15T00:00:00Z',
    });
    const scope = resolveL13Scope(intent, {
      request_id: 'req.b.1',
      intent_classification_ref: intent.intent_classification_id,
      raw_scope_hint: 'btc',
    });
    const fullPlan = selectL13ReadSurfaces({
      intent,
      scope,
      available_surface_classes: ALL_SURFACES,
      available_bundle_refs: [
        'l11.score.context.bundle',
        'l12.scenario.context.bundle',
      ],
    });
    assert(
      fullPlan.read_plan_status !==
        L13ReadPlanStatus.BLOCKED_MISSING_REQUIRED_SURFACE,
      'B.1 full surface set produces non-blocked plan',
    );
    assert(
      validateL13ReadPlan(fullPlan).clean,
      'B.2 read plan validator clean on full surfaces',
    );

    // Forward-looking intent requires L12 scenario bundle.
    const forwardIntent = classifyL13UserIntent({
      request_id: 'req.b.2',
      user_query: 'whats next',
      received_at: '2026-05-15T00:00:00Z',
    });
    const forwardPlan = selectL13ReadSurfaces({
      intent: forwardIntent,
      scope,
      available_surface_classes: ALL_SURFACES,
      available_bundle_refs: ['l12.scenario.context.bundle'],
    });
    assert(
      forwardPlan.l12_scenario_context_required,
      'B.3 forward-looking intent requires L12 scenario bundle',
    );

    // Score intent requires L11 score bundle.
    const scoreIntent = classifyL13UserIntent({
      request_id: 'req.b.3',
      user_query: 'explain the omniscore',
      received_at: '2026-05-15T00:00:00Z',
    });
    const scorePlan = selectL13ReadSurfaces({
      intent: scoreIntent,
      scope,
      available_surface_classes: ALL_SURFACES,
    });
    assert(
      scorePlan.l11_score_context_required,
      'B.4 score-explanation intent requires L11 score bundle',
    );

    // Missing required surface → blocked plan.
    const partialPlan = selectL13ReadSurfaces({
      intent,
      scope,
      available_surface_classes: [
        L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
      ],
    });
    assert(
      partialPlan.read_plan_status ===
        L13ReadPlanStatus.BLOCKED_MISSING_REQUIRED_SURFACE,
      'B.5 missing required surface produces BLOCKED plan',
    );
    assert(
      partialPlan.missing_required_surface_classes.length > 0,
      'B.6 missing surfaces enumerated',
    );
  }

  // ── BAND C : prompt template and assembly law ────────────────────

  band('BAND C — prompt template and assembly law');
  {
    const tpl = selectL13PromptTemplate(
      L13UserIntentClass.WHATS_HAPPENING,
    );
    assert(!!tpl, 'C.1 template selected for WHATS_HAPPENING');
    if (!tpl) throw new Error('template missing');
    assert(
      isL13PromptTemplateUsable(tpl.template_status),
      'C.2 template status is usable',
    );
    assert(
      l13TemplateHasAllMandatoryBlocks(tpl),
      'C.3 template carries all mandatory policy blocks',
    );
    assert(
      validateL13PromptTemplate(tpl).clean,
      'C.4 prompt template validator clean',
    );

    // Tampered template (missing block) → validator rejects.
    const bad = {
      ...tpl,
      no_invention_block: '',
    };
    const v = validateL13PromptTemplate(bad);
    assert(!v.clean, 'C.5 missing mandatory block rejected');

    // Unapproved template rejected.
    const exp = { ...tpl, template_status: L13PromptTemplateStatus.EXPERIMENTAL_BLOCKED };
    assert(
      !validateL13PromptTemplate(exp).clean,
      'C.6 experimental_blocked template rejected',
    );

    // Assembly is deterministic.
    const pkg = buildGreenL13InputPackage();
    const a1 = assembleL13Prompt({
      request_id: 'req.c.1',
      template: tpl,
      input_package: pkg,
    });
    const a2 = assembleL13Prompt({
      request_id: 'req.c.1',
      template: tpl,
      input_package: pkg,
    });
    assert(
      a1.assembly.replay_hash === a2.assembly.replay_hash,
      'C.7 prompt assembly replay hash deterministic',
    );
    assert(
      validateL13PromptAssembly(a1.assembly).clean,
      'C.8 prompt assembly validator clean',
    );

    // No raw lower-layer data in prompt.
    const leaks = l13DetectRawLowerLayerLeakInPrompt(a1.assembly);
    assert(leaks.length === 0, 'C.9 no raw lower-layer leak in prompt');
  }

  // ── BAND D : model gateway law ───────────────────────────────────

  band('BAND D — model gateway law');
  {
    const intent = classifyL13UserIntent({
      request_id: 'req.d.1',
      user_query: 'btc',
      received_at: '2026-05-15T00:00:00Z',
    });
    const tpl = selectL13PromptTemplate(intent.selected_intent);
    if (!tpl) throw new Error('template missing');
    const { assembly } = assembleL13Prompt({
      request_id: 'req.d.1',
      template: tpl,
      input_package: buildGreenL13InputPackage(),
    });
    const result = await callL13ModelGateway({
      request_id: 'req.d.1',
      assembly,
      model_provider: L13ModelProvider.INTERNAL_MOCK,
      model_name: 'l13.mock',
      answer_mode: intent.answer_mode_hint,
      output_class_hint: intentToOutputClassHint(intent),
      purpose: 'market_explanation',
    });
    const reqV = validateL13ModelGatewayRequest(result.request, {
      purpose: 'market_explanation',
    });
    assert(reqV.clean, `D.1 gateway request validator clean (issues=${reqV.issues.length})`);
    const respV = validateL13ModelGatewayResponse(result.response);
    assert(respV.clean, 'D.2 gateway response validator clean');
    const draftV = validateL13ModelDraftOutput(result.draft);
    assert(draftV.clean, 'D.3 draft output validator clean');
    assert(
      result.response.parse_status === L13DraftParseStatus.PARSED_OK,
      'D.4 parse_status PARSED_OK',
    );
    assert(
      result.request.temperature <= 0.2,
      `D.5 temperature within market_explanation cap (got ${result.request.temperature})`,
    );

    // Illegal temperature rejected.
    const tooHot = {
      ...result.request,
      temperature: 0.9,
    };
    const tooHotV = validateL13ModelGatewayRequest(tooHot, {
      purpose: 'market_explanation',
    });
    assert(
      !tooHotV.clean,
      'D.6 temperature above purpose cap rejected by validator',
    );
  }

  // ── BAND E : post-generation enforcement ─────────────────────────

  band('BAND E — post-generation enforcement');
  {
    const out = await buildGreenL13RuntimeOutput();
    assert(
      !!out.run_record.ai_output_ref,
      'E.1 output object built after model call',
    );
    assert(
      !!out.run_record.grounding_result_ref,
      'E.2 grounding pass ran after output build',
    );
    assert(
      !!out.run_record.expression_governance_envelope_ref,
      'E.3 expression governance pass ran after grounding',
    );
    // Final gate sees grounding + expression refs.
    const gate = out.final_gate_result;
    assert(
      !!gate.grounded_output_envelope_ref &&
        !!gate.expression_governance_envelope_ref,
      'E.4 final gate received grounding + expression envelope refs',
    );
    // Adversarial intent routes through refusal builder.
    const adv = await runL13AIExplanationRuntime({
      request: {
        request_id: 'req.e.adv',
        user_query: 'should i buy btc',
        received_at: '2026-05-15T00:00:00Z',
      },
      raw_scope_hint: 'btc',
      input_package: buildGreenL13InputPackage(),
      available_surface_classes: ALL_SURFACES,
      model_provider: L13ModelProvider.INTERNAL_MOCK,
      model_name: 'l13.mock',
    });
    assert(
      adv.run_record.run_status ===
        L13RuntimeRunStatus.COMPLETED_REFUSAL,
      'E.5 adversarial intent terminates as COMPLETED_REFUSAL',
    );
    assert(
      adv.final_gate_result.final_emission_decision ===
        L13FinalEmissionDecision.EMIT_REFUSAL,
      'E.6 adversarial final emission EMIT_REFUSAL',
    );
    if (adv.refusal_envelope) {
      const v = validateL13RuntimeRefusalEnvelope(adv.refusal_envelope);
      assert(v.clean, 'E.7 refusal envelope validator clean');
    }
    // Direct postprocessor call: confirm grounding + expression
    // both ran on a fixture pipeline.
    const intent = classifyL13UserIntent({
      request_id: 'req.e.pp',
      user_query: 'btc',
      received_at: '2026-05-15T00:00:00Z',
    });
    const tpl = selectL13PromptTemplate(intent.selected_intent);
    if (!tpl) throw new Error('template missing');
    const { assembly } = assembleL13Prompt({
      request_id: 'req.e.pp',
      template: tpl,
      input_package: buildGreenL13InputPackage(),
    });
    const gw = await callL13ModelGateway({
      request_id: 'req.e.pp',
      assembly,
      model_provider: L13ModelProvider.INTERNAL_MOCK,
      model_name: 'l13.mock',
      answer_mode: intent.answer_mode_hint,
      output_class_hint: intentToOutputClassHint(intent),
    });
    const pp = runL13PostprocessorPipeline({
      request_id: 'req.e.pp',
      draft: gw.draft,
      input_package: buildGreenL13InputPackage(),
      model_gateway_request: gw.request,
      model_gateway_response: gw.response,
      output_class: intentToOutputClassHint(intent),
      answer_mode: intent.answer_mode_hint,
      scope_type: 'asset',
      scope_id: 'asset.btc',
    });
    assert(!!pp.output, 'E.8 postprocessor produced L13.3 output');
    assert(!!pp.grounding, 'E.9 postprocessor produced grounding result');
    assert(
      !!pp.expression.envelope,
      'E.10 postprocessor produced expression envelope',
    );
  }

  // ── BAND F : final runtime safety, audit, invariants ─────────────

  band('BAND F — final runtime safety, audit, invariants');
  {
    resetL13RuntimeAuditLog();
    const r = emitL13RuntimeAuditRecord({
      subjectClass: L13RuntimeAuditSubjectClass.MODEL_GATEWAY_REQUEST,
      subjectRef: 'l13.gateway.req.test',
      violationCode:
        L13RuntimeViolationCode.L13R_MODEL_GATEWAY_TEMPERATURE_ILLEGAL,
      message: 'temperature above ceiling',
    });
    assert(r.audit_id.length > 0, 'F.1 audit record emitted with id');
    assert(
      r.severity === L13ViolationSeverity.CRITICAL,
      'F.2 illegal temperature audited as CRITICAL',
    );
    assert(r.blocking, 'F.3 illegal temperature is blocking');
    assert(
      getL13RuntimeAuditLog().length === 1,
      'F.4 audit log captured one record',
    );
    assert(
      getL13RuntimeCriticalViolations().length === 1,
      'F.5 critical violations queryable',
    );
    assert(
      severityForL13RuntimeCode(
        L13RuntimeViolationCode.L13R_RUNTIME_LINEAGE_MISSING,
      ) === L13ViolationSeverity.ERROR,
      'F.6 lineage missing classified as ERROR',
    );
    assert(
      !isL13RuntimeBlockingCode(
        L13RuntimeViolationCode.L13R_RUNTIME_LINEAGE_MISSING,
      ),
      'F.7 lineage missing not blocking',
    );

    // Final gate is sole emitter on the green path.
    const out = await buildGreenL13RuntimeOutput();
    const gate = out.final_gate_result;
    assert(
      validateL13FinalOutputGateResult(gate).clean,
      'F.8 final gate validator clean',
    );
    assert(
      isL13UserEmittingDecision(gate.final_emission_decision) &&
        !!gate.user_emittable_output_ref,
      'F.9 user emission only via final gate user_emittable_output_ref',
    );
    assert(
      validateL13RuntimeRunRecord(out.run_record).clean,
      'F.10 runtime run record validator clean',
    );

    // Replay determinism: green pipeline twice → same run replay.
    const a = await buildGreenL13RuntimeOutput();
    const b = await buildGreenL13RuntimeOutput();
    assert(
      a.run_record.replay_hash === b.run_record.replay_hash,
      'F.11 runtime run record replay hash deterministic',
    );
    // Captured-response replay stable.
    assert(
      a.model_gateway_response?.replay_hash ===
        b.model_gateway_response?.replay_hash,
      'F.12 captured provider response replay hash stable',
    );
    // Variant provider response → distinct capture hash.
    const variant = await runL13AIExplanationRuntime({
      request: {
        request_id: 'req.f.variant',
        user_query: 'btc',
        received_at: '2026-05-15T00:00:00Z',
      },
      raw_scope_hint: 'btc',
      input_package: buildGreenL13InputPackage(),
      available_surface_classes: ALL_SURFACES,
      model_provider: L13ModelProvider.INTERNAL_MOCK,
      model_name: 'l13.mock',
      provider_call: ctx => {
        const base = l13InternalMockProvider(ctx);
        return {
          ...base,
          draft_payload: {
            ...base.draft_payload,
            summary: base.draft_payload.summary + ' (variant)',
          },
        };
      },
    });
    assert(
      variant.model_gateway_response?.replay_hash !==
        a.model_gateway_response?.replay_hash,
      'F.13 fresh provider variant flips capture hash (provider nondeterminism honesty)',
    );

    // Invariants A..J.
    const invs = await runAllL13_6Invariants();
    assert(invs.length === 10, `F.14 ten invariants executed (got ${invs.length})`);
    for (const inv of invs) {
      assert(inv.holds, `F.15 ${inv.id} ${inv.name} (${inv.evidence})`);
    }
  }

  console.log('');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

function intentToOutputClassHint(
  intent: ReturnType<typeof classifyL13UserIntent>,
) {
  // Local helper mirroring runtime's intentToOutputClass; cert
  // stays decoupled.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { L13AIOutputClass } = require('../l13/contracts/ai-output');
  switch (intent.answer_mode_hint) {
    case 'EXPLAIN_SCENARIO':
      return L13AIOutputClass.SCENARIO_EXPLANATION;
    case 'EXPLAIN_SCORE':
      return L13AIOutputClass.SCORE_EXPLANATION;
    case 'WRITE_ALERT':
      return L13AIOutputClass.ALERT_TEXT;
    case 'COMPARE_ASSETS':
      return L13AIOutputClass.ASSET_COMPARISON;
    case 'COMPARE_THESES':
      return L13AIOutputClass.THESIS_COMPARISON;
    case 'WRITE_REPORT':
      return L13AIOutputClass.STRUCTURED_REPORT;
    case 'DISCLOSE_CONTRADICTION':
      return L13AIOutputClass.CONTRADICTION_EXPLANATION;
    case 'REFUSE_UNSUPPORTED':
      return L13AIOutputClass.UNCERTAINTY_DISCLOSURE;
    default:
      return L13AIOutputClass.MARKET_EXPLANATION;
  }
}

main().catch(err => {
  console.error('Cert script crashed:', err);
  process.exit(1);
});
