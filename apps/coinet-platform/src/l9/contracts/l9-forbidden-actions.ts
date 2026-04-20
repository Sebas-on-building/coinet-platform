/**
 * L9.1 — Forbidden Actions Contract
 *
 * §9.1.6 — What Layer 9 may NEVER do. These must be codified and
 * test-covered, not left as prose.
 */

import { L9ForbiddenAction } from './l9-constitutional-types';

export interface L9ForbiddenActionDefinition {
  readonly action: L9ForbiddenAction;
  readonly description: string;
  readonly examples: readonly string[];
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const L9_FORBIDDEN_ACTION_DEFINITIONS: readonly L9ForbiddenActionDefinition[] = [
  {
    action: L9ForbiddenAction.VALIDATION_TRUTH_REDEFINITION,
    description:
      'L9 may consume L7 validation truth but may not redefine or override it. ' +
      'Validation classes, contradiction families, and confidence bands from L7 are law.',
    examples: [
      'Overriding a L7 validation class from CONFLICTING to CONFIRMED inside sequence logic',
      'Recomputing validation truth from L6 to bypass L7 restrictions',
      'Reclassifying a contradiction family as noise inside a sequence engine',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.CONTRADICTION_POSTURE_IGNORE,
    description:
      'L9 may not ignore the contradiction posture attached to an L7 assessment when ' +
      'conditioning sequence outputs, lead-lag structure, or phase classification',
    examples: [
      'Treating a L7 result with open contradiction as fully supported inside a sequence chain',
      'Silently dropping contradiction posture when deriving sequence confidence',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.RESTRICTION_POSTURE_IGNORE,
    description:
      'L9 may not ignore the restriction profile attached to an L7 assessment or L8 regime output',
    examples: [
      'Using L7 output in sequence-confidence derivation when restriction forbids it',
      'Serving restricted L8 regime state to L10 consumers without governed re-declaration',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.RESTRICTION_BYPASS,
    description:
      'L9 may not widen the downstream rights of L7 or L8 outputs beyond their declared restriction profile',
    examples: [
      'Emit a sequence confidence that requires more L7 strength than restriction allows',
      'Use restricted L8 regime state as if it were unrestricted in phase classification',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.REGIME_POSTURE_IGNORE,
    description:
      'L9 may not ignore L8 regime posture when sequence meaning depends on environment. ' +
      'Same chain means different things in RISK_OFF vs RISK_ON, fragile vs deep liquidity.',
    examples: [
      'Classifying a lead-lag chain identically across RISK_OFF and RISK_ON',
      'Classifying crowding phase identically across THIN_LIQUIDITY_FRAGILITY and SPOT_LED_EXPANSION',
      'Ignoring transition risk when active regime transition is declared',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.REGIME_REINTERPRETATION,
    description:
      'L9 may consume L8 regime state but may not locally reinterpret or replace regime truth',
    examples: [
      'Deriving regime from L6 primitives inside a sequence engine',
      'Reclassifying regime when L8 already provides a stable regime call',
      'Overriding regime confidence from L8',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.RAW_DATA_SEQUENCE_INVENTION,
    description:
      'L9 may not invent sequence meaning from raw ungated data that bypasses L6/L7/L8 governance',
    examples: [
      'Compute lead-lag directly from an exchange websocket feed',
      'Compute phase progression from provider-native snapshots not routed through L6',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.RAW_L6_REVALIDATION_BYPASS,
    description:
      'L9 may not re-run validation live from L6 to bypass L7 restrictions — that is L7 work',
    examples: [
      'Redo contradiction detection inside sequence engine',
      'Re-assess confidence from L6 primitives without going through L7',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.AMBIGUITY_LAUNDERING,
    description:
      'L9 may not silently flatten ordering ambiguity into fake clean chains. Ambiguous ' +
      'ordering must be preserved as an explicit ambiguity posture.',
    examples: [
      'Tie-breaking two equally-timed signals by narrative preference',
      'Declaring a clean chain when ordering is materially ambiguous',
      'Dropping the ambiguity flag when multiple orderings fit the evidence',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.CAUSAL_LAUNDERING,
    description:
      'L9 may not promote loose temporal adjacency into causal certainty. Temporal order ' +
      'may support lead-lag interpretation; it may never silently become "A caused B".',
    examples: [
      'Claiming whale-buy caused narrative growth because it happened first',
      'Declaring OI expansion caused price without causal-restraint tagging',
      'Emitting "causal certainty" outputs from ordered chains',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.TEMPORAL_THEATRICS,
    description:
      'L9 may not produce elegant temporal stories that are not supported by governed evidence',
    examples: [
      '"Clean chain" claims where ordering is materially ambiguous',
      '"Early phase" claims where the initiating signal appeared late',
      '"Validated expansion" claims where the chain is actually reflexive or crowded',
      '"Post-shock digestion" claims without a valid shock anchor and post-event window',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.FINAL_SCENARIO_LEAK,
    description: 'L9 may not emit scenario finalization',
    examples: ['scenario_winner', 'most_likely_scenario', 'final_scenario', 'scenario_chain'],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.FINAL_JUDGMENT_LEAK,
    description:
      'L9 may not emit final judgment language such as "best sequence", "winning setup", or ' +
      '"highest-conviction chain"',
    examples: [
      'final_judgment',
      'best_sequence',
      'winning_sequence',
      'conviction_sequence',
      'attractive_setup',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.FINAL_SCORE_LEAK,
    description:
      'L9 may not emit deterministic final scoring — sequence confidence is interpretive posture, not score',
    examples: [
      'final_score',
      'score_override',
      'score_boost_from_sequence',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
    description:
      'L9 may not emit recommendation or actionability language — no buy/sell/avoid signals, no "trade-ready" or "entry-ready" labels',
    examples: [
      'buy_signal',
      'sell_signal',
      'avoid_signal',
      'trade_signal',
      'trade_ready_sequence',
      'entry_ready_timing',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.HYPOTHESIS_LEAK,
    description:
      'L9 may not behave as a hypothesis or scenario engine. Sequence meaning is not a hypothesis.',
    examples: [
      'hypothesis_sequence',
      'hypothesis_chain',
      'scenario_chain',
      'candidate_scenario_sequence',
    ],
    severity: 'HIGH',
  },
  {
    action: L9ForbiddenAction.ACTION_BIAS_IN_SEQUENCE_NAME,
    description:
      'Sequence labels must describe governed temporal meaning, not imply actions',
    examples: [
      'buy_ready_sequence',
      'risk_on_buy_sequence',
      'bullish_confirmed_chain',
      'alpha_phase_entry',
    ],
    severity: 'HIGH',
  },
  {
    action: L9ForbiddenAction.ILLEGAL_L5_BYPASS,
    description: 'L9 may not persist or read outside governed L5 paths',
    examples: [
      'Direct Postgres INSERT bypassing L5 for sequence state',
      'Shadow Redis store for sequence state',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.LOWER_LAYER_IDENTITY_REDEFINITION,
    description: 'L9 may not re-resolve identity established by L3',
    examples: ['creating entity IDs from provider keys', 'shadow identity maps'],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.LOWER_LAYER_GRAPH_REDEFINITION,
    description: 'L9 may not invent graph semantics or rebuild propagation law',
    examples: ['ad hoc edges outside L4', 'local propagation weights inside sequence logic'],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.LOWER_LAYER_PRIMITIVE_REDEFINITION,
    description:
      'L9 may consume L6 primitives but may not mutate their meaning or reinterpret their null/freshness law',
    examples: [
      'Treating a funding_z as a different metric inside a sequence calc',
      'Redefining event instance semantics inside sequence logic',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L9ForbiddenAction.STALE_SEQUENCE_MASQUERADE,
    description:
      'L9 may not silently fall back to stale sequence state without explicit staleness classification',
    examples: [
      'Returning last-known sequence without staleness or freshness declaration',
      'Marking a stale chain as current when the underlying L6/L7/L8 inputs are stale',
    ],
    severity: 'HIGH',
  },
  {
    action: L9ForbiddenAction.EVIDENCE_ONLY_AS_DECISIVE,
    description:
      'L9 may read evidence-backed context surfaces, but may not treat evidence-only ' +
      'surfaces as decisive chain support',
    examples: [
      'Declaring a clean chain based solely on an evidence-only read surface',
      'Raising sequence confidence purely from an evidence-only L7 read',
    ],
    severity: 'HIGH',
  },
  {
    action: L9ForbiddenAction.LATE_LAYER_CONSUMPTION,
    description:
      'L9 may not consume later-layer (L10+) scenario, hypothesis, score, or judgment surfaces as sequence evidence',
    examples: [
      'Using an L10 scenario selection as a lead-lag anchor',
      'Using an L12 recommendation as a sequence chain input',
    ],
    severity: 'CRITICAL',
  },
];

export function getL9ForbiddenActionDefinition(
  action: L9ForbiddenAction,
): L9ForbiddenActionDefinition {
  return L9_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === action)!;
}

export function getAllL9CriticalForbiddenActions(): readonly L9ForbiddenAction[] {
  return L9_FORBIDDEN_ACTION_DEFINITIONS.filter(d => d.severity === 'CRITICAL').map(d => d.action);
}
