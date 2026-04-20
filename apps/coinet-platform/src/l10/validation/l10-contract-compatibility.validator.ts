/**
 * L10.3 — Contract Compatibility Validator
 *
 * §10.3.8 — Given a from-version and a to-version contract delta,
 * classify the upgrade and reject upgrades that silently re-interpret
 * hypothesis/competition/replay-hash semantics. Prohibited changes and
 * unapproved breaking-semantic upgrades are rejected regardless.
 *
 * §10.3.8.2 — Required-field removals are classified as
 * MIGRATION_REQUIRED; they are only legal when the caller opts in.
 */

import {
  L10ContractCompatibilityClass,
  L10ContractDelta,
  classifyL10ContractDelta,
  compareL10ContractVersions,
} from '../contracts/hypothesis-contract-versioning';
import {
  L10ContractIssue,
  L10ContractReport,
  L10HypothesisContractViolationCode as V,
} from './l10-contract-violation-codes';

export interface L10ContractCompatibilityOpts {
  readonly allowBreaking?: boolean;
  readonly allowMigrationRequired?: boolean;
  readonly expectedClass?: L10ContractCompatibilityClass;
}

export function validateL10ContractCompatibility(
  delta: L10ContractDelta,
  opts: L10ContractCompatibilityOpts = {},
): L10ContractReport {
  const issues: L10ContractIssue[] = [];

  // Version monotonicity (§10.3.8.3)
  if (compareL10ContractVersions(delta.to, delta.from) <= 0) {
    issues.push({ code: V.COMPATIBILITY_NON_MONOTONIC_VERSION,
      message: `contract version did not advance: ${delta.from} -> ${delta.to}` });
  }

  const cls = classifyL10ContractDelta(delta);

  if (cls === L10ContractCompatibilityClass.PROHIBITED) {
    issues.push({ code: V.COMPATIBILITY_PROHIBITED,
      message: `prohibited change on surface ${delta.surface}` });
  }

  if (cls === L10ContractCompatibilityClass.BREAKING_SEMANTIC
    && opts.allowBreaking !== true) {
    issues.push({ code: V.COMPATIBILITY_BREAKING_SEMANTIC_UNAPPROVED,
      message: `breaking-semantic change not approved: ${delta.semantically_changed_fields.join(', ')}` });
  }

  if (cls === L10ContractCompatibilityClass.MIGRATION_REQUIRED
    && delta.removed_fields.length > 0
    && opts.allowMigrationRequired !== true) {
    issues.push({ code: V.COMPATIBILITY_REQUIRED_FIELD_REMOVED,
      message: `required fields removed without migration approval: ${delta.removed_fields.join(', ')}` });
  }

  if (opts.expectedClass && opts.expectedClass !== cls) {
    issues.push({ code: V.COMPATIBILITY_CLASSIFICATION_MISMATCH,
      message: `expected ${opts.expectedClass} but classified ${cls}` });
  }

  return { valid: issues.length === 0, issues };
}

export function classifyL10ContractDeltaClass(
  delta: L10ContractDelta,
): L10ContractCompatibilityClass {
  return classifyL10ContractDelta(delta);
}
