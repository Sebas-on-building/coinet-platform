/**
 * L7.3 — Restriction Profile Contract Validator
 *
 * §7.3.6.4 — Verifies the executable restriction-profile contract:
 * registered rights, internal flag/right consistency, conflict detection,
 * presence of reason codes, and (when context is supplied) consistency
 * with validation class / confidence band / contradiction severity.
 */

import {
  L7ClaimRestrictionProfileContract,
  L7_RESTRICTION_CONTRACT_REQUIRED_FIELDS,
  restrictionIsConsistentWithState,
  L7RestrictionConsistencyContext,
} from '../contracts/restriction-profile.contract';
import {
  L7RestrictionRight,
  rightsAreInternallyConsistent,
} from '../contracts/claim-restriction-profile';
import { RestrictionRightRegistry } from '../registry/restriction-right.registry';
import {
  L7ContractViolation,
  L7ContractViolationCode,
} from './contract-violation-codes';

export interface RestrictionContractValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L7ContractViolation[];
}

export function validateRestrictionProfileContract(
  p: L7ClaimRestrictionProfileContract,
  opts: {
    registry?: RestrictionRightRegistry;
    consistencyContext?: L7RestrictionConsistencyContext;
  } = {},
): RestrictionContractValidationResult {
  const violations: L7ContractViolation[] = [];
  const registry = opts.registry ?? new RestrictionRightRegistry();
  const obj = p as unknown as Record<string, unknown>;

  for (const f of L7_RESTRICTION_CONTRACT_REQUIRED_FIELDS) {
    if (obj[f] === undefined || obj[f] === null) {
      violations.push({
        code: L7ContractViolationCode.RESTRICTION_CONTRACT_INCOMPLETE_FIELD,
        message: `Required field missing: ${f}`,
        path: `restriction.${f}`,
      });
    }
  }

  if (!p.restriction_contract_version || !p.schema_version) {
    violations.push({
      code: L7ContractViolationCode.RESTRICTION_CONTRACT_MISSING_VERSION,
      message: 'restriction_contract_version and schema_version are required.',
      path: 'restriction.version',
    });
  }

  if (!Array.isArray(p.downstream_use_rights) || p.downstream_use_rights.length === 0) {
    violations.push({
      code: L7ContractViolationCode.RESTRICTION_CONTRACT_DOWNSTREAM_AMBIGUOUS,
      message: 'downstream_use_rights must declare at least one right.',
      path: 'restriction.downstream_use_rights',
    });
  } else {
    for (const r of p.downstream_use_rights) {
      if (!registry.isRegistered(r)) {
        violations.push({
          code: L7ContractViolationCode.RESTRICTION_CONTRACT_RIGHT_UNREGISTERED,
          message: `Right '${r}' is not registered.`,
          path: 'restriction.downstream_use_rights',
        });
      }
    }
    const rights = new Set(p.downstream_use_rights);
    for (const r of p.downstream_use_rights) {
      const conflicts = registry.conflictsWith(r as L7RestrictionRight);
      for (const c of conflicts) {
        if (rights.has(c)) {
          violations.push({
            code: L7ContractViolationCode.RESTRICTION_CONTRACT_RIGHTS_CONFLICT,
            message: `Right '${r}' conflicts with '${c}'.`,
            path: 'restriction.downstream_use_rights',
          });
        }
      }
    }
  }

  if (!Array.isArray(p.restriction_reasons) || p.restriction_reasons.length === 0) {
    violations.push({
      code: L7ContractViolationCode.RESTRICTION_CONTRACT_REASONS_MISSING,
      message: 'restriction_reasons must include at least one reason code.',
      path: 'restriction.restriction_reasons',
    });
  }

  if (!rightsAreInternallyConsistent(p)) {
    violations.push({
      code: L7ContractViolationCode.RESTRICTION_CONTRACT_RIGHTS_INTERNAL_INCONSISTENT,
      message: 'Boolean flags do not agree with declared rights.',
      path: 'restriction.flags',
    });
  }

  if (
    p.requires_contradiction_disclosure &&
    !p.downstream_use_rights.includes(L7RestrictionRight.USABLE_WITH_CONTRADICTION_DISCLOSURE_ONLY)
  ) {
    violations.push({
      code: L7ContractViolationCode.RESTRICTION_CONTRACT_DISCLOSURE_REQUIRED_BUT_MISSING,
      message: 'requires_contradiction_disclosure=true but USABLE_WITH_CONTRADICTION_DISCLOSURE_ONLY is missing.',
      path: 'restriction.requires_contradiction_disclosure',
    });
  }

  if (!p.lineage_refs || !p.lineage_refs.trace_id || !p.lineage_refs.manifest_id || !p.replay_hash || !p.compute_run_id) {
    violations.push({
      code: L7ContractViolationCode.RESTRICTION_CONTRACT_MISSING_LINEAGE,
      message: 'lineage_refs, replay_hash, and compute_run_id are required.',
      path: 'restriction.lineage',
    });
  }

  if (opts.consistencyContext) {
    const ctx = opts.consistencyContext;
    if (!restrictionIsConsistentWithState(p, ctx)) {
      const cls = ctx.validation_class;
      if (cls === 'CONFLICTING') {
        violations.push({
          code: L7ContractViolationCode.RESTRICTION_CONTRACT_INCONSISTENT_WITH_CONTRADICTION,
          message: 'Conflicting verdict grants high downstream rights without contradiction disclosure.',
          path: 'restriction.consistency',
        });
      } else if (ctx.confidence_band === 'VERY_LOW' || ctx.confidence_band === 'LOW') {
        violations.push({
          code: L7ContractViolationCode.RESTRICTION_CONTRACT_INCONSISTENT_WITH_CONFIDENCE,
          message: 'Low/very-low confidence grants USABLE_FOR_FINAL_JUDGMENT.',
          path: 'restriction.consistency',
        });
      } else if (ctx.highest_contradiction_severity === 'SEVERE' || ctx.highest_contradiction_severity === 'BLOCKING') {
        violations.push({
          code: L7ContractViolationCode.RESTRICTION_CONTRACT_INCONSISTENT_WITH_CONTRADICTION,
          message: 'Severe/blocking contradiction without requires_contradiction_disclosure.',
          path: 'restriction.consistency',
        });
      } else {
        violations.push({
          code: L7ContractViolationCode.RESTRICTION_CONTRACT_INCONSISTENT_WITH_VALIDATION,
          message: 'Restriction profile inconsistent with validation state.',
          path: 'restriction.consistency',
          details: { ctx },
        });
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
