/**
 * L13.7 — Comparison Output Validators
 *
 * §13.7.13.6 / §13.7.14 — Validates asset and thesis comparison
 * payloads. Detects recommendation/finality leakage, missing
 * mandatory dimensions, and undisclosed asymmetries.
 */

import {
  L13ComparisonAsymmetryClass,
  L13_COMPARISON_RECOMMENDATION_LEAK_PATTERNS,
  L13_MANDATORY_ASSET_COMPARISON_DIMENSIONS,
  type L13AssetComparisonOutput,
} from '../contracts/asset-comparison-output';
import {
  L13_THESIS_FINALITY_LEAK_PATTERNS,
  type L13ThesisComparisonOutput,
} from '../contracts/thesis-comparison-output';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

function corpusFromAssetComparison(
  cmp: L13AssetComparisonOutput,
): string {
  const parts: string[] = [
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
  ];
  return parts.join(' ');
}

export function validateL13AssetComparisonOutput(
  cmp: L13AssetComparisonOutput,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!cmp.asset_comparison_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'asset_comparison_id missing',
    });
  }
  if (!cmp.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (cmp.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }
  if (cmp.comparison_subject_refs.length < 2) {
    issues.push({
      code: L13ModeViolationCode.L13M_ASSET_COMPARISON_PARITY_MISSING,
      severity: SEV.CRITICAL,
      message:
        'asset comparison requires at least two comparison_subject_refs',
    });
  }
  const dimensionsCovered = new Set(
    cmp.comparison_dimension_results.map(d => d.dimension),
  );
  for (const required of L13_MANDATORY_ASSET_COMPARISON_DIMENSIONS) {
    if (!dimensionsCovered.has(required)) {
      issues.push({
        code: L13ModeViolationCode.L13M_ASSET_COMPARISON_DIMENSION_INCOMPLETE,
        severity: SEV.CRITICAL,
        message: `mandatory dimension ${required} missing`,
      });
    }
  }
  const corpus = corpusFromAssetComparison(cmp);
  for (const pattern of L13_COMPARISON_RECOMMENDATION_LEAK_PATTERNS) {
    if (pattern.test(corpus)) {
      issues.push({
        code: L13ModeViolationCode.L13M_ASSET_COMPARISON_RECOMMENDATION_LEAK,
        severity: SEV.CRITICAL,
        message: `recommendation leak detected (pattern: ${pattern.source})`,
      });
      break;
    }
  }
  if (cmp.recommendation_language_detected !== false) {
    issues.push({
      code: L13ModeViolationCode.L13M_ASSET_COMPARISON_RECOMMENDATION_LEAK,
      severity: SEV.CRITICAL,
      message: 'recommendation_language_detected must be false',
    });
  }

  // Asymmetry disclosure law — when a dimension result is flagged
  // asymmetry but no disclosure was emitted, fail.
  const asymmetryFlagged = cmp.comparison_dimension_results.some(
    d => d.asymmetry_flag,
  );
  if (asymmetryFlagged && cmp.asymmetry_disclosures.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_ASSET_COMPARISON_MISSING_DATA_ASYMMETRY_HIDDEN,
      severity: SEV.CRITICAL,
      message:
        'dimension results carry asymmetry_flag but asymmetry_disclosures is empty',
    });
  }
  const restrictionFlagged = cmp.comparison_dimension_results.some(
    d => d.restriction_flag,
  );
  const restrictionDisclosed = cmp.asymmetry_disclosures.some(
    d =>
      d.asymmetry_class ===
      L13ComparisonAsymmetryClass.RESTRICTION_ASYMMETRY,
  );
  if (restrictionFlagged && !restrictionDisclosed) {
    issues.push({
      code: L13ModeViolationCode.L13M_ASSET_COMPARISON_RESTRICTION_ASYMMETRY_HIDDEN,
      severity: SEV.CRITICAL,
      message:
        'restriction asymmetry flagged but RESTRICTION_ASYMMETRY disclosure missing',
    });
  }
  return l13ModeResult(issues);
}

export function validateL13ThesisComparisonOutput(
  cmp: L13ThesisComparisonOutput,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!cmp.thesis_comparison_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'thesis_comparison_id missing',
    });
  }
  if (!cmp.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (cmp.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }
  if (!cmp.contradiction_comparison) {
    issues.push({
      code: L13ModeViolationCode.L13M_THESIS_COMPARISON_MISSING_CONTRADICTION,
      severity: SEV.CRITICAL,
      message: 'contradiction_comparison empty',
    });
  }
  const corpus = [
    cmp.support_comparison,
    cmp.contradiction_comparison,
    cmp.confirmation_gap_comparison,
    cmp.invalidation_risk_comparison,
    cmp.scenario_implication_comparison,
    cmp.shift_condition_comparison,
    cmp.stronger_current_explanation_line ?? '',
    cmp.preserved_alternative_line ?? '',
  ].join(' ');
  for (const pattern of L13_THESIS_FINALITY_LEAK_PATTERNS) {
    if (pattern.test(corpus)) {
      issues.push({
        code: L13ModeViolationCode.L13M_THESIS_COMPARISON_FINALITY_LEAK,
        severity: SEV.CRITICAL,
        message: `finality leak detected (pattern: ${pattern.source})`,
      });
      break;
    }
  }
  if (cmp.forbidden_finality_detected !== false) {
    issues.push({
      code: L13ModeViolationCode.L13M_THESIS_COMPARISON_FINALITY_LEAK,
      severity: SEV.CRITICAL,
      message: 'forbidden_finality_detected must be false',
    });
  }
  return l13ModeResult(issues);
}
