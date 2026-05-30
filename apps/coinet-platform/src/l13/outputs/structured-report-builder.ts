/**
 * L13.7 — Structured Report Builder
 *
 * §13.7.12 — Builds an `L13StructuredReportOutput`. Every mandatory
 * section is materialised from the L13.2 input package + L13.3
 * output + L13.4 grounding + L13.5 expression governance; missing
 * upstream context surfaces as a present-but-disclosure section
 * ("no material X under governed refs"), never silently dropped.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import {
  L13ReportReadinessClass,
  L13ReportSectionClass,
  type L13ReportAppendixSection,
  type L13ReportSection,
  type L13StructuredReportOutput,
} from '../contracts/structured-report-output';
import { L13ExpressionReadinessClass } from '../contracts/expression-governance-envelope';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13StructuredReportBuilderInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly expression: L13ExpressionGovernanceResult;
  readonly report_title?: string;
  readonly report_scope_ref?: string;
}

function mkSection(
  id: string,
  cls: L13ReportSectionClass,
  title: string,
  summary: string,
  bullets: readonly string[],
  required: boolean,
  evidence_refs: readonly string[],
  lineage_refs: readonly string[],
): L13ReportSection {
  return {
    section_id: id,
    section_class: cls,
    title,
    summary,
    bullet_points: bullets,
    required,
    present: summary.trim().length > 0 || bullets.length > 0,
    evidence_refs,
    lineage_refs,
    policy_version: POLICY_V,
  };
}

function deriveReadiness(
  expression: L13ExpressionGovernanceResult,
  hasIncomplete: boolean,
): L13ReportReadinessClass {
  const r = expression.envelope.final_expression_readiness;
  if (r === L13ExpressionReadinessClass.EXPRESSION_BLOCKED) {
    return L13ReportReadinessClass.REPORT_BLOCKED;
  }
  if (r === L13ExpressionReadinessClass.EXPRESSION_REFUSAL_REQUIRED) {
    return L13ReportReadinessClass.REPORT_REFUSAL_REQUIRED;
  }
  if (r === L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED) {
    return L13ReportReadinessClass.REPORT_INCOMPLETE;
  }
  if (hasIncomplete) {
    return L13ReportReadinessClass.REPORT_INCOMPLETE;
  }
  if (
    r ===
    L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_UNCERTAINTY
  ) {
    return L13ReportReadinessClass.REPORT_NARROWED_BY_UNCERTAINTY;
  }
  if (
    r ===
    L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_RESTRICTION
  ) {
    return L13ReportReadinessClass.REPORT_NARROWED_BY_RESTRICTION;
  }
  if (
    r === L13ExpressionReadinessClass.EXPRESSION_CLEAN_WITH_DISCLOSURE
  ) {
    return L13ReportReadinessClass.REPORT_READY_WITH_DISCLOSURE;
  }
  return L13ReportReadinessClass.REPORT_READY;
}

export function buildL13StructuredReport(
  args: L13StructuredReportBuilderInput,
): L13StructuredReportOutput {
  const { output, input_package } = args;
  const evidence_refs = input_package.evidence_refs;
  const lineage_refs =
    input_package.lineage_refs.length > 0
      ? input_package.lineage_refs
      : ['l13.outputs.lineage'];

  const exec = mkSection(
    'rs.exec',
    L13ReportSectionClass.EXECUTIVE_SUMMARY,
    'Executive Summary',
    output.summary,
    [output.headline],
    true,
    evidence_refs.slice(0, 3),
    lineage_refs,
  );
  const evidence = mkSection(
    'rs.ev',
    L13ReportSectionClass.EVIDENCE_SUMMARY,
    'Evidence Summary',
    'Positive and contradictive evidence aggregated under governed refs.',
    [
      `Positive evidence refs: ${input_package.strongest_positive_evidence
        .map(e => e.evidence_ref)
        .slice(0, 5)
        .join(', ')}`,
      `Contradictive evidence refs: ${input_package.strongest_contradictions
        .map(e => e.evidence_ref)
        .slice(0, 5)
        .join(', ')}`,
    ],
    true,
    evidence_refs,
    lineage_refs,
  );
  const regime = mkSection(
    'rs.regime',
    L13ReportSectionClass.REGIME,
    'Regime',
    'Regime posture under governed L8 refs.',
    [input_package.regime_summary.regime_summary_id],
    true,
    evidence_refs.slice(0, 2),
    lineage_refs,
  );
  const sequence = mkSection(
    'rs.seq',
    L13ReportSectionClass.SEQUENCE,
    'Sequence',
    'Sequence posture under governed L9 refs.',
    [input_package.sequence_summary.sequence_summary_id],
    true,
    evidence_refs.slice(0, 2),
    lineage_refs,
  );
  const hypothesis = mkSection(
    'rs.hyp',
    L13ReportSectionClass.HYPOTHESES,
    'Hypotheses',
    'Hypothesis ranking and spread under governed L10 refs.',
    [input_package.hypothesis_summary.hypothesis_summary_id],
    true,
    evidence_refs.slice(0, 3),
    lineage_refs,
  );
  const scores = mkSection(
    'rs.score',
    L13ReportSectionClass.SCORES,
    'Scores',
    'Score posture and attribution under governed L11 refs.',
    [input_package.score_summary.score_summary_id],
    true,
    evidence_refs.slice(0, 3),
    lineage_refs,
  );
  const scenarios = mkSection(
    'rs.scn',
    L13ReportSectionClass.SCENARIOS,
    'Scenarios',
    output.scenario_section?.present
      ? output.scenario_section.content
      : 'No scenario context available under governed refs.',
    output.scenario_section?.present
      ? [output.scenario_section.content]
      : [],
    true,
    evidence_refs.slice(0, 3),
    lineage_refs,
  );
  const contradictionPresent =
    output.contradiction_section?.present ||
    input_package.uncertainty_profile.active_contradiction_present;
  const contradictions = mkSection(
    'rs.con',
    L13ReportSectionClass.CONTRADICTIONS,
    'Contradictions',
    contradictionPresent
      ? output.contradiction_section?.content ??
        'Active contradiction present under governed L7 refs.'
      : 'No material contradiction is currently active under governed refs.',
    [],
    true,
    input_package.contradiction_summary.active_contradiction_refs,
    lineage_refs,
  );
  const uncertainty = mkSection(
    'rs.unc',
    L13ReportSectionClass.UNCERTAINTY,
    'Uncertainty',
    output.uncertainty_section?.content ??
      'Uncertainty profile derived from governed L13.2 refs.',
    [],
    true,
    evidence_refs.slice(0, 3),
    lineage_refs,
  );
  const triggersPresent =
    output.trigger_invalidation_section?.present;
  const triggers = mkSection(
    'rs.trig',
    L13ReportSectionClass.KEY_TRIGGERS,
    'Key Triggers',
    triggersPresent
      ? output.trigger_invalidation_section.content
      : 'No active triggers under governed refs.',
    [],
    true,
    evidence_refs.slice(0, 3),
    lineage_refs,
  );
  const invalidations = mkSection(
    'rs.inv',
    L13ReportSectionClass.KEY_INVALIDATIONS,
    'Key Invalidations',
    triggersPresent
      ? output.trigger_invalidation_section.content
      : 'No active invalidations under governed refs.',
    [],
    true,
    evidence_refs.slice(0, 3),
    lineage_refs,
  );
  const restrictions = mkSection(
    'rs.restr',
    L13ReportSectionClass.RESTRICTIONS,
    'Restrictions',
    output.restriction_disclosure.restriction_statement,
    output.restriction_disclosure.applied_restriction_codes,
    true,
    evidence_refs.slice(0, 3),
    lineage_refs,
  );
  const appendix: L13ReportAppendixSection = {
    section_id: 'rs.app',
    section_class: L13ReportSectionClass.APPENDIX,
    title: 'Appendix',
    summary: 'Evidence and lineage refs supporting every section.',
    bullet_points: [],
    required: true,
    present: true,
    evidence_refs,
    lineage_refs,
    policy_version: POLICY_V,
    aggregated_evidence_refs: evidence_refs,
    aggregated_lineage_refs: lineage_refs,
    hypothesis_ref_index: [
      input_package.hypothesis_summary.hypothesis_summary_id,
    ],
    scenario_ref_index: ['l12.scenario.base.1'],
    score_ref_index: [
      input_package.score_summary.score_summary_id,
    ],
    contradiction_ref_index:
      input_package.contradiction_summary.active_contradiction_refs,
  };

  const sections: readonly L13ReportSection[] = [
    exec,
    evidence,
    regime,
    sequence,
    hypothesis,
    scores,
    scenarios,
    contradictions,
    uncertainty,
    triggers,
    invalidations,
    restrictions,
    appendix,
  ];
  const hasIncomplete = sections.some(s => s.required && !s.present);

  const readiness = deriveReadiness(args.expression, hasIncomplete);

  const replayHash = fnv1a(
    [
      output.output_id,
      input_package.input_package_id,
      args.grounding_result.grounding_result_id,
      args.expression.envelope.expression_governance_id,
      args.report_title ?? output.headline,
      args.report_scope_ref ?? output.scope_id,
      ...sections.map(s => s.section_id),
      readiness,
      POLICY_V,
    ].join('|'),
  );

  return {
    report_output_id: `l13.report.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    report_title: args.report_title ?? output.headline,
    report_scope_ref: args.report_scope_ref ?? output.scope_id,
    report_as_of: output.as_of,
    executive_summary: exec,
    evidence_summary: evidence,
    regime_section: regime,
    sequence_section: sequence,
    hypothesis_section: hypothesis,
    scores_section: scores,
    scenarios_section: scenarios,
    contradictions_section: contradictions,
    uncertainty_section: uncertainty,
    key_triggers_section: triggers,
    key_invalidations_section: invalidations,
    restrictions_section: restrictions,
    appendix_section: appendix,
    report_readiness: readiness,
    evidence_refs,
    lineage_refs,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
