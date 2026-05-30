/**
 * L13.7 — Structured Report Output Validator
 *
 * §13.7.12.5 / §13.7.18 — Reports must include every mandatory
 * section. Sections may say "no material X under governed refs"
 * but may not be absent for readability.
 */

import {
  L13ReportSectionClass,
  type L13ReportSection,
  type L13StructuredReportOutput,
} from '../contracts/structured-report-output';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

function requireSection(
  section: L13ReportSection,
  expectedClass: L13ReportSectionClass,
  code: L13ModeViolationCode,
  issues: L13ModeIssue[],
): void {
  if (
    !section ||
    section.section_class !== expectedClass ||
    !section.present
  ) {
    issues.push({
      code,
      severity: SEV.CRITICAL,
      message: `mandatory section ${expectedClass} missing or empty`,
    });
  }
}

export function validateL13StructuredReportOutput(
  report: L13StructuredReportOutput,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!report.report_output_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'report_output_id missing',
    });
  }
  if (!report.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (report.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }

  requireSection(
    report.executive_summary,
    L13ReportSectionClass.EXECUTIVE_SUMMARY,
    L13ModeViolationCode.L13M_REPORT_EXECUTIVE_SUMMARY_MISSING,
    issues,
  );
  requireSection(
    report.contradictions_section,
    L13ReportSectionClass.CONTRADICTIONS,
    L13ModeViolationCode.L13M_REPORT_CONTRADICTION_SECTION_MISSING,
    issues,
  );
  requireSection(
    report.uncertainty_section,
    L13ReportSectionClass.UNCERTAINTY,
    L13ModeViolationCode.L13M_REPORT_UNCERTAINTY_SECTION_MISSING,
    issues,
  );
  requireSection(
    report.key_triggers_section,
    L13ReportSectionClass.KEY_TRIGGERS,
    L13ModeViolationCode.L13M_REPORT_TRIGGER_SECTION_MISSING,
    issues,
  );
  requireSection(
    report.key_invalidations_section,
    L13ReportSectionClass.KEY_INVALIDATIONS,
    L13ModeViolationCode.L13M_REPORT_INVALIDATION_SECTION_MISSING,
    issues,
  );
  requireSection(
    report.restrictions_section,
    L13ReportSectionClass.RESTRICTIONS,
    L13ModeViolationCode.L13M_REPORT_RESTRICTION_SECTION_MISSING,
    issues,
  );

  if (
    !report.appendix_section ||
    !report.appendix_section.present ||
    (report.appendix_section.aggregated_evidence_refs.length === 0 &&
      report.appendix_section.aggregated_lineage_refs.length === 0)
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_REPORT_APPENDIX_OR_EVIDENCE_MISSING,
      severity: SEV.CRITICAL,
      message: 'appendix section missing or lacks evidence/lineage refs',
    });
  }

  // Regime/Sequence/Hypothesis/Scores/Scenarios — required as
  // body sections.
  const REQUIRED_BODY: readonly [L13ReportSection, L13ReportSectionClass][] = [
    [report.evidence_summary, L13ReportSectionClass.EVIDENCE_SUMMARY],
    [report.regime_section, L13ReportSectionClass.REGIME],
    [report.sequence_section, L13ReportSectionClass.SEQUENCE],
    [report.hypothesis_section, L13ReportSectionClass.HYPOTHESES],
    [report.scores_section, L13ReportSectionClass.SCORES],
    [report.scenarios_section, L13ReportSectionClass.SCENARIOS],
  ];
  for (const [section, expected] of REQUIRED_BODY) {
    if (
      !section ||
      section.section_class !== expected ||
      !section.present
    ) {
      issues.push({
        code: L13ModeViolationCode.L13M_MODE_REQUIRED_SECTION_MISSING,
        severity: SEV.CRITICAL,
        message: `report section ${expected} missing or empty`,
      });
    }
  }

  return l13ModeResult(issues);
}
