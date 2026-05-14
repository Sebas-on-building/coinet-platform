/**
 * L13.1 — Forbidden Actions Contract
 *
 * §13.1.5 — What Layer 13 may NEVER do. Codified, severity-mapped,
 * and test-covered. All recommendation, prediction,
 * unsupported-certainty, and lower-layer-rebuild actions are CRITICAL.
 */

import {
  L13ForbiddenAction,
  L13ViolationSeverity,
} from './l13-constitutional-types';

export interface L13ForbiddenActionDefinition {
  readonly action: L13ForbiddenAction;
  readonly description: string;
  readonly exampleIllegalOutput: string;
  readonly legalRewrite: string;
  readonly severity: L13ViolationSeverity;
  readonly blocking: boolean;
}

export const L13_FORBIDDEN_ACTION_DEFINITIONS:
  readonly L13ForbiddenActionDefinition[] = [
  // ── Invention / hiding / restriction ──
  {
    action: L13ForbiddenAction.INVENT_MISSING_SUPPORT,
    description:
      'L13 may not invent supporting evidence, drivers, or claims that are not present in the governed input package.',
    exampleIllegalOutput:
      'Whales are accumulating heavily.',
    legalRewrite:
      'The engine has no on-chain accumulation evidence in the current governed inputs.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.HIDE_CONTRADICTION,
    description:
      'L13 may not omit a known L7 contradiction, an L10 active invalidation, or an L12 narrow spread.',
    exampleIllegalOutput:
      'The setup is clean and contradiction-free.',
    legalRewrite:
      'A contradiction is currently active and is capping confidence.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.IGNORE_RESTRICTION,
    description:
      'L13 may not use a lower-layer output for a purpose blocked by its restriction profile.',
    exampleIllegalOutput:
      'Score restriction says calibration-only — using it as advice anyway.',
    legalRewrite:
      'The score is in calibration-only restriction; it must not drive any advice.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.OVERRIDE_CONFIDENCE_CAP,
    description:
      'L13 may not present higher confidence than the engine emitted (no laundering of caps).',
    exampleIllegalOutput:
      'Despite the engine cap, this is a high-conviction setup.',
    legalRewrite:
      'The engine has capped confidence due to active contradiction; conviction language is unsupported.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.PRETEND_MISSING_DATA_COMPLETE,
    description:
      'L13 may not claim data is complete when the L11 missing-data profile says otherwise.',
    exampleIllegalOutput:
      'Visibility is full. Nothing is missing.',
    legalRewrite:
      'On-chain coverage is partial; the missing-data profile flags reduced visibility.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },

  // ── Lower-layer rebuild ──
  {
    action: L13ForbiddenAction.REBUILD_SCENARIO,
    description:
      'L13 may not reconstruct scenario sets, base case, or alternative paths from L7–L11 directly.',
    exampleIllegalOutput:
      'Scenario set was rebuilt locally because L12 looked stale.',
    legalRewrite:
      'L12 is the scenario authority; L13 reads its scenario set as-is.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.REBUILD_SCORE,
    description:
      'L13 may not recompute scores, components, or attribution. L11 is authority.',
    exampleIllegalOutput:
      'Recomputed Opportunity Score locally = 78.',
    legalRewrite:
      'The L11 Opportunity Score is 74 with attribution to liquidity and ecosystem.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.REBUILD_HYPOTHESIS,
    description:
      'L13 may not rebuild or rerank hypotheses. L10 is authority.',
    exampleIllegalOutput:
      'Locally reranked hypotheses; sees H2 above H1.',
    legalRewrite:
      'The L10 primary hypothesis is H1; the secondary is H2 with narrow spread.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.REBUILD_SEQUENCE,
    description:
      'L13 may not infer or reorder sequence locally. L9 is authority.',
    exampleIllegalOutput:
      'Reinterpreted sequence locally; sees early validation.',
    legalRewrite:
      'L9 marks the setup as late and decaying.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.REBUILD_REGIME,
    description:
      'L13 may not classify regime locally. L8 is authority.',
    exampleIllegalOutput:
      'Locally classified regime as risk-on.',
    legalRewrite:
      'L8 marks the regime as fragile leverage-led.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },

  // ── Engine creation by L13 ──
  {
    action: L13ForbiddenAction.CREATE_NEW_SCENARIO,
    description:
      'L13 may not invent a scenario that L12 did not emit.',
    exampleIllegalOutput:
      'Adding a third scenario "explosive breakout" — best case.',
    legalRewrite:
      'L12 emitted only base case + bullish/bearish alternatives.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.CREATE_NEW_HYPOTHESIS,
    description:
      'L13 may not invent a hypothesis that L10 did not emit.',
    exampleIllegalOutput:
      'New hypothesis: alien intervention.',
    legalRewrite:
      'L10 has not produced any new hypothesis matching that claim.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.COMPUTE_SCORE_LOCALLY,
    description:
      'L13 may not compute its own score or its own confidence.',
    exampleIllegalOutput:
      'Computed L13 confidence = 0.92.',
    legalRewrite:
      'L11 reports the score with attribution; no local L13 score is computed.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },

  // ── Recommendation leakage ──
  {
    action: L13ForbiddenAction.EMIT_BUY_INSTRUCTION,
    description: 'L13 may not say "buy".',
    exampleIllegalOutput: 'Buy now.',
    legalRewrite:
      'The engine sees a continuation path with rising fragility.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.EMIT_SELL_INSTRUCTION,
    description: 'L13 may not say "sell".',
    exampleIllegalOutput: 'Sell now.',
    legalRewrite:
      'The bearish failure path is open and trigger conditions are present.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.EMIT_HOLD_INSTRUCTION,
    description: 'L13 may not say "hold".',
    exampleIllegalOutput: 'Hold here.',
    legalRewrite:
      'Confidence is capped; multiple paths remain plausible.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.EMIT_AVOID_INSTRUCTION,
    description: 'L13 may not say "avoid".',
    exampleIllegalOutput: 'Avoid this asset.',
    legalRewrite:
      'Active L7 contradiction is present; restriction profile applies.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.EMIT_LEVERAGE_INSTRUCTION,
    description: 'L13 may not advise leverage.',
    exampleIllegalOutput: 'Use 5x leverage.',
    legalRewrite:
      'Regime is leverage-led with rising fragility; the engine does not size positions.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.EMIT_POSITION_SIZE_INSTRUCTION,
    description: 'L13 may not advise position size.',
    exampleIllegalOutput: 'Size 2% of book.',
    legalRewrite:
      'The engine does not produce sizing.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.EMIT_ENTRY_EXIT_INSTRUCTION,
    description: 'L13 may not advise entry or exit.',
    exampleIllegalOutput: 'Enter on the next dip.',
    legalRewrite:
      'A trigger condition would be a sustained reclaim of the prior breakout level.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },

  // ── Prediction / certainty / final-judgment leakage ──
  {
    action: L13ForbiddenAction.CLAIM_GUARANTEE,
    description:
      'L13 may not claim guaranteed outcomes.',
    exampleIllegalOutput:
      'This is a guaranteed continuation.',
    legalRewrite:
      'The continuation path remains plausible if its triggers fire.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.CLAIM_CERTAINTY_UNSUPPORTED,
    description:
      'L13 may not claim certainty when the engine has not.',
    exampleIllegalOutput:
      'It is certain this hypothesis is correct.',
    legalRewrite:
      'L10 spread is narrow; competition between hypotheses is still open.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.CALL_SCENARIO_WINNER,
    description:
      'L13 may not declare a winning scenario.',
    exampleIllegalOutput:
      'Bullish continuation is the winning scenario.',
    legalRewrite:
      'The bullish continuation is the base case; the bearish failure path is preserved.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.CALL_HYPOTHESIS_FINAL_TRUTH,
    description:
      'L13 may not declare a hypothesis as final truth.',
    exampleIllegalOutput:
      'H1 is the final truth.',
    legalRewrite:
      'H1 leads under L10 ranking; H2 remains plausible.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.SAY_SCORE_MEANS_RECOMMENDATION,
    description:
      'L13 may not equate a score value with a recommendation.',
    exampleIllegalOutput:
      'Opportunity Score 80 means buy.',
    legalRewrite:
      'Opportunity Score is 80 with attribution to liquidity; restriction profile still applies.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.TREAT_SCENARIO_CONFIDENCE_AS_PROBABILITY,
    description:
      'L13 may not present scenario path confidence as a probability of outcome.',
    exampleIllegalOutput:
      'Bullish path has a 70% probability of happening.',
    legalRewrite:
      'L12 path confidence is 0.70 — this is a governed path-strength measure, not a probability of outcome.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },

  // ── Omissions ──
  {
    action: L13ForbiddenAction.OMIT_ACTIVE_INVALIDATION,
    description:
      'L13 must not omit an active L10 / L12 invalidation when explaining a scenario.',
    exampleIllegalOutput:
      'Bullish continuation is intact.',
    legalRewrite:
      'Bullish continuation remains plausible, but its invalidation is active and confidence is capped.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.OMIT_REQUIRED_TRIGGER,
    description:
      'L13 must not omit the required trigger when explaining a scenario.',
    exampleIllegalOutput:
      'Bullish continuation is the base case.',
    legalRewrite:
      'Bullish continuation is the base case if its trigger (sustained reclaim) holds.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },

  // ── Raw lower-layer bypass ──
  {
    action: L13ForbiddenAction.USE_RAW_LOWER_LAYER_BYPASS,
    description:
      'L13 may not consume raw L6/L7/L8/L9/L10/L11 internal state by bypassing governed handoff surfaces.',
    exampleIllegalOutput:
      'Read raw on-chain state from L6 directly to assemble explanation.',
    legalRewrite:
      'Reference governed L6 evidence ref surfaces only via L7/L11/L12 handoff.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
  {
    action: L13ForbiddenAction.OUTPUT_UNGROUNDED_CLAIM,
    description:
      'L13 must not emit a claim without an evidence ref or lineage ref.',
    exampleIllegalOutput:
      'Many institutions are buying.',
    legalRewrite:
      'No L7/L11/L12 evidence ref supports an institutional-flow claim.',
    severity: L13ViolationSeverity.CRITICAL,
    blocking: true,
  },
];

export function getL13ForbiddenActionDefinition(
  action: L13ForbiddenAction,
): L13ForbiddenActionDefinition {
  return L13_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === action)!;
}

export function getAllL13CriticalForbiddenActions():
  readonly L13ForbiddenAction[] {
  return L13_FORBIDDEN_ACTION_DEFINITIONS
    .filter(d => d.severity === L13ViolationSeverity.CRITICAL)
    .map(d => d.action);
}

export function getAllL13BlockingForbiddenActions():
  readonly L13ForbiddenAction[] {
  return L13_FORBIDDEN_ACTION_DEFINITIONS
    .filter(d => d.blocking)
    .map(d => d.action);
}
