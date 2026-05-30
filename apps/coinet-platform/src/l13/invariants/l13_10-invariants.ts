/**
 * L13.10 — Persistence, Feedback, Evaluation, and Audit Invariants
 *
 * §13.10.42 — INV-13.10-A through INV-13.10-J.
 */

import {
  L13MutationDiscipline,
  L13StorageAuthorityClass,
  l13IsAuthorityClass,
} from '../contracts/l13-storage-authority';
import {
  L13DurableSurfaceId,
} from '../contracts/l13-persistence-surface';
import {
  L13AIOutputSupersessionReason,
  L13CurrentOutputAuthorityStatus,
} from '../contracts/l13-current-output-record';
import { L13HistoricalFactFamily } from '../contracts/l13-historical-fact-family';
import { L13PersistenceClass } from '../contracts/l13-persistence-class';
import {
  L13FeedbackReasonCode,
  L13FeedbackType,
} from '../contracts/l13-feedback-record';
import {
  L13MetricConfidenceClass,
  L13MetricStatus,
  L13OutputQualityMetricClass,
  L13QualityEvaluationWindow,
  l13IsAdjudicatedMetric,
  l13IsSatisfactionProxyMetric,
} from '../contracts/l13-output-quality-metric';
import {
  L13OutputFailureClass,
  L13OutputFailureStage,
} from '../contracts/l13-output-failure-record';
import {
  getL13DurableSurfaceDescriptors,
  l13SurfaceIsRegistered,
} from '../persistence/l13-materialization-policy';
import {
  materializeL13Run,
  recomputeL13CurrentFeedbackSummary,
  writeL13AIOutputFailureRecord,
  writeL13CurrentAIOutputRecord,
  writeL13HistoricalAIOutputFact,
  writeL13OutputQualityEvaluation,
  writeL13OutputQualityMetric,
  writeL13UserFeedbackRecord,
} from '../persistence';
import {
  validateL13Persistence,
} from '../persistence/l13-persistence.validator';
import {
  validateL13AIOutputFailureRecord,
  validateL13CurrentAIOutputRecord,
  validateL13FeedbackSummaryRecord,
  validateL13HistoricalAIOutputFact,
  validateL13OutputQualityEvaluation,
  validateL13OutputQualityMetric,
  validateL13PersistenceEnvelope,
  validateL13UserFeedbackRecord,
} from '../validation/persistence.validators';

export interface L13_10InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── Test helpers ────────────────────────────────────────────────────

function buildGreenMaterializationInput() {
  return {
    request_id: 'l13.req.test',
    runtime_run_id: 'l13.run.test',
    output_id: 'l13.out.test',
    input_package_ref: 'l13.pkg.test',
    prompt_assembly_ref: 'l13.prompt.test',
    model_run_ref: 'l13.model.run.test',
    model_response_artifact_ref: 'l13.model.artifact.test',
    final_output_ref: 'l13.out.test',
    product_mode_payload_ref: 'l13.mode.payload.test',
    styled_response_ref: 'l13.styled.test',
    safety_gate_result_ref: 'l13.safety.gate.test',
    final_gate_result_ref: 'l13.final.gate.test',
    grounded_claim_refs: ['l13.claim.grounded.1'],
    blocked_claim_refs: ['l13.claim.blocked.1'],
    current_authority: {
      output_id: 'l13.out.test',
      request_id: 'l13.req.test',
      runtime_run_id: 'l13.run.test',
      scope_type: 'ASSET',
      scope_id: 'btc',
      as_of: '2026-05-15T00:00:00Z',
      product_answer_mode: 'STANDARD_CHAT',
      output_class: 'MARKET_EXPLANATION',
      final_emission_decision: 'USER_EMIT',
      safety_decision: 'SAFETY_ALLOW',
      style_readiness: 'STYLE_READY',
      mode_readiness: 'MODE_READY',
      expression_readiness: 'EXPRESSION_READY',
      grounding_readiness: 'GROUNDING_CLEAN',
      user_emittable_payload_ref: 'l13.mode.payload.test',
      final_gate_result_ref: 'l13.final.gate.test',
      safety_gate_result_ref: 'l13.safety.gate.test',
      styled_response_ref: 'l13.styled.test',
      output_mode_envelope_ref: 'l13.mode.env.test',
      required_artifacts_complete: true,
    },
    historical_fact: {
      output_id: 'l13.out.test',
      request_id: 'l13.req.test',
      runtime_run_id: 'l13.run.test',
      product_answer_mode: 'STANDARD_CHAT',
      output_class: 'MARKET_EXPLANATION',
      emitted: true,
      refusal_emitted: false,
      blocked: false,
      grounding_readiness: 'GROUNDING_CLEAN',
      expression_readiness: 'EXPRESSION_READY',
      mode_readiness: 'MODE_READY',
      style_readiness: 'STYLE_READY',
      safety_decision: 'SAFETY_ALLOW',
    },
  } as const;
}

// ── INV-13.10-A : L5-only persistence law ───────────────────────────

export function checkINV_1310_A(): L13_10InvariantResult {
  const result = materializeL13Run(buildGreenMaterializationInput());
  const allHaveEnvelope = result.envelopes.length > 0;
  let allAuthorized = true;
  let allHaveLineage = true;
  for (const e of result.envelopes) {
    if (!l13IsAuthorityClass(e.storage_authority_class)) {
      allAuthorized = false;
    }
    if (e.lineage_refs.length === 0) allHaveLineage = false;
  }
  // Direct-write attempt must throw at validation time too.
  let illegalRejected = false;
  const fakeEnvelope = {
    persistence_envelope_id: 'l13.persist.env.illegal',
    surface_id: L13DurableSurfaceId.AI_OUTPUTS,
    persistence_class: L13PersistenceClass.FINAL_AI_OUTPUT,
    materialization_mode:
      result.envelopes[0]?.materialization_mode ?? ('DIRECT_ROW' as never),
    storage_authority_class:
      L13StorageAuthorityClass.REDIS_CACHE_NON_AUTHORITY,
    source_artifact_ref: 'l13.illegal',
    write_intent: 'WRITE_NEW' as never,
    append_safe_required: true,
    current_authority_update: false,
    lineage_refs: ['l13.persistence.lineage'],
    replay_hash: 'h',
    policy_version: 'l13.persistence.v1',
  };
  const v = validateL13PersistenceEnvelope(fakeEnvelope as never);
  illegalRejected = !v.clean;
  return {
    id: 'INV-13.10-A',
    name: 'L5-only persistence law',
    holds: allHaveEnvelope && allAuthorized && allHaveLineage && illegalRejected,
    evidence: `envelopes=${result.envelopes.length} authorized=${allAuthorized} lineage=${allHaveLineage} illegalRejected=${illegalRejected}`,
  };
}

// ── INV-13.10-B : input/output/model-run durability law ────────────

export function checkINV_1310_B(): L13_10InvariantResult {
  const green = materializeL13Run(buildGreenMaterializationInput());
  const requiredClasses = new Set([
    L13PersistenceClass.INPUT_PACKAGE,
    L13PersistenceClass.PROMPT_ASSEMBLY,
    L13PersistenceClass.MODEL_RUN,
    L13PersistenceClass.MODEL_RESPONSE_ARTIFACT,
    L13PersistenceClass.FINAL_AI_OUTPUT,
    L13PersistenceClass.PRODUCT_MODE_PAYLOAD,
    L13PersistenceClass.STYLED_RESPONSE,
    L13PersistenceClass.SAFETY_GATE_RESULT,
    L13PersistenceClass.FINAL_GATE_RESULT,
  ]);
  const found = new Set<L13PersistenceClass>();
  for (const e of green.envelopes) {
    if (requiredClasses.has(e.persistence_class)) found.add(e.persistence_class);
  }
  const allFound = Array.from(requiredClasses).every(c => found.has(c));
  const complete = green.required_artifacts_complete;
  // Missing required artifact → failure record persisted + current
  // authority is PENDING_MATERIALIZATION.
  const incomplete = materializeL13Run({
    ...buildGreenMaterializationInput(),
    model_response_artifact_ref: undefined,
  });
  const failurePersisted = incomplete.failures.length > 0;
  const pending =
    incomplete.current_authority?.current_authority_status ===
    L13CurrentOutputAuthorityStatus.PENDING_MATERIALIZATION;
  return {
    id: 'INV-13.10-B',
    name: 'input/output/model-run durability law',
    holds: allFound && complete && failurePersisted && pending,
    evidence: `allFound=${allFound} complete=${complete} failurePersisted=${failurePersisted} pending=${pending}`,
  };
}

// ── INV-13.10-C : claim durability law ──────────────────────────────

export function checkINV_1310_C(): L13_10InvariantResult {
  const green = materializeL13Run(buildGreenMaterializationInput());
  const groundedEnvelopes = green.envelopes.filter(
    e => e.persistence_class === L13PersistenceClass.GROUNDED_CLAIM,
  );
  const blockedEnvelopes = green.envelopes.filter(
    e => e.persistence_class === L13PersistenceClass.BLOCKED_CLAIM,
  );
  const allHaveRefs =
    groundedEnvelopes.every(
      e => e.source_artifact_ref.length > 0 && e.replay_hash.length > 0,
    ) &&
    blockedEnvelopes.every(
      e => e.source_artifact_ref.length > 0 && e.replay_hash.length > 0,
    );
  return {
    id: 'INV-13.10-C',
    name: 'claim durability law',
    holds:
      groundedEnvelopes.length === 1 &&
      blockedEnvelopes.length === 1 &&
      allHaveRefs,
    evidence: `grounded=${groundedEnvelopes.length} blocked=${blockedEnvelopes.length} allRefs=${allHaveRefs}`,
  };
}

// ── INV-13.10-D : feedback durability and queryability law ─────────

export function checkINV_1310_D(): L13_10InvariantResult {
  const w = writeL13UserFeedbackRecord({
    output_id: 'l13.out.test',
    feedback_type: L13FeedbackType.THUMBS_UP,
    feedback_reason_codes: [
      L13FeedbackReasonCode.ANSWERED_QUESTION_WELL,
    ],
  });
  const v = validateL13UserFeedbackRecord(w.record);
  // Missing reason codes must be flagged.
  const badFeedback = writeL13UserFeedbackRecord({
    output_id: 'l13.out.test',
    feedback_type: L13FeedbackType.THUMBS_DOWN,
    feedback_reason_codes: [],
  });
  const vBad = validateL13UserFeedbackRecord(badFeedback.record);
  // Output ref absent must be flagged.
  const noOutputRef = writeL13UserFeedbackRecord({
    output_id: '',
    feedback_type: L13FeedbackType.THUMBS_DOWN,
    feedback_reason_codes: [
      L13FeedbackReasonCode.DID_NOT_ANSWER_QUESTION,
    ],
  });
  const vNoRef = validateL13UserFeedbackRecord(noOutputRef.record);
  return {
    id: 'INV-13.10-D',
    name: 'feedback durability and queryability law',
    holds:
      v.clean &&
      !vBad.clean &&
      !vNoRef.clean &&
      w.record.output_id === 'l13.out.test' &&
      w.envelope.append_safe_required,
    evidence: `green=${v.clean} badReasonsRejected=${!vBad.clean} noOutputRejected=${!vNoRef.clean}`,
  };
}

// ── INV-13.10-E : current vs historical authority law ──────────────

export function checkINV_1310_E(): L13_10InvariantResult {
  const cur1 = writeL13CurrentAIOutputRecord({
    ...buildGreenMaterializationInput().current_authority,
    output_id: 'l13.out.e1',
  });
  // Supersession with reason.
  const cur2 = writeL13CurrentAIOutputRecord({
    ...buildGreenMaterializationInput().current_authority,
    output_id: 'l13.out.e1',
    supersedes_output_ref: cur1.record.output_id,
    supersession_reason: L13AIOutputSupersessionReason.NEW_RUNTIME_RUN,
  });
  const v1 = validateL13CurrentAIOutputRecord(cur1.record);
  const v2 = validateL13CurrentAIOutputRecord(cur2.record);
  // Supersession without reason must be rejected.
  const illegal = writeL13CurrentAIOutputRecord({
    ...buildGreenMaterializationInput().current_authority,
    output_id: 'l13.out.e1',
    supersedes_output_ref: cur1.record.output_id,
    supersession_reason: undefined,
  });
  const vIllegal = validateL13CurrentAIOutputRecord(illegal.record);
  // Historical fact append must succeed and replay-hash must be present.
  const fact = writeL13HistoricalAIOutputFact(
    buildGreenMaterializationInput().historical_fact,
  );
  const vFact = validateL13HistoricalAIOutputFact(fact.fact);
  // Discipline: historical authority class must be APPEND_ONLY.
  const descriptors = getL13DurableSurfaceDescriptors();
  const allHistoricalAppendOnly = descriptors
    .filter(d =>
      [
        L13DurableSurfaceId.TS_AI_OUTPUT_FACT_V1,
        L13DurableSurfaceId.TS_AI_CLAIM_GROUNDING_V1,
        L13DurableSurfaceId.TS_AI_BLOCKED_CLAIM_FACT_V1,
        L13DurableSurfaceId.TS_AI_SAFETY_EVENT_V1,
        L13DurableSurfaceId.TS_AI_OUTPUT_QUALITY_V1,
        L13DurableSurfaceId.TS_AI_MODEL_RUN_FACT_V1,
        L13DurableSurfaceId.TS_AI_FAILURE_FACT_V1,
        L13DurableSurfaceId.TS_AI_FEEDBACK_V1,
        L13DurableSurfaceId.TS_AI_FEEDBACK_RESOLUTION_FACT_V1,
      ].includes(d.surface_id),
    )
    .every(d => d.mutation_discipline === L13MutationDiscipline.APPEND_ONLY);
  return {
    id: 'INV-13.10-E',
    name: 'current vs historical authority law',
    holds:
      v1.clean &&
      v2.clean &&
      !vIllegal.clean &&
      vFact.clean &&
      allHistoricalAppendOnly,
    evidence: `cur1=${v1.clean} cur2=${v2.clean} illegalRejected=${!vIllegal.clean} factClean=${vFact.clean} histAppendOnly=${allHistoricalAppendOnly}`,
  };
}

// ── INV-13.10-F : quality metric definition law ────────────────────

export function checkINV_1310_F(): L13_10InvariantResult {
  // Groundedness rate: 9/10 = 0.9.
  const ground = writeL13OutputQualityMetric({
    metric_class: L13OutputQualityMetricClass.GROUNDEDNESS_RATE,
    metric_window: L13QualityEvaluationWindow.PER_OUTPUT,
    numerator: 9,
    denominator: 10,
    answer_mode: 'STANDARD_CHAT',
  });
  const vGround = validateL13OutputQualityMetric(ground.metric);
  const groundOk =
    vGround.clean &&
    ground.metric.metric_value === 0.9 &&
    ground.metric.metric_status === L13MetricStatus.METRIC_CLEAN;
  // Invalid denominator must surface as METRIC_INVALID_DENOMINATOR.
  const invalid = writeL13OutputQualityMetric({
    metric_class: L13OutputQualityMetricClass.GROUNDEDNESS_RATE,
    metric_window: L13QualityEvaluationWindow.PER_OUTPUT,
    numerator: 0,
    denominator: 0,
  });
  const vInvalid = validateL13OutputQualityMetric(invalid.metric);
  const invalidFlagged =
    invalid.metric.metric_status === L13MetricStatus.METRIC_INVALID_DENOMINATOR;
  // Adjudicated correctness requires adjudication label.
  const adj = writeL13OutputQualityMetric({
    metric_class:
      L13OutputQualityMetricClass.REFUSAL_CORRECTNESS_ADJUDICATED,
    metric_window: L13QualityEvaluationWindow.WEEKLY,
    numerator: 5,
    denominator: 10,
    adjudication_label_present: true,
  });
  const adjOk =
    adj.metric.metric_confidence_class ===
    L13MetricConfidenceClass.ADJUDICATED;
  // Satisfaction proxy is PROXY_ONLY, never ADJUDICATED.
  const proxy = writeL13OutputQualityMetric({
    metric_class: L13OutputQualityMetricClass.OUTPUT_USEFULNESS_SCORE,
    metric_window: L13QualityEvaluationWindow.DAILY,
    numerator: 50,
    denominator: 100,
  });
  const proxyOk =
    proxy.metric.metric_confidence_class ===
    L13MetricConfidenceClass.PROXY_ONLY &&
    l13IsSatisfactionProxyMetric(
      L13OutputQualityMetricClass.OUTPUT_USEFULNESS_SCORE,
    ) &&
    !l13IsAdjudicatedMetric(
      L13OutputQualityMetricClass.OUTPUT_USEFULNESS_SCORE,
    );
  // Evaluation record per output.
  const evaluation = writeL13OutputQualityEvaluation({
    output_id: 'l13.out.test',
    runtime_run_id: 'l13.run.test',
    groundedness_passed: true,
    contradiction_disclosure_passed: true,
    safety_gate_passed: true,
    style_integrity_passed: true,
    mode_completeness_passed: true,
    unsupported_claim_attempt_count: 1,
    blocked_claim_count: 1,
    emitted_claim_count: 9,
    safety_rewrite_count: 0,
    refusal_emitted: false,
  });
  const vEval = validateL13OutputQualityEvaluation(evaluation.evaluation);
  return {
    id: 'INV-13.10-F',
    name: 'quality metric definition law',
    holds:
      groundOk &&
      invalidFlagged &&
      !vInvalid.clean &&
      adjOk &&
      proxyOk &&
      vEval.clean,
    evidence: `ground=${groundOk} invalid=${invalidFlagged} adj=${adjOk} proxy=${proxyOk} evalClean=${vEval.clean}`,
  };
}

// ── INV-13.10-G : failure and audit law ────────────────────────────

export function checkINV_1310_G(): L13_10InvariantResult {
  const incomplete = materializeL13Run({
    ...buildGreenMaterializationInput(),
    final_output_ref: undefined,
  });
  const failureRecorded =
    incomplete.failures.length > 0 &&
    incomplete.failures[0].failure_class ===
      L13OutputFailureClass.REQUIRED_ARTIFACT_MISSING;
  const v = validateL13AIOutputFailureRecord(incomplete.failures[0]);
  // Manual failure write — stage enum covers materialization classes.
  const write = writeL13AIOutputFailureRecord({
    request_id: 'l13.req.g',
    failure_stage: L13OutputFailureStage.AUDIT_EVENT_PERSISTENCE,
    failure_class: L13OutputFailureClass.L5_ROUTE_REJECTED,
    failure_reason_codes: ['UNIT_TEST_FAILURE'],
    safe_to_retry: true,
    repair_possible: true,
  });
  const vWrite = validateL13AIOutputFailureRecord(write.record);
  return {
    id: 'INV-13.10-G',
    name: 'failure and audit law',
    holds: failureRecorded && v.clean && vWrite.clean,
    evidence: `failureRecorded=${failureRecorded} green=${v.clean} writeClean=${vWrite.clean}`,
  };
}

// ── INV-13.10-H : evaluation honesty law ───────────────────────────

export function checkINV_1310_H(): L13_10InvariantResult {
  // Satisfaction-proxy classes never collapse into ADJUDICATED.
  const satisfactionMetric = writeL13OutputQualityMetric({
    metric_class: L13OutputQualityMetricClass.REFUSAL_SATISFACTION_PROXY,
    metric_window: L13QualityEvaluationWindow.ROLLING_7D,
    numerator: 40,
    denominator: 50,
  });
  const satOk =
    satisfactionMetric.metric.metric_confidence_class ===
    L13MetricConfidenceClass.PROXY_ONLY;
  // Hallucination incident count requires adjudication label to
  // earn ADJUDICATED — without it, it is PROXY_ONLY/PROVISIONAL.
  const hallucMetric = writeL13OutputQualityMetric({
    metric_class: L13OutputQualityMetricClass.HALLUCINATION_INCIDENT_COUNT,
    metric_window: L13QualityEvaluationWindow.MONTHLY,
    numerator: 0,
    denominator: 100,
    adjudication_label_present: false,
  });
  const hallucNotAdjudicated =
    hallucMetric.metric.metric_confidence_class !==
    L13MetricConfidenceClass.ADJUDICATED;
  // Adjudication-labeled hallucination metric earns ADJUDICATED.
  const hallucAdj = writeL13OutputQualityMetric({
    metric_class: L13OutputQualityMetricClass.HALLUCINATION_INCIDENT_COUNT,
    metric_window: L13QualityEvaluationWindow.MONTHLY,
    numerator: 0,
    denominator: 100,
    adjudication_label_present: true,
  });
  const hallucAdjOk =
    hallucAdj.metric.metric_confidence_class ===
    L13MetricConfidenceClass.ADJUDICATED;
  return {
    id: 'INV-13.10-H',
    name: 'evaluation honesty law',
    holds: satOk && hallucNotAdjudicated && hallucAdjOk,
    evidence: `proxy=${satOk} hallucNotAdjudicated=${hallucNotAdjudicated} hallucAdjOk=${hallucAdjOk}`,
  };
}

// ── INV-13.10-I : downstream (L14) handoff law ─────────────────────

export function checkINV_1310_I(): L13_10InvariantResult {
  const green = materializeL13Run(buildGreenMaterializationInput());
  // L14 may consume: current authority + historical fact + feedback +
  // quality. We assert all four shapes are present, validated, and
  // carry replay hashes + lineage. L14 may NEVER mutate; the
  // historical-fact authority class is APPEND_ONLY (proven in E).
  const feedback = writeL13UserFeedbackRecord({
    output_id: green.current_authority!.output_id,
    feedback_type: L13FeedbackType.HELPFUL,
    feedback_reason_codes: [L13FeedbackReasonCode.ANSWERED_QUESTION_WELL],
  });
  const summary = recomputeL13CurrentFeedbackSummary({
    output_id: green.current_authority!.output_id,
    feedback_records: [feedback.record],
  });
  const evaluation = writeL13OutputQualityEvaluation({
    output_id: green.current_authority!.output_id,
    runtime_run_id: 'l13.run.test',
    groundedness_passed: true,
    contradiction_disclosure_passed: true,
    safety_gate_passed: true,
    style_integrity_passed: true,
    mode_completeness_passed: true,
    unsupported_claim_attempt_count: 0,
    blocked_claim_count: 0,
    emitted_claim_count: 5,
    safety_rewrite_count: 0,
    refusal_emitted: false,
  });
  const composite = validateL13Persistence({
    envelopes: green.envelopes,
    current_outputs: green.current_authority ? [green.current_authority] : [],
    historical_facts: green.historical_fact ? [green.historical_fact] : [],
    feedback_records: [feedback.record],
    feedback_summaries: [summary.summary],
    quality_evaluations: [evaluation.evaluation],
  });
  return {
    id: 'INV-13.10-I',
    name: 'downstream handoff law',
    holds:
      composite.clean &&
      validateL13FeedbackSummaryRecord(summary.summary).clean,
    evidence: `composite=${composite.clean} issues=${composite.issues.length}`,
  };
}

// ── INV-13.10-J : replay / lineage law ─────────────────────────────

export function checkINV_1310_J(): L13_10InvariantResult {
  // Deterministic replay: same inputs → same hashes for every shape.
  const inputA = buildGreenMaterializationInput();
  const inputB = buildGreenMaterializationInput();
  const a = materializeL13Run(inputA);
  const b = materializeL13Run(inputB);
  const stableCurrent =
    a.current_authority?.replay_hash === b.current_authority?.replay_hash;
  const stableHistory =
    a.historical_fact?.replay_hash === b.historical_fact?.replay_hash;
  const stableEnvelopes =
    a.envelopes.length === b.envelopes.length &&
    a.envelopes.every(
      (e, i) => e.replay_hash === b.envelopes[i].replay_hash,
    );
  // Material change must flip the current-authority hash.
  const c = materializeL13Run({
    ...inputA,
    current_authority: {
      ...inputA.current_authority,
      product_answer_mode: 'DEEP_ANALYSIS',
    },
  });
  const flipped =
    c.current_authority?.replay_hash !== a.current_authority?.replay_hash;
  // All durable surfaces are registered (lineage substrate complete).
  const allRegistered = getL13DurableSurfaceDescriptors().every(d =>
    l13SurfaceIsRegistered(d.surface_id),
  );
  // All historical fact families are enumerated.
  const allFamiliesEnumerated = Object.values(L13HistoricalFactFamily).length === 9;
  return {
    id: 'INV-13.10-J',
    name: 'replay and lineage law',
    holds:
      stableCurrent &&
      stableHistory &&
      stableEnvelopes &&
      flipped &&
      allRegistered &&
      allFamiliesEnumerated,
    evidence: `cur=${stableCurrent} hist=${stableHistory} env=${stableEnvelopes} flip=${flipped} reg=${allRegistered} fam=${allFamiliesEnumerated}`,
  };
}

export function runAllL13_10Invariants():
  readonly L13_10InvariantResult[] {
  return [
    checkINV_1310_A(),
    checkINV_1310_B(),
    checkINV_1310_C(),
    checkINV_1310_D(),
    checkINV_1310_E(),
    checkINV_1310_F(),
    checkINV_1310_G(),
    checkINV_1310_H(),
    checkINV_1310_I(),
    checkINV_1310_J(),
  ];
}
