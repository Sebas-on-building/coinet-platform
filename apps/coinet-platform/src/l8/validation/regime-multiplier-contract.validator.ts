/**
 * L8.3 — Regime Multiplier Profile Contract Validator
 *
 * §8.3.6.5 / §8.3.6.6 — Enforces completeness and legality of
 * `L8RegimeMultiplierProfileContract`: regime anchoring, every required
 * dimension present and within legal range, derivation spec linkage,
 * restriction consumption when required, no final-score shape, no
 * action-biased description, and replay identity.
 */

import {
  L8RegimeMultiplierProfileContract,
  listMissingOrOorMultiplierDimensions,
  multiplierIsScoreShaped,
  multiplierDescriptionHasActionBias,
} from '../contracts/regime-multiplier-profile.contract';
import { containsL8ForbiddenNaming } from '../contracts/l8-boundary';
import { L8RegimeContractViolationCode } from './l8-contract-violation-codes';

export interface L8MultiplierContractIssue {
  readonly code: L8RegimeContractViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8MultiplierContractReport {
  readonly valid: boolean;
  readonly issues: readonly L8MultiplierContractIssue[];
}

const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

export interface L8MultiplierValidationContext {
  /** Whether the subject declared restriction consumption as required. */
  readonly restriction_required: boolean;
}

export function validateRegimeMultiplierContract(
  p: L8RegimeMultiplierProfileContract,
  ctx?: L8MultiplierValidationContext,
): L8MultiplierContractReport {
  const issues: L8MultiplierContractIssue[] = [];

  if (!p.multiplier_profile_id) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_IDENTITY,
      message: 'multiplier_profile_id missing',
    });
  }
  if (!p.regime_subject_id) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_IDENTITY,
      message: 'regime_subject_id missing',
    });
  }
  if (!p.regime_result_id) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_RESULT_REF,
      message: 'regime_result_id missing',
    });
  }
  if (!p.multiplier_contract_version ||
      !SEMVER.test(p.multiplier_contract_version)) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_CONTRACT_VERSION,
      message:
        `multiplier_contract_version missing or not semver: ${p.multiplier_contract_version}`,
    });
  }
  if (!p.policy_version) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_POLICY_VERSION,
      message: 'policy_version missing',
    });
  }

  // Regime anchor
  if (!p.primary_regime) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_REGIME_ANCHOR,
      message: 'primary_regime missing',
    });
  }
  if (!p.regime_confidence_band) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_REGIME_ANCHOR,
      message: 'regime_confidence_band missing',
    });
  }
  if (!p.transition_risk_class) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_REGIME_ANCHOR,
      message: 'transition_risk_class missing',
    });
  }

  // Required dimensions
  const missing = listMissingOrOorMultiplierDimensions({ dimensions: p.dimensions });
  for (const m of missing) {
    issues.push({
      code: p.dimensions && Number.isFinite(p.dimensions[m])
        ? L8RegimeContractViolationCode.MULTIPLIER_DIMENSION_OUT_OF_RANGE
        : L8RegimeContractViolationCode.MULTIPLIER_MISSING_DIMENSION,
      message: `multiplier dimension ${m} missing or out of range`,
    });
  }

  // Derivation spec ref
  if (!p.derivation_spec_ref) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_DERIVATION_SPEC,
      message: 'derivation_spec_ref missing',
    });
  }

  // Restriction consumption refs
  if (ctx?.restriction_required) {
    if (!p.restriction_consumption_refs ||
        p.restriction_consumption_refs.length === 0) {
      issues.push({
        code:
          L8RegimeContractViolationCode.MULTIPLIER_MISSING_RESTRICTION_CONSUMPTION,
        message:
          'subject required restriction consumption but restriction_consumption_refs empty',
      });
    }
  }

  // Score-shaped multiplier
  if (multiplierIsScoreShaped({
    dimensions: p.dimensions,
    description: p.description ?? '',
  })) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_IS_SCORE_SHAPED,
      message:
        'multiplier profile is score-shaped (OOR, uniform collapse, or final-score wording)',
    });
  }

  // Action bias in description / forbidden semantics
  if (p.description &&
      (multiplierDescriptionHasActionBias(p.description) ||
       containsL8ForbiddenNaming(p.description))) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_ACTION_BIAS,
      message: 'multiplier description contains action-biased or judgment semantics',
    });
  }

  // Replay identity
  if (!p.replay_hash) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  // Lineage
  if (!p.lineage_refs || !p.lineage_refs.trace_id ||
      !p.lineage_refs.manifest_id) {
    issues.push({
      code: L8RegimeContractViolationCode.MULTIPLIER_MISSING_IDENTITY,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }

  return { valid: issues.length === 0, issues };
}
