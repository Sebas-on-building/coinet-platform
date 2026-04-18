/**
 * L7.3 — Confidence Assessment Contract Validator
 *
 * §7.3.5.5 — Verifies the executable confidence-assessment contract:
 * score range, band-score legality, factor completeness, weight presence,
 * cap-chain legality, contradiction-penalty presence when contradiction
 * is present, restriction linkage, and replay lineage.
 */

import {
  L7ConfidenceAssessmentContract,
  L7_CONFIDENCE_CONTRACT_REQUIRED_FIELDS,
  capChainIsLegal,
} from '../contracts/confidence-assessment.contract';
import { bandMatchesScore } from '../contracts/confidence-assessment';
import {
  L7ContractViolation,
  L7ContractViolationCode,
} from './contract-violation-codes';

export interface ConfidenceContractValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L7ContractViolation[];
}

const REQUIRED_COMPONENT_KEYS: readonly string[] = [
  'source_trust_component',
  'freshness_component',
  'feature_completeness_component',
  'cross_source_agreement_component',
  'regime_compatibility_component',
  'historical_reliability_component',
  'contradiction_penalty_component',
];

const REQUIRED_WEIGHT_KEYS: readonly string[] = [
  'source_trust_weight',
  'freshness_weight',
  'feature_completeness_weight',
  'cross_source_agreement_weight',
  'regime_compatibility_weight',
  'historical_reliability_weight',
  'contradiction_penalty_weight',
];

export function validateConfidenceAssessmentContract(
  c: L7ConfidenceAssessmentContract,
  opts: { contradictionPresent?: boolean } = {},
): ConfidenceContractValidationResult {
  const violations: L7ContractViolation[] = [];
  const obj = c as unknown as Record<string, unknown>;

  for (const f of L7_CONFIDENCE_CONTRACT_REQUIRED_FIELDS) {
    if (obj[f] === undefined || obj[f] === null) {
      violations.push({
        code: L7ContractViolationCode.CONFIDENCE_CONTRACT_INCOMPLETE_FIELD,
        message: `Required field missing: ${f}`,
        path: `confidence.${f}`,
      });
    }
  }

  if (!c.confidence_contract_version || !c.schema_version || !c.confidence_policy_version) {
    violations.push({
      code: L7ContractViolationCode.CONFIDENCE_CONTRACT_MISSING_VERSION,
      message: 'confidence_contract_version, schema_version, and confidence_policy_version are required.',
      path: 'confidence.version',
    });
  }

  for (const score of [c.raw_score, c.capped_score, c.confidence_score]) {
    if (typeof score !== 'number' || score < 0 || score > 1 + 1e-9) {
      violations.push({
        code: L7ContractViolationCode.CONFIDENCE_CONTRACT_SCORE_OUT_OF_RANGE,
        message: 'raw_score, capped_score, and confidence_score must be in [0, 1].',
        path: 'confidence.scores',
        details: { raw: c.raw_score, capped: c.capped_score, score: c.confidence_score },
      });
      break;
    }
  }

  if (c.confidence_band && typeof c.confidence_score === 'number' && !bandMatchesScore(c.confidence_band, c.confidence_score)) {
    violations.push({
      code: L7ContractViolationCode.CONFIDENCE_CONTRACT_BAND_MISMATCH,
      message: `confidence_band '${c.confidence_band}' does not match confidence_score=${c.confidence_score}.`,
      path: 'confidence.band',
    });
  }

  if (!c.components) {
    violations.push({
      code: L7ContractViolationCode.CONFIDENCE_CONTRACT_FACTORS_INCOMPLETE,
      message: 'components is required.',
      path: 'confidence.components',
    });
  } else {
    const comps = c.components as unknown as Record<string, number>;
    for (const k of REQUIRED_COMPONENT_KEYS) {
      if (typeof comps[k] !== 'number') {
        violations.push({
          code: L7ContractViolationCode.CONFIDENCE_CONTRACT_FACTORS_INCOMPLETE,
          message: `components.${k} missing or non-numeric.`,
          path: `confidence.components.${k}`,
        });
      }
    }
  }

  if (!c.component_weights) {
    violations.push({
      code: L7ContractViolationCode.CONFIDENCE_CONTRACT_WEIGHTS_INCOMPLETE,
      message: 'component_weights is required.',
      path: 'confidence.component_weights',
    });
  } else {
    const w = c.component_weights as unknown as Record<string, number>;
    for (const k of REQUIRED_WEIGHT_KEYS) {
      if (typeof w[k] !== 'number') {
        violations.push({
          code: L7ContractViolationCode.CONFIDENCE_CONTRACT_WEIGHTS_INCOMPLETE,
          message: `component_weights.${k} missing or non-numeric.`,
          path: `confidence.component_weights.${k}`,
        });
      }
    }
  }

  if (!Array.isArray(c.cap_chain) || !capChainIsLegal(c)) {
    violations.push({
      code: L7ContractViolationCode.CONFIDENCE_CONTRACT_CAP_CHAIN_ILLEGAL,
      message: 'cap_chain is missing or inconsistent with raw/capped/confidence_score.',
      path: 'confidence.cap_chain',
      details: { raw: c.raw_score, capped: c.capped_score, score: c.confidence_score },
    });
  }

  if (
    opts.contradictionPresent === true &&
    c.components &&
    c.components.contradiction_penalty_component <= 0
  ) {
    violations.push({
      code: L7ContractViolationCode.CONFIDENCE_CONTRACT_PENALTY_MISSING,
      message: 'Contradiction is present but contradiction_penalty_component <= 0.',
      path: 'confidence.components.contradiction_penalty_component',
    });
  }

  if (!Array.isArray(c.rationale_codes) || c.rationale_codes.length === 0) {
    violations.push({
      code: L7ContractViolationCode.CONFIDENCE_CONTRACT_RATIONALE_MISSING,
      message: 'rationale_codes must include at least one rationale code.',
      path: 'confidence.rationale_codes',
    });
  }

  if (!c.restriction_profile_ref) {
    violations.push({
      code: L7ContractViolationCode.CONFIDENCE_CONTRACT_RESTRICTION_LINK_MISSING,
      message: 'restriction_profile_ref is required.',
      path: 'confidence.restriction_profile_ref',
    });
  }

  if (!c.lineage_refs || !c.lineage_refs.trace_id || !c.lineage_refs.manifest_id || !c.replay_hash || !c.compute_run_id) {
    violations.push({
      code: L7ContractViolationCode.CONFIDENCE_CONTRACT_MISSING_LINEAGE,
      message: 'lineage_refs, replay_hash, and compute_run_id are all required.',
      path: 'confidence.lineage',
    });
  }

  return { valid: violations.length === 0, violations };
}
