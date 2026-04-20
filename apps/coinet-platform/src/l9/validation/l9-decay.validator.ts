/**
 * L9.5 — Decay Validator
 *
 * §9.5.8 — Enforces decay law: scores bounded, dominance banding
 * matches score, refresh candidates are governed, and illegal postures
 * (zero-decay under contradiction, still-early under decay, etc.) are
 * rejected.
 */

import {
  L9DecayClass,
  L9DecayProfile,
} from '../contracts/decay-profile';
import {
  L9DecayDominance,
  L9DecayFactor,
  L9RefreshCandidate,
  classifyL9DecayDominance,
  composeL9DecayScore,
  evaluateL9Refresh,
  l9IsDecayDominant,
  scanL9IllegalDecayPostures,
} from '../contracts/l9-decay-policy';
import { L9TemporalSemanticTier } from '../contracts/l9-temporal-semantics-types';
import {
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
  violation,
} from './l9-temporal-semantic-violation-codes';

export interface L9DecayValidationInput {
  readonly profile: L9DecayProfile;
  readonly contributions: Partial<Record<L9DecayFactor, number>>;
  readonly declared_dominance?: L9DecayDominance;
  /** Did the chain claim "still early" despite the decay score? */
  readonly claims_still_early?: boolean;
  /** Is there a dominant contradiction present elsewhere in the chain? */
  readonly has_dominant_contradiction?: boolean;
  /** Is a post-event shock still dominant? */
  readonly post_event_shock_still_dominant?: boolean;
  /** Is the chain claiming recovery? */
  readonly claims_recovery?: boolean;
  /** Did the engine substitute "stale" for "decayed"? (e.g. set decay=0 because data is fresh) */
  readonly staleness_substituted_for_decay?: boolean;
  readonly refresh_candidates?: readonly L9RefreshCandidate[];
}

export interface L9DecayValidationResult {
  readonly ok: boolean;
  readonly derived_dominance: L9DecayDominance;
  readonly derived_score: number;
  readonly violations: readonly L9TemporalSemanticViolation[];
}

export function validateL9Decay(
  input: L9DecayValidationInput,
): L9DecayValidationResult {
  const violations: L9TemporalSemanticViolation[] = [];
  const p = input.profile;

  if (!Number.isFinite(p.decay_score) ||
      p.decay_score < 0 || p.decay_score > 1) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.DECAY_SCORE_OUT_OF_RANGE,
      L9TemporalSemanticTier.DECAY,
      `decay_score=${p.decay_score} out of [0,1]`,
    ));
  }

  const derivedScore = composeL9DecayScore(input.contributions);
  const derivedDominance = classifyL9DecayDominance(p.decay_score);

  if (input.declared_dominance &&
      input.declared_dominance !== derivedDominance) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.DECAY_DOMINANCE_CLASS_MISMATCH,
      L9TemporalSemanticTier.DECAY,
      `declared dominance ${input.declared_dominance} != derived ${derivedDominance}`,
    ));
  }

  // §9.5.8.8 — illegal decay postures
  const postures = scanL9IllegalDecayPostures({
    decay_score: p.decay_score,
    decay_class: p.decay_class,
    has_dominant_contradiction: input.has_dominant_contradiction ?? false,
    claims_still_early: input.claims_still_early ?? false,
    contributions: input.contributions,
    post_event_shock_still_dominant:
      input.post_event_shock_still_dominant ?? false,
    claims_recovery: input.claims_recovery ?? false,
  });
  for (const reason of postures) {
    switch (reason) {
      case 'DECAY_ZERO_UNDER_DOMINANT_CONTRADICTION':
        violations.push(violation(
          L9TemporalSemanticViolationCode
            .DECAY_ZERO_UNDER_DOMINANT_CONTRADICTION,
          L9TemporalSemanticTier.DECAY,
          'zero/low decay reported under dominant contradiction',
        ));
        break;
      case 'STILL_EARLY_WHILE_MATERIALLY_DECAYED':
        violations.push(violation(
          L9TemporalSemanticViolationCode
            .DECAY_STILL_EARLY_WHILE_MATERIALLY_DECAYED,
          L9TemporalSemanticTier.DECAY,
          'chain claims "still early" while materially decayed',
        ));
        break;
      case 'FRESH_CLASS_WITH_HIGH_CONTRADICTION':
        violations.push(violation(
          L9TemporalSemanticViolationCode
            .DECAY_FRESH_CLASS_WITH_HIGH_CONTRADICTION,
          L9TemporalSemanticTier.DECAY,
          'decay class FRESH reported alongside high contradiction burden',
        ));
        break;
      case 'RECOVERY_CLAIM_WHILE_SHOCK_DOMINANT':
        violations.push(violation(
          L9TemporalSemanticViolationCode
            .DECAY_RECOVERY_CLAIM_WHILE_SHOCK_DOMINANT,
          L9TemporalSemanticTier.DECAY,
          'recovery claimed while post-event shock is still dominant',
        ));
        break;
    }
  }

  // §9.5.8.2 — staleness may not be substituted for decay
  if (input.staleness_substituted_for_decay) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.DECAY_STALENESS_SUBSTITUTED,
      L9TemporalSemanticTier.DECAY,
      'staleness substituted for decay (decay must be derived from factor contributions)',
    ));
  }

  // §9.5.8.6 — refresh candidates
  for (const c of input.refresh_candidates ?? []) {
    const ev = evaluateL9Refresh(c);
    if (ev.legal) continue;
    for (const r of ev.reasons) {
      switch (r) {
        case 'REFRESH_UNGOVERNED':
          violations.push(violation(
            L9TemporalSemanticViolationCode.DECAY_REFRESH_UNGOVERNED,
            L9TemporalSemanticTier.DECAY,
            `refresh candidate ${c.ref} is not governed`,
            [c.ref],
          ));
          break;
        case 'REFRESH_FAMILY_MISMATCH':
          violations.push(violation(
            L9TemporalSemanticViolationCode.DECAY_REFRESH_FAMILY_MISMATCH,
            L9TemporalSemanticTier.DECAY,
            `refresh candidate ${c.ref} does not match family`,
            [c.ref],
          ));
          break;
        case 'REFRESH_OUTSIDE_WINDOW':
          violations.push(violation(
            L9TemporalSemanticViolationCode.DECAY_REFRESH_OUTSIDE_WINDOW,
            L9TemporalSemanticTier.DECAY,
            `refresh candidate ${c.ref} falls outside refresh window`,
            [c.ref],
          ));
          break;
        case 'REFRESH_CONTRADICTION_NULLIFIES':
          violations.push(violation(
            L9TemporalSemanticViolationCode
              .DECAY_REFRESH_CONTRADICTION_NULLIFIES,
            L9TemporalSemanticTier.DECAY,
            `refresh candidate ${c.ref} nullified by contradiction`,
            [c.ref],
          ));
          break;
      }
    }
  }

  // suppress unused imports in tree-shaking builds
  void L9DecayClass;
  void l9IsDecayDominant;

  return {
    ok: violations.length === 0,
    derived_dominance: derivedDominance,
    derived_score: derivedScore,
    violations,
  };
}
