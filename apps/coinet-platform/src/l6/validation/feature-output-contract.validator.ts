/**
 * L6.3 — Feature Output Contract Validator
 *
 * §6.3.4.5 / §6.3.4.3 — Enforces feature runtime output legality:
 *   - all required top-level and lineage fields present
 *   - replay hash present and well-formed
 *   - validity state consistent with quality/freshness/null state
 *   - value_kind in payload matches the contract's declared feature kind
 *   - contract version matches definition
 */

import {
  FeatureOutput,
  REQUIRED_FEATURE_OUTPUT_TOP_FIELDS,
  REQUIRED_FEATURE_OUTPUT_LINEAGE_FIELDS,
} from '../contracts/feature-output.contract';
import { FeatureDefinitionContract } from '../contracts/feature-definition.contract';
import {
  L6FeatureValidityState,
  isValidEmissionLegal,
} from '../contracts/feature-validity-state';
import { FEATURE_VALUE_SHAPE_BY_KIND, L6FeatureValueKind } from '../contracts/feature-contract';
import { materializationRequiresCurrentState } from '../contracts/materialization-policy';
import {
  L6ContractValidationResult,
  L6ContractViolation,
  L6ContractViolationCode,
  contractFail,
  contractOk,
  contractViolation,
} from './contract-violation-codes';
import { isValidReplayHash } from './replay-hash';

export function validateFeatureOutput(
  output: FeatureOutput,
  definition?: FeatureDefinitionContract,
): L6ContractValidationResult {
  const v: L6ContractViolation[] = [];

  if (!output || typeof output !== 'object') {
    return contractFail([contractViolation(
      L6ContractViolationCode.OUT_MISSING_FIELD, 'root',
      'Feature output is missing.', {},
    )]);
  }

  const dict = output as unknown as Record<string, unknown>;
  for (const field of REQUIRED_FEATURE_OUTPUT_TOP_FIELDS) {
    if (!hasMeaningfulValue(dict, field as string)) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_MISSING_FIELD, field as string,
        `Feature output is missing required field "${String(field)}".`,
        { field: String(field) },
      ));
    }
  }

  if (output.lineage) {
    const lineageDict = output.lineage as unknown as Record<string, unknown>;
    for (const field of REQUIRED_FEATURE_OUTPUT_LINEAGE_FIELDS) {
      if (!hasMeaningfulValue(lineageDict, field as string)) {
        v.push(contractViolation(
          L6ContractViolationCode.OUT_MISSING_LINEAGE_FIELD,
          `lineage.${String(field)}`,
          `Feature output lineage is missing required field "${String(field)}".`,
          { field: String(field) },
        ));
      }
    }
    if (output.lineage.replay_hash && !isValidReplayHash(output.lineage.replay_hash)) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_MISSING_REPLAY_HASH, 'lineage.replay_hash',
        'replay_hash must be a 64-char lowercase hex SHA-256 digest.',
        { got: output.lineage.replay_hash },
      ));
    }
  }

  if (output.value_payload?.value_kind) {
    const vk = output.value_payload.value_kind;
    if (!Object.values(L6FeatureValueKind).includes(vk)) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_VALUE_KIND_MISMATCH, 'value_payload.value_kind',
        `value_payload.value_kind is not a registered L6FeatureValueKind.`,
        { got: vk },
      ));
    }
  }

  if (output.validity_state && !Object.values(L6FeatureValidityState).includes(output.validity_state)) {
    v.push(contractViolation(
      L6ContractViolationCode.OUT_INVALID_VALIDITY_STATE, 'validity_state',
      `validity_state is not a registered L6FeatureValidityState.`,
      { got: output.validity_state },
    ));
  } else if (output.validity_state === L6FeatureValidityState.VALID) {
    const legal = isValidEmissionLegal(
      output.validity_state, output.quality_state, output.freshness_state, output.null_state,
    );
    if (!legal) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_ILLEGAL_VALID_EMISSION, 'validity_state',
        'Feature emitted as VALID while quality/freshness/null-state rules block VALID emission.',
        {
          quality_state: output.quality_state,
          freshness_state: output.freshness_state,
          null_state: output.null_state,
        },
      ));
    }
    if (output.warmup_satisfied === false) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_ILLEGAL_VALID_EMISSION, 'warmup_satisfied',
        'Feature emitted as VALID while warmup is not satisfied.',
        { warmup_satisfied: output.warmup_satisfied },
      ));
    }
  }

  if (definition) {
    if (output.feature_id !== definition.primitive_id) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_CONTRACT_VERSION_MISMATCH, 'feature_id',
        `Feature output feature_id "${output.feature_id}" does not match definition primitive_id "${definition.primitive_id}".`,
        { output: output.feature_id, definition: definition.primitive_id },
      ));
    }
    if (output.feature_version !== definition.version) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_CONTRACT_VERSION_MISMATCH, 'feature_version',
        `Feature output feature_version "${output.feature_version}" does not match definition version "${definition.version}".`,
        { output: output.feature_version, definition: definition.version },
      ));
    }
    if (output.value_payload?.value_kind && definition.value_kind
      && output.value_payload.value_kind !== definition.value_kind) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_VALUE_KIND_MISMATCH, 'value_payload.value_kind',
        `Feature output value_kind "${output.value_payload.value_kind}" does not match definition value_kind "${definition.value_kind}".`,
        { output: output.value_payload.value_kind, definition: definition.value_kind },
      ));
    }
    if (definition.value_kind) {
      const expectedShape = FEATURE_VALUE_SHAPE_BY_KIND[definition.value_kind];
      if (!expectedShape) {
        v.push(contractViolation(
          L6ContractViolationCode.OUT_VALUE_KIND_MISMATCH, 'value_payload',
          'Definition value_kind lacks a registered shape mapping.',
          { value_kind: definition.value_kind },
        ));
      }
    }
    if (definition.materialization_policy
      && materializationRequiresCurrentState(definition.materialization_policy)
      && output.validity_state === L6FeatureValidityState.VALID
      && !output.lineage?.manifest_id) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_MISSING_LINEAGE_FIELD, 'lineage.manifest_id',
        'Current-state-backed feature requires manifest_id for VALID emissions.', {},
      ));
    }
    if (definition.evidence_pack_policy === 'ALWAYS_REQUIRED'
      && !output.lineage?.evidence_pack_ref) {
      v.push(contractViolation(
        L6ContractViolationCode.OUT_MISSING_EVIDENCE_REF, 'lineage.evidence_pack_ref',
        'Definition requires evidence_pack_ref on every output.', {},
      ));
    }
  }

  return v.length === 0 ? contractOk() : contractFail(v);
}

function hasMeaningfulValue(obj: Record<string, unknown>, field: string): boolean {
  if (!(field in obj)) return false;
  const v = obj[field];
  if (v === null || v === undefined) return false;
  if (typeof v === 'string' && v.length === 0) return false;
  return true;
}
