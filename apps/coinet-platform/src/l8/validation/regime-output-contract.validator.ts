/**
 * L8.3 — Regime Output Contract Validator
 *
 * §8.3.3.6 — Enforces completeness and legality of an
 * `L8RegimeOutputContract`: identity, family/primary/secondary legality,
 * scope/time, confidence/transition consistency, multiplier linkage,
 * coexistence posture, validation refs, evidence refs, lineage, and
 * replay identity.
 *
 * Cleanliness law (§8.3.3.7) is handled here too: an output that claims
 * CLEAN_SINGLE while material ambiguity exists is blocked.
 */

import {
  L8RegimeOutputContract,
  outputViolatesCleanliness,
} from '../contracts/regime-output.contract';
import {
  L8RegimeCoexistenceClass,
  L8RegimeConfidenceBand,
  L8TransitionRiskClass,
} from '../contracts/regime-state';
import {
  getDefaultL8RegimeFamilyRegistry,
  L8RegimeFamilyRegistry,
} from '../registry/regime-family.registry';
import {
  getDefaultL8RegimeClassRegistry,
  L8RegimeClassRegistry,
} from '../registry/regime-class.registry';
import { containsL8ForbiddenNaming } from '../contracts/l8-boundary';
import { L8RegimeContractViolationCode } from './l8-contract-violation-codes';

export interface L8OutputContractIssue {
  readonly code: L8RegimeContractViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8OutputContractReport {
  readonly valid: boolean;
  readonly issues: readonly L8OutputContractIssue[];
}

const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

function inUnit(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

function confBandMatches(score: number, band: L8RegimeConfidenceBand): boolean {
  if (score < 0.25) return band === 'LOW';
  if (score < 0.55) return band === 'MODERATE';
  if (score < 0.85) return band === 'HIGH';
  return band === 'FULL';
}

function transClassMatches(score: number, cls: L8TransitionRiskClass): boolean {
  if (score < 0.15) return cls === 'STABLE';
  if (score < 0.35) return cls === 'MILD';
  if (score < 0.6) return cls === 'ELEVATED';
  if (score < 0.85) return cls === 'HIGH';
  return cls === 'CRITICAL';
}

export function validateRegimeOutputContract(
  o: L8RegimeOutputContract,
  familyRegistry:
    L8RegimeFamilyRegistry = getDefaultL8RegimeFamilyRegistry(),
  classRegistry:
    L8RegimeClassRegistry = getDefaultL8RegimeClassRegistry(),
): L8OutputContractReport {
  const issues: L8OutputContractIssue[] = [];

  // Identity
  if (!o.regime_result_id) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_IDENTITY,
      message: 'regime_result_id missing',
    });
  }
  if (!o.regime_subject_id) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_SUBJECT_REF,
      message: 'regime_subject_id missing',
    });
  }
  if (!o.subject_contract_ref) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_SUBJECT_REF,
      message: 'subject_contract_ref missing',
    });
  }

  // Versioning
  if (!o.output_contract_version || !SEMVER.test(o.output_contract_version)) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_CONTRACT_VERSION,
      message: `output_contract_version missing or not semver: ${o.output_contract_version}`,
    });
  }
  if (!o.schema_version) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_SCHEMA_VERSION,
      message: 'schema_version missing',
    });
  }
  if (!o.policy_version) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_POLICY_VERSION,
      message: 'policy_version missing',
    });
  }

  // Family / primary / secondary
  if (!o.regime_family || !familyRegistry.isRegistered(o.regime_family)) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_FAMILY,
      message: `regime_family missing or unregistered: ${o.regime_family}`,
    });
  }
  if (!o.primary_regime) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_PRIMARY_REGIME,
      message: 'primary_regime missing',
    });
  } else if (o.regime_family &&
      familyRegistry.isRegistered(o.regime_family) &&
      classRegistry.isRegistered(o.primary_regime) &&
      !classRegistry.belongsToFamily(o.primary_regime, o.regime_family)) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_PRIMARY_REGIME,
      message:
        `primary_regime ${o.primary_regime} does not belong to family ${o.regime_family}`,
    });
  }

  if (o.secondary_regime !== null) {
    if (o.secondary_regime === o.primary_regime) {
      issues.push({
        code: L8RegimeContractViolationCode.OUTPUT_SECONDARY_EQUALS_PRIMARY,
        message: 'secondary_regime must differ from primary_regime',
      });
    } else if (o.regime_family &&
        familyRegistry.isRegistered(o.regime_family) &&
        classRegistry.isRegistered(o.secondary_regime) &&
        !classRegistry.belongsToFamily(o.secondary_regime, o.regime_family)) {
      issues.push({
        code: L8RegimeContractViolationCode.OUTPUT_SECONDARY_WRONG_FAMILY,
        message:
          `secondary_regime ${o.secondary_regime} does not belong to family ${o.regime_family}`,
      });
    }
    if (o.secondary_regime_confidence === null) {
      issues.push({
        code: L8RegimeContractViolationCode.OUTPUT_SECONDARY_CONFIDENCE_MISSING,
        message: 'secondary_regime present but secondary_regime_confidence null',
      });
    } else if (!inUnit(o.secondary_regime_confidence)) {
      issues.push({
        code: L8RegimeContractViolationCode.OUTPUT_CONFIDENCE_OUT_OF_RANGE,
        message:
          `secondary_regime_confidence out of range: ${o.secondary_regime_confidence}`,
      });
    }
  } else if (o.secondary_regime_confidence !== null) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_SECONDARY_CONFIDENCE_DANGLING,
      message: 'secondary_regime_confidence present without secondary_regime',
    });
  }

  if (!o.coexistence_class) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_COEXISTENCE_CLASS,
      message: 'coexistence_class missing',
    });
  }

  // Scope and time
  if (!o.scope_type || !o.scope_id) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_SCOPE,
      message: 'scope_type or scope_id missing',
    });
  }
  if (!o.as_of || !ISO_TS.test(o.as_of)) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_TIME_ANCHOR,
      message: `as_of missing or not ISO-8601: ${o.as_of}`,
    });
  }

  // Confidence
  if (!inUnit(o.regime_confidence_score)) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_CONFIDENCE_OUT_OF_RANGE,
      message: `regime_confidence_score OOR: ${o.regime_confidence_score}`,
    });
  } else if (!confBandMatches(o.regime_confidence_score, o.regime_confidence_band)) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_CONFIDENCE_BAND_INCONSISTENT,
      message:
        `regime_confidence_band ${o.regime_confidence_band} inconsistent with score ${o.regime_confidence_score}`,
    });
  }
  if (!o.confidence_profile_ref) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_CONFIDENCE_PROFILE_REF,
      message: 'confidence_profile_ref missing',
    });
  }

  // Transition
  if (!inUnit(o.transition_risk_score)) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_TRANSITION_SCORE_OUT_OF_RANGE,
      message: `transition_risk_score OOR: ${o.transition_risk_score}`,
    });
  } else if (!transClassMatches(o.transition_risk_score, o.transition_risk_class)) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_TRANSITION_CLASS_INCONSISTENT,
      message:
        `transition_risk_class ${o.transition_risk_class} inconsistent with score ${o.transition_risk_score}`,
    });
  }
  if (!o.transition_profile_ref) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_TRANSITION_PROFILE_REF,
      message: 'transition_profile_ref missing',
    });
  }

  // Support / coexistence / cleanliness scores
  for (const [name, v] of [
    ['support_strength_score', o.support_strength_score],
    ['ambiguity_score', o.ambiguity_score],
    ['staleness_score', o.staleness_score],
    ['degradation_score', o.degradation_score],
  ] as const) {
    if (!inUnit(v)) {
      issues.push({
        code: L8RegimeContractViolationCode.OUTPUT_SCORE_OUT_OF_RANGE,
        message: `${name} OOR: ${v}`,
      });
    }
  }

  // Multiplier linkage
  if (!o.multiplier_profile_ref) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_MULTIPLIER_PROFILE,
      message: 'multiplier_profile_ref missing',
    });
  }

  // Validation / evidence / input snapshot refs
  if (!o.validation_refs || o.validation_refs.length === 0) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_VALIDATION_REFS,
      message: 'validation_refs empty (L7 handoff refs required)',
    });
  }
  if (!o.evidence_pack_ref) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_EVIDENCE_PACK_REF,
      message: 'evidence_pack_ref missing',
    });
  }
  if (!o.input_snapshot_ref) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_INPUT_SNAPSHOT_REF,
      message: 'input_snapshot_ref missing',
    });
  }

  // Materialization + replay identity
  if (!o.materialization_mode) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_MATERIALIZATION_MODE,
      message: 'materialization_mode missing',
    });
  }
  if (!o.compute_run_id) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_RUN_ID,
      message: 'compute_run_id missing',
    });
  }
  if (!o.replay_hash) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  // Lineage
  if (!o.lineage_refs || !o.lineage_refs.trace_id ||
      !o.lineage_refs.manifest_id) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }

  // Cleanliness law (§8.3.3.7)
  const clean = outputViolatesCleanliness(o);
  if (clean.cleanWhileAmbiguous) {
    issues.push({
      code: L8RegimeContractViolationCode.CLEAN_WHILE_AMBIGUOUS,
      message:
        `coexistence_class=${L8RegimeCoexistenceClass.CLEAN_SINGLE} with ambiguity_score=${o.ambiguity_score}`,
    });
  }
  if (clean.cleanWhileStale) {
    issues.push({
      code: L8RegimeContractViolationCode.CLEAN_WHILE_STALE,
      message:
        `high confidence band ${o.regime_confidence_band} with staleness_score=${o.staleness_score}`,
    });
  }
  if (clean.cleanWhileDegraded) {
    issues.push({
      code: L8RegimeContractViolationCode.CLEAN_WHILE_DEGRADED,
      message:
        `high confidence band ${o.regime_confidence_band} with degradation_score=${o.degradation_score}`,
    });
  }
  if (clean.cleanWhileTransitionHigh) {
    issues.push({
      code: L8RegimeContractViolationCode.CLEAN_WHILE_TRANSITION_HIGH,
      message:
        `transition class ${o.transition_risk_class} with transition_risk_score=${o.transition_risk_score}`,
    });
  }

  // Ambiguity posture required when coexistence is CLEAN_SINGLE + ambiguity
  // is material. Already covered above by CLEAN_WHILE_AMBIGUOUS; we also
  // enforce the symmetric rule: PRIMARY_PLUS_SECONDARY with ambiguity_score
  // > 0.5 must move to AMBIGUOUS_MULTI_CANDIDATE.
  if (o.coexistence_class === L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY &&
      o.ambiguity_score > 0.6) {
    issues.push({
      code: L8RegimeContractViolationCode.AMBIGUITY_POSTURE_REQUIRED,
      message:
        `PRIMARY_PLUS_SECONDARY with high ambiguity_score=${o.ambiguity_score} must escalate to AMBIGUOUS_MULTI_CANDIDATE`,
    });
  }

  // Judgment leak via forbidden naming somewhere readable
  if (containsL8ForbiddenNaming(o.subject_contract_ref ?? '') ||
      containsL8ForbiddenNaming(o.multiplier_profile_ref ?? '')) {
    issues.push({
      code: L8RegimeContractViolationCode.OUTPUT_JUDGMENT_LEAK,
      message:
        'output refs contain forbidden judgment/scenario/recommendation semantics',
    });
  }

  return { valid: issues.length === 0, issues };
}
