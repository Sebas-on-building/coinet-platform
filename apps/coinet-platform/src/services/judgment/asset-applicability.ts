/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   ASSET APPLICABILITY — judge every asset by the RIGHT lens, honestly          ║
 * ║                                                                               ║
 * ║   Coinet is universal: it judges BTC and memecoins alike. A judgment is only   ║
 * ║   fair if each asset is evaluated on the families that MATTER for its purpose, ║
 * ║   and never penalized for lacking a metric that's the wrong lens for its type. ║
 * ║                                                                               ║
 * ║   This module is the SINGLE SOURCE OF TRUTH for "which lens applies to which   ║
 * ║   asset" and "do we actually have the data". It produces, per judgment family, ║
 * ║   one of THREE states — the distinction that separates honest from dishonest:  ║
 * ║                                                                               ║
 * ║     • SCORED             — applicable to this asset AND we have real data.      ║
 * ║     • APPLICABLE_NO_DATA — the RIGHT lens for this asset, but we lack a source. ║
 * ║                            (e.g. BTC SHOULD be judged on network fees — we just ║
 * ║                            don't have them yet. This is a real coverage gap     ║
 * ║                            that must lower confidence, never be hidden.)        ║
 * ║     • NOT_APPLICABLE     — the WRONG lens for this asset's purpose.             ║
 * ║                            (e.g. protocol TVL for a memecoin — no such thesis   ║
 * ║                            exists; absence is not weakness and must be excluded)║
 * ║                                                                               ║
 * ║   Consumed by the confidence, contradiction, and hypothesis engines so all     ║
 * ║   three judge by one consistent purpose→lens map instead of scattering         ║
 * ║   `sector.includes('L1')` conditionals.                                        ║
 * ║                                                                               ║
 * ║   Pure: no I/O, no time, no randomness. Classification (Sector) is supplied by ║
 * ║   the caller from OmniScore's getAssetSector; this module only maps purpose →  ║
 * ║   lens. It never invents data.                                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Sector, CapBucket } from '../omniscore_v3';
import type { SignalSnapshot } from './types';

/**
 * Judgment families — the lenses the judgment engines reason over. These are the
 * judgment-engine's evidence categories, distinct from OmniScore's QS features.
 */
export type JudgmentFamily =
  | 'market'                 // price / volume / liquidity / momentum
  | 'derivatives'            // leverage / funding / OI / liquidations
  | 'fundamentals_protocol'  // TVL / fees / revenue — a protocol that earns
  | 'fundamentals_network'   // L1 base-layer: network fees, active addresses, security
  | 'onchain_flows'          // exchange inflow / outflow, whale distribution
  | 'valuation'              // FDV, mcap-to-FDV, circulating ratio (value vs price)
  | 'tokenomics'             // supply dynamics: emission / inflation / unlock pressure
  | 'narrative'              // sentiment / social / attention
  | 'peg';                   // stablecoin peg stability

export const ALL_JUDGMENT_FAMILIES: readonly JudgmentFamily[] = [
  'market',
  'derivatives',
  'fundamentals_protocol',
  'fundamentals_network',
  'onchain_flows',
  'valuation',
  'tokenomics',
  'narrative',
  'peg',
] as const;

export type ApplicabilityState = 'SCORED' | 'APPLICABLE_NO_DATA' | 'NOT_APPLICABLE';

export type FamilyApplicability = Record<JudgmentFamily, ApplicabilityState>;

/**
 * Which families actually have genuine (non-default, non-zero) data this request.
 * Anything omitted/false is treated as "no data" → drives APPLICABLE_NO_DATA when
 * the family is otherwise applicable. The caller derives this from the snapshot's
 * `_missing` set and real values — never from present-but-zero placeholders.
 */
export type FamilyDataPresence = Partial<Record<JudgmentFamily, boolean>>;

// ═══════════════════════════════════════════════════════════════════════════════
// PURPOSE → LENS TABLE
// ═══════════════════════════════════════════════════════════════════════════════
// For each asset Sector, the set of families that are APPLICABLE (the right lens
// for that asset's value thesis). Any family NOT in the set is NOT_APPLICABLE.
//
// Design rationale (mirrors OmniScore SECTOR_INFO's relevant/notApplicable split):
//   - market / narrative / onchain_flows apply to essentially every tradeable,
//     on-chain asset (data-gated, not purpose-gated).
//   - derivatives apply broadly (a perp may or may not exist → data-gated).
//   - valuation (FDV / mcap-to-FDV) applies to growth assets, NOT stablecoins
//     (pegged — no growth thesis).
//   - tokenomics (supply / emission) applies to growth & meme assets, NOT
//     stablecoins (supply expands with demand by design).
//   - fundamentals_protocol = a protocol that EARNS (DeFi/L2/infra/exchange/gaming).
//   - fundamentals_network  = a base-layer settlement network (L1/Payment/Privacy).
//   - peg = stablecoins only.
//   - Unknown = ALL families applicable (conservative; never hide weakness on an
//     unclassified asset — fall back to data-gating, not purpose-gating).

const BASE_GROWTH: JudgmentFamily[] = [
  'market',
  'derivatives',
  'onchain_flows',
  'valuation',
  'tokenomics',
  'narrative',
];

const SECTOR_LENS: Record<Sector, JudgmentFamily[]> = {
  L1: [...BASE_GROWTH, 'fundamentals_network'],
  Privacy: [...BASE_GROWTH, 'fundamentals_network'],
  Payment: [...BASE_GROWTH, 'fundamentals_network'],
  L2: [...BASE_GROWTH, 'fundamentals_protocol', 'fundamentals_network'],
  DeFi: [...BASE_GROWTH, 'fundamentals_protocol'],
  Infrastructure: [...BASE_GROWTH, 'fundamentals_protocol'],
  Gaming: [...BASE_GROWTH, 'fundamentals_protocol'],
  Exchange: [...BASE_GROWTH, 'fundamentals_protocol'],
  // Memecoins have no fundamentals thesis — value is narrative / attention /
  // liquidity / supply dynamics. Absent protocol/network fundamentals is NOT a
  // weakness for a meme; it's the wrong lens entirely.
  Memecoin: [...BASE_GROWTH],
  // Stablecoins are judged on peg stability, not growth/revenue. Valuation
  // (FDV growth) and tokenomics (emission) are inapplicable by design.
  Stablecoin: ['market', 'derivatives', 'onchain_flows', 'narrative', 'peg'],
  // Unknown → everything applicable; let data-gating (not purpose-gating) decide.
  Unknown: [...ALL_JUDGMENT_FAMILIES],
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map an asset's purpose (Sector) + data presence → per-family applicability state.
 *
 * @param sector       OmniScore Sector (from getAssetSector). 'Unknown' → all applicable.
 * @param capBucket    OmniScore CapBucket. Reserved: applicability is purpose-driven,
 *                     so capBucket does NOT change WHICH lens applies (a small L1 is
 *                     still judged on network fundamentals). It is accepted here so
 *                     the interface is stable, and is consumed downstream by the
 *                     confidence layer for expectation calibration (a mega-cap with
 *                     no fundamentals data is more suspicious than a micro-cap).
 * @param dataPresence Which families genuinely have data this request.
 */
export function familyApplicability(
  sector: Sector,
  capBucket: CapBucket | null | undefined,
  dataPresence: FamilyDataPresence,
): FamilyApplicability {
  void capBucket; // reserved — see doc above; not used for applicability in v1.

  const applicable = new Set<JudgmentFamily>(SECTOR_LENS[sector] ?? SECTOR_LENS.Unknown);

  const out = {} as FamilyApplicability;
  for (const family of ALL_JUDGMENT_FAMILIES) {
    if (!applicable.has(family)) {
      out[family] = 'NOT_APPLICABLE';
    } else if (dataPresence[family]) {
      out[family] = 'SCORED';
    } else {
      out[family] = 'APPLICABLE_NO_DATA';
    }
  }
  return out;
}

/**
 * True when EITHER fundamentals lens (protocol or network) applies to this
 * sector. Used at the snapshot-build boundary to gate the OmniScore
 * Quality-Score → `fundamentals_strength` projection: a memecoin or stablecoin
 * (no fundamentals thesis) must NOT pull a "fundamentals" signal from QS — that
 * would be judging it by the wrong lens. Unknown → true (conservative).
 */
export function sectorFundamentalsApplicable(sector: Sector | null | undefined): boolean {
  const lens = SECTOR_LENS[sector ?? 'Unknown'] ?? SECTOR_LENS.Unknown;
  return lens.includes('fundamentals_protocol') || lens.includes('fundamentals_network');
}

/** Convenience predicates for the consuming engines. */
export function isScored(state: ApplicabilityState): boolean {
  return state === 'SCORED';
}

/** True when the lens applies to this asset (whether or not we have the data). */
export function isApplicable(state: ApplicabilityState): boolean {
  return state === 'SCORED' || state === 'APPLICABLE_NO_DATA';
}

/** True when the lens applies but we lack a source — a real, disclosable gap. */
export function isApplicableButMissing(state: ApplicabilityState): boolean {
  return state === 'APPLICABLE_NO_DATA';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATION BRIDGE — map the sparse knowledge-graph sector strings onto the
// richer OmniScore Sector vocabulary, for when the OmniScore sector isn't supplied.
// ═══════════════════════════════════════════════════════════════════════════════

export function mapGraphSectorToOmniSector(graphSector: string | null | undefined): Sector | null {
  if (!graphSector) return null;
  const s = graphSector.replace(/^sector:/, '').toLowerCase();
  switch (s) {
    case 'defi': return 'DeFi';
    case 'meme':
    case 'memecoin': return 'Memecoin';
    case 'stablecoin': return 'Stablecoin';
    case 'smart-contract-platform':
    case 'l1': return 'L1';
    case 'l2': return 'L2';
    case 'oracle':
    case 'infrastructure': return 'Infrastructure';
    case 'gaming': return 'Gaming';
    case 'payment': return 'Payment';
    case 'exchange': return 'Exchange';
    case 'privacy': return 'Privacy';
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA PRESENCE — derive, honestly, which families have GENUINE data on a snapshot.
// "Present-but-zero / present-but-neutral" counts as NO data (that conflation is
// exactly the bug this whole feature fixes). Families with no snapshot field yet
// (network fundamentals, valuation, tokenomics, peg) are reported absent until a
// real source is threaded — so they surface as APPLICABLE_NO_DATA, never faked.
// ═══════════════════════════════════════════════════════════════════════════════

export function deriveFamilyDataPresence(s: SignalSnapshot): FamilyDataPresence {
  const missing = s._missing;
  const notMissing = (key: string) => !(missing && missing.has(key));
  return {
    market: (s.volume_24h > 0.01 || s.liquidity > 0.01) && notMissing('market'),
    // Derivatives present only when the snapshot carries real (non-default)
    // leverage/funding/liquidation signal — defaults are funding 0.5, liq 0.
    derivatives:
      notMissing('derivatives') &&
      (s.leverage_pressure !== 0.5 || s.funding_rate !== 0.5 || s.liquidation_density > 0),
    // Fundamentals presence is carried by `fundamentals_strength`, which the
    // snapshot builder fills from real protocol metrics (TVL/fees/revenue) OR
    // from the OmniScore Quality Score — but only when fundamentals are the right
    // lens for the asset (gated upstream). The applicability table then routes it
    // to the correct lens (protocol for DeFi/L2/infra; network for L1/Payment/
    // Privacy) and marks the other NOT_APPLICABLE, so a present proxy registers as
    // SCORED on whichever family actually applies — never on the wrong one.
    fundamentals_protocol: s.tvl_trend > 0 || s.revenue_quality > 0 || s.fundamentals_strength > 0,
    fundamentals_network: s.fundamentals_strength > 0,
    onchain_flows: notMissing('onchain') && (s.exchange_inflow > 0 || s.exchange_outflow > 0),
    // No dedicated valuation / peg snapshot fields yet — honestly absent for now.
    valuation: false,
    // Tokenomics (supply dynamics) is carried by `unlock_pressure`, filled from
    // the OmniScore circulating-supply ratio (lower circulating ⇒ more overhang)
    // or a real next-unlock figure.
    tokenomics: s.unlock_pressure > 0,
    narrative: notMissing('narrative') && (s.narrative_intensity > 0 || s.sentiment !== 0),
    peg: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXIS AGGREGATION — the confidence engine reasons over 4 coarse axes; map each
// axis to its constituent judgment families so it can renormalize away an axis
// that is WHOLLY not-applicable to the asset (e.g. fundamentals for a stablecoin).
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceAxis = 'market' | 'fundamentals' | 'onchain' | 'narrative';

const AXIS_FAMILIES: Record<ConfidenceAxis, JudgmentFamily[]> = {
  market: ['market', 'derivatives'],
  fundamentals: ['fundamentals_protocol', 'fundamentals_network', 'valuation', 'tokenomics'],
  onchain: ['onchain_flows'],
  narrative: ['narrative'],
};

/**
 * An axis is applicable unless EVERY one of its families is NOT_APPLICABLE for
 * this asset. (e.g. a stablecoin's fundamentals axis — protocol/network/valuation/
 * tokenomics all N/A — is excluded from the weighted confidence and the remaining
 * weights renormalize. An L1's fundamentals axis stays: network/valuation/
 * tokenomics are applicable, just data-gapped.)
 */
export function isAxisApplicable(axis: ConfidenceAxis, applicability: FamilyApplicability): boolean {
  return AXIS_FAMILIES[axis].some((f) => applicability[f] !== 'NOT_APPLICABLE');
}
