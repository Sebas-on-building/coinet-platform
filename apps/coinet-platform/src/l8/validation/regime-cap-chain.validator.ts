/**
 * L8.7 — Cap Chain Validator
 *
 * §8.7.7 — Enforces cap-chain law: precedence, value coherence, and
 * presence of required caps given the derivation context.
 */

import {
  L8RegimeCapChain,
  L8RegimeCapEntry,
  L8RegimeCapReason,
  compareL8CapReasonPrecedence,
  deriveL8CapChainReadinessHint,
  dominantL8CapReason,
} from '../contracts/regime-cap-chain';
import {
  L8RegimeRelianceViolationCode,
  L8RegimeRelianceViolation,
} from './l8-reliance-violation-codes';

export interface L8CapChainValidationInput {
  readonly cap_chain: L8RegimeCapChain;
  readonly required_cap_reasons: readonly L8RegimeCapReason[];
  readonly subject_ref?: string;
}

export interface L8CapChainValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L8RegimeRelianceViolation[];
}

function push(
  violations: L8RegimeRelianceViolation[],
  code: L8RegimeRelianceViolationCode,
  detail: string,
  subject_ref?: string,
): void {
  violations.push({ code, detail, subject_ref });
}

function inRange01(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1 + 1e-9;
}

/** §8.7.7 — Validate the cap chain against its declared context. */
export function validateRegimeCapChain(
  input: L8CapChainValidationInput,
): L8CapChainValidationResult {
  const { cap_chain: c, required_cap_reasons: required, subject_ref } = input;
  const violations: L8RegimeRelianceViolation[] = [];

  // §8.7.7.5 — score bounds and pre/capped coherence
  if (!inRange01(c.pre_cap_score)) {
    push(violations,
      L8RegimeRelianceViolationCode.CAP_CHAIN_PRE_CAP_OUT_OF_RANGE,
      `pre_cap_score=${c.pre_cap_score}`, subject_ref);
  }
  if (!inRange01(c.capped_score)) {
    push(violations,
      L8RegimeRelianceViolationCode.CAP_CHAIN_CAPPED_OUT_OF_RANGE,
      `capped_score=${c.capped_score}`, subject_ref);
  }
  if (c.capped_score > c.pre_cap_score + 1e-9) {
    push(violations,
      L8RegimeRelianceViolationCode.CAP_CHAIN_CAPPED_ABOVE_PRE_CAP,
      `capped=${c.capped_score} > pre=${c.pre_cap_score}`, subject_ref);
  }

  // §8.7.7.4 — dominant cap must exist iff any cap is applied, and must
  // be the highest-precedence applied cap.
  const applied = c.applied_caps.filter(x => x.applied);
  const computedDominant = dominantL8CapReason(c.applied_caps);
  if (applied.length === 0) {
    if (c.dominant_cap_reason !== null) {
      push(violations,
        L8RegimeRelianceViolationCode.CAP_CHAIN_DOMINANT_NOT_IN_APPLIED,
        `dominant=${c.dominant_cap_reason} but no caps applied`, subject_ref);
    }
  } else {
    if (c.dominant_cap_reason === null) {
      push(violations,
        L8RegimeRelianceViolationCode.CAP_CHAIN_MISSING_DOMINANT,
        `caps applied=${applied.length} but dominant is null`, subject_ref);
    } else if (c.dominant_cap_reason !== computedDominant) {
      push(violations,
        L8RegimeRelianceViolationCode.CAP_CHAIN_DOMINANT_WRONG_PRECEDENCE,
        `dominant=${c.dominant_cap_reason} expected=${computedDominant}`,
        subject_ref);
    }
    if (!applied.some(a => a.cap_reason === c.dominant_cap_reason)) {
      push(violations,
        L8RegimeRelianceViolationCode.CAP_CHAIN_DOMINANT_NOT_IN_APPLIED,
        `dominant=${c.dominant_cap_reason} not in applied list`, subject_ref);
    }
  }

  // §8.7.7.6 — required caps must all be present in applied=true form.
  for (const r of required) {
    if (!applied.some(a => a.cap_reason === r)) {
      push(violations,
        L8RegimeRelianceViolationCode.CAP_CHAIN_REQUIRED_CAP_MISSING,
        `required cap '${r}' not applied`, subject_ref);
    }
  }

  // §8.7.7.5 — no duplicate cap reasons in applied set.
  const seen = new Set<L8RegimeCapReason>();
  for (const a of c.applied_caps) {
    if (!a.applied) continue;
    if (seen.has(a.cap_reason)) {
      push(violations,
        L8RegimeRelianceViolationCode.CAP_CHAIN_DUPLICATE_REASON,
        `duplicate applied cap '${a.cap_reason}'`, subject_ref);
    }
    seen.add(a.cap_reason);
  }

  // §8.7.7.5 — per-entry coherence: max_after_cap in [0, pre_cap], and
  // capped_score ≤ min(max_after_cap) across applied caps.
  let tightestCap = Number.POSITIVE_INFINITY;
  for (const a of c.applied_caps) {
    if (!Number.isFinite(a.max_after_cap) ||
        a.max_after_cap < 0 || a.max_after_cap > 1 + 1e-9) {
      push(violations,
        L8RegimeRelianceViolationCode.CAP_CHAIN_CAP_VALUE_INCOHERENT,
        `cap ${a.cap_reason} max_after_cap=${a.max_after_cap}`, subject_ref);
      continue;
    }
    if (a.applied) tightestCap = Math.min(tightestCap, a.max_after_cap);
  }
  if (Number.isFinite(tightestCap) &&
      c.capped_score > tightestCap + 1e-9) {
    push(violations,
      L8RegimeRelianceViolationCode.CAP_CHAIN_CAP_VALUE_INCOHERENT,
      `capped=${c.capped_score} exceeds tightest cap=${tightestCap}`,
      subject_ref);
  }

  // §8.7.7.5 — readiness_hint must match the derivation rule.
  const expectedHint = deriveL8CapChainReadinessHint(
    c.pre_cap_score, c.capped_score, c.applied_caps,
  );
  if (c.readiness_hint !== expectedHint) {
    push(violations,
      L8RegimeRelianceViolationCode.CAP_CHAIN_READINESS_HINT_WRONG,
      `hint=${c.readiness_hint} expected=${expectedHint}`, subject_ref);
  }

  // §8.7.7.4 — precedence sanity: if multiple caps are applied, the
  // first by precedence ordering must be at or before the dominant.
  if (applied.length > 1 && c.dominant_cap_reason !== null) {
    const sorted = [...applied].sort((a, b) =>
      compareL8CapReasonPrecedence(a.cap_reason, b.cap_reason));
    if (sorted[0].cap_reason !== c.dominant_cap_reason) {
      push(violations,
        L8RegimeRelianceViolationCode.CAP_CHAIN_DOMINANT_WRONG_PRECEDENCE,
        `dominant=${c.dominant_cap_reason} top-precedence=${sorted[0].cap_reason}`,
        subject_ref);
    }
  }

  return { ok: violations.length === 0, violations };
}

export function validateRegimeCapEntries(
  entries: readonly L8RegimeCapEntry[],
  subject_ref?: string,
): L8CapChainValidationResult {
  const violations: L8RegimeRelianceViolation[] = [];
  for (const e of entries) {
    if (!Number.isFinite(e.max_after_cap) ||
        e.max_after_cap < 0 || e.max_after_cap > 1 + 1e-9) {
      push(violations,
        L8RegimeRelianceViolationCode.CAP_CHAIN_CAP_VALUE_INCOHERENT,
        `cap=${e.cap_id} max_after_cap=${e.max_after_cap}`, subject_ref);
    }
  }
  return { ok: violations.length === 0, violations };
}
