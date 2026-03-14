/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     JUDGMENT DEBUG VIEW                                                       ║
 * ║                                                                               ║
 * ║   Inspect every layer of the judgment engine:                                 ║
 * ║   - Raw input signals                                                         ║
 * ║   - State classification candidates and scores                                ║
 * ║   - Contradiction detection details                                           ║
 * ║   - Confidence penalties breakdown                                            ║
 * ║   - Evidence ledger contents                                                  ║
 * ║   - Scenario generation rationale                                             ║
 * ║   - Quality check results                                                     ║
 * ║                                                                               ║
 * ║   Use this to diagnose and tune the judgment system.                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { SignalSnapshot } from './signal-snapshot';
import type { JudgmentOutput } from './types';
import {
  MARKET_STATE_LABELS,
  MARKET_STATE_GROUPS,
  HYPOTHESIS_LABELS,
  CONTRADICTION_LABELS,
  TIMING_LABELS,
  type MarketState,
  type HypothesisClass,
  type ContradictionClass,
  type TimingPhase,
} from './taxonomies';

// ═══════════════════════════════════════════════════════════════════════════════
// DEBUG OUTPUT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface JudgmentDebugView {
  meta: {
    entity_id: string;
    symbol: string;
    chain: string | null;
    judged_at: string;
    version: string;
  };

  input_signals: {
    raw: SignalSnapshot;
    summary: string[];
  };

  state_debug: {
    primary: { state: string; label: string; group: string; confidence: number };
    secondary: { state: string; label: string; group: string } | null;
  };

  cause_debug: {
    dominant_cluster: string;
    secondary_cluster: string | null;
    positive_drivers: Array<{
      family: string;
      strength: number;
      feature_count: number;
      summary: string;
    }>;
    negative_drivers: Array<{
      family: string;
      strength: number;
      feature_count: number;
      summary: string;
    }>;
  };

  thesis_debug: {
    primary: { hypothesis: string; label: string; support: number; contradiction: number; confidence: number };
    secondary: { hypothesis: string; label: string; support: number; contradiction: number; confidence: number } | null;
    clarity: number;
    ambiguous: boolean;
  };

  contradiction_debug: {
    total_detected: number;
    load: number;
    structural_warning: boolean;
    items: Array<{
      class: string;
      label: string;
      severity: string;
      resolvable: boolean;
      affects: string[];
      summary: string;
    }>;
  };

  timing_debug: {
    phase: string;
    phase_label: string;
    score: number;
    position: string;
    maturity_warning: boolean;
    maturity_note: string | null;
    sequence: {
      pattern: string;
      health: number;
      lead_signal: string;
      lag_signal: string;
      missing_lead: string | null;
      late_arrivals: string[];
      summary: string;
    } | null;
    maturity: {
      score: number;
      label: string;
      risk_factors: string[];
      confirmation_needed: string[];
    } | null;
    inflections: Array<{ type: string; label: string; strength: number }>;
    projection: {
      must_happen: string[];
      invalidates_thesis: string[];
      watch_for: string[];
    } | null;
  };

  scenario_debug: {
    base_case: string;
    bullish_confirmation: string;
    bearish_failure: string;
    next_trigger: string;
    scenario_confidence: number;
  };

  confidence_debug: {
    overall_band: string;
    overall_score: number;
    breakdown: {
      market: number;
      fundamentals: number;
      onchain: number;
      narrative: number;
    };
    primary_uncertainty: string | null;
    penalties_applied: string[];
  };

  evidence_debug: {
    positive_count: number;
    negative_count: number;
    unresolved_count: number;
    stale_count: number;
    positive: string[];
    negative: string[];
    unresolved: string[];
    stale: string[];
  };

  quality_checks: {
    has_clear_state: boolean;
    has_top_causes: boolean;
    has_contradictions: boolean;
    has_timing: boolean;
    has_next_conditions: boolean;
    has_honest_confidence: boolean;
    all_passed: boolean;
  };

  scores_reference: {
    qs: number;
    os: number | null;
    risk: number;
    pos: number | null;
  };

  regime_debug: {
    macro_posture: string;
    macro_confidence: number;
    macro_drivers: string[];
    btc_trend: string;
    btc_dominance_trend: string;
    overall_leverage: string;
    ecosystem_chain: string;
    ecosystem_health: string;
    ecosystem_tvl_trend: string;
    ecosystem_activity_trend: string;
    ecosystem_capital_flow: string;
    volatility_regime: string;
    volatility_trend: string;
    transition_risk: string;
    transition_probability: number;
    transition_direction: string;
    transition_signals: string[];
    confidence_modifier: number;
    data_coverage: number;
    config_version: string;
    summary: string;
  } | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD DEBUG VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export function buildJudgmentDebugView(
  judgment: JudgmentOutput,
  signals: SignalSnapshot
): JudgmentDebugView {
  return {
    meta: {
      entity_id: judgment.entity_id,
      symbol: judgment.symbol,
      chain: judgment.chain,
      judged_at: judgment.judged_at,
      version: judgment.version,
    },

    input_signals: {
      raw: signals,
      summary: summarizeSignals(signals),
    },

    state_debug: {
      primary: {
        state: String(judgment.state.primary),
        label: String(MARKET_STATE_LABELS[judgment.state.primary as MarketState] ?? judgment.state.primary),
        group: String(MARKET_STATE_GROUPS[judgment.state.primary as MarketState] ?? 'unknown'),
        confidence: Number(judgment.state.confidence),
      },
      secondary: judgment.state.secondary
        ? {
            state: String(judgment.state.secondary),
            label: String(MARKET_STATE_LABELS[judgment.state.secondary as MarketState] ?? judgment.state.secondary),
            group: String(MARKET_STATE_GROUPS[judgment.state.secondary as MarketState] ?? 'unknown'),
          }
        : null,
    },

    cause_debug: {
      dominant_cluster: String(judgment.cause.dominant_cluster),
      secondary_cluster: judgment.cause.secondary_cluster != null ? String(judgment.cause.secondary_cluster) : null,
      positive_drivers: (judgment.cause.positive_drivers as Array<{ family: string; strength: number; supporting_features: string[]; summary: string }>).map(d => ({
        family: d.family,
        strength: d.strength,
        feature_count: d.supporting_features.length,
        summary: d.summary,
      })),
      negative_drivers: (judgment.cause.negative_drivers as Array<{ family: string; strength: number; supporting_features: string[]; summary: string }>).map(d => ({
        family: d.family,
        strength: d.strength,
        feature_count: d.supporting_features.length,
        summary: d.summary,
      })),
    },

    thesis_debug: {
      primary: {
        hypothesis: String(judgment.thesis.primary.hypothesis),
        label: String(HYPOTHESIS_LABELS[judgment.thesis.primary.hypothesis as HypothesisClass] ?? judgment.thesis.primary.hypothesis),
        support: Number(judgment.thesis.primary.support_score),
        contradiction: Number(judgment.thesis.primary.contradiction_score),
        confidence: Number(judgment.thesis.primary.confidence),
      },
      secondary: judgment.thesis.secondary
        ? {
            hypothesis: String(judgment.thesis.secondary.hypothesis),
            label: String(HYPOTHESIS_LABELS[judgment.thesis.secondary.hypothesis as HypothesisClass] ?? judgment.thesis.secondary.hypothesis),
            support: Number(judgment.thesis.secondary.support_score),
            contradiction: Number(judgment.thesis.secondary.contradiction_score),
            confidence: Number(judgment.thesis.secondary.confidence),
          }
        : null,
      clarity: Number(judgment.thesis.clarity),
      ambiguous: Boolean(judgment.thesis.ambiguity_flag),
    },

    contradiction_debug: {
      total_detected: judgment.contradictions.items.length,
      load: Number(judgment.contradictions.load),
      structural_warning: Boolean(judgment.contradictions.structural_warning),
      items: (judgment.contradictions.items as Array<{ class: string; severity: string; resolvable: boolean; affects_scores: string[]; summary: string }>).map(c => ({
        class: c.class,
        label: String(CONTRADICTION_LABELS[c.class as ContradictionClass] ?? c.class),
        severity: c.severity,
        resolvable: c.resolvable,
        affects: c.affects_scores,
        summary: c.summary,
      })),
    },

    timing_debug: {
      phase: String(judgment.timing.phase),
      phase_label: String(TIMING_LABELS[judgment.timing.phase as TimingPhase] ?? judgment.timing.phase),
      score: Number(judgment.timing.score),
      position: `${Number(judgment.timing.sequence_position)}/${Number(judgment.timing.sequence_total)}`,
      maturity_warning: Boolean(judgment.timing.maturity_warning),
      maturity_note: judgment.timing.maturity_note != null ? String(judgment.timing.maturity_note) : null,
      sequence: judgment.timing_extended ? {
        pattern: String(judgment.timing_extended.sequence.pattern),
        health: Number(judgment.timing_extended.sequence.sequence_health),
        lead_signal: String(judgment.timing_extended.sequence.lead_signal),
        lag_signal: String(judgment.timing_extended.sequence.lag_signal),
        missing_lead: judgment.timing_extended.sequence.missing_lead != null ? String(judgment.timing_extended.sequence.missing_lead) : null,
        late_arrivals: [...(judgment.timing_extended.sequence.late_arrivals as string[])],
        summary: String(judgment.timing_extended.sequence.summary),
      } : null,
      maturity: judgment.timing_extended ? {
        score: Number(judgment.timing_extended.maturity.score),
        label: String(judgment.timing_extended.maturity.label),
        risk_factors: [...(judgment.timing_extended.maturity.risk_factors as string[])],
        confirmation_needed: [...(judgment.timing_extended.maturity.confirmation_needed as string[])],
      } : null,
      inflections: ((judgment.timing_extended?.inflections ?? []) as Array<{ type: string; label: string; strength: number }>).map(inf => ({
        type: inf.type,
        label: inf.label,
        strength: Number(inf.strength),
      })),
      projection: judgment.timing_extended ? {
        must_happen: [...(judgment.timing_extended.projection.must_happen as string[])],
        invalidates_thesis: [...(judgment.timing_extended.projection.invalidates_thesis as string[])],
        watch_for: [...(judgment.timing_extended.projection.watch_for as string[])],
      } : null,
    },

    scenario_debug: {
      base_case: String(judgment.scenario.base_case),
      bullish_confirmation: String(judgment.scenario.bullish_confirmation),
      bearish_failure: String(judgment.scenario.bearish_failure),
      next_trigger: String(judgment.scenario.next_trigger),
      scenario_confidence: Number(judgment.scenario.scenario_confidence),
    },

    confidence_debug: {
      overall_band: String(judgment.confidence.overall),
      overall_score: Number(judgment.confidence.score),
      breakdown: {
        market: Number((judgment.confidence.breakdown as { market: number; fundamentals: number; onchain: number; narrative: number }).market),
        fundamentals: Number((judgment.confidence.breakdown as { market: number; fundamentals: number; onchain: number; narrative: number }).fundamentals),
        onchain: Number((judgment.confidence.breakdown as { market: number; fundamentals: number; onchain: number; narrative: number }).onchain),
        narrative: Number((judgment.confidence.breakdown as { market: number; fundamentals: number; onchain: number; narrative: number }).narrative),
      },
      primary_uncertainty: judgment.confidence.primary_uncertainty != null ? String(judgment.confidence.primary_uncertainty) : null,
      penalties_applied: identifyPenalties(judgment, signals),
    },

    evidence_debug: {
      positive_count: judgment.evidence.positive.length,
      negative_count: judgment.evidence.negative.length,
      unresolved_count: judgment.evidence.unresolved.length,
      stale_count: judgment.evidence.stale.length,
      positive: [...(judgment.evidence.positive as string[])],
      negative: [...(judgment.evidence.negative as string[])],
      unresolved: [...(judgment.evidence.unresolved as string[])],
      stale: [...(judgment.evidence.stale as string[])],
    },

    quality_checks: {
      has_clear_state: Boolean(judgment.quality_checks.has_clear_state),
      has_top_causes: Boolean(judgment.quality_checks.has_top_causes),
      has_contradictions: Boolean(judgment.quality_checks.has_contradictions),
      has_timing: Boolean(judgment.quality_checks.has_timing),
      has_next_conditions: Boolean(judgment.quality_checks.has_next_conditions),
      has_honest_confidence: Boolean(judgment.quality_checks.has_honest_confidence),
      all_passed: Boolean(judgment.quality_checks.all_passed),
    },

    scores_reference: {
      qs: Number(judgment.scores.qs),
      os: judgment.scores.os != null ? Number(judgment.scores.os) : null,
      risk: Number(judgment.scores.risk),
      pos: judgment.scores.pos != null ? Number(judgment.scores.pos) : null,
    },

    regime_debug: judgment.regime
      ? {
          macro_posture: judgment.regime.macro.posture,
          macro_confidence: judgment.regime.macro.confidence,
          macro_drivers: judgment.regime.macro.drivers,
          btc_trend: judgment.regime.macro.btcTrend,
          btc_dominance_trend: judgment.regime.macro.btcDominanceTrend,
          overall_leverage: judgment.regime.macro.overallLeverage,
          ecosystem_chain: judgment.regime.ecosystem.chain,
          ecosystem_health: judgment.regime.ecosystem.health,
          ecosystem_tvl_trend: judgment.regime.ecosystem.tvlTrend,
          ecosystem_activity_trend: judgment.regime.ecosystem.activityTrend,
          ecosystem_capital_flow: judgment.regime.ecosystem.capitalFlow,
          volatility_regime: judgment.regime.volatility.regime,
          volatility_trend: judgment.regime.volatility.trend,
          transition_risk: judgment.regime.transition.risk,
          transition_probability: judgment.regime.transition.probability,
          transition_direction: judgment.regime.transition.direction,
          transition_signals: judgment.regime.transition.signals,
          confidence_modifier: judgment.regime.confidenceModifier,
          data_coverage: (judgment.regime as any).dataCoverage ?? 0,
          config_version: (judgment.regime as any).configVersion ?? 'unknown',
          summary: judgment.regime.summary,
        }
      : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT FOR TERMINAL / LOG OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export function formatJudgmentDebugText(debug: JudgmentDebugView): string {
  const lines: string[] = [];
  const hr = '─'.repeat(72);

  lines.push('');
  lines.push(`  JUDGMENT DEBUG: ${debug.meta.symbol} (${debug.meta.entity_id})`);
  lines.push(`  Chain: ${debug.meta.chain ?? 'N/A'}  |  ${debug.meta.judged_at}`);
  lines.push(hr);

  // STATE
  lines.push('');
  lines.push(`  STATE`);
  lines.push(`  Primary:   ${debug.state_debug.primary.label} [${debug.state_debug.primary.group}] (conf: ${(debug.state_debug.primary.confidence * 100).toFixed(0)}%)`);
  if (debug.state_debug.secondary) {
    lines.push(`  Secondary: ${debug.state_debug.secondary.label} [${debug.state_debug.secondary.group}]`);
  }

  // CAUSE
  lines.push('');
  lines.push(`  CAUSE`);
  lines.push(`  Dominant: ${debug.cause_debug.dominant_cluster}`);
  if (debug.cause_debug.secondary_cluster) {
    lines.push(`  Secondary: ${debug.cause_debug.secondary_cluster}`);
  }
  for (const d of debug.cause_debug.positive_drivers) {
    lines.push(`  + ${d.family} (str: ${(d.strength * 100).toFixed(0)}%, ${d.feature_count} features)`);
  }
  for (const d of debug.cause_debug.negative_drivers) {
    lines.push(`  - ${d.family} (str: ${(d.strength * 100).toFixed(0)}%, ${d.feature_count} features)`);
  }

  // THESIS
  lines.push('');
  lines.push(`  THESIS`);
  lines.push(`  Primary:   ${debug.thesis_debug.primary.label} (conf: ${(debug.thesis_debug.primary.confidence * 100).toFixed(0)}%)`);
  if (debug.thesis_debug.secondary) {
    lines.push(`  Secondary: ${debug.thesis_debug.secondary.label} (conf: ${(debug.thesis_debug.secondary.confidence * 100).toFixed(0)}%)`);
  }
  lines.push(`  Clarity: ${(debug.thesis_debug.clarity * 100).toFixed(0)}%${debug.thesis_debug.ambiguous ? '  *** AMBIGUOUS ***' : ''}`);

  // CONTRADICTIONS
  lines.push('');
  lines.push(`  CONTRADICTIONS (${debug.contradiction_debug.total_detected} detected, load: ${(debug.contradiction_debug.load * 100).toFixed(0)}%)`);
  if (debug.contradiction_debug.structural_warning) {
    lines.push(`  *** STRUCTURAL WARNING ***`);
  }
  for (const c of debug.contradiction_debug.items) {
    lines.push(`  [${c.severity.toUpperCase()}] ${c.label}${c.resolvable ? '' : ' (structural)'}`);
    lines.push(`    ${c.summary}`);
  }

  // TIMING & SEQUENCE
  lines.push('');
  lines.push(`  TIMING & SEQUENCE`);
  lines.push(`  Phase: ${debug.timing_debug.phase_label} (${debug.timing_debug.position}, score: ${debug.timing_debug.score})`);
  if (debug.timing_debug.maturity_warning) {
    lines.push(`  *** ${debug.timing_debug.maturity_note} ***`);
  }
  if (debug.timing_debug.sequence) {
    lines.push(`  Sequence: ${debug.timing_debug.sequence.pattern} (health: ${(debug.timing_debug.sequence.health * 100).toFixed(0)}%)`);
    lines.push(`  Lead: ${debug.timing_debug.sequence.lead_signal}  Lag: ${debug.timing_debug.sequence.lag_signal}`);
    if (debug.timing_debug.sequence.missing_lead) {
      lines.push(`  Missing lead: ${debug.timing_debug.sequence.missing_lead}`);
    }
    if (debug.timing_debug.sequence.late_arrivals.length > 0) {
      lines.push(`  Late arrivals: ${debug.timing_debug.sequence.late_arrivals.join(', ')}`);
    }
  }
  if (debug.timing_debug.maturity) {
    lines.push(`  Maturity: ${debug.timing_debug.maturity.label} (${debug.timing_debug.maturity.score}/100)`);
    for (const r of debug.timing_debug.maturity.risk_factors) {
      lines.push(`    Risk: ${r}`);
    }
    for (const c of debug.timing_debug.maturity.confirmation_needed) {
      lines.push(`    Need: ${c}`);
    }
  }
  if (debug.timing_debug.inflections.length > 0) {
    lines.push(`  Inflections:`);
    for (const inf of debug.timing_debug.inflections.slice(0, 4)) {
      lines.push(`    [${inf.type === 'positive' ? '+' : '-'}] ${inf.label} (${(inf.strength * 100).toFixed(0)}%)`);
    }
  }
  if (debug.timing_debug.projection) {
    lines.push(`  Must happen: ${debug.timing_debug.projection.must_happen.join('; ')}`);
    lines.push(`  Invalidates: ${debug.timing_debug.projection.invalidates_thesis.join('; ')}`);
    lines.push(`  Watch for: ${debug.timing_debug.projection.watch_for.join(', ')}`);
  }

  // SCENARIO
  lines.push('');
  lines.push(`  SCENARIO (conf: ${(debug.scenario_debug.scenario_confidence * 100).toFixed(0)}%)`);
  lines.push(`  Base:    ${debug.scenario_debug.base_case}`);
  lines.push(`  Bull:    ${debug.scenario_debug.bullish_confirmation}`);
  lines.push(`  Bear:    ${debug.scenario_debug.bearish_failure}`);
  lines.push(`  Trigger: ${debug.scenario_debug.next_trigger}`);

  // CONFIDENCE
  lines.push('');
  lines.push(`  CONFIDENCE: ${debug.confidence_debug.overall_band.toUpperCase()} (${(debug.confidence_debug.overall_score * 100).toFixed(0)}%)`);
  lines.push(`  Market: ${(debug.confidence_debug.breakdown.market * 100).toFixed(0)}%  Fundamentals: ${(debug.confidence_debug.breakdown.fundamentals * 100).toFixed(0)}%  On-chain: ${(debug.confidence_debug.breakdown.onchain * 100).toFixed(0)}%  Narrative: ${(debug.confidence_debug.breakdown.narrative * 100).toFixed(0)}%`);
  if (debug.confidence_debug.primary_uncertainty) {
    lines.push(`  Uncertainty: ${debug.confidence_debug.primary_uncertainty}`);
  }
  if (debug.confidence_debug.penalties_applied.length > 0) {
    lines.push(`  Penalties: ${debug.confidence_debug.penalties_applied.join(', ')}`);
  }

  // EVIDENCE
  lines.push('');
  lines.push(`  EVIDENCE (+${debug.evidence_debug.positive_count} / -${debug.evidence_debug.negative_count} / ?${debug.evidence_debug.unresolved_count} / stale:${debug.evidence_debug.stale_count})`);

  // QUALITY
  lines.push('');
  lines.push(`  QUALITY CHECKS: ${debug.quality_checks.all_passed ? 'ALL PASSED' : 'ISSUES FOUND'}`);
  if (!debug.quality_checks.has_clear_state) lines.push(`    FAIL: no clear state`);
  if (!debug.quality_checks.has_top_causes) lines.push(`    FAIL: no top causes`);
  if (!debug.quality_checks.has_honest_confidence) lines.push(`    FAIL: confidence invalid`);

  // SCORES
  lines.push('');
  lines.push(`  OMNISCORE REF: QS=${debug.scores_reference.qs} OS=${debug.scores_reference.os ?? 'gated'} Risk=${debug.scores_reference.risk} POS=${debug.scores_reference.pos ?? 'gated'}`);

  lines.push(hr);
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT FOR AI CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format judgment for AI prompt injection.
 * Concise structured text the LLM can reference when explaining.
 */
export function formatJudgmentForAI(judgment: JudgmentOutput): string {
  const lines: string[] = [];

  lines.push(`[JUDGMENT: ${String(judgment.symbol)}]`);
  lines.push(`State: ${MARKET_STATE_LABELS[judgment.state.primary as MarketState] ?? judgment.state.primary} (${(Number(judgment.state.confidence) * 100).toFixed(0)}% confidence)`);
  if (judgment.state.secondary) {
    lines.push(`Secondary state: ${MARKET_STATE_LABELS[judgment.state.secondary as MarketState] ?? judgment.state.secondary}`);
  }

  lines.push('');
  lines.push('Causes:');
  for (const d of judgment.cause.positive_drivers as Array<{ summary: string }>) {
    lines.push(`  + ${d.summary}`);
  }
  for (const d of judgment.cause.negative_drivers as Array<{ summary: string }>) {
    lines.push(`  - ${d.summary}`);
  }

  lines.push('');
  lines.push(`Primary thesis: ${HYPOTHESIS_LABELS[judgment.thesis.primary.hypothesis as HypothesisClass] ?? judgment.thesis.primary.hypothesis} (${(Number(judgment.thesis.primary.confidence) * 100).toFixed(0)}% confidence)`);
  if (judgment.thesis.secondary) {
    lines.push(`Alternative: ${HYPOTHESIS_LABELS[judgment.thesis.secondary.hypothesis as HypothesisClass] ?? judgment.thesis.secondary.hypothesis} (${(Number(judgment.thesis.secondary.confidence) * 100).toFixed(0)}%)`);
  }
  if (judgment.thesis.ambiguity_flag) {
    lines.push(`Note: thesis is ambiguous — primary and secondary are close.`);
  }

  if (judgment.contradictions.items.length > 0) {
    lines.push('');
    lines.push('Contradictions:');
    for (const c of judgment.contradictions.items) {
      lines.push(`  [${c.severity}] ${c.summary}`);
    }
  }

  lines.push('');
  lines.push(`Timing: ${TIMING_LABELS[judgment.timing.phase as TimingPhase] ?? judgment.timing.phase} (score ${Number(judgment.timing.score)}/100, step ${Number(judgment.timing.sequence_position)}/${Number(judgment.timing.sequence_total)})`);
  if (judgment.timing.maturity_warning && judgment.timing.maturity_note) {
    lines.push(`  Warning: ${judgment.timing.maturity_note}`);
  }
  if (judgment.timing_extended) {
    lines.push(`  Sequence: ${judgment.timing_extended.sequence.summary}`);
    lines.push(`  Maturity: ${judgment.timing_extended.maturity.label} (${Number(judgment.timing_extended.maturity.score)}/100)`);
    const infs = judgment.timing_extended.inflections as Array<{ type: string; label: string }>;
    if (infs.length > 0) {
      for (const inf of infs.slice(0, 3)) {
        lines.push(`  ${inf.type === 'positive' ? '+' : '-'} ${inf.label}`);
      }
    }
    const mustHappen = judgment.timing_extended.projection.must_happen as string[];
    const invalidates = judgment.timing_extended.projection.invalidates_thesis as string[];
    if (mustHappen.length > 0) {
      lines.push(`  Next: ${mustHappen[0]}`);
    }
    if (invalidates.length > 0) {
      lines.push(`  Invalidation: ${invalidates[0]}`);
    }
  }

  lines.push('');
  lines.push('Scenario:');
  lines.push(`  Base case: ${judgment.scenario.base_case}`);
  lines.push(`  Bull confirmation: ${judgment.scenario.bullish_confirmation}`);
  lines.push(`  Bear failure: ${judgment.scenario.bearish_failure}`);
  lines.push(`  Next trigger: ${judgment.scenario.next_trigger}`);

  lines.push('');
  lines.push(`Overall confidence: ${judgment.confidence.overall} (${(Number(judgment.confidence.score) * 100).toFixed(0)}%)`);
  if (judgment.confidence.primary_uncertainty) {
    lines.push(`Primary uncertainty: ${judgment.confidence.primary_uncertainty}`);
  }

  if (judgment.regime) {
    lines.push('');
    lines.push('Regime context:');
    lines.push(`  ${judgment.regime.summary}`);
    if (judgment.regime.transition.risk !== 'low') {
      lines.push(`  Transition risk: ${judgment.regime.transition.risk} (${(judgment.regime.transition.probability * 100).toFixed(0)}% probability, ${judgment.regime.transition.direction})`);
    }
    if (judgment.regime.confidenceModifier < 0.9) {
      lines.push(`  Confidence adjustment: ${((judgment.regime.confidenceModifier - 1) * 100).toFixed(0)}% from regime context`);
    }
  }

  lines.push('');
  lines.push('Evidence:');
  const pos = judgment.evidence.positive as string[];
  const neg = judgment.evidence.negative as string[];
  const unres = judgment.evidence.unresolved as string[];
  if (pos.length > 0) lines.push(`  Positive: ${pos.join(', ')}`);
  if (neg.length > 0) lines.push(`  Negative: ${neg.join(', ')}`);
  if (unres.length > 0) lines.push(`  Unresolved: ${unres.join(', ')}`);

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function summarizeSignals(s: SignalSnapshot): string[] {
  const items: string[] = [];
  if (s.price_momentum_24h > 0.1) items.push(`Strong positive momentum (${(s.price_momentum_24h * 30).toFixed(1)}%)`);
  if (s.price_momentum_24h < -0.1) items.push(`Strong negative momentum (${(s.price_momentum_24h * 30).toFixed(1)}%)`);
  if (s.volume_24h > 0.4) items.push('High volume');
  if (s.volume_24h < 0.1) items.push('Very low volume');
  if (s.liquidity > 0.4) items.push('Good liquidity');
  if (s.liquidity < 0.1) items.push('Thin liquidity');
  if (s.leverage_pressure > 0.6) items.push('High leverage/OI');
  if (s.funding_rate > 0.7) items.push('Stretched funding');
  if (s.whale_activity > 0.5) items.push('Whale accumulation');
  if (s.exchange_inflow > 0.4) items.push('Exchange inflows elevated');
  if (s.security_risk > 0.6) items.push('Security flags');
  if (s.narrative_intensity > 0.5) items.push('Strong narrative');
  if (s.unlock_pressure > 0.3) items.push('Unlock approaching');
  if (s.data_completeness < 0.5) items.push('Significant data gaps');
  if (items.length === 0) items.push('No strong signals detected');
  return items;
}

function identifyPenalties(judgment: JudgmentOutput, signals: SignalSnapshot): string[] {
  const penalties: string[] = [];
  const load = Number(judgment.contradictions.load);
  const stateConf = Number(judgment.state.confidence);
  if (load > 0.1) {
    penalties.push(`contradiction load (-${(load * 25).toFixed(0)}%)`);
  }
  if (judgment.contradictions.structural_warning) {
    penalties.push('structural contradiction (-10%)');
  }
  if (stateConf < 0.4) {
    penalties.push('low state confidence (-10%)');
  } else if (stateConf < 0.6) {
    penalties.push('moderate state confidence (-5%)');
  }
  const dataCompleteness = Number(signals.data_completeness);
  const dataFreshness = Number(signals.data_freshness);
  if (dataCompleteness < 0.5) {
    penalties.push('data gaps (-15%)');
  } else if (dataCompleteness < 0.75) {
    penalties.push('partial data (-5%)');
  }
  if (dataFreshness < 0.5) {
    penalties.push('stale data (-10%)');
  }
  return penalties;
}
