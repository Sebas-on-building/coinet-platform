/**
 * L10.1 — Forbidden Actions Contract
 *
 * §10.1.5 — What Layer 10 may NEVER do. Codified and test-covered.
 */

import { L10ForbiddenAction } from './l10-constitutional-types';

export interface L10ForbiddenActionDefinition {
  readonly action: L10ForbiddenAction;
  readonly description: string;
  readonly examples: readonly string[];
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const L10_FORBIDDEN_ACTION_DEFINITIONS: readonly L10ForbiddenActionDefinition[] = [
  {
    action: L10ForbiddenAction.LOWER_LAYER_TRUTH_REDEFINITION,
    description:
      'L10 may consume lower-layer (L3–L9) governed truth but may not redefine or override it. ' +
      'Validation classes, contradiction families, regime state, and sequence posture are law.',
    examples: [
      'Overriding a L7 validation class inside a hypothesis',
      'Recomputing validation truth from L6 inside hypothesis logic',
      'Rewriting regime state inside a hypothesis ranking',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.CONTRADICTION_POSTURE_OVERWRITE,
    description:
      'L10 may not overwrite or ignore the contradiction posture attached to an L7 assessment when ' +
      'binding contradiction-domain evidence',
    examples: [
      'Marking a hypothesis as uncontested when L7 attached an open contradiction',
      'Silently dropping contradiction posture when ranking candidates',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.RESTRICTION_POSTURE_IGNORED,
    description:
      'L10 may not ignore the restriction profile attached to an L7, L8, or L9 output',
    examples: [
      'Using L7 output in hypothesis-confidence derivation when restriction forbids it',
      'Serving restricted L9 sequence state inside a hypothesis without re-declaring posture',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.RESTRICTION_BYPASS,
    description:
      'L10 may not widen the downstream rights of L7/L8/L9 outputs beyond their declared restriction profile',
    examples: [
      'Emit a hypothesis requiring more L7 strength than restriction allows',
      'Use restricted L9 sequence state as if it were unrestricted in ranking',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.REGIME_POSTURE_OVERWRITE,
    description:
      'L10 may not overwrite L8 regime posture where hypothesis construction depends on it',
    examples: [
      'Treating a hypothesis as regime-agnostic when L8 declared active regime transition',
      'Classifying ranking identically across RISK_OFF and RISK_ON',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.SEQUENCE_POSTURE_OVERWRITE,
    description:
      'L10 may not overwrite L9 sequence posture (lead-lag, phase, decay, causal restraint, ambiguity)',
    examples: [
      'Redefining lead-lag relations inside a hypothesis',
      'Dropping L9 ambiguity posture when binding support',
      'Removing L9 causal-restraint tag when the hypothesis tells a neater story',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.L7_LIVE_REVALIDATION,
    description:
      'L10 may not re-run L7 validation live from L6 to bypass restrictions',
    examples: [
      'Recomputing confidence from primitives inside hypothesis logic',
      'Re-running contradiction detection inside hypothesis ranking',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.REGIME_RECLASSIFICATION,
    description:
      'L10 may not locally reclassify L8 regime — it must consume L8 as law',
    examples: [
      'Deriving regime from L6 primitives inside hypothesis logic',
      'Reclassifying regime when L8 already provides a stable call',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.SEQUENCE_REINTERPRETATION,
    description:
      'L10 may not locally reinterpret L9 sequence meaning — it must consume L9 as law',
    examples: [
      'Rebuilding lead-lag relations inside hypothesis logic',
      'Rewriting phase state to fit a candidate narrative',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.SINGLE_STORY_COLLAPSE,
    description:
      'L10 may not collapse competing candidates into one comfortable story. At least one ' +
      'plausible alternative must always remain visible.',
    examples: [
      'Emitting a primary hypothesis without any preserved alternative',
      'Discarding a plausible competitor because a neat narrative is preferred',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.ALTERNATIVE_SUPPRESSION,
    description:
      'L10 may not silently suppress a plausible competitor to make a primary look clean',
    examples: [
      'Dropping a competitor whose evidence asymmetry is small',
      'Hiding an alternative because it inconveniences the narrative',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.CLOSE_SPREAD_CONCEALMENT,
    description:
      'L10 may not conceal a close primary/secondary spread. Close spreads must be visible ' +
      'to later layers.',
    examples: [
      'Reporting a wide spread when primary/secondary are within noise',
      'Rounding a close spread up to hide narrowing',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.CONFIRMATION_GAP_CONCEALMENT,
    description:
      'L10 may not hide missing confirmations. Confirmation gaps must be emitted explicitly.',
    examples: [
      'Marking a hypothesis as fully supported when confirmations are missing',
      'Dropping confirmation-gap posture under ranking pressure',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.INVALIDATION_POSTURE_CONCEALMENT,
    description:
      'L10 may not hide invalidation-risk posture. Invalidation conditions must be emitted.',
    examples: [
      'Reporting low invalidation risk when L7/L8/L9 imply material risk',
      'Suppressing known invalidation anchors',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.EXPLANATION_LAUNDERING,
    description:
      'L10 may not launder weak support into strong explanation via rhetorical devices or ' +
      'confidence numerology',
    examples: [
      'Up-weighting a weak support into high confidence to justify primary',
      'Using spread magnitude to imply certainty',
      'Translating fragile evidence into decisive narrative',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.FINAL_SCENARIO_LEAK,
    description: 'L10 may not emit final scenario selection',
    examples: [
      'scenario_winner',
      'final_scenario',
      'most_likely_scenario',
      'scenario_chain_winner',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.FINAL_JUDGMENT_LEAK,
    description:
      'L10 may not emit final judgment language such as "best explanation", "winning thesis", or ' +
      '"highest-conviction hypothesis"',
    examples: [
      'final_judgment',
      'best_explanation',
      'winning_explanation',
      'conviction_ranking',
      'attractive_opportunity',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.FINAL_SCORE_LEAK,
    description:
      'L10 may not emit deterministic final scoring — hypothesis confidence is interpretive posture',
    examples: ['final_score', 'score_override', 'score_boost_from_hypothesis'],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
    description:
      'L10 may not emit recommendation or actionability language — no buy/sell/avoid signals, no ' +
      '"trade-ready" or "entry-ready" labels',
    examples: [
      'buy_signal',
      'sell_signal',
      'avoid_signal',
      'trade_signal',
      'trade_ready_hypothesis',
      'entry_ready_explanation',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.CONVICTION_LANGUAGE_LEAK,
    description:
      'L10 may not emit conviction semantics such as "highest conviction" or "best opportunity"',
    examples: [
      'highest_conviction_hypothesis',
      'best_opportunity',
      'clear_buy_explanation',
      'ideal_explanation',
      'alpha_explanation',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.CAUSAL_LAUNDERING,
    description:
      'L10 may not promote support, temporal adjacency, regime compatibility, contradiction ' +
      'absence, or lead-lag structure into proven causation',
    examples: [
      'Declaring "this narrative caused the move" from temporal support',
      'Declaring "regime confirms cause" from compatibility',
      'Emitting causal certainty outputs from ranked hypotheses',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.PRIMARY_AS_FINAL_TRUTH,
    description:
      'L10 may not let a primary hypothesis masquerade as final truth. The primary is one ' +
      'candidate in competition — never the verdict.',
    examples: [
      'Emitting a primary labelled the_explanation',
      'Stripping spread/alternative fields so the primary appears singular',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.ILLEGAL_L5_BYPASS,
    description: 'L10 may not persist or read outside governed L5 paths',
    examples: [
      'Direct Postgres INSERT bypassing L5 for hypothesis state',
      'Shadow Redis store for hypothesis state',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.LOWER_LAYER_IDENTITY_REDEFINITION,
    description: 'L10 may not re-resolve identity established by L3',
    examples: ['creating entity IDs from provider keys', 'shadow identity maps'],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.LOWER_LAYER_GRAPH_REDEFINITION,
    description: 'L10 may not invent graph semantics or rebuild propagation law',
    examples: ['ad hoc edges outside L4', 'local propagation weights inside hypothesis logic'],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.LOWER_LAYER_PRIMITIVE_REDEFINITION,
    description:
      'L10 may consume L6 primitives but may not mutate their meaning or reinterpret their null/freshness law',
    examples: [
      'Treating a funding_z as a different metric inside hypothesis logic',
      'Redefining event instance semantics inside hypothesis logic',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.RAW_DATA_HYPOTHESIS_INVENTION,
    description:
      'L10 may not invent hypotheses from raw ungated data that bypasses L6/L7/L8/L9 governance',
    examples: [
      'Generate hypothesis from exchange websocket feed',
      'Derive support directly from provider-native snapshots not routed through L6',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L10ForbiddenAction.LATE_LAYER_CONSUMPTION,
    description:
      'L10 may not consume later-layer (L11+) scenario, judgment, recommendation, or score surfaces ' +
      'as hypothesis evidence',
    examples: [
      'Using an L11 scenario as a hypothesis anchor',
      'Using an L12 recommendation as a hypothesis input',
    ],
    severity: 'CRITICAL',
  },
];

export function getL10ForbiddenActionDefinition(
  action: L10ForbiddenAction,
): L10ForbiddenActionDefinition {
  return L10_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === action)!;
}

export function getAllL10CriticalForbiddenActions(): readonly L10ForbiddenAction[] {
  return L10_FORBIDDEN_ACTION_DEFINITIONS.filter(d => d.severity === 'CRITICAL').map(
    d => d.action,
  );
}
