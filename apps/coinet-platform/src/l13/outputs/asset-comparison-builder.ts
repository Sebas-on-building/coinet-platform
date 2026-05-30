/**
 * L13.7 — Asset Comparison Builder
 *
 * §13.7.13 — Builds an `L13AssetComparisonOutput` from N per-asset
 * input packages + per-asset L13.3/L13.4/L13.5 results. Compares
 * across the mandatory dimensions and emits asymmetry disclosures
 * when data quality / drift / restrictions differ materially.
 */

import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import {
  L13ComparisonAsymmetryClass,
  L13ComparisonDimension,
  L13ComparisonReadinessClass,
  L13ComparisonRelation,
  L13ComparisonScopeClass,
  L13_MANDATORY_ASSET_COMPARISON_DIMENSIONS,
  type L13AssetComparisonOutput,
  type L13ComparisonAsymmetryDisclosure,
  type L13ComparisonDimensionResult,
} from '../contracts/asset-comparison-output';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13AssetComparisonSide {
  readonly subject_ref: string;
  readonly subject_label: string;
  readonly input_package: L13AIInputPackage;
  readonly output: L13AIExplanationOutput;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly expression: L13ExpressionGovernanceResult;
}

export interface L13AssetComparisonBuilderInput {
  readonly request_output_id: string;
  readonly left: L13AssetComparisonSide;
  readonly right: L13AssetComparisonSide;
  readonly scope_class?: L13ComparisonScopeClass;
}

function detectMissingDataAsymmetry(
  left: L13AssetComparisonSide,
  right: L13AssetComparisonSide,
): boolean {
  return (
    left.input_package.uncertainty_profile
      .material_missing_data_present !==
    right.input_package.uncertainty_profile
      .material_missing_data_present
  );
}

function detectDriftAsymmetry(
  left: L13AssetComparisonSide,
  right: L13AssetComparisonSide,
): boolean {
  return (
    left.input_package.uncertainty_profile.material_drift_present !==
    right.input_package.uncertainty_profile.material_drift_present
  );
}

function detectRestrictionAsymmetry(
  left: L13AssetComparisonSide,
  right: L13AssetComparisonSide,
): boolean {
  return (
    left.input_package.restriction_profile.lower_layer_restriction_refs
      .length !==
    right.input_package.restriction_profile.lower_layer_restriction_refs
      .length
  );
}

function detectConfidenceAsymmetry(
  left: L13AssetComparisonSide,
  right: L13AssetComparisonSide,
): boolean {
  return (
    left.input_package.confidence_breakdown
      .overall_explanation_confidence_band !==
    right.input_package.confidence_breakdown
      .overall_explanation_confidence_band
  );
}

function buildDimension(
  dimension: L13ComparisonDimension,
  left: L13AssetComparisonSide,
  right: L13AssetComparisonSide,
  relation: L13ComparisonRelation,
  statement: string,
  asymmetry: boolean,
  restriction: boolean,
): L13ComparisonDimensionResult {
  const replay = fnv1a(
    [
      dimension,
      left.subject_ref,
      right.subject_ref,
      relation,
      statement,
      String(asymmetry),
      String(restriction),
      POLICY_V,
    ].join('|'),
  );
  return {
    comparison_dimension_result_id: `l13.cmp.dim.${replay}`,
    dimension,
    left_subject_ref: left.subject_ref,
    right_subject_ref: right.subject_ref,
    relation,
    comparison_statement: statement,
    confidence_band: L13ExplanationConfidenceBand.MEDIUM,
    asymmetry_flag: asymmetry,
    restriction_flag: restriction,
    evidence_refs: [
      ...left.input_package.evidence_refs.slice(0, 1),
      ...right.input_package.evidence_refs.slice(0, 1),
    ],
    lineage_refs: ['l13.outputs.lineage'],
    policy_version: POLICY_V,
  };
}

function deriveReadiness(
  asymmetries: number,
  left: L13AssetComparisonSide,
  right: L13AssetComparisonSide,
): L13ComparisonReadinessClass {
  if (
    left.expression.envelope.block_required ||
    right.expression.envelope.block_required
  ) {
    return L13ComparisonReadinessClass.COMPARISON_BLOCKED;
  }
  if (
    left.expression.envelope.rewrite_required ||
    right.expression.envelope.rewrite_required
  ) {
    return L13ComparisonReadinessClass.COMPARISON_INCOMPLETE;
  }
  if (asymmetries >= 3) {
    return L13ComparisonReadinessClass.COMPARISON_NARROWED_BY_ASYMMETRY;
  }
  if (asymmetries > 0) {
    return L13ComparisonReadinessClass.COMPARISON_READY_WITH_DISCLOSURE;
  }
  return L13ComparisonReadinessClass.COMPARISON_READY;
}

/**
 * §13.7.13 — Build asset comparison. Uses governed posture from
 * each side; never emits "better buy" language.
 */
export function buildL13AssetComparison(
  args: L13AssetComparisonBuilderInput,
): L13AssetComparisonOutput {
  const { left, right } = args;
  const missingDataAsym = detectMissingDataAsymmetry(left, right);
  const driftAsym = detectDriftAsymmetry(left, right);
  const restrictionAsym = detectRestrictionAsymmetry(left, right);
  const confidenceAsym = detectConfidenceAsymmetry(left, right);

  const asymmetry_disclosures:
    L13ComparisonAsymmetryDisclosure[] = [];
  if (missingDataAsym) {
    asymmetry_disclosures.push({
      asymmetry_class:
        L13ComparisonAsymmetryClass.MISSING_DATA_ASYMMETRY,
      affected_subject_ref: left.input_package.uncertainty_profile
        .material_missing_data_present
        ? left.subject_ref
        : right.subject_ref,
      statement:
        'Missing visibility differs materially between the compared subjects; the comparison narrows accordingly.',
    });
  }
  if (driftAsym) {
    asymmetry_disclosures.push({
      asymmetry_class:
        L13ComparisonAsymmetryClass.DRIFT_ASYMMETRY,
      affected_subject_ref: left.input_package.uncertainty_profile
        .material_drift_present
        ? left.subject_ref
        : right.subject_ref,
      statement:
        'Drift posture differs between subjects; score-context comparisons remain conditional.',
    });
  }
  if (restrictionAsym) {
    asymmetry_disclosures.push({
      asymmetry_class:
        L13ComparisonAsymmetryClass.RESTRICTION_ASYMMETRY,
      affected_subject_ref:
        left.input_package.restriction_profile
          .lower_layer_restriction_refs.length >
        right.input_package.restriction_profile
          .lower_layer_restriction_refs.length
          ? left.subject_ref
          : right.subject_ref,
      statement:
        'Lower-layer restriction profiles differ; comparison is limited by the more restrictive side.',
    });
  }
  if (confidenceAsym) {
    asymmetry_disclosures.push({
      asymmetry_class:
        L13ComparisonAsymmetryClass.CONFIDENCE_ASYMMETRY,
      affected_subject_ref: left.subject_ref,
      statement:
        'Confidence bands differ; clean comparative conclusions are not legal.',
    });
  }
  const asymmetryCount = asymmetry_disclosures.length;

  // Build a dimension result per mandatory dimension. The
  // relations are intentionally conservative; the engine never
  // claims a clean "stronger" relation when asymmetry is detected.
  const dim = (
    dimension: L13ComparisonDimension,
    statement: string,
    relation: L13ComparisonRelation = L13ComparisonRelation.ROUGHLY_BALANCED,
  ): L13ComparisonDimensionResult =>
    buildDimension(
      dimension,
      left,
      right,
      asymmetryCount > 0
        ? L13ComparisonRelation.INCOMPARABLE_DUE_TO_VISIBILITY
        : relation,
      statement,
      asymmetryCount > 0,
      restrictionAsym,
    );

  const comparison_dimension_results: L13ComparisonDimensionResult[] =
    L13_MANDATORY_ASSET_COMPARISON_DIMENSIONS.map(d => {
      switch (d) {
        case L13ComparisonDimension.SCORES:
          return dim(
            d,
            'Score posture varies; the comparison is reported under governed L11 refs without recommending action.',
          );
        case L13ComparisonDimension.SCENARIOS:
          return dim(
            d,
            'Scenario clarity differs; both sides keep base case and alternatives.',
          );
        case L13ComparisonDimension.RISK:
          return dim(d, 'Risk posture compared under governed refs.');
        case L13ComparisonDimension.TIMING:
          return dim(
            d,
            'Timing maturity compared; neither side is presented as a trade window.',
          );
        case L13ComparisonDimension.HYPOTHESIS_STRENGTH:
          return dim(
            d,
            'Hypothesis support is contrasted; alternatives remain preserved.',
          );
        case L13ComparisonDimension.CONFIDENCE:
          return dim(
            d,
            'Confidence postures contrasted; lower side governs comparison strength.',
          );
        case L13ComparisonDimension.INVALIDATION_PRESSURE:
          return dim(
            d,
            'Invalidation pressure contrasted; never converted into a directional call.',
          );
        case L13ComparisonDimension.MISSING_DATA_QUALITY:
          return dim(
            d,
            'Missing visibility contrasted; clean comparison is limited where asymmetric.',
          );
        case L13ComparisonDimension.DRIFT:
          return dim(
            d,
            'Drift posture contrasted under governed refs.',
          );
        case L13ComparisonDimension.RESTRICTIONS:
          return dim(
            d,
            'Lower-layer restrictions contrasted; comparison is limited by the more restrictive side.',
          );
        default:
          return dim(d, 'Dimension compared under governed refs.');
      }
    });

  const readiness = deriveReadiness(asymmetryCount, left, right);

  const evidence_refs = [
    ...left.input_package.evidence_refs,
    ...right.input_package.evidence_refs,
  ];
  const lineage_refs = [
    ...left.input_package.lineage_refs,
    ...right.input_package.lineage_refs,
    'l13.outputs.lineage',
  ];

  const replayHash = fnv1a(
    [
      args.request_output_id,
      left.subject_ref,
      right.subject_ref,
      args.scope_class ?? L13ComparisonScopeClass.TWO_ASSETS,
      ...comparison_dimension_results.map(
        d => d.comparison_dimension_result_id,
      ),
      asymmetry_disclosures.map(a => a.asymmetry_class).join(','),
      readiness,
      POLICY_V,
    ].join('|'),
  );

  return {
    asset_comparison_id: `l13.cmp.${replayHash}`,
    output_id: args.request_output_id,
    input_package_id: left.input_package.input_package_id,
    comparison_subject_refs: [left.subject_ref, right.subject_ref],
    comparison_scope_class:
      args.scope_class ?? L13ComparisonScopeClass.TWO_ASSETS,
    comparison_dimension_results,
    strongest_relative_advantage_lines: [
      `Under governed refs, ${left.subject_label} and ${right.subject_label} show distinct posture; clean directional advantage is not asserted.`,
    ],
    strongest_relative_weakness_lines: [
      'Asymmetries in data quality and restrictions narrow any clean comparative conclusion.',
    ],
    scenario_clarity_comparison:
      'Scenario clarity contrasted under governed L12 refs.',
    opportunity_quality_comparison:
      'Opportunity quality contrasted without recommending action.',
    risk_comparison: 'Risk posture contrasted under governed refs.',
    timing_comparison:
      'Timing maturity contrasted; not presented as a trade window.',
    hypothesis_strength_comparison:
      'Hypothesis support contrasted; alternatives preserved.',
    confidence_comparison:
      'Confidence bands contrasted; the weaker side governs clean conclusions.',
    invalidation_pressure_comparison:
      'Invalidation pressure contrasted; not converted into a directional call.',
    missing_data_quality_comparison:
      'Missing visibility contrasted; comparison narrowed where asymmetric.',
    drift_comparison: 'Drift posture contrasted under governed refs.',
    restriction_comparison:
      'Lower-layer restrictions contrasted; the more restrictive side governs.',
    asymmetry_disclosures,
    final_comparison_summary:
      'Comparison concludes with governed posture, asymmetry disclosure, and no recommendation language.',
    recommendation_language_detected: false,
    comparison_readiness: readiness,
    evidence_refs,
    lineage_refs,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
