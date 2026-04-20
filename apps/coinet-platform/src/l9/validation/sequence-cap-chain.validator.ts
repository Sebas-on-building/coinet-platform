/**
 * L9.7 — Sequence Cap-Chain Validator
 *
 * §9.7.5 — Validates that a cap chain is explicit, ordered, narrowing
 * only (INV-9.7-C), that every applied cap is a registered reason
 * (§9.7.5.3), that precedence is respected (§9.7.5.4), that the
 * `tightest_cap` is consistent with `post_cap_score` (§9.7.5.5), and
 * that raw scores never survive above the cap ceiling (§9.7.5.6).
 */

import {
  ALL_L9_SEQUENCE_CAP_READINESS_HINTS,
  ALL_L9_SEQUENCE_CAP_REASONS,
  L9SequenceCapChain,
  L9SequenceCapEdge,
  L9SequenceCapReadinessHint,
  L9SequenceCapReason,
  L9_SEQUENCE_CAP_CEILING,
  L9_SEQUENCE_CAP_DOMINANCE_RANK,
  compareL9SequenceCapDominance,
  tightestL9SequenceCap,
} from '../contracts/l9_7-sequence-cap-chain';
import {
  L9SequenceRelianceValidationError,
  L9SequenceRelianceViolation,
  L9SequenceRelianceViolationCode,
  L9SequenceRelianceViolationTier,
} from './l9-reliance-violation-codes';

export interface L9SequenceCapChainValidationInput {
  readonly chain: L9SequenceCapChain;
  /** §9.7.5.6 — caps the evaluator says must be applied. */
  readonly required_caps?: readonly L9SequenceCapReason[];
}

export interface L9SequenceCapChainValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9SequenceRelianceViolation[];
}

function v(
  code: L9SequenceRelianceViolationCode,
  detail: string,
  refs?: readonly string[],
): L9SequenceRelianceViolation {
  return {
    code,
    tier: L9SequenceRelianceViolationTier.CAP_CHAIN,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL9SequenceCapChain(
  input: L9SequenceCapChainValidationInput,
): L9SequenceCapChainValidationResult {
  const c = input.chain;
  const violations: L9SequenceRelianceViolation[] = [];

  const seen = new Set<L9SequenceCapReason>();
  for (const reason of c.applied_cap_reasons) {
    if (!ALL_L9_SEQUENCE_CAP_REASONS.includes(reason)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_REASON_UNREGISTERED,
          `cap_reason ${reason} not a registered L9.7 cap reason`,
          [String(reason)]));
      continue;
    }
    if (seen.has(reason)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_DUPLICATE_REASON,
          `cap_reason ${reason} applied more than once`,
          [String(reason)]));
    }
    seen.add(reason);
  }

  // §9.7.5.4 — applied caps must be ordered by dominance ascending.
  for (let i = 1; i < c.applied_cap_reasons.length; i++) {
    const prev = c.applied_cap_reasons[i - 1];
    const cur = c.applied_cap_reasons[i];
    if (compareL9SequenceCapDominance(prev, cur) > 0) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_PRECEDENCE_VIOLATED,
          `applied_cap_reasons out of dominance order: ${prev} after ${cur}`,
          [String(prev), String(cur)]));
    }
  }

  // §9.7.5.5 — edges must reference only registered reasons and be
  // consistent with the ceiling table.
  for (const e of c.edges) {
    if (!ALL_L9_SEQUENCE_CAP_REASONS.includes(e.cap_reason)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_REASON_UNREGISTERED,
          `cap edge references unregistered reason ${e.cap_reason}`,
          [String(e.cap_reason)]));
      continue;
    }
    const expectedCeil = L9_SEQUENCE_CAP_CEILING[e.cap_reason];
    if (Math.abs(e.narrows_to - expectedCeil) > 1e-9) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_POST_CAP_EXCEEDS_CEILING,
          `edge ${e.cap_reason} narrows_to=${e.narrows_to} does not match ` +
            `ceiling=${expectedCeil}`,
          [String(e.cap_reason)]));
    }
    const expectedRank = L9_SEQUENCE_CAP_DOMINANCE_RANK[e.cap_reason];
    if (e.dominance_rank !== expectedRank) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_PRECEDENCE_VIOLATED,
          `edge ${e.cap_reason} dominance_rank=${e.dominance_rank} does not ` +
            `match canonical ${expectedRank}`,
          [String(e.cap_reason)]));
    }
  }

  // §9.7.5.6 — post_cap must not exceed tightest ceiling or pre_cap.
  const tightest = tightestL9SequenceCap(c.applied_cap_reasons);
  if (tightest !== null) {
    const ceil = L9_SEQUENCE_CAP_CEILING[tightest];
    if (c.post_cap_score > ceil + 1e-9) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_POST_CAP_EXCEEDS_CEILING,
          `post_cap_score=${c.post_cap_score} exceeds tightest ceiling ` +
            `${ceil} (${tightest})`));
    }
    if (c.tightest_cap !== tightest) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_TIGHTEST_INCONSISTENT,
          `tightest_cap=${c.tightest_cap} does not match computed ${tightest}`));
    }
  } else if (c.tightest_cap !== null) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CAP_TIGHTEST_INCONSISTENT,
        `no applied caps but tightest_cap=${c.tightest_cap} declared`));
  }

  if (c.post_cap_score > c.pre_cap_score + 1e-9) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CAP_POST_CAP_EXCEEDS_PRE_CAP,
        `post_cap_score=${c.post_cap_score} exceeds pre_cap_score=` +
          `${c.pre_cap_score}; caps may only narrow (INV-9.7-C)`));
  }

  // §9.7.5.6 — widening attempts: any edge narrows_to > pre_cap is an
  // implicit widening (the edge allows *more* than was before).
  for (const e of c.edges) {
    if (e.narrows_to > c.pre_cap_score + 1e-9 && c.pre_cap_score < 1) {
      // Only flag when the cap is *intended* to bite. If the ceiling
      // is above pre_cap, the cap is inert; but a chain that declares
      // such an inert edge should still be marked.
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_WIDENING_ATTEMPTED,
          `edge ${e.cap_reason} narrows_to=${e.narrows_to} does not ` +
            `narrow pre_cap=${c.pre_cap_score}`,
          [String(e.cap_reason)]));
    }
  }

  // §9.7.5.6 — required caps must be present.
  if (input.required_caps) {
    for (const r of input.required_caps) {
      if (!seen.has(r)) {
        violations.push(
          v(L9SequenceRelianceViolationCode.CAP_REQUIRED_CAP_MISSING,
            `required cap ${r} not applied`,
            [String(r)]));
      }
    }
  }

  // §9.7.5.5 — readiness hint consistency
  if (!ALL_L9_SEQUENCE_CAP_READINESS_HINTS.includes(c.readiness_hint)) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CAP_READINESS_HINT_INCONSISTENT,
        `readiness_hint ${c.readiness_hint} not registered`));
  } else {
    const expected = deriveHint(c);
    if (expected !== c.readiness_hint) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CAP_READINESS_HINT_INCONSISTENT,
          `readiness_hint=${c.readiness_hint} does not match derived ` +
            `${expected} for post_cap=${c.post_cap_score}/caps=` +
            c.applied_cap_reasons.join(',')));
    }
  }

  return { ok: violations.length === 0, violations };
}

export function assertL9SequenceCapChainLegal(
  input: L9SequenceCapChainValidationInput,
): void {
  const r = validateL9SequenceCapChain(input);
  if (!r.ok) throw new L9SequenceRelianceValidationError(r.violations);
}

/**
 * §9.7.5.5 — Canonical hint derivation. Matches the engine's
 * emission so validator and engine agree by construction.
 */
function deriveHint(c: L9SequenceCapChain): L9SequenceCapReadinessHint {
  if (c.applied_cap_reasons.length === 0) {
    return L9SequenceCapReadinessHint.CLEAN;
  }
  if (c.post_cap_score < 0.35) return L9SequenceCapReadinessHint.BLOCKED;
  if (c.post_cap_score < 0.55) return L9SequenceCapReadinessHint.HEAVILY_NARROWED;
  return L9SequenceCapReadinessHint.NARROWED;
}

/**
 * §9.7.5.5 — Public helper so the engine can call the same derivation.
 */
export function l9SequenceCapReadinessHintFor(
  chain: L9SequenceCapChain,
): L9SequenceCapReadinessHint {
  return deriveHint(chain);
}
