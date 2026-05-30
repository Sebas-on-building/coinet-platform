/**
 * L13.7 — Output Mode Invariants
 *
 * §13.7.26 — INV-13.7-A through INV-13.7-J.
 */

import { L13UserIntentClass } from '../contracts/user-intent-binding';
import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import { L13AnswerModeStatus } from '../contracts/product-answer-mode';
import {
  L13ModePayloadClass,
  L13ModeReadinessClass,
  type L13OutputModeEnvelope,
} from '../contracts/output-mode-envelope';
import { L13AIOutputClass } from '../contracts/ai-output';
import {
  buildL13ChatAnswer,
  buildL13Alert,
  buildL13StructuredReport,
  buildL13AssetComparison,
  buildL13ThesisComparison,
  buildL13ScenarioExplanation,
  buildL13ScoreExplanation,
  buildL13ContradictionExplanation,
  buildL13DebugExplanation,
  getL13AnswerModeDefinition,
  listL13AnswerModeDefinitions,
} from '../outputs';
import {
  validateL13AnswerModeDefinition,
  validateL13OutputModeEnvelope,
  validateL13ChatAnswer,
  validateL13AlertOutput,
  validateL13StructuredReportOutput,
  validateL13AssetComparisonOutput,
  validateL13ThesisComparisonOutput,
  validateL13ScenarioExplanationOutput,
  validateL13ScoreExplanationOutput,
  validateL13ContradictionExplanationOutput,
  validateL13DebugExplanationOutput,
} from '../validation';
import {
  L13AlertClass,
  L13AlertSeverity,
} from '../contracts/alert-output';
import { L13ComparisonScopeClass } from '../contracts/asset-comparison-output';
import { buildGreenL13InputPackage } from './l13_2-invariants';
import { buildGreenL13Output } from './l13_3-invariants';
import { runL13GroundingPipeline } from './l13_4-invariants';
import { runL13ExpressionPipeline } from './l13_5-invariants';
import { buildGreenL13RuntimeOutput } from './l13_6-invariants';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13_7InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/**
 * Helper — green runtime pipeline used by all invariants.
 */
async function greenContext(opts: { scenarioPresent?: boolean } = {}) {
  const scenarioPresent = opts.scenarioPresent ?? true;
  const pkg = buildGreenL13InputPackage();
  const output = buildGreenL13Output({ scenarioPresent });
  const grounding = runL13GroundingPipeline(output, pkg).grounding;
  const expression = runL13ExpressionPipeline(output, pkg);
  return { pkg, output, grounding, expression };
}

function buildEnvelope(
  args: {
    output_id: string;
    input_package_id: string;
    runtime_run_id: string;
    answer_mode: L13ProductAnswerMode;
    intent_class: L13UserIntentClass;
    output_class: L13AIOutputClass;
    mode_payload_class: L13ModePayloadClass;
    mode_payload_ref: string;
    mode_readiness: L13ModeReadinessClass;
    required_disclosures_satisfied: boolean;
    forbidden_omissions_detected: boolean;
    evidence_refs: readonly string[];
    lineage_refs: readonly string[];
  },
): L13OutputModeEnvelope {
  const replayHash = fnv1a(
    [
      args.output_id,
      args.input_package_id,
      args.runtime_run_id,
      args.answer_mode,
      args.intent_class,
      args.output_class,
      args.mode_payload_class,
      args.mode_payload_ref,
      args.mode_readiness,
      String(args.required_disclosures_satisfied),
      String(args.forbidden_omissions_detected),
      POLICY_V,
    ].join('|'),
  );
  return {
    mode_envelope_id: `l13.mode.env.${replayHash}`,
    output_id: args.output_id,
    input_package_id: args.input_package_id,
    runtime_run_id: args.runtime_run_id,
    answer_mode: args.answer_mode,
    intent_class: args.intent_class,
    output_class: args.output_class,
    mode_payload_class: args.mode_payload_class,
    mode_payload_ref: args.mode_payload_ref,
    mode_readiness: args.mode_readiness,
    required_disclosures_satisfied:
      args.required_disclosures_satisfied,
    forbidden_omissions_detected: args.forbidden_omissions_detected,
    evidence_refs: args.evidence_refs,
    lineage_refs: args.lineage_refs,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

// ── INV-13.7-A : mode registry law ──────────────────────────────────

export async function checkINV_137_A(): Promise<L13_7InvariantResult> {
  const defs = listL13AnswerModeDefinitions();
  const expectedModes = new Set<L13ProductAnswerMode>(
    Object.values(L13ProductAnswerMode),
  );
  const present = new Set(defs.map(d => d.answer_mode));
  const allRegistered = Array.from(expectedModes).every(m =>
    present.has(m),
  );
  const defValidatorClean = defs.every(
    d => validateL13AnswerModeDefinition(d).clean,
  );
  const debug = getL13AnswerModeDefinition(
    L13ProductAnswerMode.DEBUG_EXPLANATION,
  );
  const debugInternalOnly =
    debug?.answer_mode_status === L13AnswerModeStatus.INTERNAL_ONLY;
  return {
    id: 'INV-13.7-A',
    name: 'mode registry law',
    holds: allRegistered && defValidatorClean && !!debugInternalOnly,
    evidence: `modes=${defs.length} validatorClean=${defValidatorClean} debugInternal=${debugInternalOnly}`,
  };
}

// ── INV-13.7-B : chat-answer intent law ────────────────────────────

export async function checkINV_137_B(): Promise<L13_7InvariantResult> {
  const { pkg, output, grounding, expression } = await greenContext();
  const chat = buildL13ChatAnswer({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    intent_class: L13UserIntentClass.WHATS_HAPPENING,
    answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
  });
  const v = validateL13ChatAnswer(chat, {
    active_contradiction_required:
      pkg.uncertainty_profile.active_contradiction_present,
    active_uncertainty_required:
      pkg.uncertainty_profile.must_disclose_uncertainty,
    active_invalidation_present:
      pkg.uncertainty_profile.active_invalidation_present,
    unresolved_trigger_present:
      pkg.uncertainty_profile.unresolved_trigger_present,
  });
  const refusesRawDump = !chat.raw_metrics_included;
  return {
    id: 'INV-13.7-B',
    name: 'chat-answer intent law',
    holds:
      v.clean &&
      refusesRawDump &&
      chat.direct_answer.length > 0,
    evidence: `validator=${v.clean} rawDumpRefused=${refusesRawDump} answerLen=${chat.direct_answer.length}`,
  };
}

// ── INV-13.7-C : what-next scenario law ─────────────────────────────

export async function checkINV_137_C(): Promise<L13_7InvariantResult> {
  const { pkg, output, grounding, expression } = await greenContext();
  const whatNext = buildL13ChatAnswer({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    intent_class: L13UserIntentClass.WHATS_NEXT,
    answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
  });
  const v = validateL13ChatAnswer(whatNext, {
    active_contradiction_required: false,
    active_uncertainty_required: true,
    active_invalidation_present: false,
    unresolved_trigger_present: false,
  });
  return {
    id: 'INV-13.7-C',
    name: 'what-next scenario law',
    holds:
      v.clean &&
      whatNext.scenario_watchpoints.length > 0 &&
      whatNext.trigger_lines.length > 0,
    evidence: `validator=${v.clean} watchpoints=${whatNext.scenario_watchpoints.length} triggers=${whatNext.trigger_lines.length}`,
  };
}

// ── INV-13.7-D : alert change law ───────────────────────────────────

export async function checkINV_137_D(): Promise<L13_7InvariantResult> {
  const { pkg, output, grounding, expression } = await greenContext();
  const alert = buildL13Alert({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    alert_class: L13AlertClass.TRIGGER_ACTIVATED,
    alert_severity: L13AlertSeverity.IMPORTANT,
    changed_subject_ref: 'asset.btc',
    current_state_ref: 'l12.scenario.base.1',
    what_changed:
      'Funding cool-off threshold has been reached under governed L12 refs.',
    why_it_matters:
      'The active continuation base case now has a confirmed trigger.',
    activated_trigger_refs: ['l12.trigger.1'],
    confidence_change: {
      current_band: 'MEDIUM',
      direction: 'UNCHANGED',
      statement:
        'Confidence band unchanged; trigger activation tightens the conditional posture.',
    },
    readiness_change: {
      current_class: 'READY_WITH_DISCLOSURE',
      direction: 'UNCHANGED',
      statement: 'Readiness unchanged; disclosure preserved.',
    },
  });
  const v = validateL13AlertOutput(alert);
  return {
    id: 'INV-13.7-D',
    name: 'alert change law',
    holds: v.clean && alert.activated_trigger_refs.length > 0,
    evidence: `validator=${v.clean} triggers=${alert.activated_trigger_refs.length} severity=${alert.alert_severity}`,
  };
}

// ── INV-13.7-E : report completeness law ────────────────────────────

export async function checkINV_137_E(): Promise<L13_7InvariantResult> {
  const { pkg, output, grounding, expression } = await greenContext();
  const report = buildL13StructuredReport({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
  });
  const v = validateL13StructuredReportOutput(report);
  // Tamper: empty contradictions section.
  const broken = {
    ...report,
    contradictions_section: {
      ...report.contradictions_section,
      present: false,
      summary: '',
    },
  };
  const vBroken = validateL13StructuredReportOutput(broken);
  return {
    id: 'INV-13.7-E',
    name: 'report completeness law',
    holds: v.clean && !vBroken.clean,
    evidence: `validatorGreen=${v.clean} validatorTampered=${!vBroken.clean} issuesTampered=${vBroken.issues.length}`,
  };
}

// ── INV-13.7-F : comparison parity law ──────────────────────────────

export async function checkINV_137_F(): Promise<L13_7InvariantResult> {
  const { pkg, output, grounding, expression } = await greenContext();
  const assetCmp = buildL13AssetComparison({
    request_output_id: output.output_id,
    left: {
      subject_ref: 'asset.btc',
      subject_label: 'BTC',
      input_package: pkg,
      output,
      grounding_result: grounding,
      expression,
    },
    right: {
      subject_ref: 'asset.eth',
      subject_label: 'ETH',
      input_package: pkg,
      output,
      grounding_result: grounding,
      expression,
    },
    scope_class: L13ComparisonScopeClass.TWO_ASSETS,
  });
  const vAsset = validateL13AssetComparisonOutput(assetCmp);

  // Tamper: emit recommendation language.
  const broken = {
    ...assetCmp,
    final_comparison_summary:
      'Asset A is the better buy because of the score.',
  };
  const vBroken = validateL13AssetComparisonOutput(broken);

  const thesisCmp = buildL13ThesisComparison({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    thesis_left_ref: 'l10.thesis.left',
    thesis_right_ref: 'l10.thesis.right',
    left_thesis_name: 'Accumulation',
    right_thesis_name: 'Distribution',
  });
  const vThesis = validateL13ThesisComparisonOutput(thesisCmp);
  return {
    id: 'INV-13.7-F',
    name: 'comparison parity law',
    holds: vAsset.clean && !vBroken.clean && vThesis.clean,
    evidence: `asset=${vAsset.clean} recommendationLeakDetected=${!vBroken.clean} thesis=${vThesis.clean}`,
  };
}

// ── INV-13.7-G : scenario/score/contradiction specialization law ────

export async function checkINV_137_G(): Promise<L13_7InvariantResult> {
  const { pkg, output, grounding, expression } = await greenContext();
  const scenario = buildL13ScenarioExplanation({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
  });
  const vScn = validateL13ScenarioExplanationOutput(scenario);
  const score = buildL13ScoreExplanation({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
  });
  const vScore = validateL13ScoreExplanationOutput(score);
  const contradiction = buildL13ContradictionExplanation({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
  });
  const vCon =
    validateL13ContradictionExplanationOutput(contradiction);
  const refsUsed =
    scenario.scenario_set_ref.length > 0 &&
    score.score_ref.length > 0 &&
    contradiction.supporting_l7_refs.length > 0 &&
    (contradiction.affected_l10_hypothesis_refs.length > 0 ||
      contradiction.affected_l12_scenario_refs.length > 0);
  return {
    id: 'INV-13.7-G',
    name: 'scenario/score/contradiction specialization law',
    holds: vScn.clean && vScore.clean && vCon.clean && refsUsed,
    evidence: `scenario=${vScn.clean} score=${vScore.clean} contradiction=${vCon.clean} refsUsed=${refsUsed}`,
  };
}

// ── INV-13.7-H : debug isolation law ────────────────────────────────

export async function checkINV_137_H(): Promise<L13_7InvariantResult> {
  const { pkg, output, grounding, expression } = await greenContext();
  const runtime = await buildGreenL13RuntimeOutput();
  const debug = buildL13DebugExplanation({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    runtime_run: runtime.run_record,
  });
  const v = validateL13DebugExplanationOutput(debug);
  const env = buildEnvelope({
    output_id: output.output_id,
    input_package_id: pkg.input_package_id,
    runtime_run_id: runtime.run_record.runtime_run_id,
    answer_mode: L13ProductAnswerMode.DEBUG_EXPLANATION,
    intent_class: L13UserIntentClass.CONTRADICTION_INSIGHT,
    output_class: L13AIOutputClass.UNCERTAINTY_DISCLOSURE,
    mode_payload_class: L13ModePayloadClass.DEBUG_EXPLANATION,
    mode_payload_ref: debug.debug_explanation_id,
    mode_readiness: L13ModeReadinessClass.MODE_READY,
    required_disclosures_satisfied: true,
    forbidden_omissions_detected: false,
    evidence_refs: pkg.evidence_refs,
    lineage_refs: pkg.lineage_refs,
  });
  const userEmission = validateL13OutputModeEnvelope(env, {
    user_emission: true,
  });
  const internalEmission = validateL13OutputModeEnvelope(env, {
    user_emission: false,
  });
  return {
    id: 'INV-13.7-H',
    name: 'debug isolation law',
    holds: v.clean && !userEmission.clean && internalEmission.clean,
    evidence: `payload=${v.clean} userBlocked=${!userEmission.clean} internalAllowed=${internalEmission.clean}`,
  };
}

// ── INV-13.7-I : no-governance-bypass law ───────────────────────────

export async function checkINV_137_I(): Promise<L13_7InvariantResult> {
  const { pkg, output, grounding, expression } = await greenContext();
  // The L13.7 builders always consume governed L13.4 + L13.5
  // results. Confirm the chat payload carries refs that
  // ultimately come from the input package + expression envelope.
  const chat = buildL13ChatAnswer({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    intent_class: L13UserIntentClass.WHATS_HAPPENING,
    answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
  });
  const referencesGoverned =
    chat.evidence_refs.length > 0 &&
    chat.lineage_refs.length > 0 &&
    chat.evidence_refs.every(r =>
      pkg.evidence_refs.includes(r),
    );
  // No raw lower-layer ref escapes through chat watchpoints: each
  // string is bounded by output content already validated.
  return {
    id: 'INV-13.7-I',
    name: 'no-governance-bypass law',
    holds: referencesGoverned,
    evidence: `governed=${referencesGoverned} evRefs=${chat.evidence_refs.length} linRefs=${chat.lineage_refs.length}`,
  };
}

// ── INV-13.7-J : replay and lineage law ─────────────────────────────

export async function checkINV_137_J(): Promise<L13_7InvariantResult> {
  const { pkg, output, grounding, expression } = await greenContext();
  const a = buildL13ChatAnswer({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    intent_class: L13UserIntentClass.WHATS_HAPPENING,
    answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
  });
  const b = buildL13ChatAnswer({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    intent_class: L13UserIntentClass.WHATS_HAPPENING,
    answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
  });
  const c = buildL13ChatAnswer({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    intent_class: L13UserIntentClass.WHATS_NEXT,
    answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
  });
  const stable = a.replay_hash === b.replay_hash;
  const flipped = a.replay_hash !== c.replay_hash;
  return {
    id: 'INV-13.7-J',
    name: 'replay and lineage law',
    holds:
      stable &&
      flipped &&
      a.lineage_refs.length > 0 &&
      a.replay_hash.length > 0,
    evidence: `stable=${stable} flipped=${flipped} lineageLen=${a.lineage_refs.length}`,
  };
}

export async function runAllL13_7Invariants():
  Promise<readonly L13_7InvariantResult[]> {
  return [
    await checkINV_137_A(),
    await checkINV_137_B(),
    await checkINV_137_C(),
    await checkINV_137_D(),
    await checkINV_137_E(),
    await checkINV_137_F(),
    await checkINV_137_G(),
    await checkINV_137_H(),
    await checkINV_137_I(),
    await checkINV_137_J(),
  ];
}
