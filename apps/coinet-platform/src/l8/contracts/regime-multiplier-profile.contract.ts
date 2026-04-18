/**
 * L8.3 — Regime Multiplier Profile Contract
 *
 * §8.3.6 — Multipliers are governed interpretive objects, never final
 * scores. They condition how later layers should interpret validated
 * truths; they do not set final verdicts.
 *
 * §8.3.6.4 / §8.3.6.5 — Multiplier profiles must not encode final-score
 * semantics, action-leaning wording, score override rights, or widened
 * lower-layer rights beyond what L7 allows.
 */

import type { L8RegimeClass } from './regime-class';
import type {
  L8RegimeConfidenceBand,
  L8TransitionRiskClass,
} from './regime-state';

/**
 * §8.3.6.2 — Required multiplier dimensions. Each dimension is a typed
 * interpretive modifier bounded to a finite range; never a monetary or
 * final-score quantity.
 *
 * Each multiplier value is on [L8_MULTIPLIER_MIN, L8_MULTIPLIER_MAX];
 * 1.0 means "no environmental adjustment".
 */
export interface L8RegimeMultiplierDimensions {
  readonly trend_amplification: number;
  readonly momentum_trust_multiplier: number;
  readonly breakout_skepticism_multiplier: number;
  readonly leverage_risk_multiplier: number;
  readonly liquidity_fragility_multiplier: number;
  readonly narrative_sensitivity_multiplier: number;
  readonly risk_overhang_sensitivity_multiplier: number;
}

export const L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES:
  readonly (keyof L8RegimeMultiplierDimensions)[] = [
    'trend_amplification',
    'momentum_trust_multiplier',
    'breakout_skepticism_multiplier',
    'leverage_risk_multiplier',
    'liquidity_fragility_multiplier',
    'narrative_sensitivity_multiplier',
    'risk_overhang_sensitivity_multiplier',
  ];

/**
 * §8.3.6.5 — Legal range for multiplier values. A multiplier outside
 * this range is either a score-override attempt or a corrupted profile.
 */
export const L8_MULTIPLIER_MIN = 0.0;
export const L8_MULTIPLIER_MAX = 3.0;

/**
 * §8.3.6.3 — Restriction consumption refs — the L7 restriction profiles
 * whose rights were honoured when deriving the multipliers.
 */
export interface L8MultiplierRestrictionConsumption {
  readonly restriction_profile_ref: string;
  readonly consumed_rights: readonly (
    | 'REGIME_CONDITIONING'
    | 'MULTIPLIER_INPUT'
    | 'CONFIDENCE_INPUT'
  )[];
}

/**
 * §8.3.6.3 — The full executable multiplier profile contract.
 */
export interface L8RegimeMultiplierProfileContract {
  // Identity
  readonly multiplier_profile_id: string;
  readonly regime_subject_id: string;
  readonly regime_result_id: string;

  // Versioning
  readonly multiplier_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Regime anchor (§8.3.6.3)
  readonly primary_regime: L8RegimeClass;
  readonly secondary_regime: L8RegimeClass | null;
  readonly regime_confidence_band: L8RegimeConfidenceBand;
  readonly transition_risk_class: L8TransitionRiskClass;

  // Dimensions (§8.3.6.2)
  readonly dimensions: L8RegimeMultiplierDimensions;

  // Derivation policy (§8.3.6.3)
  readonly derivation_spec_ref: string;

  // L7 restriction consumption (§8.3.6.3)
  readonly restriction_consumption_refs:
    readonly L8MultiplierRestrictionConsumption[];

  // Lineage + replay
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;

  // Authoring
  readonly description: string;
}

export const L8_MULTIPLIER_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'multiplier_profile_id', 'regime_subject_id', 'regime_result_id',
  'multiplier_contract_version', 'schema_version', 'policy_version',
  'primary_regime',
  'regime_confidence_band', 'transition_risk_class',
  'dimensions', 'derivation_spec_ref',
  'restriction_consumption_refs',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];

/**
 * §8.3.6.5 — A multiplier is "score-shaped" when all dimensions collapse
 * into a single effective scalar, or when any dimension lies outside the
 * legal range, or when the profile carries wording suggesting a final
 * score. We detect the structural forms here; textual wording is caught
 * by the L8.1 forbidden-naming registry.
 */
export function multiplierIsScoreShaped(
  p: Pick<
    L8RegimeMultiplierProfileContract,
    'dimensions' | 'description'
  >,
): boolean {
  const d = p.dimensions;
  const values = L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES.map(
    k => d[k],
  ) as readonly number[];
  // Any OOR value — immediate failure.
  if (values.some(v =>
    !Number.isFinite(v) || v < L8_MULTIPLIER_MIN || v > L8_MULTIPLIER_MAX
  )) {
    return true;
  }
  // If every dimension is identical AND it isn't the neutral 1.0, the
  // profile is acting as a single score scalar.
  const allSame = values.every(v => Math.abs(v - values[0]) < 1e-9);
  if (allSame && Math.abs(values[0] - 1.0) > 1e-9) return true;
  // Description mentions "final score" / "total score" / "composite score"
  const lower = p.description.toLowerCase();
  if (
    lower.includes('final score') ||
    lower.includes('composite score') ||
    lower.includes('total score') ||
    lower.includes('overall score')
  ) {
    return true;
  }
  return false;
}

/**
 * §8.3.6.5 — Action-biased wording detector for multiplier description.
 * (Names are already caught by L8.1; descriptions get a second pass
 * here because multipliers are the most dangerous surface for drift.)
 */
export function multiplierDescriptionHasActionBias(
  description: string,
): boolean {
  const lower = description.toLowerCase();
  return (
    lower.includes('buy') ||
    lower.includes('sell') ||
    lower.includes('avoid') ||
    lower.includes('trade signal') ||
    lower.includes('recommendation') ||
    lower.includes('best regime') ||
    lower.includes('winning thesis')
  );
}

/**
 * §8.3.6.6 — Completeness: every required dimension must be present
 * (TypeScript's type system guarantees keys exist; this helper returns
 * the list of dimensions whose value is missing, NaN, or OOR).
 */
export function listMissingOrOorMultiplierDimensions(
  p: Pick<L8RegimeMultiplierProfileContract, 'dimensions'>,
): readonly (keyof L8RegimeMultiplierDimensions)[] {
  const out: (keyof L8RegimeMultiplierDimensions)[] = [];
  for (const k of L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES) {
    const v = p.dimensions[k];
    if (!Number.isFinite(v) || v < L8_MULTIPLIER_MIN || v > L8_MULTIPLIER_MAX) {
      out.push(k);
    }
  }
  return out;
}
