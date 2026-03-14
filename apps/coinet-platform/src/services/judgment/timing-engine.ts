/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     COINET TIMING & SEQUENCE ENGINE                                           ║
 * ║                                                                               ║
 * ║   Answers the questions other tools can't:                                    ║
 * ║   - Is this early or late?                                                    ║
 * ║   - What signals appeared first?                                              ║
 * ║   - Where in the lifecycle are we?                                            ║
 * ║   - What must happen next for the thesis to hold?                             ║
 * ║                                                                               ║
 * ║   Two modes:                                                                  ║
 * ║   A) Single-snapshot: infer sequence from signal strength hierarchy            ║
 * ║   B) Multi-snapshot: analyze actual temporal progression (future)              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { SignalSnapshot } from './signal-snapshot';
import {
  TIMING_PHASES,
  TIMING_POSITION,
  TIMING_TOTAL_STEPS,
  MARKET_STATE_GROUPS,
  type TimingPhase,
  type MarketState,
} from './taxonomies';
import type { JudgmentTiming } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL LAYER DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Each layer represents a category of market activity.
 * The ORDER in which layers activate determines timing:
 *   whales first → narrative → leverage last  =  early
 *   leverage first → narrative → whales late   =  late
 */
interface SignalLayer {
  id: string;
  label: string;
  strength: number;
  /** 1 = typically leads (early signal), 5 = typically lags (late signal) */
  canonical_order: number;
}

/**
 * Healthy accumulation sequence: layers that activate in the "right" order
 * produce a healthier setup than layers activating out of order.
 *
 * Canonical early-to-late ordering:
 * 1. Smart money / whale accumulation
 * 2. Liquidity formation
 * 3. Spot demand / volume
 * 4. Narrative / social
 * 5. Leverage / derivatives
 */
function extractSignalLayers(s: SignalSnapshot): SignalLayer[] {
  return [
    {
      id: 'smart_money',
      label: 'Smart Money / Whale Activity',
      strength: s.whale_activity,
      canonical_order: 1,
    },
    {
      id: 'liquidity',
      label: 'Liquidity Formation',
      strength: s.liquidity,
      canonical_order: 2,
    },
    {
      id: 'spot_demand',
      label: 'Spot Demand & Volume',
      strength: Math.max(s.volume_24h, Math.abs(s.price_momentum_24h)),
      canonical_order: 3,
    },
    {
      id: 'fundamentals',
      label: 'Fundamental Strength',
      strength: s.fundamentals_strength,
      canonical_order: 2.5,
    },
    {
      id: 'narrative',
      label: 'Narrative & Social Momentum',
      strength: s.narrative_intensity,
      canonical_order: 4,
    },
    {
      id: 'leverage',
      label: 'Leverage & Derivatives',
      strength: s.leverage_pressure,
      canonical_order: 5,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SequenceAnalysis {
  /** Layers sorted by inferred activation order (strongest = earliest) */
  activation_order: Array<{ layer: string; strength: number; canonical_order: number }>;

  /** Whether the observed order matches healthy accumulation sequence */
  sequence_health: number;

  /** Lead signal: what activated first */
  lead_signal: string;

  /** Lag signal: what is weakest / latest */
  lag_signal: string;

  /** Signal that typically leads but hasn't shown up yet */
  missing_lead: string | null;

  /** Late-arrival signals that are unusually strong */
  late_arrivals: string[];

  /** Sequence pattern classification */
  pattern: SequencePattern;

  /** Summary sentence */
  summary: string;
}

export type SequencePattern =
  | 'healthy_accumulation'
  | 'leverage_led'
  | 'narrative_led'
  | 'spot_led'
  | 'broad_participation'
  | 'thin_signal'
  | 'late_whale_entry'
  | 'fundamentals_led';

const SEQUENCE_PATTERN_LABELS: Record<SequencePattern, string> = {
  healthy_accumulation: 'Healthy Accumulation (smart money → liquidity → demand)',
  leverage_led: 'Leverage-Led (derivatives before spot confirmation)',
  narrative_led: 'Narrative-Led (social momentum before fundamentals)',
  spot_led: 'Spot-Led (volume and price leading)',
  broad_participation: 'Broad Participation (multiple layers active)',
  thin_signal: 'Thin Signal (limited data across layers)',
  late_whale_entry: 'Late Whale Entry (smart money arriving after expansion)',
  fundamentals_led: 'Fundamentals-Led (protocol metrics leading)',
};

function analyzeSequence(signals: SignalSnapshot): SequenceAnalysis {
  const layers = extractSignalLayers(signals);
  const ACTIVE_THRESHOLD = 0.2;

  const activeLayers = layers
    .filter(l => l.strength > ACTIVE_THRESHOLD)
    .sort((a, b) => b.strength - a.strength);

  const inactiveLayers = layers
    .filter(l => l.strength <= ACTIVE_THRESHOLD)
    .sort((a, b) => a.canonical_order - b.canonical_order);

  const activation_order = activeLayers.map(l => ({
    layer: l.id,
    strength: l.strength,
    canonical_order: l.canonical_order,
  }));

  const lead_signal = activeLayers[0]?.id ?? 'none';
  const lag_signal = activeLayers.length > 0
    ? activeLayers[activeLayers.length - 1].id
    : 'none';

  const missingLeads = inactiveLayers.filter(l => l.canonical_order <= 2);
  const missing_lead = missingLeads.length > 0 ? missingLeads[0].id : null;

  const late_arrivals = activeLayers
    .filter(l => l.canonical_order >= 4 && l.strength > 0.5)
    .map(l => l.id);

  const sequence_health = computeSequenceHealth(activeLayers);
  const pattern = classifySequencePattern(activeLayers, layers, signals);

  return {
    activation_order,
    sequence_health,
    lead_signal,
    lag_signal,
    missing_lead,
    late_arrivals,
    pattern,
    summary: buildSequenceSummary(pattern, lead_signal, missing_lead, late_arrivals),
  };
}

/**
 * Sequence health: 0–1 measuring how well the activation order
 * matches the canonical healthy accumulation order.
 * Uses Spearman rank correlation between observed and canonical.
 */
function computeSequenceHealth(activeLayers: SignalLayer[]): number {
  if (activeLayers.length < 2) return 0.5;

  const observed = activeLayers.map((_, i) => i + 1);
  const byCanonical = [...activeLayers].sort((a, b) => a.canonical_order - b.canonical_order);
  const canonicalRank = new Map<string, number>();
  byCanonical.forEach((l, j) => canonicalRank.set(l.id, j + 1));
  const canonical = activeLayers.map(l => canonicalRank.get(l.id) ?? 1);

  const n = observed.length;
  let dSquaredSum = 0;
  for (let i = 0; i < n; i++) {
    const d = observed[i] - canonical[i];
    dSquaredSum += d * d;
  }

  const spearman = 1 - (6 * dSquaredSum) / (n * (n * n - 1));
  return Math.max(0, Math.min(1, (spearman + 1) / 2));
}

function classifySequencePattern(
  activeLayers: SignalLayer[],
  allLayers: SignalLayer[],
  signals: SignalSnapshot
): SequencePattern {
  if (activeLayers.length <= 1) return 'thin_signal';

  const activeCount = activeLayers.length;
  const strongCount = activeLayers.filter(l => l.strength > 0.4).length;

  if (strongCount >= 4) return 'broad_participation';

  const leadId = activeLayers[0]?.id;
  const smartMoneyLayer = allLayers.find(l => l.id === 'smart_money')!;
  const leverageLayer = allLayers.find(l => l.id === 'leverage')!;
  const narrativeLayer = allLayers.find(l => l.id === 'narrative')!;
  const spotLayer = allLayers.find(l => l.id === 'spot_demand')!;
  const fundamentalsLayer = allLayers.find(l => l.id === 'fundamentals')!;

  if (
    smartMoneyLayer.strength > 0.4 &&
    leverageLayer.strength > 0.4 &&
    smartMoneyLayer.strength < leverageLayer.strength &&
    signals.price_momentum_24h > 0.1
  ) {
    return 'late_whale_entry';
  }

  if (leadId === 'smart_money' && smartMoneyLayer.strength > 0.3) return 'healthy_accumulation';
  if (leadId === 'leverage' && leverageLayer.strength > 0.3) return 'leverage_led';
  if (leadId === 'narrative' && narrativeLayer.strength > 0.3) return 'narrative_led';
  if (leadId === 'spot_demand' && spotLayer.strength > 0.3) return 'spot_led';
  if (leadId === 'fundamentals' && fundamentalsLayer.strength > 0.3) return 'fundamentals_led';

  return activeCount >= 3 ? 'broad_participation' : 'thin_signal';
}

function buildSequenceSummary(
  pattern: SequencePattern,
  lead: string,
  missingLead: string | null,
  lateArrivals: string[]
): string {
  const parts: string[] = [SEQUENCE_PATTERN_LABELS[pattern]];

  if (missingLead) {
    const labels: Record<string, string> = {
      smart_money: 'smart money activity',
      liquidity: 'liquidity depth',
      fundamentals: 'fundamental validation',
    };
    parts.push(`Missing: ${labels[missingLead] ?? missingLead} has not confirmed yet.`);
  }

  if (lateArrivals.length > 0) {
    const labels: Record<string, string> = {
      leverage: 'derivatives/leverage',
      narrative: 'narrative/social',
    };
    const arrivalNames = lateArrivals.map(l => labels[l] ?? l).join(', ');
    parts.push(`Late-stage signals (${arrivalNames}) are strong, suggesting maturity.`);
  }

  return parts.join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATURITY SCORING
// ═══════════════════════════════════════════════════════════════════════════════

interface MaturityAssessment {
  score: number;
  label: string;
  warning: boolean;
  note: string | null;
  risk_factors: string[];
  confirmation_needed: string[];
}

function assessMaturity(
  signals: SignalSnapshot,
  sequence: SequenceAnalysis,
  stateGroup: string
): MaturityAssessment {
  let maturityScore = 0;
  const risk_factors: string[] = [];
  const confirmation_needed: string[] = [];

  // Leverage-heavy = more mature
  if (signals.leverage_pressure > 0.6) {
    maturityScore += 25;
    risk_factors.push('High leverage suggests late-stage participation');
  }
  if (signals.leverage_pressure > 0.4) {
    maturityScore += 10;
  }

  // Narrative without fundamentals = potentially late
  if (signals.narrative_intensity > 0.5 && signals.fundamentals_strength < 0.2) {
    maturityScore += 15;
    risk_factors.push('Narrative intensity without fundamental backing');
  }

  // Funding stretched
  if (signals.funding_rate > 0.7) {
    maturityScore += 15;
    risk_factors.push('Funding rate stretched');
  }

  // Exchange inflows rising (distribution signals)
  if (signals.exchange_inflow > 0.3) {
    maturityScore += 10;
    risk_factors.push('Exchange inflows suggest distribution');
  }

  // Holder concentration high
  if (signals.holder_concentration > 0.6) {
    maturityScore += 10;
  }

  // Unlock pressure
  if (signals.unlock_pressure > 0.2) {
    maturityScore += 10;
    risk_factors.push('Upcoming unlock adds supply pressure');
  }

  // Freshness: new pairs are inherently early
  if (signals.pair_age_hours != null && signals.pair_age_hours < 48) {
    maturityScore = Math.max(0, maturityScore - 20);
  }

  // Sequence health bonus: healthy order = less mature concern
  maturityScore = Math.round(maturityScore * (1.3 - sequence.sequence_health * 0.6));

  // State group adjustment
  if (stateGroup === 'discovery') maturityScore = Math.min(maturityScore, 25);
  if (stateGroup === 'risk') maturityScore = Math.max(maturityScore, 60);

  maturityScore = Math.min(100, Math.max(0, maturityScore));

  // Confirmations needed
  if (signals.whale_activity < 0.2 && stateGroup === 'expansion') {
    confirmation_needed.push('Smart money confirmation needed');
  }
  if (signals.volume_24h < 0.2 && signals.price_momentum_24h > 0.1) {
    confirmation_needed.push('Volume confirmation needed');
  }
  if (signals.fundamentals_strength < 0.2 && signals.narrative_intensity > 0.3) {
    confirmation_needed.push('Fundamental validation needed');
  }
  if (signals.liquidity < 0.15) {
    confirmation_needed.push('Liquidity depth needed');
  }

  let label: string;
  let warning = false;
  let note: string | null = null;

  if (maturityScore < 20) {
    label = 'Very Early';
  } else if (maturityScore < 40) {
    label = 'Early';
  } else if (maturityScore < 55) {
    label = 'Mid-Stage';
  } else if (maturityScore < 70) {
    label = 'Mature';
    warning = true;
    note = 'Setup shows maturity indicators. Risk/reward shifting.';
  } else if (maturityScore < 85) {
    label = 'Late Stage';
    warning = true;
    note = 'Multiple late-stage indicators present. Elevated fragility.';
  } else {
    label = 'Very Late / Distribution';
    warning = true;
    note = 'Strongly late-stage. High probability of mean reversion or distribution.';
  }

  return { score: maturityScore, label, warning, note, risk_factors, confirmation_needed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE CLASSIFICATION (upgraded from v1)
// ═══════════════════════════════════════════════════════════════════════════════

function classifyPhase(
  signals: SignalSnapshot,
  sequence: SequenceAnalysis,
  maturity: MaturityAssessment,
  stateGroup: string
): TimingPhase {
  if (stateGroup === 'risk') {
    if (signals.price_momentum_24h < -0.15) return TIMING_PHASES.POST_PEAK;
    if (signals.exchange_inflow > 0.3) return TIMING_PHASES.DECAY_DISTRIBUTION;
    return TIMING_PHASES.POST_PEAK;
  }

  if (stateGroup === 'discovery') {
    if (signals.narrative_intensity > 0.3 && signals.volume_24h > 0.15) {
      return TIMING_PHASES.EARLY_VALIDATING;
    }
    return TIMING_PHASES.PRE_SIGNAL;
  }

  // For expansion and fragility, use maturity score to refine
  if (maturity.score >= 80) return TIMING_PHASES.LATE_REFLEXIVE;
  if (maturity.score >= 65) return TIMING_PHASES.CROWDED;
  if (maturity.score >= 50) return TIMING_PHASES.MATURE;

  if (stateGroup === 'fragility') {
    if (signals.leverage_pressure > 0.7 && signals.exchange_inflow > 0.3) {
      return TIMING_PHASES.LATE_REFLEXIVE;
    }
    return TIMING_PHASES.CROWDED;
  }

  // Expansion states
  if (sequence.pattern === 'healthy_accumulation' && maturity.score < 30) {
    return TIMING_PHASES.EARLY;
  }

  if (signals.volume_24h > 0.3 && signals.whale_activity > 0.3 && maturity.score < 45) {
    return TIMING_PHASES.EXPANSION;
  }

  if (sequence.pattern === 'leverage_led') {
    return maturity.score > 40 ? TIMING_PHASES.MATURE : TIMING_PHASES.EXPANSION;
  }

  if (maturity.score < 25) return TIMING_PHASES.EARLY;
  if (maturity.score < 45) return TIMING_PHASES.EXPANSION;
  return TIMING_PHASES.MATURE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFLECTION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface InflectionSignal {
  type: 'positive' | 'negative';
  label: string;
  strength: number;
}

function detectInflections(signals: SignalSnapshot, sequence: SequenceAnalysis): InflectionSignal[] {
  const inflections: InflectionSignal[] = [];

  // Positive inflections
  if (sequence.pattern === 'healthy_accumulation' && signals.volume_24h > 0.2) {
    inflections.push({
      type: 'positive',
      label: 'Smart money accumulation with volume confirmation beginning',
      strength: Math.min(signals.whale_activity, signals.volume_24h),
    });
  }

  if (signals.fundamentals_strength > 0.4 && signals.narrative_intensity < 0.2) {
    inflections.push({
      type: 'positive',
      label: 'Fundamental improvement ahead of narrative — potential early signal',
      strength: signals.fundamentals_strength,
    });
  }

  if (signals.exchange_outflow > 0.3 && signals.whale_activity > 0.3) {
    inflections.push({
      type: 'positive',
      label: 'Exchange outflows with whale accumulation — conviction building',
      strength: (signals.exchange_outflow + signals.whale_activity) / 2,
    });
  }

  // Negative inflections
  if (signals.funding_rate > 0.7 && signals.volume_24h < 0.2) {
    inflections.push({
      type: 'negative',
      label: 'Stretched funding without volume support — potential squeeze setup',
      strength: signals.funding_rate,
    });
  }

  if (signals.exchange_inflow > 0.4 && signals.price_momentum_24h > 0) {
    inflections.push({
      type: 'negative',
      label: 'Rising exchange inflows during uptrend — distribution risk',
      strength: signals.exchange_inflow,
    });
  }

  if (signals.narrative_intensity > 0.6 && signals.whale_activity < 0.15) {
    inflections.push({
      type: 'negative',
      label: 'Strong narrative without smart money participation — fragile',
      strength: signals.narrative_intensity,
    });
  }

  if (signals.unlock_pressure > 0.3 && signals.price_momentum_24h > 0.05) {
    inflections.push({
      type: 'negative',
      label: 'Approaching unlock during uptrend — supply risk ahead',
      strength: signals.unlock_pressure,
    });
  }

  if (signals.leverage_pressure > 0.6 && signals.buy_sell_ratio < 0.4) {
    inflections.push({
      type: 'negative',
      label: 'Heavy leverage with net selling on spot — fragile structure',
      strength: signals.leverage_pressure,
    });
  }

  return inflections.sort((a, b) => b.strength - a.strength);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEXT-STEP LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

interface TimingProjection {
  must_happen: string[];
  invalidates_thesis: string[];
  watch_for: string[];
}

function projectNextSteps(
  phase: TimingPhase,
  signals: SignalSnapshot,
  sequence: SequenceAnalysis
): TimingProjection {
  const must_happen: string[] = [];
  const invalidates_thesis: string[] = [];
  const watch_for: string[] = [];

  switch (phase) {
    case TIMING_PHASES.PRE_SIGNAL:
      must_happen.push('Volume and liquidity must form for thesis to materialize');
      invalidates_thesis.push('No activity within 48–72h likely means dormant');
      watch_for.push('First whale activity', 'Liquidity pool creation');
      break;

    case TIMING_PHASES.EARLY:
      must_happen.push('Spot volume must confirm to validate accumulation');
      if (sequence.missing_lead === 'smart_money') {
        must_happen.push('Smart money participation needed for strength');
      }
      invalidates_thesis.push('Price reversal without spot support would invalidate');
      watch_for.push('Volume acceleration', 'Narrative emergence', 'Second wave of whale buying');
      break;

    case TIMING_PHASES.EARLY_VALIDATING:
      must_happen.push('Fundamental metrics must start confirming narrative');
      invalidates_thesis.push('Narrative fading without fundamental follow-through');
      watch_for.push('TVL/fee growth', 'Institutional participation', 'Sustained volume');
      break;

    case TIMING_PHASES.EXPANSION:
      must_happen.push('Broad participation must continue expanding');
      if (signals.leverage_pressure > 0.4) {
        must_happen.push('Funding must normalize to sustain expansion');
      }
      invalidates_thesis.push('Volume collapse or leverage spike would threaten continuation');
      watch_for.push('Funding normalization', 'New participant inflow', 'Sector confirmation');
      break;

    case TIMING_PHASES.MATURE:
      must_happen.push('Must avoid leverage crowding to sustain');
      invalidates_thesis.push('Exchange inflow spike or funding explosion would signal top');
      watch_for.push('Funding rate', 'Exchange flow direction', 'Whale behavior shift');
      break;

    case TIMING_PHASES.CROWDED:
      must_happen.push('Spot participation must strengthen to prevent unwind');
      invalidates_thesis.push('Spot weakness with leverage persistence = high reversal risk');
      watch_for.push('Liquidation cascades', 'Funding reset', 'Spot volume vs OI divergence');
      break;

    case TIMING_PHASES.LATE_REFLEXIVE:
      must_happen.push('Unlikely to sustain without fundamental catalyst');
      invalidates_thesis.push('Any deleveraging event likely triggers cascade');
      watch_for.push('First major liquidation', 'Exchange inflow surge', 'Narrative fatigue');
      break;

    case TIMING_PHASES.POST_PEAK:
      must_happen.push('Need selling exhaustion and base formation');
      invalidates_thesis.push('Continued exchange inflows and whale distribution');
      watch_for.push('Selling exhaustion', 'Smart money re-entry', 'Volume floor formation');
      break;

    case TIMING_PHASES.DECAY_DISTRIBUTION:
      must_happen.push('Need catalyst or fundamental improvement to reverse');
      invalidates_thesis.push('Continued outflows and declining activity');
      watch_for.push('Fundamental catalyst', 'Sector rotation', 'New narrative');
      break;
  }

  return { must_happen, invalidates_thesis, watch_for };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL TIMING OUTPUT (extended from JudgmentTiming)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-SNAPSHOT TEMPORAL ANALYSIS (v2)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TimestampedSnapshot {
  snapshot: SignalSnapshot;
  timestamp: number;
}

export interface LeadLagRelationship {
  leader: string;
  lagger: string;
  /** How many snapshots the leader activated before the lagger */
  leadBy: number;
  /** Strength of the relationship (0–1) */
  confidence: number;
}

export interface PhaseTransition {
  from: TimingPhase;
  to: TimingPhase;
  /** When the transition occurred (unix ms) */
  transitionAt: number;
  /** Duration in the previous phase (ms) */
  durationMs: number;
}

export interface TemporalAnalysis {
  /** Number of snapshots analyzed */
  snapshotCount: number;
  /** Span covered (ms) */
  spanMs: number;
  /** Lead-lag relationships detected across time */
  leadLag: LeadLagRelationship[];
  /** Phase transitions observed */
  phaseTransitions: PhaseTransition[];
  /** How long current phase has been active (ms) */
  currentPhaseDurationMs: number;
  /** Phase progression velocity: positive = advancing, negative = regressing */
  phaseVelocity: number;
  /** Timestamps where inflection signals first appeared */
  inflectionTimestamps: Array<{ signal: string; timestamp: number; type: 'positive' | 'negative' }>;
  /** Rationale explaining current timing conclusion */
  rationale: string[];
}

const LAYER_IDS = ['smart_money', 'liquidity', 'spot_demand', 'fundamentals', 'narrative', 'leverage'] as const;
const ACTIVE_THRESHOLD = 0.2;

function extractLayerStrengths(s: SignalSnapshot): Record<string, number> {
  return {
    smart_money: s.whale_activity,
    liquidity: s.liquidity,
    spot_demand: Math.max(s.volume_24h, Math.abs(s.price_momentum_24h)),
    fundamentals: s.fundamentals_strength,
    narrative: s.narrative_intensity,
    leverage: s.leverage_pressure,
  };
}

function analyzeTemporalSequence(history: TimestampedSnapshot[]): TemporalAnalysis {
  if (history.length < 2) {
    return {
      snapshotCount: history.length,
      spanMs: 0,
      leadLag: [],
      phaseTransitions: [],
      currentPhaseDurationMs: 0,
      phaseVelocity: 0,
      inflectionTimestamps: [],
      rationale: ['Single snapshot — temporal analysis unavailable'],
    };
  }

  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const spanMs = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
  const rationale: string[] = [];

  // Detect when each layer first became active
  const firstActiveAt = new Map<string, number>();
  for (const { snapshot, timestamp } of sorted) {
    const strengths = extractLayerStrengths(snapshot);
    for (const id of LAYER_IDS) {
      if (strengths[id] > ACTIVE_THRESHOLD && !firstActiveAt.has(id)) {
        firstActiveAt.set(id, timestamp);
      }
    }
  }

  // Build lead-lag from activation order
  const activationEntries = [...firstActiveAt.entries()].sort((a, b) => a[1] - b[1]);
  const leadLag: LeadLagRelationship[] = [];

  for (let i = 0; i < activationEntries.length - 1; i++) {
    for (let j = i + 1; j < activationEntries.length; j++) {
      const [leader, leaderTime] = activationEntries[i];
      const [lagger, laggerTime] = activationEntries[j];
      const snapshotsApart = sorted.filter(s => s.timestamp >= leaderTime && s.timestamp < laggerTime).length;
      if (snapshotsApart > 0) {
        leadLag.push({
          leader,
          lagger,
          leadBy: snapshotsApart,
          confidence: clampVal(snapshotsApart / sorted.length, 0, 1),
        });
      }
    }
  }

  if (leadLag.length > 0) {
    const topLead = leadLag[0];
    rationale.push(`${topLead.leader} activated before ${topLead.lagger} by ${topLead.leadBy} snapshots`);
  }

  // Track phase transitions
  const phaseTransitions: PhaseTransition[] = [];
  let lastPhase: TimingPhase | null = null;
  let lastPhaseStart = sorted[0].timestamp;

  for (const { snapshot, timestamp } of sorted) {
    const stateGroup = 'expansion'; // simplified — use latest state group in production
    const seq = analyzeSequence(snapshot);
    const mat = assessMaturity(snapshot, seq, stateGroup);
    const phase = classifyPhase(snapshot, seq, mat, stateGroup);

    if (lastPhase !== null && phase !== lastPhase) {
      phaseTransitions.push({
        from: lastPhase,
        to: phase,
        transitionAt: timestamp,
        durationMs: timestamp - lastPhaseStart,
      });
      lastPhaseStart = timestamp;
    }
    lastPhase = phase;
  }

  const currentPhaseDurationMs = sorted[sorted.length - 1].timestamp - lastPhaseStart;

  if (phaseTransitions.length > 0) {
    const last = phaseTransitions[phaseTransitions.length - 1];
    rationale.push(`Phase shifted from ${last.from} → ${last.to} ${Math.round((sorted[sorted.length - 1].timestamp - last.transitionAt) / 60000)}m ago`);
  }
  rationale.push(`Current phase active for ${Math.round(currentPhaseDurationMs / 60000)}m`);

  // Phase velocity: compare first and last phase positions
  const firstSeq = analyzeSequence(sorted[0].snapshot);
  const firstMat = assessMaturity(sorted[0].snapshot, firstSeq, 'expansion');
  const firstPhase = classifyPhase(sorted[0].snapshot, firstSeq, firstMat, 'expansion');
  const lastSeq = analyzeSequence(sorted[sorted.length - 1].snapshot);
  const lastMat = assessMaturity(sorted[sorted.length - 1].snapshot, lastSeq, 'expansion');
  const lastPhaseCalc = classifyPhase(sorted[sorted.length - 1].snapshot, lastSeq, lastMat, 'expansion');

  const firstPos = TIMING_POSITION[firstPhase] ?? 1;
  const lastPos = TIMING_POSITION[lastPhaseCalc] ?? 1;
  const phaseVelocity = spanMs > 0 ? ((lastPos - firstPos) / (spanMs / 3600000)) : 0;

  // Inflection timestamps
  const inflectionTimestamps: TemporalAnalysis['inflectionTimestamps'] = [];
  const seenInflections = new Set<string>();
  for (const { snapshot, timestamp } of sorted) {
    const seq = analyzeSequence(snapshot);
    const inflections = detectInflections(snapshot, seq);
    for (const infl of inflections) {
      if (!seenInflections.has(infl.label)) {
        seenInflections.add(infl.label);
        inflectionTimestamps.push({ signal: infl.label, timestamp, type: infl.type });
      }
    }
  }

  return {
    snapshotCount: sorted.length,
    spanMs,
    leadLag,
    phaseTransitions,
    currentPhaseDurationMs,
    phaseVelocity,
    inflectionTimestamps,
    rationale,
  };
}

function clampVal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL TIMING OUTPUT (extended from JudgmentTiming)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FullTimingResult extends JudgmentTiming {
  sequence: SequenceAnalysis;
  maturity: MaturityAssessment;
  inflections: InflectionSignal[];
  projection: TimingProjection;
  /** Multi-snapshot temporal analysis (present when history is provided) */
  temporal?: TemporalAnalysis;
}

/**
 * Full timing/sequence engine (v2).
 * When `history` is provided, performs multi-snapshot temporal analysis
 * for lead-lag, phase transitions, and inflection timestamps.
 */
export function classifyTimingFull(
  state: { primary: MarketState; confidence: number },
  signals: SignalSnapshot,
  history?: TimestampedSnapshot[],
): FullTimingResult {
  const stateGroup = MARKET_STATE_GROUPS[state.primary];

  const sequence = analyzeSequence(signals);
  const maturity = assessMaturity(signals, sequence, stateGroup);
  const phase = classifyPhase(signals, sequence, maturity, stateGroup);
  const inflections = detectInflections(signals, sequence);
  const projection = projectNextSteps(phase, signals, sequence);

  const position = TIMING_POSITION[phase];
  const score = Math.round((position / TIMING_TOTAL_STEPS) * 100);

  // Multi-snapshot temporal analysis
  let temporal: TemporalAnalysis | undefined;
  if (history && history.length >= 2) {
    temporal = analyzeTemporalSequence(history);

    // Use temporal rationale to refine maturity note
    if (temporal.phaseVelocity > 2 && !maturity.note?.includes('accelerat')) {
      maturity.risk_factors.push(`Phase advancing rapidly (velocity: ${temporal.phaseVelocity.toFixed(1)}/hr)`);
    }
    if (temporal.currentPhaseDurationMs > 4 * 3600000 && phase === TIMING_PHASES.MATURE) {
      maturity.risk_factors.push(`Extended time in mature phase (${Math.round(temporal.currentPhaseDurationMs / 3600000)}h)`);
    }
  }

  return {
    phase,
    score,
    sequence_position: position,
    sequence_total: TIMING_TOTAL_STEPS,
    maturity_warning: maturity.warning,
    maturity_note: maturity.note,

    sequence,
    maturity,
    inflections,
    projection,
    temporal,
  };
}
