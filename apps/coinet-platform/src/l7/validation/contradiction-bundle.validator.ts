/**
 * L7.2 — Contradiction Bundle Validator
 *
 * §7.2.6.5 — Rejects bundles with missing records, untyped families,
 * missing lineage, and ensures derived fields (highest_severity,
 * dominant_family) match the record list.
 */

import {
  L7ContradictionBundle,
  L7ContradictionRecord,
  ALL_CONTRADICTION_SEVERITIES,
  computeHighestSeverity,
  computeDominantFamily,
  compareSeverity,
} from '../contracts/contradiction-bundle';
import {
  L7ObjectViolationCode,
  L7ValidationOutputClass,
  REQUIRED_FIELDS_BY_OUTPUT,
} from '../contracts/validation-output-class';
import {
  ContradictionFamilyRegistry,
  getDefaultContradictionFamilyRegistry,
} from '../registry/contradiction-family.registry';

export interface ContradictionBundleIssue {
  readonly code: L7ObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ContradictionBundleReport {
  readonly valid: boolean;
  readonly issues: readonly ContradictionBundleIssue[];
}

export function validateContradictionBundle(
  bundle: L7ContradictionBundle,
  registry: ContradictionFamilyRegistry = getDefaultContradictionFamilyRegistry(),
): ContradictionBundleReport {
  const issues: ContradictionBundleIssue[] = [];

  for (const field of REQUIRED_FIELDS_BY_OUTPUT[L7ValidationOutputClass.CONTRADICTION_BUNDLE]) {
    const v = (bundle as unknown as Record<string, unknown>)[field];
    if (v === undefined || v === null) {
      issues.push({
        code: L7ObjectViolationCode.CONTRADICTION_MISSING_IDENTITY,
        message: `missing required field: ${field}`,
      });
    }
  }

  if (!bundle.contradiction_records || bundle.contradiction_records.length === 0) {
    issues.push({
      code: L7ObjectViolationCode.CONTRADICTION_MISSING_RECORDS,
      message: 'contradiction_records must be non-empty',
    });
  } else {
    for (let i = 0; i < bundle.contradiction_records.length; i++) {
      const r = bundle.contradiction_records[i];
      const recIssues = validateContradictionRecord(r, registry, i);
      for (const ri of recIssues) issues.push(ri);
    }

    const derivedHighest = computeHighestSeverity(bundle.contradiction_records);
    if (compareSeverity(bundle.highest_severity, derivedHighest) !== 0) {
      issues.push({
        code: L7ObjectViolationCode.CONTRADICTION_UNTYPED_RECORD,
        message: `highest_severity mismatch: declared ${bundle.highest_severity}, computed ${derivedHighest}`,
      });
    }

    const derivedDominant = computeDominantFamily(bundle.contradiction_records);
    if (bundle.dominant_contradiction_family !== derivedDominant) {
      issues.push({
        code: L7ObjectViolationCode.CONTRADICTION_MISSING_FAMILY,
        message: `dominant_contradiction_family mismatch: declared ${bundle.dominant_contradiction_family}, computed ${derivedDominant}`,
      });
    }
  }

  if (!bundle.lineage_refs || !bundle.lineage_refs.trace_id || !bundle.lineage_refs.manifest_id) {
    issues.push({
      code: L7ObjectViolationCode.CONTRADICTION_MISSING_LINEAGE,
      message: 'missing lineage_refs',
    });
  }

  if (!bundle.replay_hash) {
    issues.push({
      code: L7ObjectViolationCode.CONTRADICTION_MISSING_IDENTITY,
      message: 'missing replay_hash',
    });
  }

  return { valid: issues.length === 0, issues };
}

function validateContradictionRecord(
  r: L7ContradictionRecord,
  registry: ContradictionFamilyRegistry,
  idx: number,
): ContradictionBundleIssue[] {
  const issues: ContradictionBundleIssue[] = [];

  if (!r.contradiction_record_id) {
    issues.push({
      code: L7ObjectViolationCode.CONTRADICTION_UNTYPED_RECORD,
      message: `record[${idx}] missing id`,
    });
  }

  if (!registry.isRegistered(r.family)) {
    issues.push({
      code: L7ObjectViolationCode.CONTRADICTION_MISSING_FAMILY,
      message: `record[${idx}] has unregistered family: ${r.family}`,
    });
  } else {
    const desc = registry.get(r.family)!;
    if (desc.requiresSupportRef && !r.support_ref) {
      issues.push({
        code: L7ObjectViolationCode.CONTRADICTION_UNTYPED_RECORD,
        message: `record[${idx}] family ${r.family} requires support_ref`,
      });
    }
    if (desc.requiresChallengeRef && !r.challenge_ref) {
      issues.push({
        code: L7ObjectViolationCode.CONTRADICTION_UNTYPED_RECORD,
        message: `record[${idx}] family ${r.family} requires challenge_ref`,
      });
    }
  }

  if (!ALL_CONTRADICTION_SEVERITIES.includes(r.severity)) {
    issues.push({
      code: L7ObjectViolationCode.CONTRADICTION_UNTYPED_RECORD,
      message: `record[${idx}] invalid severity: ${r.severity}`,
    });
  }

  if (!r.detected_at) {
    issues.push({
      code: L7ObjectViolationCode.CONTRADICTION_UNTYPED_RECORD,
      message: `record[${idx}] missing detected_at`,
    });
  }

  return issues;
}
