/**
 * L11.9 — Layer Inventory (§11.9.5 / §11.9.6)
 *
 * Static enumeration of all L11 sublayers, required certification
 * suites, required engines/validators/audits/invariants, and the
 * final output surfaces that L11 exposes to L12+.
 *
 * §11.9.2 Non-duplication law: this file does NOT redefine any
 * lower-sublayer contract or engine; it only enumerates known
 * surfaces by name so the master certification can detect missing
 * pieces deterministically.
 */

export const L11_LAYER_INVENTORY_POLICY_VERSION = 'l11.9.inventory.v1';

export enum L11SublayerId {
  L11_1_CONSTITUTION = 'L11_1_CONSTITUTION',
  L11_2_SCORE_DOCTRINE = 'L11_2_SCORE_DOCTRINE',
  L11_3_FORMULA_LAW = 'L11_3_FORMULA_LAW',
  L11_4_ATTRIBUTION = 'L11_4_ATTRIBUTION',
  L11_5_MISSING_REGIME = 'L11_5_MISSING_REGIME',
  L11_6_CALIBRATION = 'L11_6_CALIBRATION',
  L11_7_DRIFT = 'L11_7_DRIFT',
  L11_8_PERSISTENCE = 'L11_8_PERSISTENCE',
  L11_9_RATIFICATION = 'L11_9_RATIFICATION',
}

export const ALL_L11_SUBLAYER_IDS:
  readonly L11SublayerId[] = Object.values(L11SublayerId);

/** Sublayers that must be certified green for L11.9 to ratify L11. */
export const L11_REQUIRED_SUBLAYERS_FOR_RATIFICATION:
  readonly L11SublayerId[] = [
  L11SublayerId.L11_1_CONSTITUTION,
  L11SublayerId.L11_2_SCORE_DOCTRINE,
  L11SublayerId.L11_3_FORMULA_LAW,
  L11SublayerId.L11_4_ATTRIBUTION,
  L11SublayerId.L11_5_MISSING_REGIME,
  L11SublayerId.L11_6_CALIBRATION,
  L11SublayerId.L11_7_DRIFT,
  L11SublayerId.L11_8_PERSISTENCE,
];

export enum L11FinalOutputSurface {
  SCORE_OUTPUT = 'SCORE_OUTPUT',
  SCORE_COMPONENT_BREAKDOWN = 'SCORE_COMPONENT_BREAKDOWN',
  SCORE_ATTRIBUTION = 'SCORE_ATTRIBUTION',
  SCORE_MISSING_DATA_PROFILE = 'SCORE_MISSING_DATA_PROFILE',
  SCORE_MODIFIER_PROFILE = 'SCORE_MODIFIER_PROFILE',
  SCORE_CALIBRATION_HOOK = 'SCORE_CALIBRATION_HOOK',
  SCORE_DRIFT_REPORT = 'SCORE_DRIFT_REPORT',
  SCORE_EVIDENCE_READ_SURFACE = 'SCORE_EVIDENCE_READ_SURFACE',
  SCORE_LINEAGE_READ_SURFACE = 'SCORE_LINEAGE_READ_SURFACE',
}

export const ALL_L11_FINAL_OUTPUT_SURFACES:
  readonly L11FinalOutputSurface[] = Object.values(L11FinalOutputSurface);

export interface L11LayerInventory {
  readonly layer_id: 'L11';
  readonly layer_name: 'Deterministic Scoring Engine';

  readonly required_sublayers: readonly L11SublayerId[];

  readonly required_contract_surfaces: readonly string[];
  readonly required_registry_surfaces: readonly string[];
  readonly required_engine_surfaces: readonly string[];
  readonly required_validator_surfaces: readonly string[];
  readonly required_audit_surfaces: readonly string[];
  readonly required_invariant_surfaces: readonly string[];
  readonly required_certification_suites: readonly string[];

  readonly required_output_surfaces: readonly L11FinalOutputSurface[];

  readonly policy_version: string;
}

/**
 * §11.9.5 — Static inventory of every L11 surface that must exist
 * for the master certification to declare PRODUCTION_GREEN. The
 * names below are *path / module* identifiers, not new contract
 * declarations — they are used by the master cert harness to locate
 * registered modules.
 */
export const L11_LAYER_INVENTORY: L11LayerInventory = {
  layer_id: 'L11',
  layer_name: 'Deterministic Scoring Engine',
  required_sublayers: L11_REQUIRED_SUBLAYERS_FOR_RATIFICATION,
  required_contract_surfaces: [
    // L11.1
    'l11-mission',
    'l11-boundary',
    'l11-capability-policy',
    'l11-forbidden-actions',
    'l11-violation-codes',
    'l11-dependency-surfaces',
    'l11-output-surfaces',
    'l11-score-meaning-law',
    'l11-constitutional-types',
    // L11.2
    'score-family',
    'score-meaning-claim',
    'score-direction',
    'score-band-policy',
    'score-component',
    'score-output',
    'score-formula',
    'score-family-catalogue',
    'score-object-readiness',
    'score-production-status',
    // L11.3
    'formula-catalogue',
    'formula-input-surface',
    'formula-cap-rule',
    'formula-penalty-rule',
    'formula-modifier-rule',
    'formula-missing-data-rule',
    'formula-evaluation-result',
    'formula-status',
    'formula-weight-profile',
    // L11.4
    'score-attribution',
    'attribution-driver',
    'attribution-contribution',
    'attribution-summary-code',
    'attribution-completeness',
    'attribution-materiality',
    'top-driver-selection-policy',
    // L11.5
    'missing-data-profile',
    'regime-modifier',
    'visibility-class',
    // L11.6
    'calibration-target',
    'calibration-hook',
    'outcome-metric',
    'calibration-cohort',
    'calibration-exclusion',
    // L11.7
    'drift-type',
    'drift-severity',
    'drift-statistic',
    'drift-recommended-action',
    'drift-report',
    'threshold-policy',
    'threshold-change-classification',
    'formula-change-classification',
    'formula-change-assessment',
    // L11.8
    'l11-persistence-surface',
    'l11-current-authority',
    'l11-historical-surface',
    'l11-evidence-storage',
    'l11-read-surface',
    'l11-score-run-record',
    'l11-downstream-consumption',
    // L11.9
    'l11-final-definition',
    'l11-completion-standard',
    'l11-layer-inventory',
    'l11-freeze-policy',
    'l11-extension-policy',
    'l11-downstream-dependency',
    'l11-ratification-artifact',
  ],
  required_registry_surfaces: [
    'score-family.registry',
    'score-meaning-claim.registry',
    'score-direction.registry',
    'score-band-policy.registry',
    'reserved-score-family.registry',
    'score-output-class.registry',
    'score-formula.registry',
    'score-component.registry',
    'score-weight-profile.registry',
    'score-cap-rule.registry',
    'score-penalty-rule.registry',
    'score-modifier-rule.registry',
    'score-missing-data-rule.registry',
    'outcome-metric.registry',
    'calibration-cohort.registry',
    'calibration-exclusion.registry',
    'calibration-target.registry',
    'calibration-hook.registry',
    'l11-durable-surface.registry',
    'l11-read-surface.registry',
  ],
  required_engine_surfaces: [
    // L11.3
    'score-formula-engine',
    // L11.4
    'score-attribution-engine',
    // L11.5
    'missing-data-engine',
    'regime-modifier-engine',
    // L11.6
    'calibration-hook-engine',
    // L11.7
    'score-drift-monitoring-engine',
    'threshold-governance-engine',
    'formula-change-classifier',
  ],
  required_validator_surfaces: [
    'score-family.validator',
    'score-formula.validator',
    'score-attribution.validator',
    'missing-data-profile.validator',
    'regime-modifier.validator',
    'calibration-target.validator',
    'calibration-hook.validator',
    'drift-report.validator',
    'threshold-policy.validator',
    'formula-change-assessment.validator',
    'persistence-envelope.validator',
    'current-authority.validator',
    'historical-score-fact.validator',
    'evidence-pointer.validator',
    'l11-read-surface.validator',
    'l11-downstream-consumption.validator',
    'replay-result.validator',
    'repair-request.validator',
  ],
  required_audit_surfaces: [
    'l11-constitutional-audit',
    'l11-score-doctrine-audit',
    'l11-formula-audit',
    'l11-attribution-audit',
    'l11-missing-regime-audit',
    'l11-calibration-audit',
    'l11-drift-audit',
    'l11-persistence-audit',
    'l11-final-audit',
  ],
  required_invariant_surfaces: [
    'l11_1-invariants',
    'l11_2-invariants',
    'l11_3-invariants',
    'l11_4-invariants',
    'l11_5-invariants',
    'l11_6-invariants',
    'l11_7-invariants',
    'l11_8-invariants',
    'l11_9-invariants',
    'l11-master-invariants',
  ],
  required_certification_suites: [
    'test-l11_1-constitution',
    'test-l11_2-score-doctrine',
    'test-l11_3-formulas',
    'test-l11_4-attribution',
    'test-l11_5-missing-regime',
    'test-l11_6-calibration',
    'test-l11_7-drift',
    'test-l11_8-persistence',
    'test-l11_9-ratification',
    'test-l11_master',
  ],
  required_output_surfaces: ALL_L11_FINAL_OUTPUT_SURFACES,
  policy_version: L11_LAYER_INVENTORY_POLICY_VERSION,
};
