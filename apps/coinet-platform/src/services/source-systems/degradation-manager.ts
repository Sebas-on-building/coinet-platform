/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     DEGRADATION MANAGER                                                       ║
 * ║                                                                               ║
 * ║   A world-class source layer must support:                                    ║
 * ║     - partial degraded operation                                              ║
 * ║     - source health scoring                                                   ║
 * ║     - freshness tracking                                                      ║
 * ║     - source-class-specific confidence penalties                              ║
 * ║                                                                               ║
 * ║   The source layer must always be designed for graceful degradation,           ║
 * ║   never silent failure.                                                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  type SourceClass,
  getAllSourceClasses,
  SOURCE_CLASS_DOCTRINES,
  TRUTH_CLASS_LABELS,
  SOURCE_CLASS_TO_TRUTH,
} from './registry';
import { getClassHealth, type SourceClassHealth } from './health-monitor';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DegradationState {
  /** Source classes that are fully operational */
  operational: SourceClass[];
  /** Source classes that are degraded (partial availability) */
  degraded: SourceClass[];
  /** Source classes that are completely offline */
  offline: SourceClass[];

  /** Confidence penalty to apply due to source degradation (0–1, subtracted from raw confidence) */
  confidencePenalty: number;
  /** Whether the system is in degraded mode overall */
  isSystemDegraded: boolean;
  /** Whether the system can still produce meaningful judgments */
  canProduceJudgment: boolean;

  /** Human-readable degradation summary for AI/display consumption */
  summary: string;
  /** Per-class degradation details */
  classDetails: Record<SourceClass, ClassDegradationDetail>;
}

export interface ClassDegradationDetail {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  /** Confidence weight reduction for this class (0–1 multiplier) */
  confidenceMultiplier: number;
  /** What truth dimensions are affected */
  affectedTruth: string;
  /** What downstream engines are impacted */
  impactedEngines: string[];
  /** Recommended action */
  action: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPACT MAPPING — which engines depend on which source classes
// ═══════════════════════════════════════════════════════════════════════════════

const CLASS_ENGINE_IMPACT: Record<SourceClass, string[]> = {
  market_data: ['state-engine', 'confidence-engine', 'signal-snapshot', 'omniscore'],
  dex_discovery: ['signal-snapshot', 'timing-engine', 'evidence-pack'],
  derivatives: ['regime-engine', 'hypothesis-engine', 'contradiction-engine', 'timing-engine'],
  fundamentals: ['hypothesis-engine', 'confidence-engine', 'omniscore', 'scenario-engine'],
  onchain: ['hypothesis-engine', 'timing-engine', 'contradiction-engine', 'evidence-pack'],
  security: ['confidence-engine', 'state-engine', 'evidence-pack'],
  narrative: ['hypothesis-engine', 'timing-engine', 'signal-snapshot'],
  entity: ['hypothesis-engine', 'evidence-pack'],
  reasoning: ['chat-service', 'insight-pack', 'pass2-renderer'],
};

// Confidence penalty weight per class — more critical classes cause bigger penalties
const CLASS_CONFIDENCE_PENALTY: Record<SourceClass, number> = {
  market_data: 0.15,
  dex_discovery: 0.05,
  derivatives: 0.12,
  fundamentals: 0.10,
  onchain: 0.12,
  security: 0.08,
  narrative: 0.05,
  entity: 0.03,
  reasoning: 0.02,
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEGRADATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function assessDegradation(): DegradationState {
  const operational: SourceClass[] = [];
  const degraded: SourceClass[] = [];
  const offline: SourceClass[] = [];
  const classDetails = {} as Record<SourceClass, ClassDegradationDetail>;

  let confidencePenalty = 0;

  for (const sc of getAllSourceClasses()) {
    const health = getClassHealth(sc);
    const truthLabel = TRUTH_CLASS_LABELS[SOURCE_CLASS_TO_TRUTH[sc]];
    const impacted = CLASS_ENGINE_IMPACT[sc] ?? [];

    if (!health.operational) {
      offline.push(sc);
      confidencePenalty += CLASS_CONFIDENCE_PENALTY[sc] ?? 0.05;
      classDetails[sc] = {
        status: 'offline',
        confidenceMultiplier: 0,
        affectedTruth: truthLabel,
        impactedEngines: impacted,
        action: `${sc} is offline — ${truthLabel} truth is unavailable. All related confidence dimensions must be minimized.`,
      };
    } else if (health.degraded) {
      degraded.push(sc);
      const mult = health.avgHealthScore;
      confidencePenalty += (CLASS_CONFIDENCE_PENALTY[sc] ?? 0.05) * (1 - mult);
      classDetails[sc] = {
        status: health.status === 'critical' ? 'critical' : 'degraded',
        confidenceMultiplier: mult,
        affectedTruth: truthLabel,
        impactedEngines: impacted,
        action: `${sc} is degraded — ${truthLabel} truth has reduced reliability. Fallback providers active.`,
      };
    } else {
      operational.push(sc);
      classDetails[sc] = {
        status: 'healthy',
        confidenceMultiplier: 1,
        affectedTruth: truthLabel,
        impactedEngines: impacted,
        action: 'Operating normally.',
      };
    }
  }

  confidencePenalty = Math.min(0.5, confidencePenalty);

  const isSystemDegraded = degraded.length > 0 || offline.length > 0;

  // System can produce judgment if at least market data and one analytical class are available
  const hasMarket = operational.includes('market_data') || degraded.includes('market_data');
  const analyticalClasses: SourceClass[] = ['derivatives', 'fundamentals', 'onchain', 'narrative'];
  const hasAnalytical = analyticalClasses.some(c => operational.includes(c) || degraded.includes(c));
  const canProduceJudgment = hasMarket && hasAnalytical;

  const summary = buildDegradationSummary(operational, degraded, offline, confidencePenalty, canProduceJudgment);

  return {
    operational,
    degraded,
    offline,
    confidencePenalty,
    isSystemDegraded,
    canProduceJudgment,
    summary,
    classDetails,
  };
}

/**
 * Get the confidence multiplier for a specific source class
 * based on current degradation state.
 */
export function getClassConfidenceMultiplier(sourceClass: SourceClass): number {
  const health = getClassHealth(sourceClass);
  if (!health.operational) return 0;
  if (!health.degraded) return 1;
  return Math.max(0.2, health.avgHealthScore);
}

/**
 * Compute the aggregate confidence penalty from all degraded/offline sources.
 */
export function getAggregateConfidencePenalty(): number {
  const state = assessDegradation();
  return state.confidencePenalty;
}

/**
 * Get the list of truth dimensions that are currently blind/degraded.
 */
export function getBlindSpots(): Array<{ sourceClass: SourceClass; truthClass: string; severity: 'degraded' | 'blind' }> {
  const spots: Array<{ sourceClass: SourceClass; truthClass: string; severity: 'degraded' | 'blind' }> = [];

  for (const sc of getAllSourceClasses()) {
    const health = getClassHealth(sc);
    const truthLabel = TRUTH_CLASS_LABELS[SOURCE_CLASS_TO_TRUTH[sc]];

    if (!health.operational) {
      spots.push({ sourceClass: sc, truthClass: truthLabel, severity: 'blind' });
    } else if (health.degraded) {
      spots.push({ sourceClass: sc, truthClass: truthLabel, severity: 'degraded' });
    }
  }

  return spots;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildDegradationSummary(
  operational: SourceClass[],
  degraded: SourceClass[],
  offline: SourceClass[],
  penalty: number,
  canJudge: boolean,
): string {
  const parts: string[] = [];

  if (offline.length === 0 && degraded.length === 0) {
    return 'All source systems operational. Full observational coverage available.';
  }

  if (offline.length > 0) {
    parts.push(`OFFLINE: ${offline.join(', ')} — ${offline.length} truth dimension(s) unavailable.`);
  }
  if (degraded.length > 0) {
    parts.push(`DEGRADED: ${degraded.join(', ')} — reduced reliability.`);
  }

  parts.push(`Confidence penalty: -${(penalty * 100).toFixed(0)}% from source degradation.`);

  if (!canJudge) {
    parts.push('CRITICAL: Insufficient source coverage to produce meaningful judgment. Market data or all analytical classes are unavailable.');
  }

  return parts.join(' ');
}
