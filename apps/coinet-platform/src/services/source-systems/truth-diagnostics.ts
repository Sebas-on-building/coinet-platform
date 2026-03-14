/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     TRUTH DIAGNOSTICS — Per-Analysis Source-Governance Observability           ║
 * ║                                                                               ║
 * ║   For any given analysis, answers:                                            ║
 * ║     - Which source classes were consulted?                                    ║
 * ║     - Which provider won each truth domain?                                   ║
 * ║     - Which domains were degraded or blind?                                   ║
 * ║     - What penalties were applied to confidence?                              ║
 * ║     - What doctrine warnings were triggered?                                  ║
 * ║                                                                               ║
 * ║   This is the debugger for strange judgments.                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  type SourceClass,
  type TruthDomain,
  type TruthClass,
  SOURCE_CLASS_TO_TRUTH,
  TRUTH_CLASS_LABELS,
  TRUTH_PRECEDENCE,
  getAllSourceClasses,
} from './registry';
import { getProviderHealth, getClassHealth, type ProviderHealthState, type SourceClassHealth } from './health-monitor';
import { resolveAuthorityForDomain } from './truth-resolver';
import { enforceR3TruthRole, enforceR6SecurityCap, enforceMultiClassJudgment, type DoctrineViolation } from './doctrine-enforcer';
import { assessDegradation, getBlindSpots, getAggregateConfidencePenalty, type DegradationState } from './degradation-manager';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SourceConsultation {
  sourceClass: SourceClass;
  truthClass: TruthClass;
  truthLabel: string;
  /** Provider that supplied data for this class */
  provider: string | null;
  /** Health of the providing provider at analysis time */
  providerHealth: number;
  /** Module status from evidence pack (ok, missing, stale, error) */
  moduleStatus: string;
  /** Latency of the fetch (ms) */
  latencyMs: number;
}

export interface DomainResolution {
  domain: TruthDomain;
  /** Which source class is authoritative for this domain right now */
  authority: SourceClass;
  /** Fallback source class if primary is degraded */
  fallback: SourceClass | null;
  /** Confidence in the resolution (0–1) */
  confidence: number;
  rationale: string;
}

export interface ConfidencePenalty {
  source: string;
  penalty: number;
  reason: string;
}

export interface TruthDiagnosticsReport {
  /** Asset/entity being analyzed */
  entityId: string;
  symbol: string;
  timestamp: string;

  /** Source classes consulted for this analysis */
  consultations: SourceConsultation[];
  /** How many of the 9 source classes were actually available */
  classesConsulted: number;
  classesAvailable: number;
  classesDegraded: number;
  classesOffline: number;

  /** Truth domain resolution: who won authority for each domain */
  domainResolutions: DomainResolution[];

  /** Blind spots: truth dimensions without data */
  blindSpots: Array<{ sourceClass: SourceClass; truthClass: string; severity: 'degraded' | 'blind' }>;

  /** All confidence penalties applied */
  penalties: ConfidencePenalty[];
  totalPenalty: number;

  /** Doctrine violations triggered */
  doctrineWarnings: DoctrineViolation[];

  /** Overall degradation state at analysis time */
  degradation: DegradationState;

  /** Summary for human consumption */
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE → SOURCE CLASS MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const MODULE_TO_SOURCE_CLASS: Record<string, SourceClass> = {
  dexscreener: 'dex_discovery',
  market_snapshot: 'market_data',
  derivatives: 'derivatives',
  security: 'security',
  holders: 'security',
  sentiment: 'narrative',
  news: 'narrative',
  onchain: 'onchain',
};

const MODULE_TO_PROVIDER: Record<string, string> = {
  dexscreener: 'dexscreener',
  market_snapshot: 'coingecko',
  derivatives: 'coinglass',
  security: 'goplus',
  holders: 'goplus',
  sentiment: 'lunarcrush',
  news: 'cryptopanic',
  onchain: 'alchemy',
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface EvidenceModuleTrace {
  module: string;
  status: string;
  latencyMs: number;
}

/**
 * Build a complete truth diagnostics report for a specific analysis.
 *
 * Call this after an Evidence Pack is built and a judgment is produced,
 * passing in the module-level trace from the Evidence Pack build.
 */
export function buildTruthDiagnostics(
  entityId: string,
  symbol: string,
  moduleTraces: EvidenceModuleTrace[],
  signals: { security_risk: number; _missing?: Set<string> },
  confidenceScore: number,
): TruthDiagnosticsReport {
  const timestamp = new Date().toISOString();

  // 1. Map module traces → source consultations
  const consultedClasses = new Set<SourceClass>();
  const consultations: SourceConsultation[] = moduleTraces.map(trace => {
    const sc = MODULE_TO_SOURCE_CLASS[trace.module] ?? ('market_data' as SourceClass);
    const providerId = MODULE_TO_PROVIDER[trace.module] ?? 'unknown';
    consultedClasses.add(sc);

    const health = getProviderHealth(providerId);
    const truthClass = SOURCE_CLASS_TO_TRUTH[sc];

    return {
      sourceClass: sc,
      truthClass,
      truthLabel: TRUTH_CLASS_LABELS[truthClass],
      provider: providerId,
      providerHealth: health.healthScore,
      moduleStatus: trace.status,
      latencyMs: trace.latencyMs,
    };
  });

  // 2. Identify classes not consulted (no module fetched for them)
  const allClasses = getAllSourceClasses();
  // Entity and reasoning don't have evidence-pack modules, so they're structural gaps
  const moduleBackedClasses: SourceClass[] = ['market_data', 'dex_discovery', 'derivatives', 'fundamentals', 'onchain', 'security', 'narrative'];
  const unconsulted = moduleBackedClasses.filter(sc => !consultedClasses.has(sc));

  for (const sc of unconsulted) {
    const truthClass = SOURCE_CLASS_TO_TRUTH[sc];
    consultations.push({
      sourceClass: sc,
      truthClass,
      truthLabel: TRUTH_CLASS_LABELS[truthClass],
      provider: null,
      providerHealth: 0,
      moduleStatus: 'not_consulted',
      latencyMs: 0,
    });
  }

  // 3. Resolve truth domain authorities
  const domains: TruthDomain[] = ['behavioral', 'pressure', 'substance', 'safety', 'attention', 'context', 'surface', 'expression'];
  const domainResolutions: DomainResolution[] = domains.map(d => {
    const resolution = resolveAuthorityForDomain(d);
    return {
      domain: d,
      authority: resolution.authoritative,
      fallback: resolution.fallback,
      confidence: resolution.confidence,
      rationale: resolution.rationale,
    };
  });

  // 4. Blind spots
  const blindSpots = getBlindSpots();

  // 5. Confidence penalties
  const penalties: ConfidencePenalty[] = [];

  // Degradation penalty
  const degradationPenalty = getAggregateConfidencePenalty();
  if (degradationPenalty > 0.01) {
    penalties.push({
      source: 'source_degradation',
      penalty: degradationPenalty,
      reason: 'Aggregate penalty from degraded/offline source classes',
    });
  }

  // Security cap
  if (signals.security_risk > 0.5) {
    const { cappedConfidence, violation } = enforceR6SecurityCap(signals.security_risk, confidenceScore);
    if (violation) {
      const secPenalty = confidenceScore - cappedConfidence;
      penalties.push({
        source: 'security_cap',
        penalty: secPenalty,
        reason: violation.message,
      });
    }
  }

  // Missing-data penalty (from _missing set on signals)
  const missing = signals._missing;
  if (missing && missing.size > 0) {
    const missingPenalty = (missing.size / 9) * 0.2;
    penalties.push({
      source: 'missing_signal_data',
      penalty: missingPenalty,
      reason: `${missing.size} signal categories missing: ${[...missing].join(', ')}`,
    });
    if (missing.has('derivatives') || missing.has('onchain')) {
      penalties.push({
        source: 'critical_category_missing',
        penalty: 0.05,
        reason: 'Critical category (derivatives or onchain) has no data',
      });
    }
  }

  const totalPenalty = penalties.reduce((sum, p) => sum + p.penalty, 0);

  // 6. Doctrine warnings
  const doctrineWarnings: DoctrineViolation[] = [];

  // Multi-class check
  const classesUsed = [...consultedClasses];
  doctrineWarnings.push(...enforceMultiClassJudgment(classesUsed));

  // Check if noisy sources (DEX, narrative, derivatives) were consulted without cross-layer
  for (const sc of consultedClasses) {
    const consultation = consultations.find(c => c.sourceClass === sc && c.moduleStatus === 'ok');
    if (consultation) {
      const warnings = enforceR3TruthRole(sc, ['timing', 'protocol_quality', 'leverage', 'safety']);
      doctrineWarnings.push(...warnings);
    }
  }

  // 7. Degradation state
  const degradation = assessDegradation();

  // 8. Counts
  const classesAvailable = allClasses.filter(sc => {
    const h = getClassHealth(sc);
    return h.operational;
  }).length;

  // 9. Summary
  const summary = buildSummary(
    consultedClasses.size,
    classesAvailable,
    blindSpots.length,
    totalPenalty,
    doctrineWarnings.length,
    degradation.canProduceJudgment,
  );

  return {
    entityId,
    symbol,
    timestamp,
    consultations,
    classesConsulted: consultedClasses.size,
    classesAvailable,
    classesDegraded: degradation.degraded.length,
    classesOffline: degradation.offline.length,
    domainResolutions,
    blindSpots,
    penalties,
    totalPenalty: Math.round(totalPenalty * 1000) / 1000,
    doctrineWarnings,
    degradation,
    summary,
  };
}

function buildSummary(
  consulted: number,
  available: number,
  blindCount: number,
  penalty: number,
  warnings: number,
  canJudge: boolean,
): string {
  const parts: string[] = [];

  parts.push(`Source coverage: ${consulted}/${available} classes consulted.`);

  if (blindCount > 0) {
    parts.push(`${blindCount} truth dimension(s) degraded or blind.`);
  }

  if (penalty > 0.01) {
    parts.push(`Total confidence penalty from source governance: -${(penalty * 100).toFixed(1)}%.`);
  }

  if (warnings > 0) {
    parts.push(`${warnings} doctrine warning(s) triggered.`);
  }

  if (!canJudge) {
    parts.push('CRITICAL: Insufficient source coverage for meaningful judgment.');
  }

  if (penalty < 0.05 && blindCount === 0 && warnings === 0) {
    parts.push('Source governance: clean.');
  }

  return parts.join(' ');
}
