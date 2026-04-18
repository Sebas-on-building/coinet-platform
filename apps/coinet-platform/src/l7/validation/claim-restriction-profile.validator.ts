/**
 * L7.2 — Claim Restriction Profile Validator
 *
 * §7.2.6.5 + §7.2.7.5 — Rejects restriction profiles with:
 *   - missing identity or lineage
 *   - empty rights set
 *   - missing reason codes
 *   - rights not in the restriction-right registry
 *   - internal inconsistency between flags and rights
 */

import {
  L7ClaimRestrictionProfile,
  L7RestrictionRight,
  L7RestrictionReasonCode,
  ALL_RESTRICTION_REASON_CODES,
  rightsAreInternallyConsistent,
} from '../contracts/claim-restriction-profile';
import {
  L7ObjectViolationCode,
  L7ValidationOutputClass,
  REQUIRED_FIELDS_BY_OUTPUT,
} from '../contracts/validation-output-class';
import {
  RestrictionRightRegistry,
  getDefaultRestrictionRightRegistry,
} from '../registry/restriction-right.registry';

export interface ClaimRestrictionProfileIssue {
  readonly code: L7ObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ClaimRestrictionProfileReport {
  readonly valid: boolean;
  readonly issues: readonly ClaimRestrictionProfileIssue[];
}

export function validateClaimRestrictionProfile(
  p: L7ClaimRestrictionProfile,
  registry: RestrictionRightRegistry = getDefaultRestrictionRightRegistry(),
): ClaimRestrictionProfileReport {
  const issues: ClaimRestrictionProfileIssue[] = [];

  for (const field of REQUIRED_FIELDS_BY_OUTPUT[L7ValidationOutputClass.CLAIM_RESTRICTION_PROFILE]) {
    const v = (p as unknown as Record<string, unknown>)[field];
    if (v === undefined || v === null || v === '') {
      issues.push({
        code: L7ObjectViolationCode.RESTRICTION_MISSING_IDENTITY,
        message: `missing required field: ${field}`,
      });
    }
  }

  if (!p.downstream_use_rights || p.downstream_use_rights.length === 0) {
    issues.push({
      code: L7ObjectViolationCode.RESTRICTION_MISSING_RIGHTS,
      message: 'downstream_use_rights must be non-empty',
    });
  } else {
    for (const r of p.downstream_use_rights) {
      if (!registry.isRegistered(r)) {
        issues.push({
          code: L7ObjectViolationCode.RESTRICTION_UNAUTHORISED_DOWNSTREAM,
          message: `unregistered restriction right: ${r}`,
        });
      }
    }

    const usedRights = new Set(p.downstream_use_rights);
    for (const r of p.downstream_use_rights) {
      const conflicts = registry.conflictsWith(r);
      for (const c of conflicts) {
        if (usedRights.has(c)) {
          issues.push({
            code: L7ObjectViolationCode.RESTRICTION_INCONSISTENT_RIGHT,
            message: `restriction right ${r} conflicts with ${c}`,
          });
        }
      }
    }
  }

  if (!p.restriction_reasons || p.restriction_reasons.length === 0) {
    if (!hasOnlyFullyPermissiveRights(p.downstream_use_rights)) {
      issues.push({
        code: L7ObjectViolationCode.RESTRICTION_MISSING_REASONS,
        message: 'restriction_reasons required when any non-full-use right is declared',
      });
    }
  } else {
    for (const rc of p.restriction_reasons) {
      if (!ALL_RESTRICTION_REASON_CODES.includes(rc as L7RestrictionReasonCode)) {
        issues.push({
          code: L7ObjectViolationCode.RESTRICTION_MISSING_REASONS,
          message: `unknown restriction reason code: ${rc}`,
        });
      }
    }
  }

  if (!rightsAreInternallyConsistent(p)) {
    issues.push({
      code: L7ObjectViolationCode.RESTRICTION_INCONSISTENT_RIGHT,
      message: 'boolean flags are inconsistent with downstream_use_rights',
    });
  }

  if (!p.lineage_refs || !p.lineage_refs.trace_id || !p.lineage_refs.manifest_id) {
    issues.push({
      code: L7ObjectViolationCode.RESTRICTION_MISSING_LINEAGE,
      message: 'missing lineage_refs',
    });
  }

  return { valid: issues.length === 0, issues };
}

function hasOnlyFullyPermissiveRights(rights: readonly L7RestrictionRight[]): boolean {
  const permissive: readonly L7RestrictionRight[] = [
    L7RestrictionRight.USABLE_FOR_REGIME_INPUT,
    L7RestrictionRight.USABLE_FOR_SCENARIO_WEIGHTING,
    L7RestrictionRight.USABLE_FOR_DETERMINISTIC_SCORING,
    L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT,
  ];
  return rights.every(r => permissive.includes(r));
}
