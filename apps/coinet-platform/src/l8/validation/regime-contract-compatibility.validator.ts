/**
 * L8.3 — Regime Contract Compatibility Validator
 *
 * §8.3.7.5 — Blocks silent breaking changes, non-monotonic versioning,
 * incompatible replay identity drift, and required-field deletions
 * without migration classification.
 */

import {
  L8ContractCompatibilityClass,
  L8ContractDelta,
  classifyL8ContractDelta,
  compareL8ContractVersions,
  isLegalL8ContractUpgrade,
} from '../contracts/regime-contract-versioning';
import { L8_SUBJECT_CONTRACT_REQUIRED_FIELDS } from '../contracts/regime-subject.contract';
import { L8_OUTPUT_CONTRACT_REQUIRED_FIELDS } from '../contracts/regime-output.contract';
import { L8_CONFIDENCE_CONTRACT_REQUIRED_FIELDS } from '../contracts/regime-confidence.contract';
import { L8_TRANSITION_CONTRACT_REQUIRED_FIELDS } from '../contracts/regime-transition.contract';
import { L8_MULTIPLIER_CONTRACT_REQUIRED_FIELDS } from '../contracts/regime-multiplier-profile.contract';
import { L8RegimeContractViolationCode } from './l8-contract-violation-codes';

const REQUIRED_BY_SURFACE: Record<string, readonly string[]> = {
  SUBJECT: L8_SUBJECT_CONTRACT_REQUIRED_FIELDS,
  OUTPUT: L8_OUTPUT_CONTRACT_REQUIRED_FIELDS,
  CONFIDENCE: L8_CONFIDENCE_CONTRACT_REQUIRED_FIELDS,
  TRANSITION: L8_TRANSITION_CONTRACT_REQUIRED_FIELDS,
  MULTIPLIER: L8_MULTIPLIER_CONTRACT_REQUIRED_FIELDS,
};

export interface L8CompatibilityIssue {
  readonly code: L8RegimeContractViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8CompatibilityReport {
  readonly valid: boolean;
  readonly classification: L8ContractCompatibilityClass;
  readonly issues: readonly L8CompatibilityIssue[];
}

export interface L8CompatibilityRequest {
  readonly delta: L8ContractDelta;
  readonly declared_classification: L8ContractCompatibilityClass;
  readonly allow_breaking: boolean;
  readonly allow_migration_required: boolean;
}

export function validateRegimeContractCompatibility(
  req: L8CompatibilityRequest,
): L8CompatibilityReport {
  const issues: L8CompatibilityIssue[] = [];

  const classification = classifyL8ContractDelta(req.delta);

  // Classification mismatch: engine declared a gentler class than the
  // real delta warrants.
  if (req.declared_classification !== classification) {
    issues.push({
      code:
        L8RegimeContractViolationCode.COMPATIBILITY_CLASSIFICATION_MISMATCH,
      message:
        `declared ${req.declared_classification} but delta classifies as ${classification}`,
      details: {
        declared: req.declared_classification,
        actual: classification,
      },
    });
  }

  // Required-field removal with a too-gentle declared class
  const requiredForSurface = REQUIRED_BY_SURFACE[req.delta.surface] ?? [];
  const removedRequired = req.delta.removed_fields.filter(f =>
    requiredForSurface.includes(f));
  if (removedRequired.length > 0) {
    issues.push({
      code:
        L8RegimeContractViolationCode.COMPATIBILITY_REQUIRED_FIELD_REMOVED,
      message:
        `removed required fields: ${removedRequired.join(', ')}`,
      details: { removed_required: removedRequired },
    });
  }

  // Non-monotonic version
  const cmp = compareL8ContractVersions(req.delta.from, req.delta.to);
  if (cmp >= 0) {
    issues.push({
      code:
        L8RegimeContractViolationCode.COMPATIBILITY_NON_MONOTONIC_VERSION,
      message:
        `version did not increase: ${req.delta.from} → ${req.delta.to}`,
      details: { cmp },
    });
  }

  // Prohibited
  if (classification === L8ContractCompatibilityClass.PROHIBITED) {
    issues.push({
      code: L8RegimeContractViolationCode.COMPATIBILITY_PROHIBITED,
      message: 'delta is PROHIBITED',
    });
  }

  // Breaking without explicit allow
  const legal = isLegalL8ContractUpgrade(req.delta, {
    allowBreaking: req.allow_breaking,
    allowMigrationRequired: req.allow_migration_required,
  });
  if (!legal &&
      classification === L8ContractCompatibilityClass.BREAKING_SEMANTIC) {
    issues.push({
      code:
        L8RegimeContractViolationCode.COMPATIBILITY_BREAKING_SEMANTIC_UNAPPROVED,
      message:
        'BREAKING_SEMANTIC change without allow_breaking=true',
    });
  }

  return {
    valid: issues.length === 0 && legal,
    classification,
    issues,
  };
}
