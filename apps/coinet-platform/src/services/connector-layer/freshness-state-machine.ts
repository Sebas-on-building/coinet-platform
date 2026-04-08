/**
 * L2.2 — Freshness State Machine
 *
 * Family-specific transition logic, dominant clock resolution,
 * transport gap escalation, and unknown freshness handling.
 *
 * Rule-based, not fuzzy. Every transition is auditable.
 */

import type {
  FreshnessState, DominantClock, FreshnessUsageRight,
  FreshnessEvaluationInput, TimingAges,
} from './freshness-ontology';
import type { FreshnessPolicy } from './freshness-policy-map';

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINANT CLOCK RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveDominantClock(input: FreshnessEvaluationInput): DominantClock {
  if (input.isBackfill || input.routeMode === 'backfill') {
    return input.observedTimestamp ? 'HISTORICAL_PIN' : 'UNKNOWN';
  }

  if (input.observedTimestamp) return 'OBSERVED';
  if (input.publishedTimestamp) return 'PUBLISHED';
  if (input.timingCompleteness === 'minimal') return 'UNKNOWN';
  return 'INGESTED';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING AGE COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function computeTimingAges(input: FreshnessEvaluationInput, now: number): TimingAges {
  const ingested = new Date(input.ingestedTimestamp).getTime();
  const observed = input.observedTimestamp ? new Date(input.observedTimestamp).getTime() : undefined;
  const published = input.publishedTimestamp ? new Date(input.publishedTimestamp).getTime() : undefined;

  return {
    observationAgeMs: observed != null ? Math.max(0, now - observed) : undefined,
    publicationAgeMs: published != null ? Math.max(0, now - published) : undefined,
    ingestionAgeMs: Math.max(0, now - ingested),
    transportGapMs: observed != null ? Math.max(0, ingested - observed) : undefined,
    publicationGapMs: observed != null && published != null ? Math.max(0, published - observed) : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE ASSIGNMENT — REALTIME FAMILIES
// ═══════════════════════════════════════════════════════════════════════════════

function evaluateRealtimeState(
  ages: TimingAges,
  policy: FreshnessPolicy,
  domClock: DominantClock,
): { state: FreshnessState; reasons: string[] } {
  const reasons: string[] = [];

  if (domClock === 'UNKNOWN') {
    reasons.push('RT_UNKNOWN_CLOCK');
    return { state: 'F5_UNKNOWN', reasons };
  }

  const primaryAge = ages.observationAgeMs ?? ages.publicationAgeMs ?? ages.ingestionAgeMs;

  if (primaryAge <= policy.currentMaxMs) {
    if (ages.transportGapMs != null && ages.transportGapMs > policy.maxTransportGapMs) {
      reasons.push('RT_TRANSPORT_GAP_ELEVATED');
      return { state: 'F1_SLIPPING', reasons };
    }
    return { state: 'F0_CURRENT', reasons };
  }

  if (primaryAge <= policy.slippingMaxMs) {
    reasons.push('RT_PRIMARY_AGE_SLIPPING');
    return { state: 'F1_SLIPPING', reasons };
  }

  if (primaryAge <= policy.staleButUsableMaxMs) {
    reasons.push('RT_PRIMARY_AGE_STALE_USABLE');
    return { state: 'F2_STALE_BUT_USABLE', reasons };
  }

  if (primaryAge <= policy.staleConstrainedMaxMs) {
    reasons.push('RT_PRIMARY_AGE_STALE_CONSTRAINED');
    return { state: 'F3_STALE_AND_CONSTRAINED', reasons };
  }

  reasons.push('RT_PRIMARY_AGE_UNUSABLE');
  return { state: 'F4_UNUSABLE', reasons };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE ASSIGNMENT — SCHEDULED FAMILIES
// ═══════════════════════════════════════════════════════════════════════════════

function evaluateScheduledState(
  ages: TimingAges,
  policy: FreshnessPolicy,
  domClock: DominantClock,
): { state: FreshnessState; reasons: string[] } {
  const reasons: string[] = [];

  if (domClock === 'UNKNOWN') {
    reasons.push('SCHED_UNKNOWN_CLOCK');
    return { state: 'F5_UNKNOWN', reasons };
  }

  const primaryAge = ages.observationAgeMs ?? ages.publicationAgeMs ?? ages.ingestionAgeMs;

  if (primaryAge <= policy.currentMaxMs) {
    return { state: 'F0_CURRENT', reasons };
  }

  if (primaryAge <= policy.slippingMaxMs) {
    reasons.push('SCHED_CADENCE_SLIPPING');
    return { state: 'F1_SLIPPING', reasons };
  }

  if (primaryAge <= policy.staleButUsableMaxMs) {
    reasons.push('SCHED_CADENCE_BEHIND');
    if (ages.publicationGapMs != null && ages.publicationGapMs > policy.maxPublicationGapMs) {
      reasons.push('SCHED_PUBLICATION_GAP_HIGH');
    }
    return { state: 'F2_STALE_BUT_USABLE', reasons };
  }

  if (primaryAge <= policy.staleConstrainedMaxMs) {
    reasons.push('SCHED_CADENCE_SIGNIFICANTLY_BEHIND');
    return { state: 'F3_STALE_AND_CONSTRAINED', reasons };
  }

  reasons.push('SCHED_CADENCE_EXPIRED');
  return { state: 'F4_UNUSABLE', reasons };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE ASSIGNMENT — ON-DEMAND
// ═══════════════════════════════════════════════════════════════════════════════

function evaluateOnDemandState(
  ages: TimingAges,
  policy: FreshnessPolicy,
  domClock: DominantClock,
): { state: FreshnessState; reasons: string[] } {
  const reasons: string[] = [];

  if (domClock === 'UNKNOWN') {
    reasons.push('OD_UNKNOWN_CLOCK');
    return { state: 'F5_UNKNOWN', reasons };
  }

  const primaryAge = ages.observationAgeMs ?? ages.publicationAgeMs ?? ages.ingestionAgeMs;

  if (primaryAge <= policy.currentMaxMs) return { state: 'F0_CURRENT', reasons };

  if (primaryAge <= policy.slippingMaxMs) {
    reasons.push('OD_AGING');
    return { state: 'F1_SLIPPING', reasons };
  }

  if (primaryAge <= policy.staleButUsableMaxMs) {
    reasons.push('OD_STALE_USABLE');
    return { state: 'F2_STALE_BUT_USABLE', reasons };
  }

  if (primaryAge <= policy.staleConstrainedMaxMs) {
    reasons.push('OD_STALE_CONSTRAINED');
    return { state: 'F3_STALE_AND_CONSTRAINED', reasons };
  }

  reasons.push('OD_EXPIRED');
  return { state: 'F4_UNUSABLE', reasons };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE ASSIGNMENT — HISTORICAL
// ═══════════════════════════════════════════════════════════════════════════════

function evaluateHistoricalState(
  input: FreshnessEvaluationInput,
  _ages: TimingAges,
  domClock: DominantClock,
): { state: FreshnessState; reasons: string[] } {
  const reasons: string[] = [];

  if (!input.observedTimestamp) {
    reasons.push('HIST_NO_OBSERVED_TIMESTAMP');
    return { state: 'F5_UNKNOWN', reasons };
  }

  if (input.timingCompleteness === 'minimal') {
    reasons.push('HIST_MINIMAL_TIMING');
    return { state: 'F3_STALE_AND_CONSTRAINED', reasons };
  }

  if (domClock === 'HISTORICAL_PIN') {
    reasons.push('HIST_PINNED');
    return { state: 'F0_CURRENT', reasons };
  }

  reasons.push('HIST_VALID');
  return { state: 'F0_CURRENT', reasons };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMARY STATE ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface StateResult {
  state: FreshnessState;
  reasons: string[];
}

export function assignFreshnessState(
  input: FreshnessEvaluationInput,
  ages: TimingAges,
  policy: FreshnessPolicy,
  domClock: DominantClock,
): StateResult {
  switch (policy.freshnessFamily) {
    case 'REALTIME':  return evaluateRealtimeState(ages, policy, domClock);
    case 'SCHEDULED': return evaluateScheduledState(ages, policy, domClock);
    case 'ON_DEMAND': return evaluateOnDemandState(ages, policy, domClock);
    case 'HISTORICAL': return evaluateHistoricalState(input, ages, domClock);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSPORT GAP ESCALATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transport gap escalation only applies to REALTIME families where
 * the primary age says F0 but the transport path itself was degraded.
 * For scheduled/historical data the gap is inherent to the cadence.
 * Never escalate an already-stale observation — age already covers it.
 */
export function applyTransportGapEscalation(
  state: FreshnessState,
  ages: TimingAges,
  policy: FreshnessPolicy,
  reasons: string[],
): { state: FreshnessState; reasons: string[] } {
  if (policy.freshnessFamily !== 'REALTIME') return { state, reasons };
  if (state !== 'F0_CURRENT') return { state, reasons };
  if (ages.transportGapMs == null) return { state, reasons };
  if (ages.transportGapMs <= policy.maxTransportGapMs) return { state, reasons };

  return { state: 'F1_SLIPPING', reasons: [...reasons, 'TRANSPORT_GAP_ESCALATION'] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM-USAGE OVERRIDE
// ═══════════════════════════════════════════════════════════════════════════════

export function applyClaimUsageOverride(
  state: FreshnessState,
  rights: FreshnessUsageRight[],
  claimUsage: string | undefined,
  reasons: string[],
): { effectiveRights: FreshnessUsageRight[]; allowed: boolean; reasons: string[] } {
  if (!claimUsage) return { effectiveRights: rights, allowed: true, reasons };

  const USAGE_TO_RIGHT: Record<string, FreshnessUsageRight> = {
    DISPLAY: 'DISPLAY_ALLOWED',
    LIVE_SCORING: 'LIVE_SCORING_ALLOWED',
    SCENARIO_CONFIRMATION: 'SCENARIO_CONFIRMATION_ALLOWED',
    CONTRADICTION_EVIDENCE: 'CONTRADICTION_EVIDENCE_ALLOWED',
    HISTORICAL_REPLAY: 'HISTORICAL_REPLAY_ALLOWED',
    AUDIT: 'AUDIT_ONLY',
  };

  const required = USAGE_TO_RIGHT[claimUsage];
  if (!required) return { effectiveRights: rights, allowed: true, reasons };

  if (rights.includes('NOT_ALLOWED')) {
    return { effectiveRights: rights, allowed: false, reasons: [...reasons, `USAGE_BLOCKED_${claimUsage}`] };
  }

  if (required === 'AUDIT_ONLY') {
    return { effectiveRights: rights, allowed: true, reasons };
  }

  const allowed = rights.includes(required);
  if (!allowed) {
    return { effectiveRights: rights, allowed: false, reasons: [...reasons, `USAGE_NOT_PERMITTED_${claimUsage}`] };
  }

  return { effectiveRights: rights, allowed: true, reasons };
}
