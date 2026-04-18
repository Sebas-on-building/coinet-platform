/**
 * L8.2 — Regime Coexistence Law
 *
 * §8.2.9 — Multi-regime coexistence is explicit and governed. A regime
 * engine that forces one flat label becomes weak fast.
 *
 * §8.2.9.2 — Two kinds of coexistence:
 *   A. Cross-family coexistence (different families may coexist cleanly)
 *   B. Intra-family coexistence (within one family, constrained)
 *
 * §8.2.9.6 — Certain intra-family pairings are illegal or must be
 * reclassified to TRANSITIONAL_OVERLAP / AMBIGUOUS_MULTI_CANDIDATE.
 */

import { L8RegimeFamily } from './regime-family';
import {
  L8RegimeClass,
  L8MacroRegimeClass,
  L8CryptoStructureRegimeClass,
  L8TokenRegimeClass,
  L8EcosystemRegimeClass,
} from './regime-class';
import { L8RegimeCoexistenceClass } from './regime-state';

/**
 * §8.2.9.7 — Coexistence rule. Three kinds of rules matter:
 *
 *   ALLOWED          — may coexist as primary+secondary cleanly
 *   TRANSITION_ONLY  — may only coexist under TRANSITIONAL_OVERLAP
 *   AMBIGUITY_ONLY   — may only coexist under AMBIGUOUS_MULTI_CANDIDATE
 *   ILLEGAL          — may never coexist as clean simultaneous primaries
 */
export type L8CoexistenceRuleKind =
  | 'ALLOWED'
  | 'TRANSITION_ONLY'
  | 'AMBIGUITY_ONLY'
  | 'ILLEGAL';

/**
 * §8.2.9.7 — A coexistence rule pairs two regime classes within one
 * family. Pairs are commutative; the validator checks both orderings.
 */
export interface L8CoexistenceRule {
  readonly family: L8RegimeFamily;
  readonly pair: readonly [L8RegimeClass, L8RegimeClass];
  readonly kind: L8CoexistenceRuleKind;
  readonly reason: string;
}

/**
 * §8.2.9.6 + §8.2.4 / §8.2.5 / §8.2.6 / §8.2.7 — Frozen coexistence
 * rulebook.
 *
 * Any intra-family pair that does not match an ALLOWED rule is rejected
 * unless the engine explicitly marks the state as TRANSITIONAL_OVERLAP
 * or AMBIGUOUS_MULTI_CANDIDATE per a TRANSITION_ONLY / AMBIGUITY_ONLY
 * rule.
 */
export const L8_COEXISTENCE_RULES: readonly L8CoexistenceRule[] = [
  // ── MACRO (§8.2.4 / §8.2.9.6) ──
  {
    family: L8RegimeFamily.MACRO,
    pair: [L8MacroRegimeClass.RISK_ON, L8MacroRegimeClass.RISK_OFF],
    kind: 'ILLEGAL',
    reason: 'Macro RISK_ON and RISK_OFF cannot be simultaneous primary states',
  },
  {
    family: L8RegimeFamily.MACRO,
    pair: [L8MacroRegimeClass.RISK_ON, L8MacroRegimeClass.TRANSITION],
    kind: 'TRANSITION_ONLY',
    reason: 'RISK_ON + TRANSITION only valid under transitional overlap',
  },
  {
    family: L8RegimeFamily.MACRO,
    pair: [L8MacroRegimeClass.RISK_OFF, L8MacroRegimeClass.TRANSITION],
    kind: 'TRANSITION_ONLY',
    reason: 'RISK_OFF + TRANSITION only valid under transitional overlap',
  },
  {
    family: L8RegimeFamily.MACRO,
    pair: [L8MacroRegimeClass.CHOP, L8MacroRegimeClass.TRANSITION],
    kind: 'AMBIGUITY_ONLY',
    reason: 'CHOP + TRANSITION must remain ambiguity-preserving',
  },
  {
    family: L8RegimeFamily.MACRO,
    pair: [L8MacroRegimeClass.RISK_ON, L8MacroRegimeClass.CHOP],
    kind: 'AMBIGUITY_ONLY',
    reason: 'RISK_ON + CHOP must remain ambiguity-preserving',
  },
  {
    family: L8RegimeFamily.MACRO,
    pair: [L8MacroRegimeClass.RISK_OFF, L8MacroRegimeClass.CHOP],
    kind: 'AMBIGUITY_ONLY',
    reason: 'RISK_OFF + CHOP must remain ambiguity-preserving',
  },

  // ── CRYPTO_STRUCTURE (§8.2.5) ──
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    pair: [
      L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION,
      L8CryptoStructureRegimeClass.DELEVERAGING,
    ],
    kind: 'ILLEGAL',
    reason: 'Spot-led expansion and deleveraging are structurally opposed',
  },
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    pair: [
      L8CryptoStructureRegimeClass.LEVERAGE_LED_EXPANSION,
      L8CryptoStructureRegimeClass.DELEVERAGING,
    ],
    kind: 'TRANSITION_ONLY',
    reason: 'Leverage expansion→deleveraging requires explicit transition',
  },
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    pair: [
      L8CryptoStructureRegimeClass.LEVERAGE_LED_EXPANSION,
      L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY,
    ],
    kind: 'ALLOWED',
    reason: 'Leverage expansion often coexists with thin-liquidity fragility',
  },
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    pair: [
      L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION,
      L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY,
    ],
    kind: 'AMBIGUITY_ONLY',
    reason:
      'Spot-led expansion coexisting with thin-liquidity fragility must remain ambiguous',
  },
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    pair: [
      L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION,
      L8CryptoStructureRegimeClass.LEVERAGE_LED_EXPANSION,
    ],
    kind: 'AMBIGUITY_ONLY',
    reason: 'Spot-led and leverage-led expansion coexist only ambiguously',
  },

  // ── TOKEN_SPECIFIC (§8.2.6.5 — lifecycle integrity) ──
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.LAUNCH_DISCOVERY, L8TokenRegimeClass.MATURE_TREND],
    kind: 'ILLEGAL',
    reason: 'Launch discovery and mature trend are incompatible lifecycle states',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.LAUNCH_DISCOVERY, L8TokenRegimeClass.DISTRIBUTION],
    kind: 'ILLEGAL',
    reason: 'Launch discovery and distribution are incompatible lifecycle states',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.LAUNCH_DISCOVERY, L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE],
    kind: 'ILLEGAL',
    reason: 'Launch discovery and late-stage blowoff cannot coexist as primaries',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.EARLY_ACCUMULATION, L8TokenRegimeClass.DISTRIBUTION],
    kind: 'ILLEGAL',
    reason: 'Early accumulation and distribution cannot coexist as primaries',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.EARLY_ACCUMULATION, L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE],
    kind: 'ILLEGAL',
    reason: 'Early accumulation and late-stage blowoff cannot coexist',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.MATURE_TREND, L8TokenRegimeClass.DISTRIBUTION],
    kind: 'TRANSITION_ONLY',
    reason: 'Mature trend → distribution requires explicit transition posture',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.MATURE_TREND, L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE],
    kind: 'TRANSITION_ONLY',
    reason: 'Mature trend → late-stage blowoff requires explicit transition',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.NARRATIVE_BREAKOUT, L8TokenRegimeClass.POST_UNLOCK_DIGESTION],
    kind: 'AMBIGUITY_ONLY',
    reason: 'Narrative breakout overlapping post-unlock digestion stays ambiguous',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.EARLY_ACCUMULATION, L8TokenRegimeClass.NARRATIVE_BREAKOUT],
    kind: 'ALLOWED',
    reason:
      'Early accumulation often precedes and briefly coexists with narrative breakout',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.NARRATIVE_BREAKOUT, L8TokenRegimeClass.MATURE_TREND],
    kind: 'TRANSITION_ONLY',
    reason: 'Narrative breakout → mature trend requires explicit transition',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    pair: [L8TokenRegimeClass.POST_UNLOCK_DIGESTION, L8TokenRegimeClass.DISTRIBUTION],
    kind: 'TRANSITION_ONLY',
    reason: 'Post-unlock digestion → distribution requires explicit transition',
  },

  // ── ECOSYSTEM (§8.2.7) ──
  {
    family: L8RegimeFamily.ECOSYSTEM,
    pair: [L8EcosystemRegimeClass.CHAIN_EXPANSION, L8EcosystemRegimeClass.CHAIN_CONTRACTION],
    kind: 'ILLEGAL',
    reason: 'Chain expansion and chain contraction cannot coexist as primaries',
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    pair: [L8EcosystemRegimeClass.CHAIN_EXPANSION, L8EcosystemRegimeClass.SECTOR_ROTATION],
    kind: 'ALLOWED',
    reason: 'Chain expansion often coexists with sector rotation',
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    pair: [L8EcosystemRegimeClass.CHAIN_EXPANSION, L8EcosystemRegimeClass.L2_ATTENTION_SHIFT],
    kind: 'ALLOWED',
    reason: 'Chain expansion often coexists with L2 attention shift',
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    pair: [L8EcosystemRegimeClass.SECTOR_ROTATION, L8EcosystemRegimeClass.MEMECOIN_MANIA],
    kind: 'ALLOWED',
    reason: 'Memecoin mania often emerges during broader sector rotation',
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    pair: [L8EcosystemRegimeClass.SECTOR_ROTATION, L8EcosystemRegimeClass.DEFI_RERATING],
    kind: 'ALLOWED',
    reason: 'DeFi rerating can be one observable form of sector rotation',
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    pair: [L8EcosystemRegimeClass.MEMECOIN_MANIA, L8EcosystemRegimeClass.DEFI_RERATING],
    kind: 'AMBIGUITY_ONLY',
    reason: 'Memecoin mania and DeFi rerating coexist only ambiguously',
  },
];

/**
 * Commutative pair lookup.
 */
function pairEquals(
  a: readonly [L8RegimeClass, L8RegimeClass],
  b: readonly [L8RegimeClass, L8RegimeClass],
): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

/**
 * Returns the rule governing a regime pair within a family. If no rule
 * is declared, the pair is implicitly ALLOWED for that family.
 */
export function getCoexistenceRule(
  family: L8RegimeFamily,
  a: L8RegimeClass,
  b: L8RegimeClass,
): L8CoexistenceRule | undefined {
  return L8_COEXISTENCE_RULES.find(
    r => r.family === family && pairEquals(r.pair, [a, b]),
  );
}

/**
 * §8.2.9.4 — Coexistence decision against a declared coexistence class.
 * Returns whether the declared class is consistent with the rule.
 */
export interface L8CoexistenceDecision {
  readonly allowed: boolean;
  readonly declaredClass: L8RegimeCoexistenceClass;
  readonly requiredClass: L8RegimeCoexistenceClass | null;
  readonly rule: L8CoexistenceRule | null;
  readonly reason: string;
}

export function decideCoexistence(
  family: L8RegimeFamily,
  primary: L8RegimeClass,
  secondary: L8RegimeClass | null,
  declared: L8RegimeCoexistenceClass,
): L8CoexistenceDecision {
  // No secondary — must be CLEAN_SINGLE.
  if (secondary === null) {
    if (declared === L8RegimeCoexistenceClass.CLEAN_SINGLE) {
      return {
        allowed: true,
        declaredClass: declared,
        requiredClass: L8RegimeCoexistenceClass.CLEAN_SINGLE,
        rule: null,
        reason: 'no secondary declared',
      };
    }
    return {
      allowed: false,
      declaredClass: declared,
      requiredClass: L8RegimeCoexistenceClass.CLEAN_SINGLE,
      rule: null,
      reason:
        `secondary is null but coexistence_class=${declared} (must be CLEAN_SINGLE)`,
    };
  }

  // Secondary === primary is always illegal.
  if (primary === secondary) {
    return {
      allowed: false,
      declaredClass: declared,
      requiredClass: L8RegimeCoexistenceClass.ILLEGAL_COLLISION,
      rule: null,
      reason: 'secondary must differ from primary',
    };
  }

  const rule = getCoexistenceRule(family, primary, secondary);
  // No rule → implicitly allowed, CLEAN_SINGLE invalid because secondary
  // is declared.
  if (!rule) {
    if (declared === L8RegimeCoexistenceClass.CLEAN_SINGLE) {
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
        rule: null,
        reason:
          'secondary present but coexistence_class=CLEAN_SINGLE (must be PRIMARY_PLUS_SECONDARY)',
      };
    }
    if (declared === L8RegimeCoexistenceClass.ILLEGAL_COLLISION) {
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
        rule: null,
        reason: 'pair has no illegal rule declared',
      };
    }
    return {
      allowed: true,
      declaredClass: declared,
      requiredClass: null,
      rule: null,
      reason: 'no explicit rule — coexistence implicitly allowed',
    };
  }

  switch (rule.kind) {
    case 'ILLEGAL':
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L8RegimeCoexistenceClass.ILLEGAL_COLLISION,
        rule,
        reason: rule.reason,
      };
    case 'TRANSITION_ONLY':
      if (declared === L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP) {
        return {
          allowed: true,
          declaredClass: declared,
          requiredClass: L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP,
          rule,
          reason: rule.reason,
        };
      }
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP,
        rule,
        reason:
          `pair requires TRANSITIONAL_OVERLAP but declared ${declared}: ${rule.reason}`,
      };
    case 'AMBIGUITY_ONLY':
      if (declared === L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE) {
        return {
          allowed: true,
          declaredClass: declared,
          requiredClass: L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE,
          rule,
          reason: rule.reason,
        };
      }
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE,
        rule,
        reason:
          `pair requires AMBIGUOUS_MULTI_CANDIDATE but declared ${declared}: ${rule.reason}`,
      };
    case 'ALLOWED':
      if (declared === L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY ||
          declared === L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP ||
          declared === L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE) {
        return {
          allowed: true,
          declaredClass: declared,
          requiredClass: null,
          rule,
          reason: rule.reason,
        };
      }
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
        rule,
        reason:
          `ALLOWED pair cannot be declared ${declared}: ${rule.reason}`,
      };
  }
}

/**
 * Returns true if the primary+secondary within a family is strictly
 * ILLEGAL regardless of declared coexistence class.
 */
export function isIllegalIntraFamilyPair(
  family: L8RegimeFamily,
  primary: L8RegimeClass,
  secondary: L8RegimeClass,
): boolean {
  const rule = getCoexistenceRule(family, primary, secondary);
  return rule?.kind === 'ILLEGAL';
}
