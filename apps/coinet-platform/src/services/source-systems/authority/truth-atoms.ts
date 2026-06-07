/**
 * Truth Atom Registry — the smallest useful units of market truth.
 *
 * Authority attaches to truth atoms, not to provider brands.
 * This prevents giving whole providers oversized authority.
 */

import { TRUTH_CLASSES } from '../registry';
import type { TruthAtomDef } from './types';

const TC = TRUTH_CLASSES;

export const TRUTH_ATOMS: TruthAtomDef[] = [
  // ── Market Surface ────────────────────────────────────────────────────
  { id: 'price.spot',             truthClass: TC.MARKET_SURFACE,       name: 'Spot Price',            description: 'Current market spot price across venues',       metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'price.dex',             truthClass: TC.MARKET_SURFACE,       name: 'DEX Price',             description: 'Price from decentralized exchange pools',       metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'volume.usd',            truthClass: TC.MARKET_SURFACE,       name: 'Volume (USD)',          description: 'Aggregate trading volume in USD',               metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'market_cap',            truthClass: TC.MARKET_SURFACE,       name: 'Market Cap',            description: 'Circulating market capitalization',             metricType: 'numeric',     refreshSensitivity: 'scheduled' },
  { id: 'fdv',                   truthClass: TC.MARKET_SURFACE,       name: 'FDV',                   description: 'Fully diluted valuation',                       metricType: 'numeric',     refreshSensitivity: 'scheduled' },
  { id: 'liquidity.usd',         truthClass: TC.MARKET_SURFACE,       name: 'Liquidity Depth',       description: 'Available liquidity depth in USD',              metricType: 'numeric',     refreshSensitivity: 'fast' },

  // ── Macro Surface (market-wide regime inputs) ─────────────────────────
  { id: 'macro.btc_dominance',          truthClass: TC.MARKET_SURFACE, name: 'BTC Dominance',          description: 'Bitcoin share of total crypto market cap',      metricType: 'numeric', refreshSensitivity: 'scheduled' },
  { id: 'macro.total_market_cap',       truthClass: TC.MARKET_SURFACE, name: 'Total Market Cap',       description: 'Aggregate crypto market capitalization (USD)',  metricType: 'numeric', refreshSensitivity: 'scheduled' },
  { id: 'macro.total_market_cap_change',truthClass: TC.MARKET_SURFACE, name: 'Total Market Cap Δ24h',  description: 'Aggregate market-cap percentage change (24h)',  metricType: 'numeric', refreshSensitivity: 'scheduled' },
  { id: 'macro.fear_greed',             truthClass: TC.MARKET_SURFACE, name: 'Fear & Greed Index',     description: 'Composite market fear/greed sentiment (0–100)', metricType: 'numeric', refreshSensitivity: 'scheduled' },

  // ── DEX Emergence ─────────────────────────────────────────────────────
  { id: 'pair.newly_created',    truthClass: TC.DEX_EMERGENCE,        name: 'New Pair',              description: 'Whether a pair was recently created on DEX',    metricType: 'boolean',     refreshSensitivity: 'fast' },
  { id: 'pair.age',              truthClass: TC.DEX_EMERGENCE,        name: 'Pair Age',              description: 'Time since pair creation',                      metricType: 'numeric',     refreshSensitivity: 'scheduled' },
  { id: 'pair.liquidity.depth',  truthClass: TC.DEX_EMERGENCE,        name: 'Pair Liquidity',        description: 'Pool liquidity depth for the pair',             metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'pair.fragmentation',    truthClass: TC.DEX_EMERGENCE,        name: 'Pair Fragmentation',    description: 'Liquidity fragmentation across pools',          metricType: 'numeric',     refreshSensitivity: 'scheduled' },
  { id: 'pair.ignition_score',   truthClass: TC.DEX_EMERGENCE,        name: 'Ignition Score',        description: 'Early momentum and liquidity ignition quality', metricType: 'numeric',     refreshSensitivity: 'fast' },

  // ── Derivatives Pressure ──────────────────────────────────────────────
  { id: 'oi.notional',           truthClass: TC.DERIVATIVES_PRESSURE, name: 'OI Notional',           description: 'Open interest in notional value',              metricType: 'numeric',     refreshSensitivity: 'realtime' },
  { id: 'oi.velocity',           truthClass: TC.DERIVATIVES_PRESSURE, name: 'OI Velocity',           description: 'Rate of change in open interest',              metricType: 'numeric',     refreshSensitivity: 'realtime' },
  { id: 'funding.rate',          truthClass: TC.DERIVATIVES_PRESSURE, name: 'Funding Rate',          description: 'Perpetual funding rate',                       metricType: 'numeric',     refreshSensitivity: 'realtime' },
  { id: 'liq.long.usd',         truthClass: TC.DERIVATIVES_PRESSURE, name: 'Long Liquidations',     description: 'Long liquidation volume in USD',               metricType: 'numeric',     refreshSensitivity: 'realtime' },
  { id: 'liq.short.usd',        truthClass: TC.DERIVATIVES_PRESSURE, name: 'Short Liquidations',    description: 'Short liquidation volume in USD',              metricType: 'numeric',     refreshSensitivity: 'realtime' },
  { id: 'crowding.index',        truthClass: TC.DERIVATIVES_PRESSURE, name: 'Crowding Index',        description: 'Composite leverage crowding metric',           metricType: 'numeric',     refreshSensitivity: 'realtime' },
  { id: 'long_short.ratio',      truthClass: TC.DERIVATIVES_PRESSURE, name: 'Long/Short Ratio',     description: 'Ratio of long to short positions',             metricType: 'numeric',     refreshSensitivity: 'fast' },

  // ── Protocol Substance ────────────────────────────────────────────────
  { id: 'protocol.tvl',          truthClass: TC.PROTOCOL_SUBSTANCE,   name: 'TVL',                   description: 'Total value locked in protocol',               metricType: 'numeric',     refreshSensitivity: 'scheduled' },
  { id: 'protocol.inflows.usd',  truthClass: TC.PROTOCOL_SUBSTANCE,   name: 'Protocol Inflows',      description: 'Net inflows to protocol in USD',               metricType: 'numeric',     refreshSensitivity: 'scheduled' },
  { id: 'protocol.fees.usd',     truthClass: TC.PROTOCOL_SUBSTANCE,   name: 'Protocol Fees',         description: 'Fee revenue generated by protocol',            metricType: 'numeric',     refreshSensitivity: 'scheduled' },
  { id: 'protocol.revenue.usd',  truthClass: TC.PROTOCOL_SUBSTANCE,   name: 'Protocol Revenue',      description: 'Total revenue accrued to protocol',            metricType: 'numeric',     refreshSensitivity: 'scheduled' },
  { id: 'protocol.holders_rev',  truthClass: TC.PROTOCOL_SUBSTANCE,   name: 'Holders Revenue',       description: 'Revenue accruing to token holders',            metricType: 'numeric',     refreshSensitivity: 'slow' },
  { id: 'protocol.unlock.next',  truthClass: TC.PROTOCOL_SUBSTANCE,   name: 'Next Unlock',           description: 'Next token unlock amount and timing',          metricType: 'composite',   refreshSensitivity: 'slow' },

  // ── On-Chain Behavior ─────────────────────────────────────────────────
  { id: 'wallet.exchange_inflow',  truthClass: TC.ONCHAIN_BEHAVIOR,   name: 'Exchange Inflow',       description: 'Token inflow to exchanges from wallets',       metricType: 'numeric',     refreshSensitivity: 'realtime' },
  { id: 'wallet.exchange_outflow', truthClass: TC.ONCHAIN_BEHAVIOR,   name: 'Exchange Outflow',      description: 'Token outflow from exchanges to wallets',      metricType: 'numeric',     refreshSensitivity: 'realtime' },
  { id: 'wallet.smart_money',     truthClass: TC.ONCHAIN_BEHAVIOR,    name: 'Smart Money Activity',  description: 'Activity from identified smart-money wallets', metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'wallet.treasury_risk',   truthClass: TC.ONCHAIN_BEHAVIOR,    name: 'Treasury Transfer Risk', description: 'Risk signals from treasury wallet movement',  metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'contract.interaction',    truthClass: TC.ONCHAIN_BEHAVIOR,   name: 'Contract Interaction',  description: 'Spike in contract interactions',               metricType: 'numeric',     refreshSensitivity: 'realtime' },
  { id: 'wallet.whale_flow',      truthClass: TC.ONCHAIN_BEHAVIOR,    name: 'Whale Flow',            description: 'Large-wallet transfer volume and direction',   metricType: 'numeric',     refreshSensitivity: 'fast' },

  // ── Structural Safety ─────────────────────────────────────────────────
  { id: 'security.risk_score',       truthClass: TC.STRUCTURAL_SAFETY, name: 'Security Risk Score',    description: 'Composite security/risk assessment',         metricType: 'numeric',     refreshSensitivity: 'slow' },
  { id: 'security.mint_authority',   truthClass: TC.STRUCTURAL_SAFETY, name: 'Mint Authority Risk',    description: 'Whether mint authority is retained/abusable', metricType: 'boolean',     refreshSensitivity: 'slow' },
  { id: 'security.ownership_conc',   truthClass: TC.STRUCTURAL_SAFETY, name: 'Ownership Concentration', description: 'Top-holder concentration risk',             metricType: 'numeric',     refreshSensitivity: 'slow' },
  { id: 'security.verification',     truthClass: TC.STRUCTURAL_SAFETY, name: 'Verification Status',    description: 'Contract verification confidence',           metricType: 'categorical', refreshSensitivity: 'slow' },
  { id: 'security.rug_pattern',      truthClass: TC.STRUCTURAL_SAFETY, name: 'Rug Pattern Similarity', description: 'Similarity to known rug/scam patterns',     metricType: 'numeric',     refreshSensitivity: 'slow' },

  // ── Narrative Attention ───────────────────────────────────────────────
  { id: 'narrative.intensity',    truthClass: TC.NARRATIVE_ATTENTION,  name: 'Narrative Intensity',   description: 'Overall narrative/attention concentration',    metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'narrative.breadth',      truthClass: TC.NARRATIVE_ATTENTION,  name: 'Narrative Breadth',     description: 'Breadth of narrative coverage',                metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'sentiment.velocity',     truthClass: TC.NARRATIVE_ATTENTION,  name: 'Sentiment Velocity',    description: 'Rate of change in sentiment direction',       metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'news.intensity',         truthClass: TC.NARRATIVE_ATTENTION,  name: 'News Intensity',        description: 'Volume and urgency of news flow',             metricType: 'numeric',     refreshSensitivity: 'fast' },
  { id: 'social.acceleration',    truthClass: TC.NARRATIVE_ATTENTION,  name: 'Social Acceleration',   description: 'Social mention acceleration rate',            metricType: 'numeric',     refreshSensitivity: 'fast' },

  // ── Entity Context ────────────────────────────────────────────────────
  { id: 'entity.label_confidence',  truthClass: TC.ENTITY_CONTEXT,    name: 'Label Confidence',      description: 'Confidence in wallet/entity label accuracy',   metricType: 'numeric',     refreshSensitivity: 'slow' },
  { id: 'entity.cluster_identity',  truthClass: TC.ENTITY_CONTEXT,    name: 'Cluster Identity',      description: 'Identified wallet cluster and significance',   metricType: 'categorical', refreshSensitivity: 'slow' },
  { id: 'entity.exchange_proximity', truthClass: TC.ENTITY_CONTEXT,   name: 'Exchange Proximity',    description: 'Wallet proximity to exchange hot wallets',     metricType: 'numeric',     refreshSensitivity: 'slow' },
  { id: 'entity.institutional',     truthClass: TC.ENTITY_CONTEXT,    name: 'Institutional Relevance', description: 'Whether entity is institutional or fund',    metricType: 'boolean',     refreshSensitivity: 'slow' },
];

const ATOM_MAP = new Map<string, TruthAtomDef>(TRUTH_ATOMS.map(a => [a.id, a]));

export function getTruthAtom(id: string): TruthAtomDef | undefined {
  return ATOM_MAP.get(id);
}

export function getTruthAtomsForClass(truthClass: string): TruthAtomDef[] {
  return TRUTH_ATOMS.filter(a => a.truthClass === truthClass);
}

export function getAllTruthAtomIds(): string[] {
  return TRUTH_ATOMS.map(a => a.id);
}
