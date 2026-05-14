/**
 * L13.3 — AI Output Contract & Explanation Object Model
 * Certification Test Suite (§13.3.23)
 *
 * 6 Bands:
 *   A — Output object completeness
 *   B — Output class & section law
 *   C — Observation / inference / disclosure law
 *   D — Semantic leakage law
 *   E — Readiness law
 *   F — Audit, replay, invariants
 */

import {
  ALL_L13_AI_OUTPUT_CLASSES,
  ALL_L13_OUTPUT_BLOCKED_CLAIM_TYPES,
  ALL_L13_OUTPUT_READINESS_CLASSES,
  ALL_L13_OUTPUT_SECTION_CLASSES,
  ALL_L13_OUTPUT_SECTION_READINESS_CLASSES,
  ALL_L13_OUTPUT_VALIDATOR_CLASSES,
  L13_BLOCKED_OUTPUT_READINESS_CLASSES,
  L13_BLOCKING_SECTION_READINESS_CLASSES,
  L13_FORBIDDEN_CONFIDENCE_PHRASES,
  L13_FORBIDDEN_PROBABILITY_PATTERNS,
  L13_HYPOTHESIS_OUTPUT_CLASSES,
  L13_INFERENCE_MARKER_PHRASES,
  L13_OBSERVATION_MARKER_PHRASES,
  L13_REQUIRED_OUTPUT_CONTENT_FIELDS,
  L13_REQUIRED_OUTPUT_IDENTITY_FIELDS,
  L13_REQUIRED_OUTPUT_TRACE_FIELDS,
  L13_SCENARIO_OUTPUT_CLASSES,
  L13_SCORE_OUTPUT_CLASSES,
  L13AIOutputClass,
  L13AnswerMode,
  L13ExplanationConfidenceBand,
  L13OutputBlockedClaimType,
  L13OutputReadinessClass,
  L13OutputSectionClass,
  L13OutputSectionReadinessClass,
  L13OutputValidatorClass,
  L13ViolationSeverity,
  containsL13ForbiddenConfidencePhrase,
  detectL13ProbabilityTheater,
  isL13BlockedOutputReadiness,
  isL13BlockingSectionReadiness,
  isL13HypothesisOutputClass,
  isL13ScenarioOutputClass,
  isL13ScoreOutputClass,
  type L13AIExplanationOutput,
  type L13BlockedClaim,
} from '../l13/contracts';
import {
  ALL_L13_OUTPUT_VIOLATION_CODES,
  L13OutputViolationCode,
  scanL13SemanticLeakage,
  validateL13AIOutput,
  validateL13BlockedClaim,
  validateL13ConfidenceDisclosure,
  validateL13ModelMetadata,
  validateL13OutputReadinessAssessment,
  validateL13OutputSection,
  validateL13RestrictionDisclosure,
  validateL13SemanticLeakage,
} from '../l13/validation';
import {
  ALL_L13_OUTPUT_AUDIT_SUBJECT_CLASSES,
  L13OutputAuditSubjectClass,
  emitL13OutputAuditRecord,
  getL13OutputAuditLog,
  getL13OutputBlockingViolations,
  getL13OutputCriticalViolations,
  getL13OutputViolationCount,
  getL13OutputViolationsByCode,
  getL13OutputViolationsBySubjectClass,
  hasAnyL13OutputViolations,
  isL13OutputBlockingCode,
  resetL13OutputAuditLog,
  severityForL13OutputCode,
} from '../l13/constitution';
import {
  buildL13AIExplanationOutput,
  canonicalL13AIOutputReplayHash,
  deriveL13OutputReadiness,
} from '../l13/context';
import {
  __l13_3_test_helpers,
  runAllL13_3Invariants,
} from '../l13/invariants/l13_3-invariants';

const { buildGreenL13Output, greenMetadata, greenRestriction } =
  __l13_3_test_helpers;

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function band(name: string, fn: () => void): void {
  console.log(`\n── Band ${name} ──`);
  fn();
}

// ════════════════════════════════════════════════════════════════════
// Band A — Output object completeness
// ════════════════════════════════════════════════════════════════════
band('A — output object completeness', () => {
  const green = buildGreenL13Output();
  const v = validateL13AIOutput(green);
  assert(v.clean, 'A.1 green output validates clean');

  assert(
    L13_REQUIRED_OUTPUT_IDENTITY_FIELDS.length >= 10,
    'A.2 identity manifest has ≥10 fields',
  );
  assert(
    L13_REQUIRED_OUTPUT_CONTENT_FIELDS.length >= 9,
    'A.3 content manifest has ≥9 fields',
  );
  assert(
    L13_REQUIRED_OUTPUT_TRACE_FIELDS.length === 4,
    'A.4 trace manifest has 4 fields',
  );

  // Missing identity fields.
  const missingId: L13AIExplanationOutput = { ...green, output_id: '' };
  const v1 = validateL13AIOutput(missingId);
  assert(
    v1.issues.some(
      i => i.code === L13OutputViolationCode.L13O_OUTPUT_ID_MISSING,
    ),
    'A.5 missing output_id rejects',
  );

  const missingReq: L13AIExplanationOutput = { ...green, request_id: '' };
  assert(
    validateL13AIOutput(missingReq).issues.some(
      i => i.code === L13OutputViolationCode.L13O_REQUEST_ID_MISSING,
    ),
    'A.6 missing request_id rejects',
  );

  const missingPkg: L13AIExplanationOutput = {
    ...green,
    input_package_id: '',
  };
  assert(
    validateL13AIOutput(missingPkg).issues.some(
      i => i.code === L13OutputViolationCode.L13O_INPUT_PACKAGE_REF_MISSING,
    ),
    'A.7 missing input_package_id rejects',
  );

  const missingClass: L13AIExplanationOutput = {
    ...green,
    output_class: '' as unknown as L13AIOutputClass,
  };
  assert(
    validateL13AIOutput(missingClass).issues.some(
      i => i.code === L13OutputViolationCode.L13O_OUTPUT_CLASS_MISSING,
    ),
    'A.8 missing output_class rejects',
  );

  const missingMode: L13AIExplanationOutput = {
    ...green,
    answer_mode: '' as unknown as L13AnswerMode,
  };
  assert(
    validateL13AIOutput(missingMode).issues.some(
      i => i.code === L13OutputViolationCode.L13O_ANSWER_MODE_MISSING,
    ),
    'A.9 missing answer_mode rejects',
  );

  const missingHeadline: L13AIExplanationOutput = { ...green, headline: '' };
  assert(
    validateL13AIOutput(missingHeadline).issues.some(
      i => i.code === L13OutputViolationCode.L13O_HEADLINE_MISSING,
    ),
    'A.10 missing headline rejects',
  );

  const missingSummary: L13AIExplanationOutput = { ...green, summary: '' };
  assert(
    validateL13AIOutput(missingSummary).issues.some(
      i => i.code === L13OutputViolationCode.L13O_SUMMARY_MISSING,
    ),
    'A.11 missing summary rejects',
  );

  const missingEvidence: L13AIExplanationOutput = {
    ...green,
    evidence_refs: [],
  };
  assert(
    validateL13AIOutput(missingEvidence).issues.some(
      i => i.code === L13OutputViolationCode.L13O_EVIDENCE_REFS_MISSING,
    ),
    'A.12 missing evidence_refs rejects',
  );

  const missingLineage: L13AIExplanationOutput = {
    ...green,
    lineage_refs: [],
  };
  assert(
    validateL13AIOutput(missingLineage).issues.some(
      i => i.code === L13OutputViolationCode.L13O_LINEAGE_REFS_MISSING,
    ),
    'A.13 missing lineage_refs rejects',
  );

  const missingReplay: L13AIExplanationOutput = {
    ...green,
    replay_hash: '',
  };
  assert(
    validateL13AIOutput(missingReplay).issues.some(
      i => i.code === L13OutputViolationCode.L13O_REPLAY_HASH_MISSING,
    ),
    'A.14 missing replay_hash rejects',
  );

  const missingMeta: L13AIExplanationOutput = {
    ...green,
    model_metadata: undefined as never,
  };
  assert(
    validateL13AIOutput(missingMeta).issues.some(
      i => i.code === L13OutputViolationCode.L13O_MODEL_METADATA_MISSING,
    ),
    'A.15 missing model_metadata rejects',
  );

  const missingScope: L13AIExplanationOutput = { ...green, scope_id: '' };
  assert(
    validateL13AIOutput(missingScope).issues.some(
      i => i.code === L13OutputViolationCode.L13O_SCOPE_MISSING,
    ),
    'A.16 missing scope_id rejects',
  );

  const missingAsOf: L13AIExplanationOutput = { ...green, as_of: '' };
  assert(
    validateL13AIOutput(missingAsOf).issues.some(
      i => i.code === L13OutputViolationCode.L13O_AS_OF_MISSING,
    ),
    'A.17 missing as_of rejects',
  );

  assert(
    ALL_L13_OUTPUT_VIOLATION_CODES.every(c => c.startsWith('L13O_')),
    'A.18 every output violation code is in L13O_ namespace',
  );

  assert(
    ALL_L13_AI_OUTPUT_CLASSES.length === 10,
    'A.19 10 legal AI output classes registered',
  );
  assert(
    ALL_L13_OUTPUT_SECTION_CLASSES.length === 12,
    'A.20 12 output section classes registered',
  );
});

// ════════════════════════════════════════════════════════════════════
// Band B — Output class and section law
// ════════════════════════════════════════════════════════════════════
band('B — output class & section law', () => {
  assert(
    isL13ScenarioOutputClass(L13AIOutputClass.SCENARIO_EXPLANATION),
    'B.1 SCENARIO_EXPLANATION is a scenario class',
  );
  assert(
    isL13ScoreOutputClass(L13AIOutputClass.SCORE_EXPLANATION),
    'B.2 SCORE_EXPLANATION is a score class',
  );
  assert(
    isL13HypothesisOutputClass(L13AIOutputClass.THESIS_COMPARISON),
    'B.3 THESIS_COMPARISON is a hypothesis class',
  );

  assert(
    L13_SCENARIO_OUTPUT_CLASSES.length >= 1,
    'B.4 scenario output classes registered',
  );
  assert(
    L13_SCORE_OUTPUT_CLASSES.length >= 1,
    'B.5 score output classes registered',
  );
  assert(
    L13_HYPOTHESIS_OUTPUT_CLASSES.length >= 1,
    'B.6 hypothesis output classes registered',
  );

  // SCENARIO_EXPLANATION must have scenario refs.
  const noScenarioRefs: L13AIExplanationOutput = {
    ...buildGreenL13Output({
      outputClass: L13AIOutputClass.SCENARIO_EXPLANATION,
      scenarioPresent: true,
    }),
    scenario_refs: [],
  };
  assert(
    validateL13AIOutput(noScenarioRefs).issues.some(
      i => i.code === L13OutputViolationCode.L13O_SCENARIO_SECTION_MISSING,
    ),
    'B.7 scenario explanation requires scenario_refs',
  );

  // SCENARIO_EXPLANATION must have trigger/invalidation section.
  const noTrig = buildGreenL13Output({
    outputClass: L13AIOutputClass.SCENARIO_EXPLANATION,
    scenarioPresent: true,
  });
  const stripped: L13AIExplanationOutput = {
    ...noTrig,
    trigger_invalidation_section: {
      ...noTrig.trigger_invalidation_section,
      present: false,
      content: '',
      section_readiness:
        L13OutputSectionReadinessClass.SECTION_REQUIRED_MISSING,
    },
  };
  assert(
    validateL13AIOutput(stripped).issues.some(
      i =>
        i.code ===
        L13OutputViolationCode.L13O_TRIGGER_INVALIDATION_SECTION_MISSING,
    ),
    'B.8 scenario explanation requires trigger_invalidation_section',
  );

  // Score explanation must carry score_refs.
  const noScore: L13AIExplanationOutput = {
    ...buildGreenL13Output({
      outputClass: L13AIOutputClass.SCORE_EXPLANATION,
    }),
    score_refs: [],
  };
  assert(
    validateL13AIOutput(noScore).issues.some(
      i => i.code === L13OutputViolationCode.L13O_SECTION_REFS_MISSING,
    ),
    'B.9 score explanation requires score_refs',
  );

  // Thesis comparison must carry hypothesis_refs.
  const noHyp: L13AIExplanationOutput = {
    ...buildGreenL13Output({
      outputClass: L13AIOutputClass.THESIS_COMPARISON,
    }),
    hypothesis_refs: [],
  };
  assert(
    validateL13AIOutput(noHyp).issues.some(
      i => i.code === L13OutputViolationCode.L13O_SECTION_REFS_MISSING,
    ),
    'B.10 thesis comparison requires hypothesis_refs',
  );

  // Section validator: factual section without evidence refs.
  const section = {
    section_id: 'sec.bad',
    section_class: L13OutputSectionClass.OBSERVATION,
    title: 'obs',
    content: 'Engine reports the active scenario.',
    claim_refs: [],
    evidence_refs: [] as readonly string[],
    contradiction_refs: [] as readonly string[],
    required: true,
    present: true,
    section_readiness:
      L13OutputSectionReadinessClass.SECTION_COMPLETE,
    may_contain_inference: false,
    may_contain_observation: true,
    may_contain_uncertainty: false,
    may_contain_restriction: false,
    forbidden_semantic_hits: [] as readonly string[],
    lineage_refs: ['x'],
    policy_version: 'l13.output.v1',
  };
  assert(
    validateL13OutputSection(section).issues.some(
      i => i.code === L13OutputViolationCode.L13O_SECTION_REFS_MISSING,
    ),
    'B.11 factual section without evidence rejects',
  );

  // Section content empty while present.
  const emptyContent = {
    ...section,
    evidence_refs: ['x'],
    content: '',
  };
  assert(
    validateL13OutputSection(emptyContent).issues.some(
      i => i.code === L13OutputViolationCode.L13O_SECTION_CONTENT_EMPTY,
    ),
    'B.12 section present with empty content rejects',
  );

  // Required + not present mismatch.
  const mismatch = {
    ...section,
    evidence_refs: ['x'],
    present: false,
  };
  assert(
    validateL13OutputSection(mismatch).issues.some(
      i => i.code === L13OutputViolationCode.L13O_SECTION_INVALID,
    ),
    'B.13 required+not-present section rejects',
  );

  assert(
    L13_BLOCKING_SECTION_READINESS_CLASSES.length === 2,
    'B.14 blocking section readiness classes registered',
  );
  assert(
    isL13BlockingSectionReadiness(
      L13OutputSectionReadinessClass.SECTION_REQUIRED_MISSING,
    ) === true,
    'B.15 SECTION_REQUIRED_MISSING is blocking',
  );
  assert(
    isL13BlockingSectionReadiness(
      L13OutputSectionReadinessClass.SECTION_COMPLETE,
    ) === false,
    'B.16 SECTION_COMPLETE is not blocking',
  );

  // CONTRADICTION_EXPLANATION requires contradiction section.
  const ce: L13AIExplanationOutput = buildGreenL13Output({
    outputClass: L13AIOutputClass.CONTRADICTION_EXPLANATION,
    contradictionPresent: false,
  });
  assert(
    validateL13AIOutput(ce).issues.some(
      i =>
        i.code ===
        L13OutputViolationCode.L13O_CONTRADICTION_SECTION_MISSING,
    ),
    'B.17 contradiction explanation requires contradiction section',
  );

  assert(
    ALL_L13_OUTPUT_SECTION_READINESS_CLASSES.length === 6,
    'B.18 6 section readiness classes',
  );
});

// ════════════════════════════════════════════════════════════════════
// Band C — Observation / inference / disclosure law
// ════════════════════════════════════════════════════════════════════
band('C — observation / inference / disclosure law', () => {
  // Observation section using speculation language.
  const mix = buildGreenL13Output({
    observationContent:
      'This setup likely continues higher and probably tests resistance.',
  });
  assert(
    validateL13AIOutput(mix).issues.some(
      i =>
        i.code ===
        L13OutputViolationCode.L13O_OBSERVATION_INFERENCE_MIXED,
    ),
    'C.1 observation with speculation marker rejected',
  );

  // Inference section using observation language without inference
  // marker.
  const obsMarker = buildGreenL13Output({
    inferenceContent:
      'Engine reports rising fragility and currently shows leverage continuation.',
  });
  assert(
    validateL13AIOutput(obsMarker).issues.some(
      i =>
        i.code ===
        L13OutputViolationCode.L13O_INFERENCE_PRESENTED_AS_FACT,
    ),
    'C.2 inference presented as observation rejected',
  );

  // Confidence disclosure validator: caps present but confident
  // language allowed.
  const conf = {
    ...buildGreenL13Output().confidence_disclosure,
    confidence_cap_refs: ['cap.1'],
    may_use_confident_language: true,
    confidence_narrowing_reasons: ['cap reason'],
  };
  assert(
    validateL13ConfidenceDisclosure(conf).issues.some(
      i =>
        i.code ===
        L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_INVALID,
    ),
    'C.3 confident language under caps rejected',
  );

  // Confidence statement using forbidden certainty phrase.
  const certConf = {
    ...buildGreenL13Output().confidence_disclosure,
    confidence_statement:
      'This continuation is guaranteed at the current funding.',
  };
  assert(
    validateL13ConfidenceDisclosure(certConf).issues.some(
      i => i.code === L13OutputViolationCode.L13O_CERTAINTY_LEAK,
    ),
    'C.4 forbidden certainty phrase in confidence statement rejected',
  );

  // Probability theater in confidence statement.
  const probConf = {
    ...buildGreenL13Output().confidence_disclosure,
    confidence_statement: 'There is a 70% chance the path holds.',
  };
  assert(
    validateL13ConfidenceDisclosure(probConf).issues.some(
      i =>
        i.code ===
        L13OutputViolationCode.L13O_CONFIDENCE_AS_PROBABILITY,
    ),
    'C.5 probability theater in confidence statement rejected',
  );

  // Restriction disclosure missing always-blocked modes.
  const r = {
    ...greenRestriction(),
    blocked_answer_modes: [],
  };
  assert(
    validateL13RestrictionDisclosure(r).issues.some(
      i =>
        i.code ===
        L13OutputViolationCode.L13O_BLOCKED_ANSWER_MODE_VIOLATED,
    ),
    'C.6 restriction disclosure missing blocked modes rejected',
  );

  // Restriction must-avoid flags must be true.
  const r2 = {
    ...greenRestriction(),
    must_avoid_recommendation_language: false as unknown as true,
  };
  assert(
    validateL13RestrictionDisclosure(r2).issues.some(
      i => i.code === L13OutputViolationCode.L13O_RESTRICTION_BYPASS,
    ),
    'C.7 must_avoid flag flipped to false rejected',
  );

  // Confidence helper utilities.
  assert(
    containsL13ForbiddenConfidencePhrase('this is guaranteed'),
    'C.8 forbidden confidence phrase detector works',
  );
  assert(
    detectL13ProbabilityTheater('an 85% chance of moving up') !== null,
    'C.9 probability theater detector works',
  );

  assert(
    L13_FORBIDDEN_CONFIDENCE_PHRASES.length >= 8,
    'C.10 forbidden confidence phrase list non-empty',
  );
  assert(
    L13_FORBIDDEN_PROBABILITY_PATTERNS.length >= 3,
    'C.11 forbidden probability patterns registered',
  );

  assert(
    L13_INFERENCE_MARKER_PHRASES.length >= 8,
    'C.12 inference marker phrase list registered',
  );
  assert(
    L13_OBSERVATION_MARKER_PHRASES.length >= 5,
    'C.13 observation marker phrase list registered',
  );
});

// ════════════════════════════════════════════════════════════════════
// Band D — Semantic leakage law
// ════════════════════════════════════════════════════════════════════
band('D — semantic leakage law', () => {
  const recommendation = scanL13SemanticLeakage(
    'You should buy this immediately, I recommend a long position.',
  );
  assert(
    recommendation.some(
      h => h.code === L13OutputViolationCode.L13O_RECOMMENDATION_LEAK,
    ) ||
      recommendation.some(
        h => h.code === L13OutputViolationCode.L13O_TRADE_ACTION_LEAK,
      ),
    'D.1 recommendation leak detected',
  );

  const prediction = scanL13SemanticLeakage(
    'This will go higher next week and the bullish path is going to play out.',
  );
  assert(
    prediction.some(
      h => h.code === L13OutputViolationCode.L13O_PREDICTION_THEATER,
    ),
    'D.2 prediction theater detected',
  );

  const finalJudgment = scanL13SemanticLeakage(
    'This is definitely the case, the truth is bullish.',
  );
  assert(
    finalJudgment.some(
      h => h.code === L13OutputViolationCode.L13O_FINAL_JUDGMENT_LEAK,
    ) ||
      finalJudgment.some(
        h =>
          h.code === L13OutputViolationCode.L13O_HYPOTHESIS_AS_FINAL_TRUTH,
      ),
    'D.3 final judgment / hypothesis-as-final-truth detected',
  );

  const trade = scanL13SemanticLeakage('Open a long position aggressively.');
  assert(
    trade.some(h => h.code === L13OutputViolationCode.L13O_TRADE_ACTION_LEAK),
    'D.4 trade action leak detected',
  );

  const certainty = scanL13SemanticLeakage(
    'This outcome is guaranteed and inevitable.',
  );
  assert(
    certainty.some(h => h.code === L13OutputViolationCode.L13O_CERTAINTY_LEAK),
    'D.5 certainty leak detected',
  );

  const scoreAdvice = scanL13SemanticLeakage(
    'Opportunity score is high, so this is a good buy.',
  );
  assert(
    scoreAdvice.some(
      h => h.code === L13OutputViolationCode.L13O_SCORE_AS_RECOMMENDATION,
    ),
    'D.6 score-as-advice detected',
  );

  const scenarioCert = scanL13SemanticLeakage(
    'Base case means this is what happens next.',
  );
  assert(
    scenarioCert.some(
      h => h.code === L13OutputViolationCode.L13O_SCENARIO_AS_CERTAINTY,
    ),
    'D.7 scenario-as-certainty detected',
  );

  const probTheater = scanL13SemanticLeakage(
    'The scenario has a 70% chance of unfolding.',
  );
  assert(
    probTheater.some(
      h => h.code === L13OutputViolationCode.L13O_CONFIDENCE_AS_PROBABILITY,
    ),
    'D.8 confidence-as-probability detected',
  );

  const hypTruth = scanL13SemanticLeakage(
    'The primary hypothesis is the truth here.',
  );
  assert(
    hypTruth.some(
      h => h.code === L13OutputViolationCode.L13O_HYPOTHESIS_AS_FINAL_TRUTH,
    ),
    'D.9 hypothesis-as-final-truth detected',
  );

  // Top-level validator picks up leaks in headline + summary.
  const leakedTop: L13AIExplanationOutput = {
    ...buildGreenL13Output(),
    headline: 'Buy this aggressively now.',
  };
  const v = validateL13SemanticLeakage(leakedTop);
  assert(
    v.issues.some(
      i => i.code === L13OutputViolationCode.L13O_TRADE_ACTION_LEAK,
    ),
    'D.10 leakage validator scans headline',
  );

  // Output with leak but no blocked-claim record raises an audit
  // omission warning.
  const v2 = validateL13AIOutput(leakedTop);
  assert(
    v2.issues.some(
      i => i.code === L13OutputViolationCode.L13O_BLOCKED_CLAIM_NOT_RECORDED,
    ),
    'D.11 leak without blocked-claim record raises BLOCKED_CLAIM_NOT_RECORDED',
  );

  assert(
    ALL_L13_OUTPUT_BLOCKED_CLAIM_TYPES.length === 11,
    'D.12 11 blocked-claim types registered',
  );
  assert(
    ALL_L13_OUTPUT_VALIDATOR_CLASSES.length === 8,
    'D.13 8 validator classes registered',
  );

  // Blocked claim validator.
  const goodClaim: L13BlockedClaim = {
    blocked_claim_id: 'bc.good',
    output_id: 'out.1',
    proposed_claim_text: 'You should buy now.',
    blocked_claim_type: L13OutputBlockedClaimType.RECOMMENDATION_LEAK,
    block_reason_code: 'RECOMMENDATION_LEAK',
    source_validator: L13OutputValidatorClass.SEMANTIC_LEAKAGE_VALIDATOR,
    replacement_text: 'The engine sees stronger quality, but this is not a recommendation.',
    evidence_refs: ['x'],
    lineage_refs: ['x'],
    policy_version: 'l13.output.v1',
  };
  assert(validateL13BlockedClaim(goodClaim).clean, 'D.14 well-formed blocked claim passes');

  const badClaim: L13BlockedClaim = { ...goodClaim, output_id: '' };
  assert(
    !validateL13BlockedClaim(badClaim).clean,
    'D.15 malformed blocked claim rejects',
  );
});

// ════════════════════════════════════════════════════════════════════
// Band E — Readiness law
// ════════════════════════════════════════════════════════════════════
band('E — readiness law', () => {
  const green = buildGreenL13Output();
  const assess = deriveL13OutputReadiness({ output: green });
  assert(
    assess.readiness_class ===
      L13OutputReadinessClass.GROUNDED_WITH_DISCLOSURE ||
      assess.readiness_class ===
        L13OutputReadinessClass.CLEAN_GROUNDED_OUTPUT,
    'E.1 green output derives clean / grounded-with-disclosure',
  );
  assert(assess.may_emit_to_user, 'E.2 green readiness may emit to user');
  assert(
    validateL13OutputReadinessAssessment(assess, green).clean,
    'E.3 readiness validator clean for green',
  );

  // Clean output under disclosure requirement.
  const undisclosed: L13AIExplanationOutput = {
    ...buildGreenL13Output({ contradictionPresent: true }),
    contradiction_refs: ['l7.contra.1'],
    output_readiness: L13OutputReadinessClass.CLEAN_GROUNDED_OUTPUT,
  };
  const offenderAssess = deriveL13OutputReadiness({
    output: undisclosed,
    disclosure_required: true,
  });
  // Force assessment to CLEAN to test validator.
  const cleanForced = {
    ...offenderAssess,
    readiness_class: L13OutputReadinessClass.CLEAN_GROUNDED_OUTPUT,
  };
  assert(
    validateL13OutputReadinessAssessment(cleanForced, undisclosed).issues.some(
      i =>
        i.code ===
        L13OutputViolationCode.L13O_CLEAN_OUTPUT_UNDER_DISCLOSURE_REQUIREMENT,
    ),
    'E.4 CLEAN_GROUNDED under contradictions rejected',
  );

  // Refusal must not emit.
  const refusalAssess = deriveL13OutputReadiness({
    output: green,
    prohibited_request: true,
  });
  assert(
    refusalAssess.readiness_class ===
      L13OutputReadinessClass.REFUSAL_REQUIRED,
    'E.5 prohibited request → REFUSAL_REQUIRED',
  );
  assert(
    refusalAssess.may_emit_to_user === false,
    'E.6 refusal may NOT emit as answer',
  );
  assert(refusalAssess.requires_refusal === true, 'E.7 refusal flag set');

  // Blocked ungrounded cannot emit.
  const ungrounded: L13AIExplanationOutput = {
    ...green,
    evidence_refs: [],
  };
  const ua = deriveL13OutputReadiness({ output: ungrounded });
  assert(
    ua.readiness_class === L13OutputReadinessClass.BLOCKED_UNGROUNDED,
    'E.8 missing evidence → BLOCKED_UNGROUNDED',
  );
  assert(ua.may_emit_to_user === false, 'E.9 blocked ungrounded blocks emit');

  // Partial answer requires disclosure.
  const partial = deriveL13OutputReadiness({
    output: green,
    context_insufficient: true,
    l13_2_disclosure_refs: ['disc.1'],
  });
  assert(
    partial.readiness_class === L13OutputReadinessClass.PARTIAL_ANSWER,
    'E.10 context_insufficient → PARTIAL_ANSWER',
  );
  assert(
    partial.disclosure_required_refs.length > 0,
    'E.11 PARTIAL_ANSWER carries disclosure refs',
  );

  // Narrowed by uncertainty when caps present.
  const cappedConf = {
    ...green.confidence_disclosure,
    confidence_cap_refs: ['cap.1'],
    confidence_narrowing_reasons: ['narrow'],
    must_use_uncertainty_language: true,
  };
  const cappedOutput: L13AIExplanationOutput = {
    ...green,
    confidence_disclosure: cappedConf,
  };
  const cappedAssess = deriveL13OutputReadiness({
    output: cappedOutput,
    l13_2_uncertainty_refs: ['u.1'],
  });
  assert(
    cappedAssess.readiness_class ===
      L13OutputReadinessClass.NARROWED_BY_UNCERTAINTY,
    'E.12 confidence caps → NARROWED_BY_UNCERTAINTY',
  );
  assert(
    cappedAssess.uncertainty_refs.length > 0,
    'E.13 NARROWED_BY_UNCERTAINTY carries uncertainty refs',
  );

  // BLOCKED band → BLOCKED_UNGROUNDED.
  const blockedConf = {
    ...green.confidence_disclosure,
    explanation_confidence_band: L13ExplanationConfidenceBand.BLOCKED,
    may_use_confident_language: false,
  };
  const blockedOutput: L13AIExplanationOutput = {
    ...green,
    confidence_disclosure: blockedConf,
  };
  const blockedAssess = deriveL13OutputReadiness({ output: blockedOutput });
  assert(
    blockedAssess.readiness_class ===
      L13OutputReadinessClass.BLOCKED_UNGROUNDED,
    'E.14 BLOCKED confidence band → BLOCKED_UNGROUNDED',
  );

  assert(
    ALL_L13_OUTPUT_READINESS_CLASSES.length === 7,
    'E.15 7 output readiness classes registered',
  );
  assert(
    L13_BLOCKED_OUTPUT_READINESS_CLASSES.length === 1,
    'E.16 1 blocked readiness class',
  );
  assert(
    isL13BlockedOutputReadiness(L13OutputReadinessClass.BLOCKED_UNGROUNDED),
    'E.17 BLOCKED_UNGROUNDED helper returns true',
  );
  assert(
    !isL13BlockedOutputReadiness(L13OutputReadinessClass.CLEAN_GROUNDED_OUTPUT),
    'E.18 CLEAN_GROUNDED helper returns false',
  );

  // Replay hash deterministic on assessment.
  const a1 = deriveL13OutputReadiness({ output: green });
  const a2 = deriveL13OutputReadiness({ output: green });
  assert(a1.replay_hash === a2.replay_hash, 'E.19 readiness replay hash deterministic');
});

// ════════════════════════════════════════════════════════════════════
// Band F — Audit, replay, invariants
// ════════════════════════════════════════════════════════════════════
band('F — audit, replay, invariants', () => {
  resetL13OutputAuditLog();

  emitL13OutputAuditRecord({
    subjectClass: L13OutputAuditSubjectClass.AI_OUTPUT,
    subjectRef: 'out.1',
    violationCode: L13OutputViolationCode.L13O_RECOMMENDATION_LEAK,
    message: 'recommendation leak detected',
    evidenceRefs: ['e1'],
    lineageRefs: ['l1'],
    createdAt: '2026-05-11T00:00:00Z',
  });
  emitL13OutputAuditRecord({
    subjectClass: L13OutputAuditSubjectClass.OUTPUT_SECTION,
    subjectRef: 'sec.1',
    violationCode: L13OutputViolationCode.L13O_SECTION_CONTENT_EMPTY,
    message: 'empty section content',
    evidenceRefs: [],
    lineageRefs: [],
    createdAt: '2026-05-11T00:00:00Z',
  });

  assert(getL13OutputViolationCount() === 2, 'F.1 audit count = 2');
  assert(
    hasAnyL13OutputViolations(),
    'F.2 hasAnyL13OutputViolations true',
  );
  assert(
    getL13OutputCriticalViolations().length === 1,
    'F.3 1 critical (recommendation leak)',
  );
  assert(
    getL13OutputBlockingViolations().length === 1,
    'F.4 1 blocking',
  );
  assert(
    getL13OutputViolationsByCode(
      L13OutputViolationCode.L13O_RECOMMENDATION_LEAK,
    ).length === 1,
    'F.5 lookup by code works',
  );
  assert(
    getL13OutputViolationsBySubjectClass(
      L13OutputAuditSubjectClass.OUTPUT_SECTION,
    ).length === 1,
    'F.6 lookup by subject class works',
  );

  // Severity mapping.
  assert(
    severityForL13OutputCode(
      L13OutputViolationCode.L13O_TRADE_ACTION_LEAK,
    ) === L13ViolationSeverity.CRITICAL,
    'F.7 trade-action leak is CRITICAL',
  );
  assert(
    severityForL13OutputCode(
      L13OutputViolationCode.L13O_BLOCKED_CLAIM_INVALID,
    ) === L13ViolationSeverity.ERROR,
    'F.8 blocked-claim invalid is ERROR',
  );

  assert(
    isL13OutputBlockingCode(
      L13OutputViolationCode.L13O_RECOMMENDATION_LEAK,
    ),
    'F.9 recommendation leak is blocking',
  );
  assert(
    !isL13OutputBlockingCode(L13OutputViolationCode.L13O_SECTION_INVALID),
    'F.10 section invalid is not blocking',
  );

  // Replay hash deterministic & flips on mutation.
  const a = buildGreenL13Output();
  const b = buildGreenL13Output();
  assert(a.replay_hash === b.replay_hash, 'F.11 same material → same hash');
  const c = buildGreenL13Output({
    inferenceContent: 'The setup suggests a different reading entirely.',
  });
  assert(a.replay_hash !== c.replay_hash, 'F.12 text mutation flips hash');

  // Canonical helper matches output replay hash.
  assert(
    canonicalL13AIOutputReplayHash(a) === a.replay_hash,
    'F.13 canonical replay hash matches output replay hash',
  );

  // Re-emit replay determinism for audit records.
  const r1 = emitL13OutputAuditRecord({
    subjectClass: L13OutputAuditSubjectClass.REPLAY_IDENTITY,
    subjectRef: 'out.x',
    violationCode: L13OutputViolationCode.L13O_REPLAY_HASH_MISSING,
    message: 'missing replay',
    evidenceRefs: ['ev'],
    lineageRefs: ['lin'],
    createdAt: '2026-05-11T00:00:00Z',
  });
  const r2 = emitL13OutputAuditRecord({
    subjectClass: L13OutputAuditSubjectClass.REPLAY_IDENTITY,
    subjectRef: 'out.x',
    violationCode: L13OutputViolationCode.L13O_REPLAY_HASH_MISSING,
    message: 'missing replay',
    evidenceRefs: ['ev'],
    lineageRefs: ['lin'],
    createdAt: '2026-05-11T00:00:00Z',
  });
  assert(
    r1.replay_hash === r2.replay_hash,
    'F.14 audit record replay hash deterministic',
  );

  assert(
    ALL_L13_OUTPUT_AUDIT_SUBJECT_CLASSES.length === 10,
    'F.15 10 audit subject classes',
  );

  resetL13OutputAuditLog();
  assert(getL13OutputAuditLog().length === 0, 'F.16 audit log reset');

  // Validator helpers exist and behave.
  assert(
    validateL13ModelMetadata(greenMetadata()).clean,
    'F.17 green model metadata passes',
  );

  // Invariants.
  const inv = runAllL13_3Invariants();
  for (const r of inv) {
    assert(r.holds, `F.${18 + inv.indexOf(r)} ${r.id} ${r.name}`);
  }
});

// ════════════════════════════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════════════════════════════
console.log(
  `\n══════════════════════════════════════════════════════════════════
L13.3 — AI Output Contracts certification: ${passed} passed, ${failed} failed
══════════════════════════════════════════════════════════════════`,
);

if (failed > 0) {
  process.exit(1);
}
