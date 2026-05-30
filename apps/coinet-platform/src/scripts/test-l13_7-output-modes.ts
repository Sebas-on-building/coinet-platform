/**
 * L13.7 — Output Modes Certification
 *
 * §13.7.29 — Bands A..G prove every product-mode law mechanically.
 */

import { L13UserIntentClass } from '../l13/contracts/user-intent-binding';
import {
  L13AnswerModeStatus,
  L13ProductAnswerMode,
} from '../l13/contracts/product-answer-mode';
import { L13AIOutputClass } from '../l13/contracts/ai-output';
import {
  L13ModePayloadClass,
  L13ModeReadinessClass,
  type L13OutputModeEnvelope,
} from '../l13/contracts/output-mode-envelope';
import {
  L13AlertClass,
  L13AlertSeverity,
} from '../l13/contracts/alert-output';
import { L13ComparisonScopeClass } from '../l13/contracts/asset-comparison-output';
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
} from '../l13/outputs';
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
  L13ModeViolationCode,
} from '../l13/validation';
import {
  emitL13OutputModeAuditRecord,
  getL13OutputModeAuditLog,
  getL13OutputModeCriticalViolations,
  L13OutputModeAuditSubjectClass,
  resetL13OutputModeAuditLog,
  severityForL13ModeCode,
  isL13ModeBlockingCode,
} from '../l13/constitution';
import { L13ViolationSeverity } from '../l13/contracts';
import { buildGreenL13InputPackage } from '../l13/invariants/l13_2-invariants';
import { buildGreenL13Output } from '../l13/invariants/l13_3-invariants';
import { runL13GroundingPipeline } from '../l13/invariants/l13_4-invariants';
import { runL13ExpressionPipeline } from '../l13/invariants/l13_5-invariants';
import { buildGreenL13RuntimeOutput } from '../l13/invariants/l13_6-invariants';
import { runAllL13_7Invariants } from '../l13/invariants/l13_7-invariants';
import { fnv1a } from '../l13/context/_fnv1a';

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

function greenContext(opts: { scenarioPresent?: boolean } = {}) {
  const scenarioPresent = opts.scenarioPresent ?? true;
  const pkg = buildGreenL13InputPackage();
  const output = buildGreenL13Output({ scenarioPresent });
  const grounding = runL13GroundingPipeline(output, pkg).grounding;
  const expression = runL13ExpressionPipeline(output, pkg);
  return { pkg, output, grounding, expression };
}

function buildEnvelope(args: {
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
}): L13OutputModeEnvelope {
  const hash = fnv1a(
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
    ].join('|'),
  );
  return {
    mode_envelope_id: `l13.mode.env.${hash}`,
    output_id: args.output_id,
    input_package_id: args.input_package_id,
    runtime_run_id: args.runtime_run_id,
    answer_mode: args.answer_mode,
    intent_class: args.intent_class,
    output_class: args.output_class,
    mode_payload_class: args.mode_payload_class,
    mode_payload_ref: args.mode_payload_ref,
    mode_readiness: args.mode_readiness,
    required_disclosures_satisfied: args.required_disclosures_satisfied,
    forbidden_omissions_detected: args.forbidden_omissions_detected,
    evidence_refs: args.evidence_refs,
    lineage_refs: args.lineage_refs,
    policy_version: 'l13.outputs.v1',
    replay_hash: hash,
  };
}

async function main(): Promise<void> {
  // ── BAND A : registry & envelope ─────────────────────────────────
  band('BAND A — mode registry & envelope');
  {
    const defs = listL13AnswerModeDefinitions();
    assert(defs.length === 11, `A.1 11 mode definitions registered (got ${defs.length})`);
    const allModesPresent = Object.values(L13ProductAnswerMode).every(m =>
      !!getL13AnswerModeDefinition(m),
    );
    assert(allModesPresent, 'A.2 every product mode registered');
    const debug = getL13AnswerModeDefinition(
      L13ProductAnswerMode.DEBUG_EXPLANATION,
    );
    assert(
      debug?.answer_mode_status === L13AnswerModeStatus.INTERNAL_ONLY,
      'A.3 DEBUG_EXPLANATION is INTERNAL_ONLY',
    );
    for (const d of defs) {
      assert(
        validateL13AnswerModeDefinition(d).clean,
        `A.4 definition validator clean for ${d.answer_mode}`,
      );
    }

    // Envelope round-trip — green envelope passes user emission;
    // missing lineage fails.
    const { pkg, output } = greenContext();
    const env = buildEnvelope({
      output_id: output.output_id,
      input_package_id: pkg.input_package_id,
      runtime_run_id: 'l13.run.test',
      answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
      intent_class: L13UserIntentClass.WHATS_HAPPENING,
      output_class: L13AIOutputClass.MARKET_EXPLANATION,
      mode_payload_class: L13ModePayloadClass.CHAT_ANSWER,
      mode_payload_ref: 'l13.chat.test',
      mode_readiness: L13ModeReadinessClass.MODE_READY,
      required_disclosures_satisfied: true,
      forbidden_omissions_detected: false,
      evidence_refs: pkg.evidence_refs,
      lineage_refs: pkg.lineage_refs,
    });
    assert(
      validateL13OutputModeEnvelope(env, { user_emission: true }).clean,
      'A.5 green envelope clean for user emission',
    );
    const missingLineage = {
      ...env,
      lineage_refs: [] as never,
    };
    assert(
      !validateL13OutputModeEnvelope(missingLineage, {
        user_emission: true,
      }).clean,
      'A.6 missing lineage rejected',
    );
    const missingPayload = {
      ...env,
      mode_payload_ref: '' as never,
    };
    assert(
      !validateL13OutputModeEnvelope(missingPayload, {
        user_emission: true,
      }).clean,
      'A.7 missing mode_payload_ref rejected',
    );
    const env2 = buildEnvelope({
      output_id: output.output_id,
      input_package_id: pkg.input_package_id,
      runtime_run_id: 'l13.run.test',
      answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
      intent_class: L13UserIntentClass.WHATS_HAPPENING,
      output_class: L13AIOutputClass.MARKET_EXPLANATION,
      mode_payload_class: L13ModePayloadClass.CHAT_ANSWER,
      mode_payload_ref: 'l13.chat.test',
      mode_readiness: L13ModeReadinessClass.MODE_READY,
      required_disclosures_satisfied: true,
      forbidden_omissions_detected: false,
      evidence_refs: pkg.evidence_refs,
      lineage_refs: pkg.lineage_refs,
    });
    assert(
      env.replay_hash === env2.replay_hash,
      'A.8 envelope replay hash deterministic',
    );
  }

  // ── BAND B : chat and what-next ──────────────────────────────────
  band('BAND B — chat and what-next');
  {
    const { pkg, output, grounding, expression } = greenContext();
    const chat = buildL13ChatAnswer({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
      intent_class: L13UserIntentClass.WHATS_HAPPENING,
      answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
    });
    assert(chat.direct_answer.length > 0, 'B.1 chat direct_answer present');
    assert(!chat.raw_metrics_included, 'B.2 raw_metrics not included by default');
    assert(
      validateL13ChatAnswer(chat, {
        active_contradiction_required: false,
        active_uncertainty_required:
          pkg.uncertainty_profile.must_disclose_uncertainty,
        active_invalidation_present: false,
        unresolved_trigger_present: false,
      }).clean,
      'B.3 chat validator clean on green',
    );

    // Forbid raw metric dump when user did not request it.
    const tampered = {
      ...chat,
      raw_metrics_included: true,
      raw_metric_refs: ['raw1', 'raw2'] as never,
    };
    assert(
      !validateL13ChatAnswer(tampered, {
        active_contradiction_required: false,
        active_uncertainty_required: false,
        active_invalidation_present: false,
        unresolved_trigger_present: false,
      }).clean,
      'B.4 raw metric dump without request rejected',
    );

    // WHATS_NEXT must include watchpoints + triggers.
    const whatNext = buildL13ChatAnswer({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
      intent_class: L13UserIntentClass.WHATS_NEXT,
      answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
    });
    assert(
      whatNext.scenario_watchpoints.length > 0,
      'B.5 WHATS_NEXT chat includes scenario watchpoints',
    );
    assert(
      whatNext.trigger_lines.length > 0,
      'B.6 WHATS_NEXT chat includes trigger lines',
    );
    assert(
      validateL13ChatAnswer(whatNext, {
        active_contradiction_required: false,
        active_uncertainty_required: true,
        active_invalidation_present: false,
        unresolved_trigger_present: false,
      }).clean,
      'B.7 WHATS_NEXT chat validator clean',
    );

    // Wrong intent for the mode rejected.
    const wrongIntent = {
      ...chat,
      intent_class: L13UserIntentClass.WRITE_ALERT as never,
    };
    assert(
      !validateL13ChatAnswer(wrongIntent, {
        active_contradiction_required: false,
        active_uncertainty_required: false,
        active_invalidation_present: false,
        unresolved_trigger_present: false,
      }).clean,
      'B.8 mode/intent mismatch rejected',
    );

    // SHORT_CHAT shorter target advisory.
    const short = buildL13ChatAnswer({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
      intent_class: L13UserIntentClass.WHATS_HAPPENING,
      answer_mode: L13ProductAnswerMode.SHORT_CHAT,
    });
    assert(
      short.answer_mode === L13ProductAnswerMode.SHORT_CHAT,
      'B.9 SHORT_CHAT mode produces concise payload',
    );
  }

  // ── BAND C : alerts ──────────────────────────────────────────────
  band('BAND C — alerts');
  {
    const { pkg, output, grounding, expression } = greenContext();
    const alert = buildL13Alert({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
      alert_class: L13AlertClass.TRIGGER_ACTIVATED,
      alert_severity: L13AlertSeverity.IMPORTANT,
      changed_subject_ref: 'asset.btc',
      current_state_ref: 'l12.scenario.base.1',
      what_changed: 'Funding cool-off threshold reached.',
      why_it_matters: 'The continuation base case has a confirmed trigger.',
      activated_trigger_refs: ['l12.trigger.1'],
      confidence_change: {
        current_band: 'MEDIUM',
        direction: 'UNCHANGED',
        statement: 'Confidence band unchanged.',
      },
      readiness_change: {
        current_class: 'READY_WITH_DISCLOSURE',
        direction: 'UNCHANGED',
        statement: 'Readiness unchanged.',
      },
    });
    assert(
      alert.what_changed.length > 0 && alert.why_it_matters.length > 0,
      'C.1 alert carries what_changed and why_it_matters',
    );
    assert(
      alert.activated_trigger_refs.length > 0,
      'C.2 trigger refs present on TRIGGER_ACTIVATED alert',
    );
    assert(validateL13AlertOutput(alert).clean, 'C.3 alert validator clean');

    // TRIGGER_ACTIVATED without trigger refs is rejected.
    const noTrigger = {
      ...alert,
      activated_trigger_refs: [] as never,
    };
    assert(
      !validateL13AlertOutput(noTrigger).clean,
      'C.4 TRIGGER_ACTIVATED without trigger refs rejected',
    );

    // INVALIDATION_ACTIVATED without invalidation refs is rejected.
    const invAlert = buildL13Alert({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
      alert_class: L13AlertClass.INVALIDATION_ACTIVATED,
      alert_severity: L13AlertSeverity.CRITICAL,
      changed_subject_ref: 'asset.btc',
      current_state_ref: 'l12.scenario.base.1',
      what_changed: 'Invalidation pressure spiked.',
      why_it_matters: 'The continuation base case is now at risk.',
      activated_invalidation_refs: [] as never,
      confidence_change: {
        current_band: 'LOW',
        direction: 'NARROWED',
        statement: 'Confidence band narrowed.',
      },
      readiness_change: {
        current_class: 'NARROWED',
        direction: 'NARROWED',
        statement: 'Readiness narrowed.',
      },
    });
    assert(
      !validateL13AlertOutput(invAlert).clean,
      'C.5 INVALIDATION_ACTIVATED without invalidation refs rejected',
    );

    // CONFIDENCE_DEGRADED requires NARROWED direction.
    const confAlert = buildL13Alert({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
      alert_class: L13AlertClass.CONFIDENCE_DEGRADED,
      alert_severity: L13AlertSeverity.IMPORTANT,
      changed_subject_ref: 'asset.btc',
      current_state_ref: 'l12.scenario.base.1',
      what_changed: 'Path confidence cap engaged.',
      why_it_matters: 'Clean direction is no longer supported.',
      confidence_change: {
        current_band: 'MEDIUM',
        direction: 'UNCHANGED',
        statement: 'Confidence unchanged.',
      },
      readiness_change: {
        current_class: 'NARROWED',
        direction: 'NARROWED',
        statement: 'Readiness narrowed.',
      },
    });
    assert(
      !validateL13AlertOutput(confAlert).clean,
      'C.6 CONFIDENCE_DEGRADED without NARROWED direction rejected',
    );

    // Empty opinion alert rejected.
    const noWhy = {
      ...alert,
      why_it_matters: '',
    };
    assert(
      !validateL13AlertOutput(noWhy).clean,
      'C.7 alert missing why_it_matters rejected',
    );
  }

  // ── BAND D : structured reports ──────────────────────────────────
  band('BAND D — structured reports');
  {
    const { pkg, output, grounding, expression } = greenContext();
    const report = buildL13StructuredReport({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
    });
    assert(report.executive_summary.present, 'D.1 executive summary present');
    assert(
      report.contradictions_section.present,
      'D.2 contradictions section present',
    );
    assert(
      report.uncertainty_section.present,
      'D.3 uncertainty section present',
    );
    assert(
      report.key_triggers_section.present,
      'D.4 key triggers section present',
    );
    assert(
      report.key_invalidations_section.present,
      'D.5 key invalidations section present',
    );
    assert(
      report.restrictions_section.present,
      'D.6 restrictions section present',
    );
    assert(
      report.appendix_section.aggregated_evidence_refs.length > 0,
      'D.7 appendix carries evidence refs',
    );
    assert(
      validateL13StructuredReportOutput(report).clean,
      'D.8 report validator clean on green',
    );
    const broken = {
      ...report,
      contradictions_section: {
        ...report.contradictions_section,
        present: false,
        summary: '',
      },
    };
    assert(
      !validateL13StructuredReportOutput(broken).clean,
      'D.9 missing contradictions section rejected',
    );
  }

  // ── BAND E : comparisons ─────────────────────────────────────────
  band('BAND E — comparisons');
  {
    const { pkg, output, grounding, expression } = greenContext();
    const asset = buildL13AssetComparison({
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
    assert(
      asset.comparison_dimension_results.length === 10,
      `E.1 all 10 mandatory dimensions covered (got ${asset.comparison_dimension_results.length})`,
    );
    assert(
      validateL13AssetComparisonOutput(asset).clean,
      'E.2 asset comparison validator clean',
    );
    const recBroken = {
      ...asset,
      final_comparison_summary:
        'Asset A is the better buy because of stronger evidence.',
    };
    assert(
      !validateL13AssetComparisonOutput(recBroken).clean,
      'E.3 "better buy" recommendation leak rejected',
    );
    const finalityBroken = {
      ...asset,
      recommendation_language_detected: true as never,
    };
    assert(
      !validateL13AssetComparisonOutput(finalityBroken).clean,
      'E.4 recommendation_language_detected=true rejected',
    );
    const thesis = buildL13ThesisComparison({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
      thesis_left_ref: 'l10.thesis.left',
      thesis_right_ref: 'l10.thesis.right',
      left_thesis_name: 'Accumulation',
      right_thesis_name: 'Distribution',
    });
    assert(
      validateL13ThesisComparisonOutput(thesis).clean,
      'E.5 thesis comparison validator clean',
    );
    const provenBroken = {
      ...thesis,
      stronger_current_explanation_line:
        'The accumulation thesis is proven.',
    };
    assert(
      !validateL13ThesisComparisonOutput(provenBroken).clean,
      'E.6 "thesis is proven" finality leak rejected',
    );
  }

  // ── BAND F : specialization (scenario/score/contradiction) ───────
  band('BAND F — specialization');
  {
    const { pkg, output, grounding, expression } = greenContext();
    const scenario = buildL13ScenarioExplanation({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
    });
    assert(
      scenario.scenario_conditionality_preserved === true,
      'F.1 scenario_conditionality_preserved=true',
    );
    assert(
      scenario.trigger_lines.length > 0 && scenario.invalidation_lines.length > 0,
      'F.2 scenario explanation has trigger + invalidation lines',
    );
    assert(
      validateL13ScenarioExplanationOutput(scenario).clean,
      'F.3 scenario explanation validator clean',
    );

    const score = buildL13ScoreExplanation({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
    });
    assert(
      score.top_positive_driver_lines.length > 0 ||
        score.top_negative_driver_lines.length > 0,
      'F.4 score explanation includes attribution',
    );
    assert(
      validateL13ScoreExplanationOutput(score).clean,
      'F.5 score explanation validator clean',
    );
    const scoreLeak = {
      ...score,
      score_meaning_line:
        'Opportunity score is high, so this is a buy because the score says buy.',
    };
    assert(
      !validateL13ScoreExplanationOutput(scoreLeak).clean,
      'F.6 score-as-recommendation leak rejected',
    );

    const contradiction = buildL13ContradictionExplanation({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
    });
    assert(
      contradiction.supporting_l7_refs.length > 0,
      'F.7 contradiction explanation references L7 refs',
    );
    assert(
      contradiction.affected_l10_hypothesis_refs.length > 0 ||
        contradiction.affected_l12_scenario_refs.length > 0,
      'F.8 contradiction explanation references L10/L12 refs',
    );
    assert(
      validateL13ContradictionExplanationOutput(contradiction).clean,
      'F.9 contradiction explanation validator clean',
    );
    const minimized = {
      ...contradiction,
      contradiction_summary_line:
        'Contradiction is minor and nothing to worry about.',
    };
    assert(
      !validateL13ContradictionExplanationOutput(minimized).clean,
      'F.10 contradiction minimization rejected',
    );
  }

  // ── BAND G : audit, debug isolation, invariants, replay ──────────
  band('BAND G — audit + debug + invariants');
  {
    resetL13OutputModeAuditLog();
    const r = emitL13OutputModeAuditRecord({
      subjectClass: L13OutputModeAuditSubjectClass.OUTPUT_MODE_ENVELOPE,
      subjectRef: 'l13.mode.env.test',
      violationCode:
        L13ModeViolationCode.L13M_DEBUG_MODE_USER_EMITTED,
      message: 'debug mode emitted to user',
    });
    assert(r.audit_id.length > 0, 'G.1 audit record emitted with id');
    assert(
      r.severity === L13ViolationSeverity.CRITICAL,
      'G.2 debug user emission audited CRITICAL',
    );
    assert(r.blocking, 'G.3 debug user emission is blocking');
    assert(
      getL13OutputModeAuditLog().length === 1,
      'G.4 audit log captures record',
    );
    assert(
      getL13OutputModeCriticalViolations().length === 1,
      'G.5 critical violations queryable',
    );
    assert(
      severityForL13ModeCode(
        L13ModeViolationCode.L13M_DEBUG_MODE_USER_EMITTED,
      ) === L13ViolationSeverity.CRITICAL,
      'G.6 severity mapping critical',
    );
    assert(
      isL13ModeBlockingCode(
        L13ModeViolationCode.L13M_DEBUG_MODE_USER_EMITTED,
      ),
      'G.7 debug user-emission code blocking',
    );

    // Debug payload — internal only.
    const { pkg, output, grounding, expression } = greenContext();
    const runtime = await buildGreenL13RuntimeOutput();
    const debug = buildL13DebugExplanation({
      output,
      input_package: pkg,
      grounding_result: grounding,
      expression,
      runtime_run: runtime.run_record,
    });
    assert(
      validateL13DebugExplanationOutput(debug).clean,
      'G.8 debug payload validator clean',
    );
    const debugEnv = buildEnvelope({
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
    assert(
      !validateL13OutputModeEnvelope(debugEnv, {
        user_emission: true,
      }).clean,
      'G.9 debug envelope refused for user emission',
    );
    assert(
      validateL13OutputModeEnvelope(debugEnv, {
        user_emission: false,
      }).clean,
      'G.10 debug envelope allowed for internal emission',
    );

    // Invariants A..J.
    const invs = await runAllL13_7Invariants();
    assert(invs.length === 10, `G.11 ten invariants executed (got ${invs.length})`);
    for (const inv of invs) {
      assert(inv.holds, `G.12 ${inv.id} ${inv.name} (${inv.evidence})`);
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

main().catch(err => {
  console.error('Cert script crashed:', err);
  process.exit(1);
});
