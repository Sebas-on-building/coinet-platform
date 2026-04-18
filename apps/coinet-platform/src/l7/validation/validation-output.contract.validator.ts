/**
 * L7.3 — Validation Output Contract Validator
 *
 * §7.3.3.6 + §7.3.3.7 — Verifies the executable output contract is
 * complete, has the right linkage, and does not silently hide cleanliness
 * violations.
 */

import {
  L7ValidationOutputContract,
  L7_OUTPUT_CONTRACT_REQUIRED_FIELDS,
  outputRequiresContradictionBundle,
  outputViolatesCleanliness,
} from '../contracts/validation-output.contract';
import { ALL_VALIDATION_CLASSES, ALL_VALIDATION_MODIFIERS } from '../contracts/validation-output-class';
import { ALL_CONFIDENCE_BANDS, bandMatchesScore } from '../contracts/confidence-assessment';
import { ALL_RUNTIME_STATUS_CLASSES, ALL_REPLAY_IDENTITY_MODES } from '../contracts/validation-runtime-status';
import {
  L7ContractViolation,
  L7ContractViolationCode,
} from './contract-violation-codes';

export interface OutputContractValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L7ContractViolation[];
}

const VALID_CLASSES = new Set<string>(ALL_VALIDATION_CLASSES as readonly string[]);
const VALID_MODIFIERS = new Set<string>(ALL_VALIDATION_MODIFIERS as readonly string[]);
const VALID_BANDS = new Set<string>(ALL_CONFIDENCE_BANDS as readonly string[]);
const VALID_STATUSES = new Set<string>(ALL_RUNTIME_STATUS_CLASSES as readonly string[]);
const VALID_REPLAY_MODES = new Set<string>(ALL_REPLAY_IDENTITY_MODES as readonly string[]);

const SCORE_FIELDS: readonly (keyof L7ValidationOutputContract)[] = [
  'support_strength_score',
  'contradiction_severity_score',
  'incompleteness_score',
  'staleness_score',
  'ambiguity_score',
  'degradation_score',
  'confidence_score',
];

export function validateValidationOutputContract(
  o: L7ValidationOutputContract,
): OutputContractValidationResult {
  const violations: L7ContractViolation[] = [];
  const obj = o as unknown as Record<string, unknown>;

  for (const f of L7_OUTPUT_CONTRACT_REQUIRED_FIELDS) {
    if (obj[f] === undefined || obj[f] === null) {
      violations.push({
        code: L7ContractViolationCode.OUTPUT_CONTRACT_INCOMPLETE_FIELD,
        message: `Required field missing: ${f}`,
        path: `output.${f}`,
      });
    }
  }

  if (!o.validation_contract_version || !o.schema_version) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_VERSION,
      message: 'validation_contract_version and schema_version are required.',
      path: 'output.version',
    });
  }

  if (!o.validation_subject_id || !o.subject_contract_ref) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_SUBJECT_LINK,
      message: 'validation_subject_id and subject_contract_ref are required.',
      path: 'output.subject_link',
    });
  }

  if (!VALID_CLASSES.has(o.validation_class as unknown as string)) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_CLASS_MODIFIER_INCONSISTENT,
      message: `Unregistered validation_class '${o.validation_class}'.`,
      path: 'output.validation_class',
    });
  }
  if (Array.isArray(o.validation_modifiers)) {
    for (const m of o.validation_modifiers) {
      if (!VALID_MODIFIERS.has(m as unknown as string)) {
        violations.push({
          code: L7ContractViolationCode.OUTPUT_CONTRACT_CLASS_MODIFIER_INCONSISTENT,
          message: `Unregistered validation_modifier '${m}'.`,
          path: 'output.validation_modifiers',
        });
      }
    }
  }

  if (!VALID_STATUSES.has(o.validation_status as unknown as string)) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_RUNTIME_INTEGRITY_VIOLATION,
      message: `Unregistered validation_status '${o.validation_status}'.`,
      path: 'output.validation_status',
    });
  }

  for (const f of SCORE_FIELDS) {
    const v = (o as unknown as Record<string, number>)[f as string];
    if (typeof v !== 'number' || v < 0 || v > 1 + 1e-9) {
      violations.push({
        code: L7ContractViolationCode.OUTPUT_CONTRACT_SCORE_OUT_OF_RANGE,
        message: `${String(f)} must be in [0, 1].`,
        path: `output.${String(f)}`,
        details: { value: v },
      });
    }
  }

  if (!VALID_BANDS.has(o.confidence_band as unknown as string)) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_BAND_SCORE_MISMATCH,
      message: `Unregistered confidence_band '${o.confidence_band}'.`,
      path: 'output.confidence_band',
    });
  } else if (typeof o.confidence_score === 'number' && !bandMatchesScore(o.confidence_band, o.confidence_score)) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_BAND_SCORE_MISMATCH,
      message: `confidence_band '${o.confidence_band}' does not match confidence_score=${o.confidence_score}.`,
      path: 'output.confidence_band',
    });
  }

  if (outputRequiresContradictionBundle(o) && !o.contradiction_bundle_ref) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_CONTRADICTION_BUNDLE,
      message: 'Contradiction is claimed (severity > 0 / class implies contradiction / modifier set) but contradiction_bundle_ref is missing.',
      path: 'output.contradiction_bundle_ref',
    });
  }

  if (!o.confidence_assessment_ref) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_CONFIDENCE_LINK,
      message: 'confidence_assessment_ref is required (confidence may not be inlined without an assessment).',
      path: 'output.confidence_assessment_ref',
    });
  }

  if (!o.restriction_profile && !o.restriction_profile_ref) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_RESTRICTION_PROFILE,
      message: 'restriction_profile must be embedded or referenced (§7.3.6.5).',
      path: 'output.restriction_profile',
    });
  }

  if (!o.replay_hash || !o.compute_run_id || !o.lineage_refs?.trace_id || !o.lineage_refs?.manifest_id) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_REPLAY_LINEAGE,
      message: 'replay_hash, compute_run_id, and lineage_refs are all required.',
      path: 'output.replay_lineage',
    });
  }

  if (!VALID_REPLAY_MODES.has(o.replay_mode_flag as unknown as string)) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_RUNTIME_INTEGRITY_VIOLATION,
      message: `Unregistered replay_mode_flag '${o.replay_mode_flag}'.`,
      path: 'output.replay_mode_flag',
    });
  }

  if (outputViolatesCleanliness(o)) {
    violations.push({
      code: L7ContractViolationCode.OUTPUT_CONTRACT_HIDDEN_CLEANLINESS,
      message: 'validation_status is CLEAN but a cleanliness dimension is materially active.',
      path: 'output.cleanliness',
      details: {
        staleness_score: o.staleness_score,
        incompleteness_score: o.incompleteness_score,
        ambiguity_score: o.ambiguity_score,
        degradation_score: o.degradation_score,
        contradiction_severity_score: o.contradiction_severity_score,
        modifiers: o.validation_modifiers,
      },
    });
  }

  if (o.runtime_integrity_flags) {
    const f = o.runtime_integrity_flags;
    if (
      !f.input_snapshot_hash_match ||
      !f.contract_version_match ||
      !f.replay_hash_stable ||
      !f.evidence_refs_resolvable ||
      !f.subject_contract_resolvable
    ) {
      violations.push({
        code: L7ContractViolationCode.OUTPUT_CONTRACT_RUNTIME_INTEGRITY_VIOLATION,
        message: 'runtime_integrity_flags indicate at least one runtime invariant is broken.',
        path: 'output.runtime_integrity_flags',
        details: { flags: f },
      });
    }
  }

  return { valid: violations.length === 0, violations };
}
