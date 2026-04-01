/**
 * Cross-Class Interaction Matrix — defines how truth classes support,
 * contradict, or remain independent of one another.
 *
 * Strategy 5: when classes disagree, preserve the tension
 * rather than smoothing it away.
 */

import { TRUTH_CLASSES } from '../registry';
import type { TruthClass } from '../registry';
import type { ClassInteraction, InteractionType } from './types';

const TC = TRUTH_CLASSES;

export const CLASS_INTERACTIONS: ClassInteraction[] = [
  // ── Market Surface interactions ──────────────────────────────────────
  { from: TC.MARKET_SURFACE, to: TC.DERIVATIVES_PRESSURE, type: 'supports',
    description: 'Surface price motion + derivatives pressure together strengthen timing reads',
    tensionSignal: 'price_rising_leverage_declining' },
  { from: TC.MARKET_SURFACE, to: TC.PROTOCOL_SUBSTANCE, type: 'supports',
    description: 'Surface visibility + substance quality together support rerating claims' },
  { from: TC.MARKET_SURFACE, to: TC.ONCHAIN_BEHAVIOR, type: 'escalates',
    description: 'Surface motion gains conviction when confirmed by on-chain flows',
    tensionSignal: 'price_strong_onchain_weak' },

  // ── DEX Emergence interactions ──────────────────────────────────────
  { from: TC.DEX_EMERGENCE, to: TC.STRUCTURAL_SAFETY, type: 'escalates',
    description: 'Early DEX discovery becomes actionable only when structural safety validates',
    tensionSignal: 'early_pair_unsafe_structure' },
  { from: TC.DEX_EMERGENCE, to: TC.NARRATIVE_ATTENTION, type: 'supports',
    description: 'DEX emergence + narrative acceleration together signal potential breakout' },
  { from: TC.DEX_EMERGENCE, to: TC.ONCHAIN_BEHAVIOR, type: 'supports',
    description: 'Early DEX activity + wallet behavior together strengthen discovery conviction' },

  // ── Derivatives Pressure interactions ────────────────────────────────
  { from: TC.DERIVATIVES_PRESSURE, to: TC.ONCHAIN_BEHAVIOR, type: 'contradicts',
    description: 'Leverage pressure without spot conviction creates fragility tension',
    tensionSignal: 'leverage_high_spot_conviction_low' },
  { from: TC.DERIVATIVES_PRESSURE, to: TC.MARKET_SURFACE, type: 'supports',
    description: 'Pressure + surface together characterize move quality (leverage-led vs spot-led)' },
  { from: TC.DERIVATIVES_PRESSURE, to: TC.NARRATIVE_ATTENTION, type: 'contradicts',
    description: 'Leverage crowding during narrative hype signals reflexive fragility',
    tensionSignal: 'leverage_crowded_narrative_hot' },

  // ── Protocol Substance interactions ──────────────────────────────────
  { from: TC.PROTOCOL_SUBSTANCE, to: TC.NARRATIVE_ATTENTION, type: 'contradicts',
    description: 'Strong attention without substance signals attention > substance tension',
    tensionSignal: 'narrative_strong_substance_weak' },
  { from: TC.PROTOCOL_SUBSTANCE, to: TC.ONCHAIN_BEHAVIOR, type: 'supports',
    description: 'Substance + on-chain activity together validate structural quality' },
  { from: TC.PROTOCOL_SUBSTANCE, to: TC.MARKET_SURFACE, type: 'supports',
    description: 'Fundamental quality + price action together support rerating thesis' },

  // ── On-Chain Behavior interactions ───────────────────────────────────
  { from: TC.ONCHAIN_BEHAVIOR, to: TC.ENTITY_CONTEXT, type: 'escalates',
    description: 'Raw behavior becomes interpretable when entity labels provide actor significance',
    tensionSignal: 'activity_present_identity_unknown' },
  { from: TC.ONCHAIN_BEHAVIOR, to: TC.STRUCTURAL_SAFETY, type: 'supports',
    description: 'Behavior patterns + safety flags together detect manipulation or legitimacy' },
  { from: TC.ONCHAIN_BEHAVIOR, to: TC.DERIVATIVES_PRESSURE, type: 'contradicts',
    description: 'Spot-led accumulation contradicts leverage-only driven interpretation',
    tensionSignal: 'spot_accumulation_vs_leverage_dominance' },

  // ── Structural Safety interactions ───────────────────────────────────
  { from: TC.STRUCTURAL_SAFETY, to: TC.MARKET_SURFACE, type: 'contradicts',
    description: 'Price strength + safety danger creates false-confidence tension',
    tensionSignal: 'price_strong_safety_poor' },
  { from: TC.STRUCTURAL_SAFETY, to: TC.DEX_EMERGENCE, type: 'escalates',
    description: 'Safety gates DEX discovery — unsafe early pairs should be suppressed' },

  // ── Narrative Attention interactions ──────────────────────────────────
  { from: TC.NARRATIVE_ATTENTION, to: TC.PROTOCOL_SUBSTANCE, type: 'contradicts',
    description: 'Narrative without substance is the defining tension of reflexive pumps',
    tensionSignal: 'attention_high_substance_absent' },
  { from: TC.NARRATIVE_ATTENTION, to: TC.ENTITY_CONTEXT, type: 'independent',
    description: 'Narrative spread and entity significance are independent observations' },
  { from: TC.NARRATIVE_ATTENTION, to: TC.STRUCTURAL_SAFETY, type: 'contradicts',
    description: 'Social hype on structurally unsafe tokens is a critical warning',
    tensionSignal: 'social_hype_structural_danger' },

  // ── Entity Context interactions ──────────────────────────────────────
  { from: TC.ENTITY_CONTEXT, to: TC.ONCHAIN_BEHAVIOR, type: 'escalates',
    description: 'Entity labels escalate raw on-chain activity into meaningful actor interpretation' },
  { from: TC.ENTITY_CONTEXT, to: TC.DERIVATIVES_PRESSURE, type: 'independent',
    description: 'Entity identity and derivatives crowding are measured independently' },

  // ── Reasoning Expression interactions ────────────────────────────────
  { from: TC.REASONING_EXPRESSION, to: TC.MARKET_SURFACE, type: 'independent',
    description: 'Reasoning receives truth, does not create it' },
  { from: TC.REASONING_EXPRESSION, to: TC.STRUCTURAL_SAFETY, type: 'independent',
    description: 'Reasoning must not override safety constraints' },
];

export function getInteractionsFor(truthClass: TruthClass): ClassInteraction[] {
  return CLASS_INTERACTIONS.filter(i => i.from === truthClass || i.to === truthClass);
}

export function getInteractionBetween(a: TruthClass, b: TruthClass): ClassInteraction | undefined {
  return CLASS_INTERACTIONS.find(
    i => (i.from === a && i.to === b) || (i.from === b && i.to === a),
  );
}

export function getContradictions(): ClassInteraction[] {
  return CLASS_INTERACTIONS.filter(i => i.type === 'contradicts');
}

export function getEscalations(): ClassInteraction[] {
  return CLASS_INTERACTIONS.filter(i => i.type === 'escalates');
}

export function getTensionSignals(): Array<{ signal: string; interaction: ClassInteraction }> {
  return CLASS_INTERACTIONS
    .filter(i => i.tensionSignal)
    .map(i => ({ signal: i.tensionSignal!, interaction: i }));
}
