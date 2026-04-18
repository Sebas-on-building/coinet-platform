/**
 * L8.2 — Regime Class Vocabulary
 *
 * §8.2.4 / §8.2.5 / §8.2.6 / §8.2.7 — Frozen regime-class vocabulary for
 * each of the four registered families. No regime class may exist outside
 * a registered family (§8.2.3.7).
 */

import { L8RegimeFamily, L8RegimeScopeType } from './regime-family';

/**
 * §8.2.4.1 — Macro regime classes.
 */
export enum L8MacroRegimeClass {
  RISK_ON = 'RISK_ON',
  RISK_OFF = 'RISK_OFF',
  TRANSITION = 'TRANSITION',
  CHOP = 'CHOP',
}

export const ALL_L8_MACRO_REGIME_CLASSES: readonly L8MacroRegimeClass[] =
  Object.values(L8MacroRegimeClass);

/**
 * §8.2.5.1 — Crypto-structure regime classes.
 */
export enum L8CryptoStructureRegimeClass {
  SPOT_LED_EXPANSION = 'SPOT_LED_EXPANSION',
  LEVERAGE_LED_EXPANSION = 'LEVERAGE_LED_EXPANSION',
  DELEVERAGING = 'DELEVERAGING',
  THIN_LIQUIDITY_FRAGILITY = 'THIN_LIQUIDITY_FRAGILITY',
}

export const ALL_L8_CRYPTO_STRUCTURE_REGIME_CLASSES:
  readonly L8CryptoStructureRegimeClass[] =
    Object.values(L8CryptoStructureRegimeClass);

/**
 * §8.2.6.1 — Token-specific regime classes.
 */
export enum L8TokenRegimeClass {
  LAUNCH_DISCOVERY = 'LAUNCH_DISCOVERY',
  EARLY_ACCUMULATION = 'EARLY_ACCUMULATION',
  NARRATIVE_BREAKOUT = 'NARRATIVE_BREAKOUT',
  MATURE_TREND = 'MATURE_TREND',
  BLOWOFF_REFLEXIVE_LATE_STAGE = 'BLOWOFF_REFLEXIVE_LATE_STAGE',
  DISTRIBUTION = 'DISTRIBUTION',
  POST_UNLOCK_DIGESTION = 'POST_UNLOCK_DIGESTION',
}

export const ALL_L8_TOKEN_REGIME_CLASSES: readonly L8TokenRegimeClass[] =
  Object.values(L8TokenRegimeClass);

/**
 * §8.2.7.1 — Ecosystem regime classes.
 */
export enum L8EcosystemRegimeClass {
  CHAIN_EXPANSION = 'CHAIN_EXPANSION',
  CHAIN_CONTRACTION = 'CHAIN_CONTRACTION',
  SECTOR_ROTATION = 'SECTOR_ROTATION',
  MEMECOIN_MANIA = 'MEMECOIN_MANIA',
  DEFI_RERATING = 'DEFI_RERATING',
  L2_ATTENTION_SHIFT = 'L2_ATTENTION_SHIFT',
}

export const ALL_L8_ECOSYSTEM_REGIME_CLASSES: readonly L8EcosystemRegimeClass[] =
  Object.values(L8EcosystemRegimeClass);

/**
 * Union of every registered regime class label across families.
 */
export type L8RegimeClass =
  | L8MacroRegimeClass
  | L8CryptoStructureRegimeClass
  | L8TokenRegimeClass
  | L8EcosystemRegimeClass;

/**
 * §8.2.6.5 — Lifecycle posture for token-family classes. Classes with
 * incompatible lifecycle posture may not coexist as clean simultaneous
 * primary regimes.
 */
export type L8LifecyclePosture =
  | 'PRE_TREND'
  | 'TREND_EMERGING'
  | 'TREND_ESTABLISHED'
  | 'LATE_STAGE'
  | 'EXITING_TREND'
  | 'DIGESTING'
  | null;

export interface L8RegimeClassDescriptor {
  readonly family: L8RegimeFamily;
  readonly regimeClass: L8RegimeClass;
  readonly semantic: string;
  readonly legalScopeTypes: readonly L8RegimeScopeType[];
  /**
   * Declares whether a regime class implies directional conditioning —
   * risk-on favors participation, risk-off favors caution, etc. This
   * is used by the multiplier anchoring law in later sublayers; here
   * it only classifies for registry inspection.
   */
  readonly directionalPosture: 'EXPANSIVE' | 'CONTRACTIVE' | 'FRAGILE' | 'NEUTRAL';
  /**
   * §8.2.6.5 — Lifecycle posture (token family only). `null` for
   * non-lifecycle families.
   */
  readonly lifecyclePosture: L8LifecyclePosture;
}

export const L8_REGIME_CLASS_DESCRIPTORS: readonly L8RegimeClassDescriptor[] = [
  // ── MACRO (§8.2.4.2) ──
  {
    family: L8RegimeFamily.MACRO,
    regimeClass: L8MacroRegimeClass.RISK_ON,
    semantic:
      'Broad environment favors participation, expansion, and acceptance ' +
      'of risk assets.',
    legalScopeTypes: ['MARKET', 'SECTOR', 'ASSET'],
    directionalPosture: 'EXPANSIVE',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.MACRO,
    regimeClass: L8MacroRegimeClass.RISK_OFF,
    semantic:
      'Broad environment favors caution, de-risking, capital withdrawal, ' +
      'and defensive behavior.',
    legalScopeTypes: ['MARKET', 'SECTOR', 'ASSET'],
    directionalPosture: 'CONTRACTIVE',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.MACRO,
    regimeClass: L8MacroRegimeClass.TRANSITION,
    semantic:
      'The macro environment is moving between broad states and should not ' +
      'be treated as stable.',
    legalScopeTypes: ['MARKET', 'SECTOR', 'ASSET'],
    directionalPosture: 'NEUTRAL',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.MACRO,
    regimeClass: L8MacroRegimeClass.CHOP,
    semantic:
      'The environment lacks directional regime cleanliness; false ' +
      'follow-through risk is high.',
    legalScopeTypes: ['MARKET', 'SECTOR', 'ASSET'],
    directionalPosture: 'FRAGILE',
    lifecyclePosture: null,
  },

  // ── CRYPTO_STRUCTURE (§8.2.5.2) ──
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    regimeClass: L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION,
    semantic:
      'Expansion is being supported by healthier spot participation and ' +
      'structural demand.',
    legalScopeTypes: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
    directionalPosture: 'EXPANSIVE',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    regimeClass: L8CryptoStructureRegimeClass.LEVERAGE_LED_EXPANSION,
    semantic:
      'Expansion is being driven disproportionately by derivatives, ' +
      'leverage, and crowding.',
    legalScopeTypes: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
    directionalPosture: 'FRAGILE',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    regimeClass: L8CryptoStructureRegimeClass.DELEVERAGING,
    semantic:
      'Structure is dominated by leverage unwind, crowding collapse, and ' +
      'contraction of aggressive positioning.',
    legalScopeTypes: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
    directionalPosture: 'CONTRACTIVE',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    regimeClass: L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY,
    semantic:
      'The environment is structurally weak because liquidity is too thin ' +
      'to trust surface moves naively.',
    legalScopeTypes: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
    directionalPosture: 'FRAGILE',
    lifecyclePosture: null,
  },

  // ── TOKEN_SPECIFIC (§8.2.6.2) ──
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    regimeClass: L8TokenRegimeClass.LAUNCH_DISCOVERY,
    semantic:
      'Very early stage price and participation discovery with immature ' +
      'structure.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL'],
    directionalPosture: 'FRAGILE',
    lifecyclePosture: 'PRE_TREND',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    regimeClass: L8TokenRegimeClass.EARLY_ACCUMULATION,
    semantic:
      'Support is building before broad attention saturation.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL'],
    directionalPosture: 'EXPANSIVE',
    lifecyclePosture: 'TREND_EMERGING',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    regimeClass: L8TokenRegimeClass.NARRATIVE_BREAKOUT,
    semantic:
      'Narrative participation is driving visible environment change ' +
      'around the token.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL'],
    directionalPosture: 'EXPANSIVE',
    lifecyclePosture: 'TREND_EMERGING',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    regimeClass: L8TokenRegimeClass.MATURE_TREND,
    semantic:
      'The token has moved beyond discovery into a more established ' +
      'directional regime.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL'],
    directionalPosture: 'EXPANSIVE',
    lifecyclePosture: 'TREND_ESTABLISHED',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    regimeClass: L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE,
    semantic:
      'Reflexivity is extreme and late-stage instability risk is high.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL'],
    directionalPosture: 'FRAGILE',
    lifecyclePosture: 'LATE_STAGE',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    regimeClass: L8TokenRegimeClass.DISTRIBUTION,
    semantic:
      'Selling/rotation/distribution behavior dominates despite surface ' +
      'stability or lagging price strength.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL'],
    directionalPosture: 'CONTRACTIVE',
    lifecyclePosture: 'EXITING_TREND',
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    regimeClass: L8TokenRegimeClass.POST_UNLOCK_DIGESTION,
    semantic:
      'Unlock or overhang effects have hit and the system is processing ' +
      'that new state rather than cleanly resuming prior regime.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL'],
    directionalPosture: 'NEUTRAL',
    lifecyclePosture: 'DIGESTING',
  },

  // ── ECOSYSTEM (§8.2.7.2) ──
  {
    family: L8RegimeFamily.ECOSYSTEM,
    regimeClass: L8EcosystemRegimeClass.CHAIN_EXPANSION,
    semantic:
      'A specific chain ecosystem is broadening in activity, liquidity, ' +
      'and attention.',
    legalScopeTypes: ['CHAIN', 'ECOSYSTEM'],
    directionalPosture: 'EXPANSIVE',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    regimeClass: L8EcosystemRegimeClass.CHAIN_CONTRACTION,
    semantic:
      'A chain ecosystem is weakening in participation, activity, or ' +
      'capital support.',
    legalScopeTypes: ['CHAIN', 'ECOSYSTEM'],
    directionalPosture: 'CONTRACTIVE',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    regimeClass: L8EcosystemRegimeClass.SECTOR_ROTATION,
    semantic:
      'Attention and capital are rotating between sectors materially ' +
      'enough to condition interpretation.',
    legalScopeTypes: ['SECTOR', 'ECOSYSTEM', 'NARRATIVE_CLUSTER'],
    directionalPosture: 'NEUTRAL',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    regimeClass: L8EcosystemRegimeClass.MEMECOIN_MANIA,
    semantic:
      'Speculative meme-driven attention is dominating ecosystem ' +
      'interpretation.',
    legalScopeTypes: ['SECTOR', 'ECOSYSTEM', 'NARRATIVE_CLUSTER', 'TOKEN'],
    directionalPosture: 'FRAGILE',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    regimeClass: L8EcosystemRegimeClass.DEFI_RERATING,
    semantic:
      'DeFi-related assets and protocols are being structurally rerated ' +
      'by the market.',
    legalScopeTypes: ['SECTOR', 'ECOSYSTEM', 'NARRATIVE_CLUSTER'],
    directionalPosture: 'NEUTRAL',
    lifecyclePosture: null,
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    regimeClass: L8EcosystemRegimeClass.L2_ATTENTION_SHIFT,
    semantic:
      'Attention, capital, and/or narrative energy are moving across L2 ' +
      'ecosystems in a meaningful way.',
    legalScopeTypes: ['CHAIN', 'ECOSYSTEM', 'NARRATIVE_CLUSTER'],
    directionalPosture: 'NEUTRAL',
    lifecyclePosture: null,
  },
];

export function getL8RegimeClassDescriptor(
  regimeClass: L8RegimeClass,
): L8RegimeClassDescriptor | undefined {
  return L8_REGIME_CLASS_DESCRIPTORS.find(d => d.regimeClass === regimeClass);
}

export function isL8RegisteredRegimeClass(value: string): boolean {
  return L8_REGIME_CLASS_DESCRIPTORS.some(d => d.regimeClass === value);
}

export function getL8RegimeClassesForFamily(
  family: L8RegimeFamily,
): readonly L8RegimeClassDescriptor[] {
  return L8_REGIME_CLASS_DESCRIPTORS.filter(d => d.family === family);
}

export function regimeClassBelongsToFamily(
  regimeClass: L8RegimeClass,
  family: L8RegimeFamily,
): boolean {
  const d = getL8RegimeClassDescriptor(regimeClass);
  if (!d) return false;
  return d.family === family;
}

export function regimeClassAllowsScope(
  regimeClass: L8RegimeClass,
  scope: L8RegimeScopeType,
): boolean {
  const d = getL8RegimeClassDescriptor(regimeClass);
  if (!d) return false;
  return d.legalScopeTypes.includes(scope);
}

export function getLifecyclePosture(
  regimeClass: L8RegimeClass,
): L8LifecyclePosture {
  const d = getL8RegimeClassDescriptor(regimeClass);
  return d?.lifecyclePosture ?? null;
}
