/**
 * L11.7 — Drift, Threshold, and Formula-change Governance
 * Invariants (§11.7.21)
 *
 * Eight machine-enforced invariants that prove the drift-and-
 * governance sublayer is production-ready. Each invariant
 * returns `{ ok, violations, evidence }`.
 *
 *   INV-11.7-A — drift report completeness law
 *   INV-11.7-B — severity / action consistency law
 *   INV-11.7-C — threshold versioning law
 *   INV-11.7-D — threshold change classification law
 *   INV-11.7-E — formula change classification law
 *   INV-11.7-F — semantic preservation law
 *   INV-11.7-G — sample confidence law
 *   INV-11.7-H — non-judgment law
 */

import {
  L11ScoreDriftReport,
  L11DriftSeverity,
  L11DriftRecommendedAction,
  L11ThresholdPolicy,
  L11ThresholdPolicyStatus,
  L11FormulaChangeAssessment,
  L11FormulaChangeClassification,
  L11FormulaChangeSurface,
  L11ThresholdChangeClassification,
  isL11DriftSeverityAtLeast,
  isL11DriftActionLegalForSeverity,
  isL11DriftActionLegalForType,
  isL11DriftActionPassive,
  isL11DriftStatisticConfidenceSufficient,
  L11DriftStatisticConfidenceClass,
  isL11ThresholdPolicyStructurallyValid,
  checkL11ThresholdPolicyIntegrity,
  isL11ThresholdPolicyCoveringFullRange,
  extractL11ThresholdPolicyReplayMaterial,
  canonicalThresholdPolicyReplayHash,
  extractL11DriftReportReplayMaterial,
  canonicalDriftReportReplayHash,
  extractL11FormulaChangeReplayMaterial,
  canonicalFormulaChangeReplayHash,
  l11FormulaChangeRequiresMigration,
  l11FormulaChangeRequiresRecalibration,
  isL11FormulaChangeProhibited,
  L11_PROHIBITED_SILENT_SURFACES,
} from '../contracts';
import {
  L11DriftIssue,
  L11DriftViolationCode,
  makeL11DriftIssue,
} from '../validation/l11-drift-violation-codes';

export interface L11_7InvariantResult {
  readonly ok: boolean;
  readonly violations: readonly L11DriftIssue[];
  readonly evidence: string;
}

function ok(evidence: string): L11_7InvariantResult {
  return { ok: true, violations: [], evidence };
}
function fail(
  violations: readonly L11DriftIssue[],
  evidence: string,
): L11_7InvariantResult {
  return { ok: false, violations, evidence };
}

// ─────────────────────────────────────────────────────────────────
// INV-11.7-A — drift report completeness law
// ─────────────────────────────────────────────────────────────────

export function invariantA_driftReportCompleteness(
  reports: readonly L11ScoreDriftReport[],
): L11_7InvariantResult {
  const issues: L11DriftIssue[] = [];
  for (const r of reports) {
    if (!r.score_family) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_DRIFT_SCORE_FAMILY_MISSING,
        'score_family missing', { drift_report_id: r.drift_report_id }));
    }
    if (!r.formula_id || !r.formula_version) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_DRIFT_FORMULA_VERSION_MISSING,
        'formula identity missing', { drift_report_id: r.drift_report_id }));
    }
    if (!r.drift_type) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_DRIFT_TYPE_MISSING,
        'drift_type missing', { drift_report_id: r.drift_report_id }));
    }
    if (!r.drift_severity) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_DRIFT_SEVERITY_MISSING,
        'drift_severity missing', { drift_report_id: r.drift_report_id }));
    }
    if (!r.observation_window_start || !r.observation_window_end) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_OBSERVATION_WINDOW_MISSING,
        'observation window missing', { drift_report_id: r.drift_report_id }));
    }
    if (!r.baseline_window_start || !r.baseline_window_end) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_BASELINE_WINDOW_MISSING,
        'baseline window missing', { drift_report_id: r.drift_report_id }));
    }
    if (!r.observed_change) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_OBSERVED_CHANGE_MISSING,
        'observed_change missing', { drift_report_id: r.drift_report_id }));
    }
    if (!r.expected_baseline) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_EXPECTED_BASELINE_MISSING,
        'expected_baseline missing', { drift_report_id: r.drift_report_id }));
    }
    if (!r.recommended_action) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_RECOMMENDED_ACTION_MISSING,
        'recommended_action missing', { drift_report_id: r.drift_report_id }));
    }
    if (!Array.isArray(r.lineage_refs) || r.lineage_refs.length === 0) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_DRIFT_LINEAGE_MISSING,
        'lineage_refs missing or empty',
        { drift_report_id: r.drift_report_id }));
    }
    if (!r.replay_hash) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_REPLAY_HASH_MISSING,
        'replay_hash missing', { drift_report_id: r.drift_report_id }));
    }
  }
  return issues.length === 0
    ? ok(`INV-11.7-A: ${reports.length} drift report(s) complete.`)
    : fail(issues, `INV-11.7-A: ${issues.length} completeness violations.`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.7-B — severity / action consistency law
// ─────────────────────────────────────────────────────────────────

export function invariantB_severityActionConsistency(
  reports: readonly L11ScoreDriftReport[],
): L11_7InvariantResult {
  const issues: L11DriftIssue[] = [];
  for (const r of reports) {
    if (!r.drift_severity || !r.recommended_action || !r.drift_type) continue;
    if (r.drift_severity === L11DriftSeverity.CRITICAL &&
        isL11DriftActionPassive(r.recommended_action)) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_CRITICAL_DRIFT_WITH_NO_ACTION,
        `CRITICAL drift cannot have passive action ${r.recommended_action}`,
        { drift_report_id: r.drift_report_id }));
    }
    if (isL11DriftSeverityAtLeast(r.drift_severity, L11DriftSeverity.SEVERE) &&
        r.recommended_action === L11DriftRecommendedAction.CONTINUE_MONITORING) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_RECOMMENDED_ACTION_INCOMPATIBLE_WITH_SEVERITY,
        `SEVERE+ drift cannot remain CONTINUE_MONITORING`,
        { drift_report_id: r.drift_report_id }));
    }
    if (!isL11DriftActionLegalForSeverity(r.recommended_action, r.drift_severity)) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_RECOMMENDED_ACTION_INCOMPATIBLE_WITH_SEVERITY,
        `action ${r.recommended_action} not legal for severity ${r.drift_severity}`,
        { drift_report_id: r.drift_report_id }));
    }
    const typed = isL11DriftActionLegalForType(
      r.recommended_action, r.drift_type, r.drift_severity);
    if (!typed.ok) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_RECOMMENDED_ACTION_INCOMPATIBLE_WITH_SEVERITY,
        typed.reason, { drift_report_id: r.drift_report_id }));
    }
  }
  return issues.length === 0
    ? ok(`INV-11.7-B: severity / action consistency holds across ${reports.length} report(s).`)
    : fail(issues, `INV-11.7-B: ${issues.length} severity/action violations.`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.7-C — threshold versioning law
// ─────────────────────────────────────────────────────────────────

export function invariantC_thresholdVersioning(
  policies: readonly L11ThresholdPolicy[],
): L11_7InvariantResult {
  const issues: L11DriftIssue[] = [];
  for (const p of policies) {
    if (p.threshold_status !== L11ThresholdPolicyStatus.ACTIVE) continue;
    const structural = isL11ThresholdPolicyStructurallyValid(p);
    if (!structural.ok) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_POLICY_DOES_NOT_COVER_FULL_RANGE,
        structural.reason, { threshold_policy_id: p.threshold_policy_id }));
      continue;
    }
    const integrity = checkL11ThresholdPolicyIntegrity(p.thresholds);
    if (!integrity.ok) {
      const code = integrity.reason.includes('overlap')
        ? L11DriftViolationCode.L11G_THRESHOLD_POLICY_OVERLAP
        : integrity.reason.includes('gap')
          ? L11DriftViolationCode.L11G_THRESHOLD_POLICY_GAP
          : L11DriftViolationCode.L11G_THRESHOLD_POLICY_BOUNDARY_AMBIGUOUS;
      issues.push(makeL11DriftIssue(code, integrity.reason,
        { threshold_policy_id: p.threshold_policy_id }));
    }
    const coverage = isL11ThresholdPolicyCoveringFullRange(p.thresholds);
    if (!coverage.ok) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_POLICY_DOES_NOT_COVER_FULL_RANGE,
        coverage.reason, { threshold_policy_id: p.threshold_policy_id }));
    }
    if (!p.threshold_version) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_VERSION_MISSING,
        'threshold_version missing',
        { threshold_policy_id: p.threshold_policy_id }));
    }
    if (!p.formula_id || !p.formula_version) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_FORMULA_VERSION_MISSING,
        'formula identity missing',
        { threshold_policy_id: p.threshold_policy_id }));
    }
    if (!p.score_family) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_SCORE_FAMILY_MISSING,
        'score_family missing',
        { threshold_policy_id: p.threshold_policy_id }));
    }
    if (!p.replay_hash) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_ACTIVE_THRESHOLD_LACKS_REPLAY_HASH,
        'active threshold policy lacks replay_hash',
        { threshold_policy_id: p.threshold_policy_id }));
    } else {
      try {
        const expected = canonicalThresholdPolicyReplayHash(
          extractL11ThresholdPolicyReplayMaterial(p));
        if (expected !== p.replay_hash) {
          issues.push(makeL11DriftIssue(
            L11DriftViolationCode.L11G_THRESHOLD_REPLAY_HASH_MISMATCH,
            `replay_hash mismatch (declared=${p.replay_hash} expected=${expected})`,
            { threshold_policy_id: p.threshold_policy_id }));
        }
      } catch (e) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_THRESHOLD_REPLAY_HASH_MISMATCH,
          `replay_hash recomputation failed: ${(e as Error).message}`,
          { threshold_policy_id: p.threshold_policy_id }));
      }
    }
  }
  return issues.length === 0
    ? ok(`INV-11.7-C: ${policies.length} threshold polic(ies) versioned, gap-free, overlap-free.`)
    : fail(issues, `INV-11.7-C: ${issues.length} threshold-versioning violations.`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.7-D — threshold change classification law
// ─────────────────────────────────────────────────────────────────

export interface L11ThresholdChangeRecord {
  readonly old_policy: L11ThresholdPolicy | null;
  readonly new_policy: L11ThresholdPolicy;
  readonly classification?: L11ThresholdChangeClassification;
}

export function invariantD_thresholdChangeClassification(
  changes: readonly L11ThresholdChangeRecord[],
): L11_7InvariantResult {
  const issues: L11DriftIssue[] = [];
  for (const c of changes) {
    if (!c.classification) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_CHANGE_UNCLASSIFIED,
        'threshold change must be classified before activation',
        { threshold_policy_id: c.new_policy.threshold_policy_id }));
    }
  }
  return issues.length === 0
    ? ok(`INV-11.7-D: all ${changes.length} threshold change(s) classified.`)
    : fail(issues, `INV-11.7-D: ${issues.length} unclassified threshold change(s).`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.7-E — formula change classification law
// ─────────────────────────────────────────────────────────────────

export function invariantE_formulaChangeClassification(
  assessments: readonly L11FormulaChangeAssessment[],
): L11_7InvariantResult {
  const issues: L11DriftIssue[] = [];
  for (const a of assessments) {
    if (!a.classification) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_FORMULA_CHANGE_UNCLASSIFIED,
        'formula change classification missing',
        { formula_change_assessment_id: a.formula_change_assessment_id }));
      continue;
    }
    if (l11FormulaChangeRequiresMigration(a.classification) && !a.migration_required) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_FORMULA_CHANGE_REQUIRES_MIGRATION,
        `${a.classification} requires migration_required=true`,
        { formula_change_assessment_id: a.formula_change_assessment_id }));
    }
    if (l11FormulaChangeRequiresRecalibration(a.classification) && !a.recalibration_required) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_FORMULA_CHANGE_REQUIRES_RECALIBRATION,
        `${a.classification} requires recalibration_required=true`,
        { formula_change_assessment_id: a.formula_change_assessment_id }));
    }
    if (a.classification === L11FormulaChangeClassification.BREAKING_SEMANTIC &&
        !a.replay_backfill_required) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_FORMULA_CHANGE_BACKFILL_REQUIRED,
        'BREAKING_SEMANTIC must set replay_backfill_required=true',
        { formula_change_assessment_id: a.formula_change_assessment_id }));
    }
    if (isL11FormulaChangeProhibited(a.classification)) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_FORMULA_CHANGE_PROHIBITED,
        'formula change classified PROHIBITED',
        { formula_change_assessment_id: a.formula_change_assessment_id }));
    }
  }
  return issues.length === 0
    ? ok(`INV-11.7-E: all ${assessments.length} formula change(s) classified consistently.`)
    : fail(issues, `INV-11.7-E: ${issues.length} formula-change classification violations.`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.7-F — semantic preservation law
// ─────────────────────────────────────────────────────────────────

export function invariantF_semanticPreservation(
  assessments: readonly L11FormulaChangeAssessment[],
): L11_7InvariantResult {
  const issues: L11DriftIssue[] = [];
  for (const a of assessments) {
    for (const surface of L11_PROHIBITED_SILENT_SURFACES) {
      if (a.changed_surfaces.includes(surface) && !a.migration_ratification_ref) {
        const code = surface === L11FormulaChangeSurface.SCORE_DIRECTION_CHANGED
          ? L11DriftViolationCode.L11G_DIRECTION_CHANGE_PROHIBITED
          : L11DriftViolationCode.L11G_MEANING_CHANGE_SILENT;
        issues.push(makeL11DriftIssue(
          code,
          `${surface} requires explicit migration_ratification_ref`,
          { formula_change_assessment_id: a.formula_change_assessment_id }));
      }
    }
    if (a.old_formula_id === a.new_formula_id &&
        a.old_formula_version === a.new_formula_version) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_OLD_FORMULA_OVERWRITTEN,
        'old and new formula identifiers identical',
        { formula_change_assessment_id: a.formula_change_assessment_id }));
    }
  }
  return issues.length === 0
    ? ok(`INV-11.7-F: semantic preservation across ${assessments.length} change(s).`)
    : fail(issues, `INV-11.7-F: ${issues.length} semantic-preservation violations.`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.7-G — sample confidence law
// ─────────────────────────────────────────────────────────────────

export function invariantG_sampleConfidence(
  reports: readonly L11ScoreDriftReport[],
): L11_7InvariantResult {
  const issues: L11DriftIssue[] = [];
  for (const r of reports) {
    if (!isL11DriftSeverityAtLeast(r.drift_severity, L11DriftSeverity.SEVERE)) continue;
    for (const stat of r.drift_statistics) {
      const enoughSample =
        Number.isFinite(stat.sample_size) &&
        Number.isFinite(stat.minimum_sample_size) &&
        stat.sample_size >= stat.minimum_sample_size;
      if (enoughSample) continue;
      if (stat.confidence_class !==
          L11DriftStatisticConfidenceClass.INSUFFICIENT_SAMPLE &&
          stat.confidence_class !==
          L11DriftStatisticConfidenceClass.LOW_CONFIDENCE) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_HIGH_SEVERITY_FROM_INSUFFICIENT_SAMPLE,
          `${r.drift_severity} from insufficient sample without confidence downgrade`,
          { drift_report_id: r.drift_report_id, statistic_id: stat.statistic_id }));
      }
    }
  }
  return issues.length === 0
    ? ok(`INV-11.7-G: sample confidence law holds.`)
    : fail(issues, `INV-11.7-G: ${issues.length} sample-confidence violations.`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.7-H — non-judgment law
// ─────────────────────────────────────────────────────────────────

const JUDGMENT_PHRASES = [
  'buy', 'sell', 'long', 'short', 'should buy', 'should sell',
  'recommend long', 'recommend short', 'winner is', 'preferred trade',
  'execute trade',
];

export function invariantH_nonJudgment(
  reports: readonly L11ScoreDriftReport[],
): L11_7InvariantResult {
  const issues: L11DriftIssue[] = [];
  for (const r of reports) {
    const hay = (r.lineage_refs.join(' ') + ' ' +
      r.evidence_refs.join(' ')).toLowerCase();
    for (const p of JUDGMENT_PHRASES) {
      if (hay.includes(p)) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_DRIFT_ACTS_AS_JUDGMENT,
          `drift report references judgment phrase '${p}'`,
          { drift_report_id: r.drift_report_id }));
      }
    }
  }
  return issues.length === 0
    ? ok(`INV-11.7-H: non-judgment law holds.`)
    : fail(issues, `INV-11.7-H: ${issues.length} non-judgment violations.`);
}

// ─────────────────────────────────────────────────────────────────
// Aggregate runner
// ─────────────────────────────────────────────────────────────────

export interface L11_7InvariantSuiteInput {
  readonly drift_reports: readonly L11ScoreDriftReport[];
  readonly threshold_policies: readonly L11ThresholdPolicy[];
  readonly threshold_changes: readonly L11ThresholdChangeRecord[];
  readonly formula_change_assessments: readonly L11FormulaChangeAssessment[];
}

export interface L11_7InvariantSuiteResult {
  readonly ok: boolean;
  readonly results: Readonly<Record<string, L11_7InvariantResult>>;
}

export function runL11_7Invariants(
  inp: L11_7InvariantSuiteInput,
): L11_7InvariantSuiteResult {
  const results: Record<string, L11_7InvariantResult> = {
    'INV-11.7-A': invariantA_driftReportCompleteness(inp.drift_reports),
    'INV-11.7-B': invariantB_severityActionConsistency(inp.drift_reports),
    'INV-11.7-C': invariantC_thresholdVersioning(inp.threshold_policies),
    'INV-11.7-D': invariantD_thresholdChangeClassification(inp.threshold_changes),
    'INV-11.7-E': invariantE_formulaChangeClassification(inp.formula_change_assessments),
    'INV-11.7-F': invariantF_semanticPreservation(inp.formula_change_assessments),
    'INV-11.7-G': invariantG_sampleConfidence(inp.drift_reports),
    'INV-11.7-H': invariantH_nonJudgment(inp.drift_reports),
  };
  const allOk = Object.values(results).every(r => r.ok);
  void extractL11DriftReportReplayMaterial;
  void canonicalDriftReportReplayHash;
  void extractL11FormulaChangeReplayMaterial;
  void canonicalFormulaChangeReplayHash;
  void isL11DriftStatisticConfidenceSufficient;
  return { ok: allOk, results };
}
