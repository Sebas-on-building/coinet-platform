/**
 * L6.3 — Event Definition Compatibility Checker
 *
 * §6.3.5.5 — Detects breaking changes between two event definition versions:
 *   - lifecycle shape / completeness changes
 *   - dedupe semantic changes
 *   - trigger spec shape changes
 *   - suppression binding changes
 *   - materialization policy changes
 *   - primitive id changes / non-monotonic versions
 */

import { EventDefinitionContract } from '../contracts/event-definition.contract';
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

export interface EventCompatibilityReport extends L6ContractValidationResult {
  readonly classification: L6ContractCompatibilityClass;
}

export function checkEventDefinitionCompatibility(
  prev: EventDefinitionContract,
  next: EventDefinitionContract,
): EventCompatibilityReport {
  const v: L6ContractViolation[] = [];

  if (prev.primitive_id !== next.primitive_id) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_PRIMITIVE_ID_CHANGED, 'primitive_id',
      `primitive_id changed from "${prev.primitive_id}" to "${next.primitive_id}".`,
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
    const lex = (delta.to.major - delta.from.major) || (delta.to.minor - delta.from.minor) || (delta.to.patch - delta.from.patch);
    if (lex < 0) {
      v.push(contractViolation(
        L6ContractViolationCode.COMPAT_VERSION_NOT_MONOTONIC, 'version',
        `next version "${next.version}" is not monotonically >= prev "${prev.version}".`,
        { prev: prev.version, next: next.version },
      ));
    }
  }

  if (prev.event_kind !== next.event_kind) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_BREAKING_TRIGGER_CHANGE, 'event_kind',
      `event_kind changed from "${prev.event_kind}" to "${next.event_kind}". Replay meaning would shift.`,
      { prev: prev.event_kind, next: next.event_kind },
    ));
  }

  if (prev.scope?.scope_type !== next.scope?.scope_type) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_BREAKING_SCOPE_CHANGE, 'scope',
      'Event scope type changed between versions. This is a breaking change.',
      { prev: prev.scope, next: next.scope },
    ));
  }

  if (prev.lifecycle_completeness && next.lifecycle_completeness) {
    const a = prev.lifecycle_completeness;
    const b = next.lifecycle_completeness;
    if (a.requiresCandidate !== b.requiresCandidate
        || a.requiresConfirmation !== b.requiresConfirmation
        || a.requiresActive !== b.requiresActive
        || a.requiresResolution !== b.requiresResolution
        || a.allowsExpiry !== b.allowsExpiry) {
      v.push(contractViolation(
        L6ContractViolationCode.COMPAT_BREAKING_LIFECYCLE_CHANGE, 'lifecycle_completeness',
        'Lifecycle completeness shape changed between versions.',
        { prev: a, next: b },
      ));
    }
  }

  if (prev.dedupe_spec && next.dedupe_spec) {
    if (JSON.stringify(prev.dedupe_spec) !== JSON.stringify(next.dedupe_spec)) {
      v.push(contractViolation(
        L6ContractViolationCode.COMPAT_BREAKING_DEDUPE_CHANGE, 'dedupe_spec',
        'dedupe_spec shape changed between versions; event identity meaning would shift.',
        { prev: prev.dedupe_spec, next: next.dedupe_spec },
      ));
    }
  }

  if (prev.suppression_taxonomy_binding?.taxonomyId
      !== next.suppression_taxonomy_binding?.taxonomyId
      || prev.suppression_taxonomy_binding?.suppressionGroupId
      !== next.suppression_taxonomy_binding?.suppressionGroupId) {
    v.push(contractViolation(
      L6ContractViolationCode.COMPAT_BREAKING_SUPPRESSION_CHANGE, 'suppression_taxonomy_binding',
      'Suppression taxonomy binding changed between versions.',
      { prev: prev.suppression_taxonomy_binding, next: next.suppression_taxonomy_binding },
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
