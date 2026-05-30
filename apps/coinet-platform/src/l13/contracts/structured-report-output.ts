/**
 * L13.7 — Structured Report Output Contract
 *
 * §13.7.12 — Institutional-format surface. A typed report object
 * with mandatory sections. Reports may not omit contradiction,
 * uncertainty, triggers, invalidations, restrictions, or evidence
 * refs for readability.
 */

/**
 * §13.7.12.3 — Report section class taxonomy.
 */
export enum L13ReportSectionClass {
  EXECUTIVE_SUMMARY = 'EXECUTIVE_SUMMARY',
  EVIDENCE_SUMMARY = 'EVIDENCE_SUMMARY',
  REGIME = 'REGIME',
  SEQUENCE = 'SEQUENCE',
  HYPOTHESES = 'HYPOTHESES',
  SCORES = 'SCORES',
  SCENARIOS = 'SCENARIOS',
  CONTRADICTIONS = 'CONTRADICTIONS',
  UNCERTAINTY = 'UNCERTAINTY',
  KEY_TRIGGERS = 'KEY_TRIGGERS',
  KEY_INVALIDATIONS = 'KEY_INVALIDATIONS',
  RESTRICTIONS = 'RESTRICTIONS',
  APPENDIX = 'APPENDIX',
}

export const ALL_L13_REPORT_SECTION_CLASSES:
  readonly L13ReportSectionClass[] =
  Object.values(L13ReportSectionClass);

export interface L13ReportSection {
  readonly section_id: string;
  readonly section_class: L13ReportSectionClass;
  readonly title: string;
  readonly summary: string;
  readonly bullet_points: readonly string[];
  readonly required: boolean;
  readonly present: boolean;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

/**
 * §13.7.12.2 — Appendix section variant. Carries explicit
 * evidence refs and lineage references for the report body.
 */
export interface L13ReportAppendixSection
  extends L13ReportSection {
  readonly aggregated_evidence_refs: readonly string[];
  readonly aggregated_lineage_refs: readonly string[];
  readonly hypothesis_ref_index: readonly string[];
  readonly scenario_ref_index: readonly string[];
  readonly score_ref_index: readonly string[];
  readonly contradiction_ref_index: readonly string[];
}

export enum L13ReportReadinessClass {
  REPORT_READY = 'REPORT_READY',
  REPORT_READY_WITH_DISCLOSURE = 'REPORT_READY_WITH_DISCLOSURE',
  REPORT_NARROWED_BY_UNCERTAINTY = 'REPORT_NARROWED_BY_UNCERTAINTY',
  REPORT_NARROWED_BY_RESTRICTION = 'REPORT_NARROWED_BY_RESTRICTION',
  REPORT_INCOMPLETE = 'REPORT_INCOMPLETE',
  REPORT_REFUSAL_REQUIRED = 'REPORT_REFUSAL_REQUIRED',
  REPORT_BLOCKED = 'REPORT_BLOCKED',
}

export const ALL_L13_REPORT_READINESS_CLASSES:
  readonly L13ReportReadinessClass[] =
  Object.values(L13ReportReadinessClass);

export interface L13StructuredReportOutput {
  readonly report_output_id: string;
  readonly output_id: string;
  readonly input_package_id: string;

  readonly report_title: string;
  readonly report_scope_ref: string;
  readonly report_as_of: string;

  readonly executive_summary: L13ReportSection;
  readonly evidence_summary: L13ReportSection;
  readonly regime_section: L13ReportSection;
  readonly sequence_section: L13ReportSection;
  readonly hypothesis_section: L13ReportSection;
  readonly scores_section: L13ReportSection;
  readonly scenarios_section: L13ReportSection;
  readonly contradictions_section: L13ReportSection;
  readonly uncertainty_section: L13ReportSection;
  readonly key_triggers_section: L13ReportSection;
  readonly key_invalidations_section: L13ReportSection;
  readonly restrictions_section: L13ReportSection;
  readonly appendix_section: L13ReportAppendixSection;

  readonly report_readiness: L13ReportReadinessClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
