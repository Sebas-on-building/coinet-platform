/**
 * L13.8 — Response Shaper
 *
 * §13.8.23 — Converts a legal L13.7 product payload into a
 * display-ready response shape aligned with language, persona,
 * verbosity, product mode, and required disclosures. The shaper
 * is intentionally minimal: it performs only the non-semantic
 * transformations §13.8.23.1 permits. Semantic mutation is the
 * responsibility of the L13.6 governed rewrite flow.
 *
 * The shaper produces one of the canonical display payload
 * classes (chat text, alert text, report tree, comparison tree,
 * debug tree).
 */

import type { L13ChatAnswerOutput } from '../contracts/chat-answer-output';
import type { L13AlertOutput } from '../contracts/alert-output';
import type { L13StructuredReportOutput } from '../contracts/structured-report-output';
import type { L13AssetComparisonOutput } from '../contracts/asset-comparison-output';
import type { L13ThesisComparisonOutput } from '../contracts/thesis-comparison-output';
import type { L13ScenarioExplanationOutput } from '../contracts/scenario-explanation-output';
import type { L13ScoreExplanationOutput } from '../contracts/score-explanation-output';
import type { L13ContradictionExplanationOutput } from '../contracts/contradiction-explanation-output';
import type { L13DebugExplanationOutput } from '../contracts/debug-explanation-output';
import {
  L13StyledDisplayPayloadClass,
} from '../contracts/styled-response-envelope';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.style.v1';

/**
 * Each shaper invocation returns a `display_payload` (string for
 * chat/alert; render-tree shape for report/comparison/debug), a
 * deterministic payload ref id, and the corpus text used by the
 * integrity engine + multilingual safety scanner.
 */
export interface L13ShapedResponse {
  readonly display_payload_class: L13StyledDisplayPayloadClass;
  readonly display_payload_ref: string;
  readonly display_payload_text: string;
  /** Render-tree object (when applicable); chat/alert leave undefined. */
  readonly display_payload_object?: unknown;
}

function joinNonEmpty(lines: readonly string[]): string {
  return lines.filter(l => l && l.trim().length > 0).join(' ');
}

/**
 * §13.8.23 — Chat shaper. Non-semantic; trims whitespace,
 * collapses duplicate sentences, and joins supporting
 * explanation into a single paragraph. Required anchor lines
 * (uncertainty / contradiction / trigger / invalidation) are
 * appended verbatim to preserve disclosure.
 */
export function shapeL13ChatResponse(
  chat: L13ChatAnswerOutput,
): L13ShapedResponse {
  const parts: string[] = [chat.direct_answer.trim()];
  if (chat.supporting_explanation.length > 0) {
    parts.push(joinNonEmpty(chat.supporting_explanation));
  }
  if (chat.scenario_watchpoints.length > 0) {
    parts.push(joinNonEmpty(chat.scenario_watchpoints));
  }
  if (chat.trigger_lines.length > 0) {
    parts.push(joinNonEmpty(chat.trigger_lines));
  }
  if (chat.invalidation_lines.length > 0) {
    parts.push(joinNonEmpty(chat.invalidation_lines));
  }
  if (chat.contradiction_lines.length > 0) {
    parts.push(joinNonEmpty(chat.contradiction_lines));
  }
  if (chat.uncertainty_lines.length > 0) {
    parts.push(joinNonEmpty(chat.uncertainty_lines));
  }
  const text = parts
    .filter(p => p && p.trim().length > 0)
    .join(' ');
  // Collapse repeated whitespace.
  const normalized = text.replace(/\s+/g, ' ').trim();
  const ref = `l13.disp.chat.${fnv1a(
    [chat.chat_answer_id, normalized, POLICY_V].join('|'),
  )}`;
  return {
    display_payload_class: L13StyledDisplayPayloadClass.CHAT_TEXT,
    display_payload_ref: ref,
    display_payload_text: normalized,
  };
}

/**
 * §13.8.23 — Alert shaper. Compact single paragraph; preserves
 * what changed, why it matters, watch-next lines, restriction +
 * uncertainty disclosure.
 */
export function shapeL13AlertResponse(
  alert: L13AlertOutput,
): L13ShapedResponse {
  const parts: string[] = [
    alert.what_changed.trim(),
    alert.why_it_matters.trim(),
  ];
  if (alert.watch_next_lines.length > 0) {
    parts.push(joinNonEmpty(alert.watch_next_lines));
  }
  if (alert.uncertainty_disclosure_lines.length > 0) {
    parts.push(joinNonEmpty(alert.uncertainty_disclosure_lines));
  }
  if (alert.restriction_disclosure_lines.length > 0) {
    parts.push(joinNonEmpty(alert.restriction_disclosure_lines));
  }
  if (
    alert.confidence_change_profile.direction !== 'UNCHANGED' &&
    alert.confidence_change_profile.statement
  ) {
    parts.push(alert.confidence_change_profile.statement);
  }
  const text = parts.filter(p => p).join(' ').replace(/\s+/g, ' ').trim();
  const ref = `l13.disp.alert.${fnv1a(
    [alert.alert_output_id, text, POLICY_V].join('|'),
  )}`;
  return {
    display_payload_class: L13StyledDisplayPayloadClass.ALERT_TEXT,
    display_payload_ref: ref,
    display_payload_text: text,
  };
}

/**
 * §13.8.23 — Structured report shaper. Returns a render-tree
 * shape (each section becomes a node) and a concatenated text
 * corpus used by the integrity engine + multilingual scanner.
 */
export function shapeL13ReportResponse(
  report: L13StructuredReportOutput,
): L13ShapedResponse {
  const tree: {
    readonly title: string;
    readonly sections: readonly {
      readonly title: string;
      readonly summary: string;
      readonly bullet_points: readonly string[];
    }[];
  } = {
    title: report.report_title,
    sections: [
      report.executive_summary,
      report.evidence_summary,
      report.regime_section,
      report.sequence_section,
      report.hypothesis_section,
      report.scores_section,
      report.scenarios_section,
      report.contradictions_section,
      report.uncertainty_section,
      report.key_triggers_section,
      report.key_invalidations_section,
      report.restrictions_section,
    ].map(s => ({
      title: s.title,
      summary: s.summary,
      bullet_points: s.bullet_points,
    })),
  };
  const corpus = [
    report.report_title,
    ...tree.sections.flatMap(s => [s.summary, ...s.bullet_points]),
  ]
    .filter(s => s && s.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const ref = `l13.disp.report.${fnv1a(
    [report.report_output_id, corpus, POLICY_V].join('|'),
  )}`;
  return {
    display_payload_class:
      L13StyledDisplayPayloadClass.REPORT_RENDER_TREE,
    display_payload_ref: ref,
    display_payload_text: corpus,
    display_payload_object: tree,
  };
}

/**
 * §13.8.23 — Asset comparison shaper. Render-tree with one node
 * per mandatory dimension. Asymmetry disclosures are appended as
 * dedicated nodes so the renderer surfaces them.
 */
export function shapeL13AssetComparisonResponse(
  cmp: L13AssetComparisonOutput,
): L13ShapedResponse {
  const tree = {
    subjects: cmp.comparison_subject_refs,
    dimensions: cmp.comparison_dimension_results.map(d => ({
      dimension: d.dimension,
      relation: d.relation,
      statement: d.comparison_statement,
      asymmetry: d.asymmetry_flag,
      restriction: d.restriction_flag,
    })),
    asymmetry_disclosures: cmp.asymmetry_disclosures,
    summary: cmp.final_comparison_summary,
  };
  const corpus = [
    cmp.scenario_clarity_comparison,
    cmp.opportunity_quality_comparison,
    cmp.risk_comparison,
    cmp.timing_comparison,
    cmp.hypothesis_strength_comparison,
    cmp.confidence_comparison,
    cmp.invalidation_pressure_comparison,
    cmp.missing_data_quality_comparison,
    cmp.drift_comparison,
    cmp.restriction_comparison,
    cmp.final_comparison_summary,
    ...cmp.strongest_relative_advantage_lines,
    ...cmp.strongest_relative_weakness_lines,
    ...cmp.asymmetry_disclosures.map(a => a.statement),
  ]
    .filter(s => s)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const ref = `l13.disp.assetcmp.${fnv1a(
    [cmp.asset_comparison_id, corpus, POLICY_V].join('|'),
  )}`;
  return {
    display_payload_class:
      L13StyledDisplayPayloadClass.COMPARISON_RENDER_TREE,
    display_payload_ref: ref,
    display_payload_text: corpus,
    display_payload_object: tree,
  };
}

/**
 * §13.8.23 — Thesis comparison shaper. Similar shape to the
 * asset comparison but anchored on the two thesis refs.
 */
export function shapeL13ThesisComparisonResponse(
  cmp: L13ThesisComparisonOutput,
): L13ShapedResponse {
  const tree = {
    left: cmp.left_thesis_name,
    right: cmp.right_thesis_name,
    support: cmp.support_comparison,
    contradiction: cmp.contradiction_comparison,
    confirmation_gap: cmp.confirmation_gap_comparison,
    invalidation_risk: cmp.invalidation_risk_comparison,
    scenario_implication: cmp.scenario_implication_comparison,
    shift_condition: cmp.shift_condition_comparison,
    stronger_current_explanation_line:
      cmp.stronger_current_explanation_line,
    preserved_alternative_line: cmp.preserved_alternative_line,
  };
  const corpus = [
    cmp.support_comparison,
    cmp.contradiction_comparison,
    cmp.confirmation_gap_comparison,
    cmp.invalidation_risk_comparison,
    cmp.scenario_implication_comparison,
    cmp.shift_condition_comparison,
    cmp.stronger_current_explanation_line ?? '',
    cmp.preserved_alternative_line ?? '',
  ]
    .filter(s => s && s.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const ref = `l13.disp.thesiscmp.${fnv1a(
    [cmp.thesis_comparison_id, corpus, POLICY_V].join('|'),
  )}`;
  return {
    display_payload_class:
      L13StyledDisplayPayloadClass.COMPARISON_RENDER_TREE,
    display_payload_ref: ref,
    display_payload_text: corpus,
    display_payload_object: tree,
  };
}

/**
 * §13.8.23 — Scenario explanation shaper.
 */
export function shapeL13ScenarioResponse(
  scn: L13ScenarioExplanationOutput,
): L13ShapedResponse {
  const tree = {
    base_case: scn.base_case_line,
    alternatives: scn.alternative_path_lines,
    bullish: scn.bullish_path_lines,
    bearish: scn.bearish_failure_path_lines,
    neutral: scn.neutral_or_chop_path_lines,
    triggers: scn.trigger_lines,
    invalidations: scn.invalidation_lines,
    path_confidence: scn.path_confidence_line,
    confidence_caps: scn.confidence_cap_lines,
    scenario_spread: scn.scenario_spread_line,
    readiness: scn.readiness_line,
    restriction: scn.restriction_line,
  };
  const corpus = [
    scn.base_case_line,
    ...scn.alternative_path_lines,
    ...scn.bullish_path_lines,
    ...scn.bearish_failure_path_lines,
    ...scn.neutral_or_chop_path_lines,
    ...scn.trigger_lines,
    ...scn.invalidation_lines,
    scn.path_confidence_line,
    ...scn.confidence_cap_lines,
    scn.scenario_spread_line,
    scn.readiness_line,
    scn.restriction_line,
  ]
    .filter(s => s && s.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const ref = `l13.disp.scn.${fnv1a(
    [scn.scenario_explanation_id, corpus, POLICY_V].join('|'),
  )}`;
  return {
    display_payload_class:
      L13StyledDisplayPayloadClass.COMPARISON_RENDER_TREE,
    display_payload_ref: ref,
    display_payload_text: corpus,
    display_payload_object: tree,
  };
}

/**
 * §13.8.23 — Score explanation shaper.
 */
export function shapeL13ScoreResponse(
  score: L13ScoreExplanationOutput,
): L13ShapedResponse {
  const corpus = [
    score.score_meaning_line,
    score.score_interpretation_line,
    ...score.top_positive_driver_lines,
    ...score.top_negative_driver_lines,
    ...score.cap_penalty_lines,
    ...score.missing_data_lines,
    ...score.drift_lines,
    score.restriction_line,
  ]
    .filter(s => s)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const ref = `l13.disp.score.${fnv1a(
    [score.score_explanation_id, corpus, POLICY_V].join('|'),
  )}`;
  return {
    display_payload_class: L13StyledDisplayPayloadClass.CHAT_TEXT,
    display_payload_ref: ref,
    display_payload_text: corpus,
  };
}

/**
 * §13.8.23 — Contradiction explanation shaper.
 */
export function shapeL13ContradictionResponse(
  con: L13ContradictionExplanationOutput,
): L13ShapedResponse {
  const corpus = [
    con.contradiction_summary_line,
    ...con.what_it_weakens_lines,
    ...con.confidence_impact_lines,
    ...con.restriction_impact_lines,
    ...con.possible_resolution_lines,
    ...con.escalation_lines,
  ]
    .filter(s => s)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const ref = `l13.disp.con.${fnv1a(
    [con.contradiction_explanation_id, corpus, POLICY_V].join('|'),
  )}`;
  return {
    display_payload_class: L13StyledDisplayPayloadClass.CHAT_TEXT,
    display_payload_ref: ref,
    display_payload_text: corpus,
  };
}

/**
 * §13.8.23 — Debug explanation shaper. Returns a debug render-tree
 * marked internal-only via the upstream debug envelope.
 */
export function shapeL13DebugResponse(
  debug: L13DebugExplanationOutput,
): L13ShapedResponse {
  const tree = {
    narrative: debug.developer_narrative,
    refs: {
      intent: debug.intent_classification_ref,
      scope: debug.scope_resolution_ref,
      read_plan: debug.read_plan_ref,
      prompt_template: debug.prompt_template_ref,
      prompt_assembly: debug.prompt_assembly_ref,
      model_gateway_request: debug.model_gateway_request_ref,
      model_gateway_response: debug.model_gateway_response_ref,
      grounding: debug.grounding_result_ref,
      expression: debug.expression_governance_envelope_ref,
      final_gate: debug.final_gate_result_ref,
    },
    blocked_claim_refs: debug.blocked_claim_refs,
    critical_violation_refs: debug.critical_violation_refs,
  };
  const corpus = [
    debug.developer_narrative,
    ...debug.blocked_claim_refs,
    ...debug.critical_violation_refs,
  ].join(' ');
  const ref = `l13.disp.debug.${fnv1a(
    [debug.debug_explanation_id, corpus, POLICY_V].join('|'),
  )}`;
  return {
    display_payload_class:
      L13StyledDisplayPayloadClass.DEBUG_RENDER_TREE,
    display_payload_ref: ref,
    display_payload_text: corpus,
    display_payload_object: tree,
  };
}
