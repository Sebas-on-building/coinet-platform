/**
 * L6.3 — Feature Definition Compatibility Checker
 *
 * §6.3.3.6 — Detects breaking changes between two feature definition versions:
 *   - scope changes
 *   - value_kind or unit changes
 *   - normalization method changes
 *   - materialization policy changes
 *   - primitive id changes
 *   - non-monotonic version drift
 */

import { FeatureDefinitionContract } from '../contracts/feature-definition.contract';
import {
  L6ContractCompatibilityClass,
  classifyVersionDelta,
} from '../contracts/contract-versioning';
import {
  L6ContractValidationResult,
  L6ContractViolation,
  L6ContractViolationCode,
  contractFail,
  contractOk,
  contractViolation,
} from './contract-violation-codes';

export interface FeatureCompatibilityReport extends L6ContractValidationResult {
  readonly classification: L6ContractCompatibilityClass;
}

export function checkFeatureDefinitionCompatibility(
  prev: FeatureDefinitionContract,
  next: FeatureDefinitionContract,
): FeatureCompatibilityReport {
  const v: L6ContractViolation[] = [];

  if (prev.primitive_id !== next.primitive_id) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_PRIMITIVE_ID_CHANGED, 'primitive_id',
      `primitive_id changed from "${prev.primitive_id}" to "${next.primitive_id}". A contract evolution must keep primitive_id stable.`,
      { prev: prev.primitive_id, next: next.primitive_id },
    ));
  }

  const delta = classifyVersionDelta(prev.version, next.version);
  if (delta.classification === L6ContractCompatibilityClass.INVALID_VERSION) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_INVALID_VERSION_DELTA, 'version',
      delta.reason, { prev: prev.version, next: next.version },
    ));
  } else if (delta.from && delta.to) {
    const lexCompare = (delta.to.major - delta.from.major) || (delta.to.minor - delta.from.minor) || (delta.to.patch - delta.from.patch);
    if (lexCompare < 0) {
      v.push(contractViolation(
        L6ContractViolationCode.COMPAT_VERSION_NOT_MONOTONIC, 'version',
        `next version "${next.version}" is not monotonically >= prev "${prev.version}".`,
        { prev: prev.version, next: next.version },
      ));
    }
  }

  if (prev.scope?.scope_type !== next.scope?.scope_type
      || prev.scope?.scope_granularity !== next.scope?.scope_granularity) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_BREAKING_SCOPE_CHANGE, 'scope',
      'Feature scope (type or granularity) changed between versions. This is a breaking change.',
      { prev: prev.scope, next: next.scope },
    ));
  }

  if (prev.value_kind !== next.value_kind) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_BREAKING_VALUE_KIND_CHANGE, 'value_kind',
      `value_kind changed from "${prev.value_kind}" to "${next.value_kind}". This is a breaking change.`,
      { prev: prev.value_kind, next: next.value_kind },
    ));
  }

  if (prev.unit !== next.unit) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_BREAKING_UNIT_CHANGE, 'unit',
      `unit changed from "${prev.unit}" to "${next.unit}". This is a breaking change.`,
      { prev: prev.unit, next: next.unit },
    ));
  }

  if (prev.normalization_method !== next.normalization_method) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_BREAKING_NORMALIZATION_CHANGE, 'normalization_method',
      `normalization_method changed from "${prev.normalization_method}" to "${next.normalization_method}". Historical values would be recomputed under a different normalization.`,
      { prev: prev.normalization_method, next: next.normalization_method },
    ));
  }

  if (prev.materialization_policy !== next.materialization_policy) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_BREAKING_MATERIALIZATION_CHANGE, 'materialization_policy',
      `materialization_policy changed from "${prev.materialization_policy}" to "${next.materialization_policy}".`,
      { prev: prev.materialization_policy, next: next.materialization_policy },
    ));
  }

  let classification: L6ContractCompatibilityClass;
  if (v.length > 0) {
    classification = L6ContractCompatibilityClass.BREAKING;
  } else {
    classification = delta.classification;
  }

  const base = v.length === 0 ? contractOk() : contractFail(v);
  return { ...base, classification };
}
