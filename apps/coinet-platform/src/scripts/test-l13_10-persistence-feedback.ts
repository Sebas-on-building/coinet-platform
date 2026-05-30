/**
 * L13.10 — Persistence, Feedback, Evaluation, and Audit
 *         Certification
 *
 * §13.10.43 — Bands A..F prove every law mechanically.
 */

import { L13ViolationSeverity } from '../l13/contracts';
import {
  L13MutationDiscipline,
  L13StorageAuthorityClass,
  l13IsAuthorityClass,
} from '../l13/contracts/l13-storage-authority';
import {
  L13DurableSurfaceId,
} from '../l13/contracts/l13-persistence-surface';
import {
  L13AIOutputSupersessionReason,
  L13CurrentOutputAuthorityStatus,
} from '../l13/contracts/l13-current-output-record';
import {
  L13FeedbackReasonCode,
  L13FeedbackType,
} from '../l13/contracts/l13-feedback-record';
import {
  L13MetricConfidenceClass,
  L13MetricStatus,
  L13OutputQualityMetricClass,
  L13QualityEvaluationWindow,
} from '../l13/contracts/l13-output-quality-metric';
import {
  L13OutputFailureClass,
  L13OutputFailureStage,
} from '../l13/contracts/l13-output-failure-record';
import { L13PersistenceClass } from '../l13/contracts/l13-persistence-class';
import {
  getL13DurableSurfaceDescriptors,
  l13SurfaceIsRegistered,
  materializeL13Run,
  recomputeL13CurrentFeedbackSummary,
  writeL13AIOutputFailureRecord,
  writeL13CurrentAIOutputRecord,
  writeL13HistoricalAIOutputFact,
  writeL13OutputQualityEvaluation,
  writeL13OutputQualityMetric,
  writeL13UserFeedbackRecord,
} from '../l13/persistence';
import {
  validateL13AIOutputFailureRecord,
  validateL13CurrentAIOutputRecord,
  validateL13FeedbackSummaryRecord,
  validateL13HistoricalAIOutputFact,
  validateL13OutputQualityEvaluation,
  validateL13OutputQualityMetric,
  validateL13PersistenceEnvelope,
  validateL13UserFeedbackRecord,
} from '../l13/validation/persistence.validators';
import {
  L13PersistenceFeedbackAuditSubjectClass,
  emitL13PersistenceFeedbackAuditRecord,
  getL13PersistenceFeedbackAuditLog,
  getL13PersistenceFeedbackCriticalViolations,
  isL13PersistenceFeedbackBlockingCode,
  resetL13PersistenceFeedbackAuditLog,
  severityForL13PersistenceFeedbackCode,
} from '../l13/constitution';
import { L13PersistenceFeedbackViolationCode } from '../l13/validation/l13-persistence-feedback-violation-codes';
import {
  resetL13DurableStore,
  appendL13AIOutputFailure,
  appendL13HistoricalAIOutputFact,
  appendL13OutputQualityEvaluation,
  appendL13OutputQualityMetric,
  appendL13UserFeedback,
  attemptL13RedisAuthority,
  commitL13CurrentAIOutput,
  commitL13FeedbackSummary,
  getAllL13CurrentAIOutputs,
  getAllL13HistoricalAIOutputFacts,
  getAllL13UserFeedback,
  L13DirectWriteAttemptError,
  L13HistoricalMutationError,
  readL13CurrentAIOutputByOutputId,
  readL13FeedbackSummaryByOutputId,
  readL13OutputQualityEvaluationByOutputId,
  readL13UserFeedbackByOutputId,
  recordL13PersistenceEnvelope,
} from '../l13/read';
import { runAllL13_10Invariants } from '../l13/invariants/l13_10-invariants';

// ── Assertion helpers ───────────────────────────────────────────────

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

resetL13DurableStore();
resetL13PersistenceFeedbackAuditLog();

function buildGreenInput() {
  return {
    request_id: 'l13.req.cert',
    runtime_run_id: 'l13.run.cert',
    output_id: 'l13.out.cert',
    input_package_ref: 'l13.pkg.cert',
    prompt_assembly_ref: 'l13.prompt.cert',
    model_run_ref: 'l13.model.run.cert',
    model_response_artifact_ref: 'l13.model.artifact.cert',
    final_output_ref: 'l13.out.cert',
    product_mode_payload_ref: 'l13.mode.payload.cert',
    styled_response_ref: 'l13.styled.cert',
    safety_gate_result_ref: 'l13.safety.gate.cert',
    final_gate_result_ref: 'l13.final.gate.cert',
    grounded_claim_refs: ['l13.claim.grounded.1'],
    blocked_claim_refs: ['l13.claim.blocked.1'],
    current_authority: {
      output_id: 'l13.out.cert',
      request_id: 'l13.req.cert',
      runtime_run_id: 'l13.run.cert',
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
      user_emittable_payload_ref: 'l13.mode.payload.cert',
      final_gate_result_ref: 'l13.final.gate.cert',
      safety_gate_result_ref: 'l13.safety.gate.cert',
      styled_response_ref: 'l13.styled.cert',
      output_mode_envelope_ref: 'l13.mode.env.cert',
      required_artifacts_complete: true,
    },
    historical_fact: {
      output_id: 'l13.out.cert',
      request_id: 'l13.req.cert',
      runtime_run_id: 'l13.run.cert',
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

// ── BAND A : persistence surfaces and L5 law ───────────────────────

band('BAND A — persistence surfaces and L5 law');

{
  const descriptors = getL13DurableSurfaceDescriptors();
  assert(descriptors.length > 0, 'A.1 durable surfaces registered');
  assert(
    descriptors.every(d => l13SurfaceIsRegistered(d.surface_id)),
    'A.2 every descriptor surface is registered',
  );
  assert(
    descriptors.every(d => d.required_lineage_refs && d.required_replay_hash),
    'A.3 every descriptor requires lineage + replay hash',
  );
  assert(
    descriptors.every(d => l13IsAuthorityClass(d.storage_authority_class)),
    'A.4 no descriptor uses Redis as authority',
  );
  // Materialize a green run; every envelope must be authorized.
  const green = materializeL13Run(buildGreenInput());
  assert(
    green.envelopes.length > 0,
    `A.5 green materialization emits envelopes (got ${green.envelopes.length})`,
  );
  assert(
    green.envelopes.every(e => l13IsAuthorityClass(e.storage_authority_class)),
    'A.6 every envelope uses an authority class',
  );
  assert(
    green.envelopes.every(e => e.lineage_refs.length > 0 && e.replay_hash.length > 0),
    'A.7 every envelope carries lineage + replay hash',
  );
  // Redis as authority must throw.
  let redisRejected = false;
  try {
    attemptL13RedisAuthority();
  } catch (e) {
    redisRejected = e instanceof L13DirectWriteAttemptError;
  }
  assert(redisRejected, 'A.8 Redis-as-authority attempt rejected');
  // Persistence envelope validator rejects Redis authority.
  const illegal = {
    ...green.envelopes[0],
    storage_authority_class:
      L13StorageAuthorityClass.REDIS_CACHE_NON_AUTHORITY,
  };
  const v = validateL13PersistenceEnvelope(illegal as never);
  assert(!v.clean, 'A.9 envelope validator rejects Redis authority');
  // Deterministic envelope hash.
  const greenB = materializeL13Run(buildGreenInput());
  const sameHashes = green.envelopes.every(
    (e, i) => e.replay_hash === greenB.envelopes[i].replay_hash,
  );
  assert(sameHashes, 'A.10 persistence envelope replay hashes deterministic');
}

// ── BAND B : artifact durability ───────────────────────────────────

band('BAND B — artifact durability');

{
  resetL13DurableStore();
  const green = materializeL13Run(buildGreenInput());
  // Commit envelopes through the in-memory store (models L5 routing).
  for (const env of green.envelopes) recordL13PersistenceEnvelope(env);
  if (green.current_authority) commitL13CurrentAIOutput(green.current_authority);
  if (green.historical_fact) appendL13HistoricalAIOutputFact(green.historical_fact);
  for (const f of green.failures) appendL13AIOutputFailure(f);

  // All required classes present.
  const required: readonly L13PersistenceClass[] = [
    L13PersistenceClass.INPUT_PACKAGE,
    L13PersistenceClass.PROMPT_ASSEMBLY,
    L13PersistenceClass.MODEL_RUN,
    L13PersistenceClass.MODEL_RESPONSE_ARTIFACT,
    L13PersistenceClass.FINAL_AI_OUTPUT,
    L13PersistenceClass.PRODUCT_MODE_PAYLOAD,
    L13PersistenceClass.STYLED_RESPONSE,
    L13PersistenceClass.SAFETY_GATE_RESULT,
    L13PersistenceClass.FINAL_GATE_RESULT,
    L13PersistenceClass.GROUNDED_CLAIM,
    L13PersistenceClass.BLOCKED_CLAIM,
    L13PersistenceClass.CURRENT_OUTPUT_AUTHORITY,
    L13PersistenceClass.HISTORICAL_AI_OUTPUT_FACT,
  ];
  const found = new Set(green.envelopes.map(e => e.persistence_class));
  for (const c of required) {
    assert(found.has(c), `B.1 ${c} persisted via envelope`);
  }
  // Current authority is AUTHORITATIVE_CURRENT when complete.
  assert(
    green.required_artifacts_complete,
    'B.2 required_artifacts_complete=true on full green input',
  );
  assert(
    green.current_authority?.current_authority_status ===
      L13CurrentOutputAuthorityStatus.AUTHORITATIVE_CURRENT,
    'B.3 current authority is AUTHORITATIVE_CURRENT',
  );
  // Read services find the record.
  const read = readL13CurrentAIOutputByOutputId('l13.out.cert');
  assert(read?.output_id === 'l13.out.cert', 'B.4 read service returns current output');
  // Missing required artifact downgrades to PENDING_MATERIALIZATION.
  const incomplete = materializeL13Run({
    ...buildGreenInput(),
    final_output_ref: undefined,
  });
  assert(
    !incomplete.required_artifacts_complete,
    'B.5 missing required ref marks required_artifacts_complete=false',
  );
  assert(
    incomplete.current_authority?.current_authority_status ===
      L13CurrentOutputAuthorityStatus.PENDING_MATERIALIZATION,
    'B.6 incomplete materialization → PENDING_MATERIALIZATION authority',
  );
  assert(
    incomplete.failures.length > 0 &&
      incomplete.failures[0].failure_class ===
        L13OutputFailureClass.REQUIRED_ARTIFACT_MISSING,
    'B.7 incomplete materialization persists failure record',
  );
}

// ── BAND C : feedback and evaluation ───────────────────────────────

band('BAND C — feedback and evaluation');

{
  const fbA = writeL13UserFeedbackRecord({
    output_id: 'l13.out.cert',
    feedback_type: L13FeedbackType.THUMBS_UP,
    feedback_reason_codes: [L13FeedbackReasonCode.ANSWERED_QUESTION_WELL],
  });
  appendL13UserFeedback(fbA.record);
  const fbB = writeL13UserFeedbackRecord({
    output_id: 'l13.out.cert',
    feedback_type: L13FeedbackType.THUMBS_DOWN,
    feedback_reason_codes: [
      L13FeedbackReasonCode.POSSIBLE_HALLUCINATION,
    ],
  });
  appendL13UserFeedback(fbB.record);
  const vA = validateL13UserFeedbackRecord(fbA.record);
  const vB = validateL13UserFeedbackRecord(fbB.record);
  assert(vA.clean && vB.clean, 'C.1 feedback records validate green');
  // Missing reason codes rejected.
  const noReason = writeL13UserFeedbackRecord({
    output_id: 'l13.out.cert',
    feedback_type: L13FeedbackType.THUMBS_DOWN,
    feedback_reason_codes: [],
  });
  assert(
    !validateL13UserFeedbackRecord(noReason.record).clean,
    'C.2 feedback without reason codes rejected',
  );
  // Output ref absent rejected.
  const noOutput = writeL13UserFeedbackRecord({
    output_id: '',
    feedback_type: L13FeedbackType.THUMBS_DOWN,
    feedback_reason_codes: [L13FeedbackReasonCode.DID_NOT_ANSWER_QUESTION],
  });
  assert(
    !validateL13UserFeedbackRecord(noOutput.record).clean,
    'C.3 feedback without output_id rejected',
  );
  // Read service returns feedback for output.
  const reads = readL13UserFeedbackByOutputId('l13.out.cert');
  assert(reads.length === 2, `C.4 read service returns 2 feedback rows (got ${reads.length})`);
  // Summary recomputes from feedback.
  const summary = recomputeL13CurrentFeedbackSummary({
    output_id: 'l13.out.cert',
    feedback_records: getAllL13UserFeedback(),
  });
  commitL13FeedbackSummary(summary.summary);
  assert(
    summary.summary.total_feedback_count === 2 &&
      summary.summary.positive_feedback_count === 1 &&
      summary.summary.negative_feedback_count === 1,
    'C.5 feedback summary tallies positive/negative/total',
  );
  assert(
    summary.summary.flagged_for_hallucination_review === true,
    'C.6 hallucination reason flags summary for review',
  );
  assert(
    readL13FeedbackSummaryByOutputId('l13.out.cert')?.feedback_summary_id ===
      summary.summary.feedback_summary_id,
    'C.7 feedback summary queryable',
  );
  // Quality metric definition + denominator validation.
  const m = writeL13OutputQualityMetric({
    metric_class: L13OutputQualityMetricClass.GROUNDEDNESS_RATE,
    metric_window: L13QualityEvaluationWindow.PER_OUTPUT,
    numerator: 9,
    denominator: 10,
  });
  appendL13OutputQualityMetric(m.metric);
  assert(
    m.metric.metric_value === 0.9 &&
      m.metric.metric_status === L13MetricStatus.METRIC_CLEAN,
    'C.8 groundedness rate computed correctly',
  );
  const bad = writeL13OutputQualityMetric({
    metric_class: L13OutputQualityMetricClass.GROUNDEDNESS_RATE,
    metric_window: L13QualityEvaluationWindow.PER_OUTPUT,
    numerator: 1,
    denominator: 0,
  });
  assert(
    bad.metric.metric_status === L13MetricStatus.METRIC_INVALID_DENOMINATOR,
    'C.9 invalid denominator surfaces in metric_status',
  );
  assert(
    !validateL13OutputQualityMetric(bad.metric).clean,
    'C.10 metric validator rejects invalid denominator',
  );
  // Quality evaluation per output.
  const evalRec = writeL13OutputQualityEvaluation({
    output_id: 'l13.out.cert',
    runtime_run_id: 'l13.run.cert',
    groundedness_passed: true,
    contradiction_disclosure_passed: true,
    safety_gate_passed: true,
    style_integrity_passed: true,
    mode_completeness_passed: true,
    unsupported_claim_attempt_count: 0,
    blocked_claim_count: 1,
    emitted_claim_count: 9,
    safety_rewrite_count: 0,
    refusal_emitted: false,
  });
  appendL13OutputQualityEvaluation(evalRec.evaluation);
  assert(
    validateL13OutputQualityEvaluation(evalRec.evaluation).clean,
    'C.11 quality evaluation validator clean',
  );
  assert(
    readL13OutputQualityEvaluationByOutputId('l13.out.cert')
      ?.output_quality_evaluation_id ===
      evalRec.evaluation.output_quality_evaluation_id,
    'C.12 quality evaluation queryable',
  );
}

// ── BAND D : historical facts and failure records ──────────────────

band('BAND D — historical facts and failure records');

{
  const facts = getAllL13HistoricalAIOutputFacts();
  assert(facts.length > 0, 'D.1 historical output fact persisted');
  assert(
    validateL13HistoricalAIOutputFact(facts[0]).clean,
    'D.2 historical output fact validator clean',
  );
  // Mutation attempt must throw.
  let mutationRejected = false;
  try {
    appendL13HistoricalAIOutputFact(facts[0]);
  } catch (e) {
    mutationRejected = e instanceof L13HistoricalMutationError;
  }
  assert(mutationRejected, 'D.3 historical fact mutation rejected');
  // Failure record writes/reads.
  const failure = writeL13AIOutputFailureRecord({
    request_id: 'l13.req.cert',
    runtime_run_id: 'l13.run.cert',
    failure_stage: L13OutputFailureStage.CURRENT_REGISTRY_UPDATE,
    failure_class: L13OutputFailureClass.AUTHORITY_CONFLICT,
    failure_reason_codes: ['CONFLICT_TEST'],
    safe_to_retry: false,
    repair_possible: true,
  });
  appendL13AIOutputFailure(failure.record);
  assert(
    validateL13AIOutputFailureRecord(failure.record).clean,
    'D.4 failure record validator clean',
  );
  // Supersession current vs historical authority.
  const before = readL13CurrentAIOutputByOutputId('l13.out.cert');
  const cur2 = writeL13CurrentAIOutputRecord({
    output_id: 'l13.out.cert',
    request_id: 'l13.req.cert',
    runtime_run_id: 'l13.run.cert.v2',
    scope_type: 'ASSET',
    scope_id: 'btc',
    as_of: '2026-05-15T01:00:00Z',
    product_answer_mode: 'STANDARD_CHAT',
    output_class: 'MARKET_EXPLANATION',
    final_emission_decision: 'USER_EMIT',
    safety_decision: 'SAFETY_ALLOW',
    style_readiness: 'STYLE_READY',
    mode_readiness: 'MODE_READY',
    expression_readiness: 'EXPRESSION_READY',
    grounding_readiness: 'GROUNDING_CLEAN',
    user_emittable_payload_ref: 'l13.mode.payload.cert.v2',
    final_gate_result_ref: 'l13.final.gate.cert.v2',
    safety_gate_result_ref: 'l13.safety.gate.cert.v2',
    styled_response_ref: 'l13.styled.cert.v2',
    output_mode_envelope_ref: 'l13.mode.env.cert.v2',
    supersedes_output_ref: before?.current_output_record_id,
    supersession_reason: L13AIOutputSupersessionReason.NEW_RUNTIME_RUN,
    required_artifacts_complete: true,
  });
  commitL13CurrentAIOutput(cur2.record);
  assert(
    validateL13CurrentAIOutputRecord(cur2.record).clean,
    'D.5 superseding current authority validates',
  );
  // Historical record count must NOT decrease.
  assert(
    getAllL13HistoricalAIOutputFacts().length >= facts.length,
    'D.6 historical facts not deleted on supersession',
  );
  // Current registry has exactly one row per output id.
  const allCurrent = getAllL13CurrentAIOutputs();
  const outputs = new Set(allCurrent.map(c => c.output_id));
  assert(
    outputs.size === allCurrent.length,
    'D.7 current registry one row per output id (no duplicates)',
  );
}

// ── BAND E : read surfaces and audit ───────────────────────────────

band('BAND E — read surfaces and audit');

{
  resetL13PersistenceFeedbackAuditLog();
  // Audit deterministic emission.
  const r = emitL13PersistenceFeedbackAuditRecord({
    subjectClass:
      L13PersistenceFeedbackAuditSubjectClass.PERSISTENCE_ENVELOPE,
    subjectRef: 'l13.cert.envelope',
    violationCode:
      L13PersistenceFeedbackViolationCode.L13D_DIRECT_WRITE_ATTEMPT,
    message: 'cert direct write attempt',
  });
  assert(r.audit_id.length > 0, 'E.1 audit record id present');
  assert(
    r.severity === L13ViolationSeverity.CRITICAL && r.blocking,
    'E.2 direct-write code is CRITICAL + blocking',
  );
  // Re-emit identical input → identical replay hash.
  const r2 = emitL13PersistenceFeedbackAuditRecord({
    subjectClass:
      L13PersistenceFeedbackAuditSubjectClass.PERSISTENCE_ENVELOPE,
    subjectRef: 'l13.cert.envelope',
    violationCode:
      L13PersistenceFeedbackViolationCode.L13D_DIRECT_WRITE_ATTEMPT,
    message: 'cert direct write attempt',
  });
  assert(
    r.replay_hash === r2.replay_hash,
    'E.3 audit replay hash deterministic',
  );
  assert(
    getL13PersistenceFeedbackAuditLog().length === 2,
    'E.4 audit log queryable',
  );
  assert(
    getL13PersistenceFeedbackCriticalViolations().length === 2,
    'E.5 critical violations queryable',
  );
  assert(
    severityForL13PersistenceFeedbackCode(
      L13PersistenceFeedbackViolationCode.L13D_LINEAGE_MISSING,
    ) === L13ViolationSeverity.ERROR,
    'E.6 lineage missing classified as ERROR',
  );
  assert(
    !isL13PersistenceFeedbackBlockingCode(
      L13PersistenceFeedbackViolationCode.L13D_LINEAGE_MISSING,
    ),
    'E.7 lineage missing not blocking',
  );
  // Read service surfaces don't expose raw authority — they return
  // typed records without any storage_authority_class field.
  const reads = readL13UserFeedbackByOutputId('l13.out.cert');
  const hasNoAuthority = reads.every(
    r0 => !(r0 as unknown as Record<string, unknown>).storage_authority_class,
  );
  assert(hasNoAuthority, 'E.8 read service does not expose raw authority');
}

// ── BAND F : invariants + L14 handoff ──────────────────────────────

band('BAND F — invariants and L14 handoff');

{
  const invs = runAllL13_10Invariants();
  assert(invs.length === 10, `F.1 ten invariants executed (got ${invs.length})`);
  for (const inv of invs) {
    assert(inv.holds, `F.2 ${inv.id} ${inv.name} (${inv.evidence})`);
  }
  // Replay determinism on materialization.
  const a = materializeL13Run(buildGreenInput());
  const b = materializeL13Run(buildGreenInput());
  assert(
    a.current_authority?.replay_hash === b.current_authority?.replay_hash,
    'F.3 current authority replay hash deterministic',
  );
  assert(
    a.historical_fact?.replay_hash === b.historical_fact?.replay_hash,
    'F.4 historical fact replay hash deterministic',
  );
  // L14 handoff: current + historical + feedback + quality all reachable.
  const sample = writeL13UserFeedbackRecord({
    output_id: 'l13.out.cert',
    feedback_type: L13FeedbackType.HELPFUL,
    feedback_reason_codes: [L13FeedbackReasonCode.USEFUL_SCENARIO_EXPLANATION],
  });
  appendL13UserFeedback(sample.record);
  const sumRebuilt = recomputeL13CurrentFeedbackSummary({
    output_id: 'l13.out.cert',
    feedback_records: getAllL13UserFeedback(),
  });
  commitL13FeedbackSummary(sumRebuilt.summary);
  assert(
    validateL13FeedbackSummaryRecord(sumRebuilt.summary).clean,
    'F.5 feedback summary recomputable + clean',
  );
  // Discipline assertion: historical surfaces are APPEND_ONLY.
  const allHistoricalAppend = getL13DurableSurfaceDescriptors()
    .filter(d =>
      [
        L13DurableSurfaceId.TS_AI_OUTPUT_FACT_V1,
        L13DurableSurfaceId.TS_AI_CLAIM_GROUNDING_V1,
        L13DurableSurfaceId.TS_AI_BLOCKED_CLAIM_FACT_V1,
        L13DurableSurfaceId.TS_AI_FEEDBACK_V1,
        L13DurableSurfaceId.TS_AI_FEEDBACK_RESOLUTION_FACT_V1,
        L13DurableSurfaceId.TS_AI_SAFETY_EVENT_V1,
        L13DurableSurfaceId.TS_AI_OUTPUT_QUALITY_V1,
        L13DurableSurfaceId.TS_AI_MODEL_RUN_FACT_V1,
        L13DurableSurfaceId.TS_AI_FAILURE_FACT_V1,
      ].includes(d.surface_id),
    )
    .every(d => d.mutation_discipline === L13MutationDiscipline.APPEND_ONLY);
  assert(allHistoricalAppend, 'F.6 historical surfaces are APPEND_ONLY');
  // Replay substrate suffix proof — every key persistence class
  // present in green envelopes.
  const greenAgain = materializeL13Run(buildGreenInput());
  const presentClasses = new Set(
    greenAgain.envelopes.map(e => e.persistence_class),
  );
  const wantClasses = [
    L13PersistenceClass.INPUT_PACKAGE,
    L13PersistenceClass.PROMPT_ASSEMBLY,
    L13PersistenceClass.MODEL_RUN,
    L13PersistenceClass.MODEL_RESPONSE_ARTIFACT,
    L13PersistenceClass.FINAL_AI_OUTPUT,
    L13PersistenceClass.STYLED_RESPONSE,
    L13PersistenceClass.SAFETY_GATE_RESULT,
    L13PersistenceClass.FINAL_GATE_RESULT,
  ];
  for (const c of wantClasses) {
    assert(presentClasses.has(c), `F.7 replay substrate persists ${c}`);
  }
  // PROXY confidence class & adjudicated class distinguished.
  const proxy = writeL13OutputQualityMetric({
    metric_class: L13OutputQualityMetricClass.OUTPUT_USEFULNESS_SCORE,
    metric_window: L13QualityEvaluationWindow.WEEKLY,
    numerator: 70,
    denominator: 100,
  });
  assert(
    proxy.metric.metric_confidence_class ===
      L13MetricConfidenceClass.PROXY_ONLY,
    'F.8 satisfaction proxy stays PROXY_ONLY',
  );
  const adj = writeL13OutputQualityMetric({
    metric_class:
      L13OutputQualityMetricClass.REFUSAL_CORRECTNESS_ADJUDICATED,
    metric_window: L13QualityEvaluationWindow.WEEKLY,
    numerator: 8,
    denominator: 10,
    adjudication_label_present: true,
  });
  assert(
    adj.metric.metric_confidence_class === L13MetricConfidenceClass.ADJUDICATED,
    'F.9 adjudicated metric earns ADJUDICATED confidence',
  );
}

// ── Summary ─────────────────────────────────────────────────────────

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
