/**
 * L9.3 — SequenceChain Contract Validator
 *
 * §9.3.5.4 — Chain-law rules.
 * §9.3.5.5 — Chain integrity doctrine.
 */

import { L9SequenceChainContract } from '../contracts/sequence-chain.contract';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9ChainContractIssue {
  readonly code: L9SequenceContractViolationCode;
  readonly message: string;
}

export interface L9ChainContractReport {
  readonly valid: boolean;
  readonly issues: readonly L9ChainContractIssue[];
}

const ISO_TS =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

function inRange01(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
}

export function validateL9SequenceChainContract(
  ch: L9SequenceChainContract,
): L9ChainContractReport {
  const issues: L9ChainContractIssue[] = [];

  if (!ch.sequence_chain_id || !ch.sequence_subject_id) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_IDENTITY,
      message: 'sequence_chain_id or sequence_subject_id missing',
    });
  }
  if (!ch.chain_contract_version || !SEMVER.test(ch.chain_contract_version)) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_CONTRACT_VERSION,
      message:
        `chain_contract_version missing or not semver: ${ch.chain_contract_version}`,
    });
  }
  if (!ch.ordered_node_refs || ch.ordered_node_refs.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_ORDERED_NODES,
      message: 'ordered_node_refs empty',
    });
  }
  if (!ch.ordered_event_refs || ch.ordered_event_refs.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_ORDERED_EVENTS,
      message: 'ordered_event_refs empty',
    });
  }

  if (!inRange01(ch.sequence_completeness_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_SCORE_OUT_OF_RANGE,
      message:
        `sequence_completeness_score out of [0,1]: ${ch.sequence_completeness_score}`,
    });
  }
  if (!inRange01(ch.ambiguity_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_SCORE_OUT_OF_RANGE,
      message: `ambiguity_score out of [0,1]: ${ch.ambiguity_score}`,
    });
  }

  if (!ch.causal_confidence_class) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_CAUSAL_CLASS,
      message: 'causal_confidence_class missing',
    });
  }
  if (!ch.chain_integrity_flags) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_INTEGRITY_FLAGS,
      message: 'chain_integrity_flags missing',
    });
  }

  // Temporal bounds
  if (!ch.chain_start_at || !ISO_TS.test(ch.chain_start_at)) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_ORDERED_EVENTS,
      message: `chain_start_at missing or not ISO-8601: ${ch.chain_start_at}`,
    });
  }
  if (!ch.chain_end_at || !ISO_TS.test(ch.chain_end_at)) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_ORDERED_EVENTS,
      message: `chain_end_at missing or not ISO-8601: ${ch.chain_end_at}`,
    });
  }
  if (ch.chain_start_at && ch.chain_end_at &&
      ISO_TS.test(ch.chain_start_at) && ISO_TS.test(ch.chain_end_at) &&
      Date.parse(ch.chain_start_at) > Date.parse(ch.chain_end_at)) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_ORDERED_EVENTS,
      message:
        `chain_start_at ${ch.chain_start_at} > chain_end_at ${ch.chain_end_at}`,
    });
  }

  // Decay profile ref required on chain (§9.3.5.3)
  if (!ch.decay_profile_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_ORDERED_EVENTS,
      message: 'decay_profile_ref missing',
    });
  }

  // Lineage + replay
  if (!ch.lineage_refs || !ch.lineage_refs.trace_id ||
      !ch.lineage_refs.manifest_id) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }
  if (!ch.replay_hash) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  // §9.3.5.4: chain may not be emitted as clean when integrity damage is
  // material. A chain is "claiming clean" when its completeness score
  // would justify a clean-single emission (≥ 0.9). A chain is
  // "damaged" when either (a) any integrity flag is set or (b) the
  // completeness score itself is materially low (< 0.7). Those two
  // pathways can co-occur (high score + flags) because a chain author
  // may report a score that ignores the flags — that is exactly the
  // offender pattern L9.3.5.4 forbids.
  const flagsDamaged =
    !!ch.chain_integrity_flags && ch.chain_integrity_flags.length > 0;
  const scoreLow = inRange01(ch.sequence_completeness_score) &&
    ch.sequence_completeness_score < 0.7;
  const claimsClean = inRange01(ch.sequence_completeness_score) &&
    ch.sequence_completeness_score >= 0.9;
  if ((flagsDamaged && claimsClean) || (scoreLow && flagsDamaged)) {
    issues.push({
      code: L9SequenceContractViolationCode.CHAIN_CLEAN_WHILE_DAMAGED,
      message:
        'chain reports clean-eligible completeness while integrity flags indicate damage',
    });
  }

  return { valid: issues.length === 0, issues };
}
