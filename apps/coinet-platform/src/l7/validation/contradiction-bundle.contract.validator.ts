/**
 * L7.3 — Contradiction Bundle Contract Validator
 *
 * §7.3.4.5 + §7.3.4.6 — Verifies the executable contradiction-bundle
 * contract: typed records, derived-field consistency, blocked surfaces,
 * stale/missing refs, lineage, replay identity.
 */

import {
  L7ContradictionBundleContract,
  L7_CONTRADICTION_BUNDLE_CONTRACT_REQUIRED_FIELDS,
  computeRecordHighestSeverity,
  computeRecordDominantFamily,
} from '../contracts/contradiction-bundle.contract';
import {
  ALL_CONTRADICTION_FAMILIES,
  ALL_CONTRADICTION_SEVERITIES,
} from '../contracts/contradiction-bundle';
import {
  L7ContractViolation,
  L7ContractViolationCode,
} from './contract-violation-codes';

export interface ContradictionBundleContractValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L7ContractViolation[];
}

const VALID_FAMILIES = new Set<string>(ALL_CONTRADICTION_FAMILIES as readonly string[]);
const VALID_SEVERITIES = new Set<string>(ALL_CONTRADICTION_SEVERITIES as readonly string[]);

export function validateContradictionBundleContract(
  b: L7ContradictionBundleContract,
): ContradictionBundleContractValidationResult {
  const violations: L7ContractViolation[] = [];
  const obj = b as unknown as Record<string, unknown>;

  for (const f of L7_CONTRADICTION_BUNDLE_CONTRACT_REQUIRED_FIELDS) {
    if (obj[f] === undefined || obj[f] === null) {
      violations.push({
        code: L7ContractViolationCode.CONTRADICTION_CONTRACT_INCOMPLETE_FIELD,
        message: `Required field missing: ${f}`,
        path: `bundle.${f}`,
      });
    }
  }

  if (!b.contradiction_contract_version || !b.schema_version) {
    violations.push({
      code: L7ContractViolationCode.CONTRADICTION_CONTRACT_MISSING_VERSION,
      message: 'contradiction_contract_version and schema_version are required.',
      path: 'bundle.version',
    });
  }

  if (!Array.isArray(b.contradiction_records)) {
    return { valid: false, violations };
  }

  for (let i = 0; i < b.contradiction_records.length; i++) {
    const r = b.contradiction_records[i];
    if (!r.contradiction_record_id) {
      violations.push({
        code: L7ContractViolationCode.CONTRADICTION_CONTRACT_UNTYPED_RECORD,
        message: `Record ${i} missing contradiction_record_id.`,
        path: `bundle.contradiction_records[${i}].id`,
      });
    }
    if (!VALID_FAMILIES.has(r.family as unknown as string)) {
      violations.push({
        code: L7ContractViolationCode.CONTRADICTION_CONTRACT_UNTYPED_RECORD,
        message: `Record ${i} family '${r.family}' not registered.`,
        path: `bundle.contradiction_records[${i}].family`,
      });
    }
    if (!VALID_SEVERITIES.has(r.severity as unknown as string)) {
      violations.push({
        code: L7ContractViolationCode.CONTRADICTION_CONTRACT_UNTYPED_RECORD,
        message: `Record ${i} severity '${r.severity}' not registered.`,
        path: `bundle.contradiction_records[${i}].severity`,
      });
    }
    if (!r.support_ref || !r.challenge_ref || !r.detected_at || !r.rationale) {
      violations.push({
        code: L7ContractViolationCode.CONTRADICTION_CONTRACT_UNTYPED_RECORD,
        message: `Record ${i} missing one of: support_ref, challenge_ref, detected_at, rationale.`,
        path: `bundle.contradiction_records[${i}]`,
      });
    }
    if (!r.lineage_refs || !r.lineage_refs.trace_id) {
      violations.push({
        code: L7ContractViolationCode.CONTRADICTION_CONTRACT_MISSING_LINEAGE,
        message: `Record ${i} missing lineage_refs.trace_id.`,
        path: `bundle.contradiction_records[${i}].lineage_refs`,
      });
    }
  }

  if (b.contradiction_records.length > 0) {
    const hs = computeRecordHighestSeverity(b.contradiction_records);
    if (hs !== b.highest_severity) {
      violations.push({
        code: L7ContractViolationCode.CONTRADICTION_CONTRACT_SEVERITY_MISMATCH,
        message: `Declared highest_severity '${b.highest_severity}' does not match derived '${hs}'.`,
        path: 'bundle.highest_severity',
      });
    }
    const df = computeRecordDominantFamily(b.contradiction_records);
    if (df !== b.dominant_contradiction_family) {
      violations.push({
        code: L7ContractViolationCode.CONTRADICTION_CONTRACT_DOMINANT_FAMILY_MISMATCH,
        message: `Declared dominant_contradiction_family '${b.dominant_contradiction_family}' does not match derived '${df}'.`,
        path: 'bundle.dominant_contradiction_family',
      });
    }
  }

  if (Array.isArray(b.cluster_summary) && b.cluster_summary.length !== b.contradiction_cluster_count) {
    violations.push({
      code: L7ContractViolationCode.CONTRADICTION_CONTRACT_CLUSTER_COUNT_MISMATCH,
      message: `cluster_summary length (${b.cluster_summary.length}) != contradiction_cluster_count (${b.contradiction_cluster_count}).`,
      path: 'bundle.cluster_summary',
    });
  }

  const blockingRecords = b.contradiction_records.filter(r => r.blocked_confirmation);
  if (blockingRecords.length > 0 && b.blocked_confirmation_surfaces.length === 0) {
    violations.push({
      code: L7ContractViolationCode.CONTRADICTION_CONTRACT_BLOCKED_SURFACES_MISSING,
      message: 'Records flagged blocked_confirmation but blocked_confirmation_surfaces is empty.',
      path: 'bundle.blocked_confirmation_surfaces',
    });
  }

  const staleRecords = b.contradiction_records.filter(r => r.temporal_status === 'STALE');
  if (staleRecords.length > 0 && b.stale_support_refs.length === 0) {
    violations.push({
      code: L7ContractViolationCode.CONTRADICTION_CONTRACT_STALE_REFS_MISSING,
      message: 'Records flagged STALE but stale_support_refs is empty.',
      path: 'bundle.stale_support_refs',
    });
  }

  if (!b.lineage_refs || !b.lineage_refs.trace_id || !b.lineage_refs.manifest_id) {
    violations.push({
      code: L7ContractViolationCode.CONTRADICTION_CONTRACT_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id are required.',
      path: 'bundle.lineage_refs',
    });
  }

  if (!b.replay_hash) {
    violations.push({
      code: L7ContractViolationCode.CONTRADICTION_CONTRACT_MISSING_REPLAY_HASH,
      message: 'replay_hash is required.',
      path: 'bundle.replay_hash',
    });
  }

  return { valid: violations.length === 0, violations };
}
