/**
 * L13.3 — Output Contracts Invariants
 *
 * §13.3.20 — INV-13.3-A through INV-13.3-J. Each invariant exercises
 * the Phase B/C/D output engines and validators against green and
 * crafted-offender inputs to prove the law mechanically.
 *
 *   INV-13.3-A : Output object completeness law
 *   INV-13.3-B : Output class legality law
 *   INV-13.3-C : Section separation law
 *   INV-13.3-D : Contradiction and uncertainty disclosure law
 *   INV-13.3-E : Scenario and score boundary law
 *   INV-13.3-F : Restriction and blocked-mode law
 *   INV-13.3-G : Semantic leakage law
 *   INV-13.3-H : Readiness law
 *   INV-13.3-I : Model metadata and auditability law
 *   INV-13.3-J : Replay determinism law
 */

import {
  L13AIOutputClass,
  type L13AIExplanationOutput,
} from '../contracts/ai-output';
import {
  L13AnswerMode,
  L13BlockedAnswerMode,
  L13_ALWAYS_BLOCKED_ANSWER_MODES,
} from '../contracts/explanation-restriction-profile';
import {
  L13OutputBlockedClaimType,
  L13OutputValidatorClass,
} from '../contracts/blocked-claim';
import {
  L13_FORBIDDEN_CONFIDENCE_PHRASES,
} from '../contracts/confidence-disclosure';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import {
  L13OutputReadinessClass,
} from '../contracts/output-readiness';
import {
  L13OutputSectionClass,
  L13OutputSectionReadinessClass,
} from '../contracts/output-section';
import { buildL13AIExplanationOutput } from '../context/ai-output-builder';
import { deriveL13OutputReadiness } from '../context/output-readiness-engine';
import { validateL13AIOutput } from '../validation/ai-output.validator';
import { validateL13OutputReadinessAssessment } from '../validation/output-readiness.validator';
import { L13OutputViolationCode } from '../validation/l13-output-violation-codes';

const POLICY_V = 'l13.output.v1';

export interface L13_3InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── Section factories ──────────────────────────────────────────────

function mkSection(
  id: string,
  cls: L13OutputSectionClass,
  present: boolean,
  content: string,
  refs: {
    claim?: readonly string[];
    evidence?: readonly string[];
    contradiction?: readonly string[];
  } = {},
): import('../contracts/output-section').L13OutputSection {
  return {
    section_id: id,
    section_class: cls,
    title: cls,
    content,
    claim_refs: refs.claim ?? [],
    evidence_refs: refs.evidence ?? [],
    contradiction_refs: refs.contradiction ?? [],
    required: true,
    present,
    section_readiness: present
      ? L13OutputSectionReadinessClass.SECTION_COMPLETE
      : L13OutputSectionReadinessClass.SECTION_OPTIONAL_ABSENT,
    may_contain_inference: cls === L13OutputSectionClass.INFERENCE,
    may_contain_observation: cls === L13OutputSectionClass.OBSERVATION,
    may_contain_uncertainty:
      cls === L13OutputSectionClass.UNCERTAINTY,
    may_contain_restriction:
      cls === L13OutputSectionClass.RESTRICTION,
    forbidden_semantic_hits: [],
    lineage_refs: ['l13.lineage.section'],
    policy_version: POLICY_V,
  };
}

function emptySection(
  id: string,
  cls: L13OutputSectionClass,
): import('../contracts/output-section').L13OutputSection {
  return {
    section_id: id,
    section_class: cls,
    title: cls,
    content: '',
    claim_refs: [],
    evidence_refs: [],
    contradiction_refs: [],
    required: false,
    present: false,
    section_readiness:
      L13OutputSectionReadinessClass.SECTION_OPTIONAL_ABSENT,
    may_contain_inference: false,
    may_contain_observation: false,
    may_contain_uncertainty: false,
    may_contain_restriction: false,
    forbidden_semantic_hits: [],
    lineage_refs: ['l13.lineage.section'],
    policy_version: POLICY_V,
  };
}

function greenConfidence(): import('../contracts/confidence-disclosure').L13ConfidenceDisclosure {
  return {
    confidence_disclosure_id: 'l13.conf.green',
    explanation_confidence_band: L13ExplanationConfidenceBand.MEDIUM,
    confidence_basis_refs: ['l11.confidence.1'],
    confidence_cap_refs: [],
    confidence_narrowing_reasons: [],
    may_use_confident_language: false,
    must_use_uncertainty_language: false,
    forbidden_confidence_phrases: [...L13_FORBIDDEN_CONFIDENCE_PHRASES],
    confidence_statement:
      'The explanation confidence is medium based on governed lower-layer support.',
    evidence_refs: ['l11.evidence.conf'],
    lineage_refs: ['l11.lineage.conf'],
    policy_version: POLICY_V,
  };
}

function greenRestriction(): import('../contracts/restriction-disclosure').L13RestrictionDisclosure {
  return {
    restriction_disclosure_id: 'l13.restr.green',
    lower_layer_restriction_refs: ['l11.restr.1', 'l12.restr.1'],
    applied_restriction_codes: ['L11_RESTR', 'L12_RESTR'],
    blocked_answer_modes: [...L13_ALWAYS_BLOCKED_ANSWER_MODES],
    required_disclosures: [],
    restriction_statement:
      'This output reflects governed lower-layer restrictions and is not a trade recommendation.',
    may_include_directional_language: true,
    may_include_scenario_language: true,
    may_include_score_language: true,
    must_avoid_recommendation_language: true,
    must_avoid_prediction_language: true,
    must_avoid_final_judgment_language: true,
    evidence_refs: ['l11.evidence.restr'],
    lineage_refs: ['l11.lineage.restr'],
    policy_version: POLICY_V,
  };
}

function greenMetadata(): import('../contracts/model-metadata').L13ModelMetadata {
  return {
    model_metadata_id: 'l13.meta.green',
    model_provider: 'anthropic',
    model_name: 'claude-explanation',
    prompt_template_id: 'l13.tpl.market_explanation',
    prompt_template_version: 'v1',
    input_package_hash: 'pkg.hash.green',
    output_policy_version: POLICY_V,
    temperature: 0.2,
    max_output_tokens: 1024,
    generation_started_at: '2026-05-11T00:00:00Z',
    generation_completed_at: '2026-05-11T00:00:01Z',
    post_validation_passed: true,
    post_validation_issue_refs: [],
    safety_gate_passed: true,
    grounding_gate_passed: true,
    lineage_refs: ['l13.lineage.meta'],
    policy_version: POLICY_V,
  };
}

interface GreenOutputOpts {
  readonly outputClass?: L13AIOutputClass;
  readonly answerMode?: L13AnswerMode;
  readonly scenarioPresent?: boolean;
  readonly contradictionPresent?: boolean;
  readonly observationContent?: string;
  readonly inferenceContent?: string;
}

export function buildGreenL13Output(
  opts: GreenOutputOpts = {},
): L13AIExplanationOutput {
  const outputClass = opts.outputClass ?? L13AIOutputClass.MARKET_EXPLANATION;
  const answerMode = opts.answerMode ?? L13AnswerMode.EXPLAIN;
  const scenarioPresent =
    opts.scenarioPresent ?? outputClass === L13AIOutputClass.SCENARIO_EXPLANATION;
  const contradictionPresent = opts.contradictionPresent ?? false;

  const observation = mkSection(
    'sec.obs.1',
    L13OutputSectionClass.OBSERVATION,
    true,
    opts.observationContent ??
      'Engine reports the active scenario base case is leverage-driven continuation with rising fragility.',
    { evidence: ['l12.evidence.scenario'] },
  );
  const inference = mkSection(
    'sec.inf.1',
    L13OutputSectionClass.INFERENCE,
    true,
    opts.inferenceContent ??
      'That suggests the setup can extend, but the continuation path is not clean because fragility and invalidation pressure are active.',
    { evidence: ['l12.evidence.scenario'] },
  );
  const uncertainty = mkSection(
    'sec.unc.1',
    L13OutputSectionClass.UNCERTAINTY,
    true,
    'Uncertainty is driven by narrow scenario spread and active fragility.',
  );
  const contradiction = contradictionPresent
    ? mkSection(
        'sec.contra.1',
        L13OutputSectionClass.CONTRADICTION,
        true,
        'A funding-rate contradiction tempers continuation strength.',
        { contradiction: ['l7.contradiction.active.1'] },
      )
    : emptySection('sec.contra.empty', L13OutputSectionClass.CONTRADICTION);
  const scenario = scenarioPresent
    ? mkSection(
        'sec.scen.1',
        L13OutputSectionClass.SCENARIO,
        true,
        'Base case is continuation; bearish alternative requires spot weakness.',
        {
          claim: ['l12.scenario.base.1'],
          evidence: ['l12.evidence.scenario'],
        },
      )
    : emptySection('sec.scen.empty', L13OutputSectionClass.SCENARIO);
  const trigger = scenarioPresent
    ? mkSection(
        'sec.trig.1',
        L13OutputSectionClass.TRIGGER_INVALIDATION,
        true,
        'Trigger: funding cool-off below threshold. Invalidation: spot break with low volume.',
        {
          claim: ['l12.trigger.1', 'l12.invalidation.1'],
          evidence: ['l12.evidence.trigger'],
        },
      )
    : emptySection(
        'sec.trig.empty',
        L13OutputSectionClass.TRIGGER_INVALIDATION,
      );

  return buildL13AIExplanationOutput({
    request_id: 'req.green',
    input_package_id: 'l13.input_package.greenpkg',
    output_class: outputClass,
    answer_mode: answerMode,
    scope_type: 'asset',
    scope_id: 'asset.btc',
    as_of: '2026-05-11T00:00:00Z',
    headline: 'Continuation setup remains active under governed fragility.',
    summary:
      'The engine surfaces a leverage-driven continuation base case with rising fragility; the path is conditional on funding cool-off and spot follow-through.',
    observation_section: observation,
    inference_section: inference,
    uncertainty_section: uncertainty,
    contradiction_section: contradiction,
    scenario_section: scenario,
    trigger_invalidation_section: trigger,
    confidence_disclosure: greenConfidence(),
    restriction_disclosure: greenRestriction(),
    evidence_refs: [
      'l11.evidence.score',
      'l12.evidence.scenario',
      'l7.evidence.validation',
    ],
    contradiction_refs: contradictionPresent
      ? ['l7.contradiction.active.1']
      : [],
    scenario_refs: scenarioPresent ? ['l12.scenario.base.1'] : [],
    score_refs:
      outputClass === L13AIOutputClass.SCORE_EXPLANATION
        ? ['l11.opportunity.1']
        : [],
    hypothesis_refs:
      outputClass === L13AIOutputClass.THESIS_COMPARISON
        ? ['l10.h.primary']
        : [],
    blocked_claims: [],
    output_readiness: L13OutputReadinessClass.GROUNDED_WITH_DISCLOSURE,
    model_metadata: greenMetadata(),
    lineage_refs: ['l13.lineage.run'],
  });
}

// ── INV-13.3-A : completeness law ──
export function checkINV_133_A(): L13_3InvariantResult {
  const out = buildGreenL13Output();
  const v = validateL13AIOutput(out);
  return {
    id: 'INV-13.3-A',
    name: 'output object completeness law',
    holds: v.clean,
    evidence: v.clean
      ? 'green output validates clean'
      : `failed: ${v.issues.map(i => i.code).join(', ')}`,
  };
}

// ── INV-13.3-B : output class legality law ──
export function checkINV_133_B(): L13_3InvariantResult {
  const offender = {
    ...buildGreenL13Output(),
    output_class: undefined as never,
  } as L13AIExplanationOutput;
  const v = validateL13AIOutput(offender);
  const detected = v.issues.some(
    i => i.code === L13OutputViolationCode.L13O_OUTPUT_CLASS_MISSING,
  );

  // Always-blocked answer mode rejected.
  const adverse: L13AIExplanationOutput = {
    ...buildGreenL13Output(),
    answer_mode:
      'TRADE_RECOMMENDATION' as unknown as L13AnswerMode,
  };
  const v2 = validateL13AIOutput(adverse);
  const detected2 = v2.issues.some(
    i =>
      i.code ===
      L13OutputViolationCode.L13O_BLOCKED_ANSWER_MODE_VIOLATED,
  );

  const holds = detected && detected2;
  return {
    id: 'INV-13.3-B',
    name: 'output class legality law',
    holds,
    evidence: holds
      ? 'missing class + always-blocked mode rejected'
      : `failed: missingClass=${detected} blockedMode=${detected2}`,
  };
}

// ── INV-13.3-C : section separation law ──
export function checkINV_133_C(): L13_3InvariantResult {
  // Observation section using prediction language.
  const offender = buildGreenL13Output({
    observationContent:
      'This setup suggests the market will continue higher.',
  });
  const v = validateL13AIOutput(offender);
  const detected = v.issues.some(
    i =>
      i.code ===
      L13OutputViolationCode.L13O_OBSERVATION_INFERENCE_MIXED,
  );
  return {
    id: 'INV-13.3-C',
    name: 'section separation law',
    holds: detected,
    evidence: detected
      ? 'observation/inference mix rejected'
      : 'failed: speculation in observation section not detected',
  };
}

// ── INV-13.3-D : contradiction & uncertainty disclosure law ──
export function checkINV_133_D(): L13_3InvariantResult {
  // CONTRADICTION_EXPLANATION without contradiction_refs.
  const offender: L13AIExplanationOutput = buildGreenL13Output({
    outputClass: L13AIOutputClass.CONTRADICTION_EXPLANATION,
    contradictionPresent: false,
  });
  const v = validateL13AIOutput(offender);
  const detectedRefs = v.issues.some(
    i => i.code === L13OutputViolationCode.L13O_CONTRADICTION_OMITTED,
  );
  const detectedSection = v.issues.some(
    i =>
      i.code ===
      L13OutputViolationCode.L13O_CONTRADICTION_SECTION_MISSING,
  );
  const holds = detectedRefs && detectedSection;
  return {
    id: 'INV-13.3-D',
    name: 'contradiction & uncertainty disclosure law',
    holds,
    evidence: holds
      ? 'contradiction explanation requires refs + section'
      : `failed: refs=${detectedRefs} section=${detectedSection}`,
  };
}

// ── INV-13.3-E : scenario & score boundary law ──
export function checkINV_133_E(): L13_3InvariantResult {
  // SCENARIO_EXPLANATION without scenario_refs.
  const noRefs: L13AIExplanationOutput = {
    ...buildGreenL13Output({
      outputClass: L13AIOutputClass.SCENARIO_EXPLANATION,
      scenarioPresent: true,
    }),
    scenario_refs: [],
  };
  const v1 = validateL13AIOutput(noRefs);
  const detected1 = v1.issues.some(
    i =>
      i.code === L13OutputViolationCode.L13O_SCENARIO_SECTION_MISSING,
  );

  // Score-as-recommendation phrasing.
  const advice = buildGreenL13Output({
    inferenceContent:
      'Opportunity score is high, so this is a good buy at current levels.',
  });
  const v2 = validateL13AIOutput(advice);
  const detected2 = v2.issues.some(
    i =>
      i.code ===
        L13OutputViolationCode.L13O_SCORE_AS_RECOMMENDATION ||
      i.code === L13OutputViolationCode.L13O_RECOMMENDATION_LEAK ||
      i.code === L13OutputViolationCode.L13O_TRADE_ACTION_LEAK,
  );

  // Confidence as probability.
  const prob = buildGreenL13Output({
    inferenceContent:
      'The base case has a 75% chance of playing out next week.',
  });
  const v3 = validateL13AIOutput(prob);
  const detected3 = v3.issues.some(
    i =>
      i.code ===
      L13OutputViolationCode.L13O_CONFIDENCE_AS_PROBABILITY,
  );

  const holds = detected1 && detected2 && detected3;
  return {
    id: 'INV-13.3-E',
    name: 'scenario & score boundary law',
    holds,
    evidence: holds
      ? 'scenario, score-as-advice, confidence-as-probability all rejected'
      : `failed: scenario=${detected1} scoreAdvice=${detected2} probTheater=${detected3}`,
  };
}

// ── INV-13.3-F : restriction & blocked-mode law ──
export function checkINV_133_F(): L13_3InvariantResult {
  const offender: L13AIExplanationOutput = {
    ...buildGreenL13Output(),
    answer_mode:
      'BUY_SELL_HOLD_AVOID' as unknown as L13AnswerMode,
  };
  const v = validateL13AIOutput(offender);
  const detected = v.issues.some(
    i =>
      i.code ===
      L13OutputViolationCode.L13O_BLOCKED_ANSWER_MODE_VIOLATED,
  );

  // Restriction disclosure missing always-blocked modes.
  const stripped: L13AIExplanationOutput = {
    ...buildGreenL13Output(),
    restriction_disclosure: {
      ...greenRestriction(),
      blocked_answer_modes: [] as readonly L13BlockedAnswerMode[],
    },
  };
  const v2 = validateL13AIOutput(stripped);
  const detected2 = v2.issues.some(
    i =>
      i.code ===
      L13OutputViolationCode.L13O_BLOCKED_ANSWER_MODE_VIOLATED,
  );

  const holds = detected && detected2;
  return {
    id: 'INV-13.3-F',
    name: 'restriction & blocked-mode law',
    holds,
    evidence: holds
      ? 'blocked answer modes can not be emitted or stripped'
      : `failed: emitted=${detected} stripped=${detected2}`,
  };
}

// ── INV-13.3-G : semantic leakage law ──
export function checkINV_133_G(): L13_3InvariantResult {
  const tradeLeak = buildGreenL13Output({
    inferenceContent: 'I would go long here aggressively.',
  });
  const v1 = validateL13AIOutput(tradeLeak);
  const detected1 = v1.issues.some(
    i =>
      i.code === L13OutputViolationCode.L13O_TRADE_ACTION_LEAK ||
      i.code === L13OutputViolationCode.L13O_RECOMMENDATION_LEAK,
  );

  const certaintyLeak = buildGreenL13Output({
    inferenceContent:
      'This continuation is guaranteed given current funding.',
  });
  const v2 = validateL13AIOutput(certaintyLeak);
  const detected2 = v2.issues.some(
    i =>
      i.code === L13OutputViolationCode.L13O_CERTAINTY_LEAK ||
      i.code === L13OutputViolationCode.L13O_PREDICTION_THEATER,
  );

  const holds = detected1 && detected2;
  return {
    id: 'INV-13.3-G',
    name: 'semantic leakage law',
    holds,
    evidence: holds
      ? 'trade-action & certainty leakage caught'
      : `failed: trade=${detected1} cert=${detected2}`,
  };
}

// ── INV-13.3-H : readiness law ──
export function checkINV_133_H(): L13_3InvariantResult {
  const out = buildGreenL13Output();
  const assess = deriveL13OutputReadiness({ output: out });
  const v = validateL13OutputReadinessAssessment(assess, out);
  const cleanLegal = v.clean;

  // Force CLEAN_GROUNDED while contradictions present — should
  // emit critical readiness error.
  const offender: L13AIExplanationOutput = {
    ...buildGreenL13Output({ contradictionPresent: true }),
    contradiction_refs: ['l7.contradiction.active.1'],
    output_readiness: L13OutputReadinessClass.CLEAN_GROUNDED_OUTPUT,
  };
  const assess2 = deriveL13OutputReadiness({ output: offender });
  // For the validator test we'll synthesize an offender assessment
  // that asserts CLEAN.
  const offenderAssessment: typeof assess2 = {
    ...assess2,
    readiness_class: L13OutputReadinessClass.CLEAN_GROUNDED_OUTPUT,
    readiness_reason_codes: ['CLEAN'],
  };
  const v2 = validateL13OutputReadinessAssessment(
    offenderAssessment,
    offender,
  );
  const detectedClean = v2.issues.some(
    i =>
      i.code ===
      L13OutputViolationCode.L13O_CLEAN_OUTPUT_UNDER_DISCLOSURE_REQUIREMENT,
  );

  // Refusal_required must NOT emit.
  const refusal = buildGreenL13Output();
  const refusalAssess: typeof assess = {
    ...deriveL13OutputReadiness({
      output: refusal,
      prohibited_request: true,
    }),
  };
  const refusalMustNotEmit = !refusalAssess.may_emit_to_user;

  const holds = cleanLegal && detectedClean && refusalMustNotEmit;
  return {
    id: 'INV-13.3-H',
    name: 'readiness law',
    holds,
    evidence: holds
      ? 'readiness derivation + validator enforce clean/refusal rules'
      : `failed: clean=${cleanLegal} cleanUnderDisc=${detectedClean} refusalBlock=${refusalMustNotEmit}`,
  };
}

// ── INV-13.3-I : model metadata law ──
export function checkINV_133_I(): L13_3InvariantResult {
  const offender: L13AIExplanationOutput = {
    ...buildGreenL13Output(),
    model_metadata: {
      ...greenMetadata(),
      model_provider: '',
    },
  };
  const v = validateL13AIOutput(offender);
  const detected = v.issues.some(
    i =>
      i.code === L13OutputViolationCode.L13O_MODEL_METADATA_INVALID,
  );
  return {
    id: 'INV-13.3-I',
    name: 'model metadata & auditability law',
    holds: detected,
    evidence: detected
      ? 'invalid model metadata rejected'
      : 'failed: invalid metadata not flagged',
  };
}

// ── INV-13.3-J : replay determinism law ──
export function checkINV_133_J(): L13_3InvariantResult {
  const a = buildGreenL13Output();
  const b = buildGreenL13Output();
  const same = a.replay_hash === b.replay_hash;

  const c = buildGreenL13Output({
    inferenceContent: 'Different inference content here.',
  });
  const flips = a.replay_hash !== c.replay_hash;

  const holds = same && flips;
  return {
    id: 'INV-13.3-J',
    name: 'replay determinism law',
    holds,
    evidence: holds
      ? 'same material → same hash; text mutation flips hash'
      : `failed: same=${same} flips=${flips}`,
  };
}

export function runAllL13_3Invariants(): readonly L13_3InvariantResult[] {
  return [
    checkINV_133_A(),
    checkINV_133_B(),
    checkINV_133_C(),
    checkINV_133_D(),
    checkINV_133_E(),
    checkINV_133_F(),
    checkINV_133_G(),
    checkINV_133_H(),
    checkINV_133_I(),
    checkINV_133_J(),
  ];
}

export const __l13_3_test_helpers = {
  buildGreenL13Output,
  greenConfidence,
  greenRestriction,
  greenMetadata,
  mkSection,
  emptySection,
};
