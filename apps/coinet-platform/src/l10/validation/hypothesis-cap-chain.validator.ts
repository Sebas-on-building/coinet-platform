/**
 * L10.7 — Hypothesis Cap-Chain Validator
 *
 * §10.7.6 — Validates that a cap chain is explicit, ordered, narrowing
 * only (INV-10.7-C), that every applied cap is a registered reason
 * (§10.7.6.3), that precedence is respected (§10.7.6.4), that the
 * `tightest_cap` and `dominant_cap_reason` are consistent with
 * `post_cap_score` (§10.7.6.5), and that raw scores never survive
 * above the cap ceiling (§10.7.6.6).
 */

import {
  ALL_L10_HYPOTHESIS_CAP_READINESS_HINTS,
  ALL_L10_HYPOTHESIS_CAP_REASONS,
  L10HypothesisCapChain,
  L10HypothesisCapReason,
  L10_HYPOTHESIS_CAP_CEILING,
  L10_HYPOTHESIS_CAP_DOMINANCE_RANK,
  compareL10HypothesisCapDominance,
  dominantL10HypothesisCap,
  l10HypothesisCapReadinessHintFor,
  tightestL10HypothesisCap,
} from '../contracts/hypothesis-cap-chain';
import {
  L10HypothesisRelianceValidationError,
  L10HypothesisRelianceViolation,
  L10HypothesisRelianceViolationCode,
  L10HypothesisRelianceViolationTier,
} from './l10-reliance-violation-codes';

export interface L10HypothesisCapChainValidationInput {
  readonly chain: L10HypothesisCapChain;
  /** §10.7.6.6 — caps the evaluator says must be applied. */
  readonly required_caps?: readonly L10HypothesisCapReason[];
}

export interface L10HypothesisCapChainValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L10HypothesisRelianceViolation[];
}

function v(
  code: L10HypothesisRelianceViolationCode,
  detail: string,
  refs?: readonly string[],
): L10HypothesisRelianceViolation {
  return {
    code,
    tier: L10HypothesisRelianceViolationTier.CAP_CHAIN,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

export function validateL10HypothesisCapChain(
  input: L10HypothesisCapChainValidationInput,
): L10HypothesisCapChainValidationResult {
  const c = input.chain;
  const violations: L10HypothesisRelianceViolation[] = [];

  const seen = new Set<L10HypothesisCapReason>();
  for (const reason of c.applied_cap_reasons) {
    if (!ALL_L10_HYPOTHESIS_CAP_REASONS.includes(reason)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CAP_REASON_UNREGISTERED,
          `cap_reason ${reason} not a registered L10.7 cap reason`,
          [String(reason)]));
      continue;
    }
    if (seen.has(reason)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CAP_DUPLICATE_REASON,
          `cap_reason ${reason} applied more than once`,
          [String(reason)]));
    }
    seen.add(reason);
  }

  // §10.7.6.4 — applied caps must be ordered by dominance ascending.
  for (let i = 1; i < c.applied_cap_reasons.length; i++) {
    const prev = c.applied_cap_reasons[i - 1];
    const cur = c.applied_cap_reasons[i];
    if (
      ALL_L10_HYPOTHESIS_CAP_REASONS.includes(prev) &&
      ALL_L10_HYPOTHESIS_CAP_REASONS.includes(cur) &&
      compareL10HypothesisCapDominance(prev, cur) > 0
    ) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CAP_PRECEDENCE_VIOLATED,
          `applied_cap_reasons out of dominance order: ${prev} after ${cur}`,
          [String(prev), String(cur)]));
    }
  }

  // §10.7.6.5 — edges must reference registered reasons and match the
  // frozen ceiling / rank tables.
  for (const e of c.edges) {
    if (!ALL_L10_HYPOTHESIS_CAP_REASONS.includes(e.cap_reason)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CAP_REASON_UNREGISTERED,
          `cap edge references unregistered reason ${e.cap_reason}`,
          [String(e.cap_reason)]));
      continue;
    }
    const expectedCeil = L10_HYPOTHESIS_CAP_CEILING[e.cap_reason];
    if (Math.abs(e.narrows_to - expectedCeil) > 1e-9) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CAP_EDGE_CEILING_MISMATCH,
          `edge ${e.cap_reason} narrows_to=${e.narrows_to} does not match ` +
            `ceiling=${expectedCeil}`,
          [String(e.cap_reason)]));
    }
    const expectedRank = L10_HYPOTHESIS_CAP_DOMINANCE_RANK[e.cap_reason];
    if (e.dominance_rank !== expectedRank) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CAP_EDGE_RANK_MISMATCH,
          `edge ${e.cap_reason} dominance_rank=${e.dominance_rank} does not ` +
            `match canonical ${expectedRank}`,
          [String(e.cap_reason)]));
    }
  }

  // §10.7.6.6 — post_cap must not exceed tightest ceiling or pre_cap.
  const validApplied = c.applied_cap_reasons.filter(r =>
    ALL_L10_HYPOTHESIS_CAP_REASONS.includes(r),
  );
  const tightest = tightestL10HypothesisCap(validApplied);
  if (tightest !== null) {
    const ceil = L10_HYPOTHESIS_CAP_CEILING[tightest];
    if (c.post_cap_score > ceil + 1e-9) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CAP_POST_CAP_EXCEEDS_CEILING,
          `post_cap_score=${c.post_cap_score} exceeds tightest ceiling ` +
            `${ceil} (${tightest})`));
    }
    if (c.tightest_cap !== tightest) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CAP_TIGHTEST_INCONSISTENT,
          `tightest_cap=${c.tightest_cap} does not match computed ${tightest}`));
    }
  } else if (c.tightest_cap !== null) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CAP_TIGHTEST_INCONSISTENT,
        `no applied caps but tightest_cap=${c.tightest_cap} declared`));
  }

  const dominant = dominantL10HypothesisCap(validApplied);
  if (dominant !== c.dominant_cap_reason) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CAP_DOMINANT_INCONSISTENT,
        `dominant_cap_reason=${c.dominant_cap_reason} does not match ` +
          `computed ${dominant}`));
  }

  if (c.post_cap_score > c.pre_cap_score + 1e-9) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CAP_POST_CAP_EXCEEDS_PRE_CAP,
        `post_cap_score=${c.post_cap_score} exceeds pre_cap_score=` +
          `${c.pre_cap_score}; caps may only narrow (INV-10.7-C)`));
  }

  // §10.7.6.6 — declarative widening: a cap chain widens iff the
  // composed post-cap score ends up above pre-cap, which is already
  // covered by CAP_POST_CAP_EXCEEDS_PRE_CAP. Non-binding ceilings
  // (edge.narrows_to > pre_cap because pre_cap was already lower) are
  // NOT widening — they are legal caps that simply do not bind. The
  // engine is allowed to surface them for auditability (§10.7.6.5).

  // §10.7.6.6 — required caps must be present.
  if (input.required_caps) {
    for (const r of input.required_caps) {
      if (!seen.has(r)) {
        violations.push(
          v(L10HypothesisRelianceViolationCode.CAP_REQUIRED_CAP_MISSING,
            `required cap ${r} not applied`,
            [String(r)]));
      }
    }
  }

  // §10.7.6.5 — readiness hint consistency.
  if (!ALL_L10_HYPOTHESIS_CAP_READINESS_HINTS.includes(c.readiness_hint)) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CAP_READINESS_HINT_INCONSISTENT,
        `readiness_hint ${c.readiness_hint} not registered`));
  } else {
    const expected = l10HypothesisCapReadinessHintFor(c);
    if (expected !== c.readiness_hint) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CAP_READINESS_HINT_INCONSISTENT,
          `readiness_hint=${c.readiness_hint} does not match derived ` +
            `${expected} for post_cap=${c.post_cap_score}/caps=` +
            c.applied_cap_reasons.join(',')));
    }
  }

  return { ok: violations.length === 0, violations };
}

export function assertL10HypothesisCapChainLegal(
  input: L10HypothesisCapChainValidationInput,
): void {
  const r = validateL10HypothesisCapChain(input);
  if (!r.ok) throw new L10HypothesisRelianceValidationError(r.violations);
}
