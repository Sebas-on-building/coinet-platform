/**
 * L9.3 — LeadLagRelation Contract Validator
 *
 * §9.3.4.4 — Lead-lag law.
 */

import { L9LeadLagRelationContract } from '../contracts/lead-lag-relation.contract';
import {
  L9LagContradictionPosture,
  L9LagSupportStrength,
} from '../contracts/lead-lag-relation';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9LeadLagContractIssue {
  readonly code: L9SequenceContractViolationCode;
  readonly message: string;
}

export interface L9LeadLagContractReport {
  readonly valid: boolean;
  readonly issues: readonly L9LeadLagContractIssue[];
}

const ISO_TS =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

export function validateL9LeadLagContract(
  ll: L9LeadLagRelationContract,
): L9LeadLagContractReport {
  const issues: L9LeadLagContractIssue[] = [];

  if (!ll.lead_lag_id || !ll.sequence_subject_id) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_IDENTITY,
      message: 'lead_lag_id or sequence_subject_id missing',
    });
  }
  if (!ll.lead_lag_contract_version ||
      !SEMVER.test(ll.lead_lag_contract_version)) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_CONTRACT_VERSION,
      message:
        `lead_lag_contract_version missing or not semver: ${ll.lead_lag_contract_version}`,
    });
  }
  if (!ll.leading_signal_ref || !ll.lagging_signal_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_ENDPOINTS,
      message: 'leading_signal_ref or lagging_signal_ref missing',
    });
  }
  if (ll.leading_signal_ref && ll.lagging_signal_ref &&
      ll.leading_signal_ref === ll.lagging_signal_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_ENDPOINTS,
      message: 'leading_signal_ref equals lagging_signal_ref',
    });
  }
  if (typeof ll.lag_duration_ms !== 'number' ||
      !Number.isFinite(ll.lag_duration_ms)) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_DURATION,
      message: 'lag_duration_ms missing or non-finite',
    });
  } else if (ll.lag_duration_ms < 0) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_NEGATIVE_DURATION,
      message: `lag_duration_ms negative: ${ll.lag_duration_ms}`,
    });
  }
  if (!ll.lag_class) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_LAG_CLASS,
      message: 'lag_class missing',
    });
  }
  if (!ll.support_strength) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_SUPPORT,
      message: 'support_strength missing',
    });
  }
  if (!ll.contradiction_posture) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_CONTRADICTION,
      message: 'contradiction_posture missing',
    });
  }
  if (typeof ll.decay_adjustment !== 'number' ||
      ll.decay_adjustment < 0 || ll.decay_adjustment > 1) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_DECAY_ADJ,
      message: `decay_adjustment out of [0,1]: ${ll.decay_adjustment}`,
    });
  }

  // §9.3.4.4: clean support while contradiction is decisive/material
  if ((ll.support_strength === L9LagSupportStrength.STRONG_SUPPORT ||
       ll.support_strength === L9LagSupportStrength.MODERATE_SUPPORT) &&
      (ll.contradiction_posture === L9LagContradictionPosture.DECISIVE ||
       ll.contradiction_posture === L9LagContradictionPosture.MATERIAL)) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_CLEAN_WHILE_CONTRADICTION,
      message:
        `support=${ll.support_strength} while contradiction=${ll.contradiction_posture}`,
    });
  }

  // §9.3.4.4: causal restraint
  if (ll.causal_restraint_flag !== true ||
      !ll.causal_restraint ||
      ll.causal_restraint.treated_as_temporal_only !== true ||
      !ll.causal_restraint.causal_inference_disclaimer) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_CAUSAL_OVERCLAIM,
      message:
        'causal_restraint_flag/causal_restraint missing or weak (required by §9.3.4.4)',
    });
  }

  // Production fields
  if (!ll.lag_window_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_LAG_WINDOW,
      message: 'lag_window_ref missing',
    });
  }
  if (!ll.scope_type || !ll.scope_id) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_SCOPE,
      message: 'scope_type or scope_id missing',
    });
  }
  if (!ll.as_of || !ISO_TS.test(ll.as_of)) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_SCOPE,
      message: `as_of missing or not ISO-8601: ${ll.as_of}`,
    });
  }

  // Lineage + replay
  if (!ll.lineage_refs || !ll.lineage_refs.trace_id ||
      !ll.lineage_refs.manifest_id) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }
  if (!ll.replay_hash || !ll.replay_hash_component) {
    issues.push({
      code: L9SequenceContractViolationCode.LEAD_LAG_MISSING_REPLAY_HASH,
      message: 'replay_hash or replay_hash_component missing',
    });
  }

  return { valid: issues.length === 0, issues };
}
