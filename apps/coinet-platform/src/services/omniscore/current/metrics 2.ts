/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 OMNISCORE OBSERVABILITY METRICS                                       ║
 * ║                                                                               ║
 * ║   Prometheus-style metrics for production monitoring.                        ║
 * ║   Alerts on failure modes: version mismatch, insufficient data, etc.         ║
 * ║                                                                               ║
 * ║   Production Readiness Gate: Phase 7                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { isMetricsEnabled } from './feature-flags';
import { ENGINE_VERSION, BUILD_COMMIT_SHA } from './version';

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Counter {
  inc(labels?: Record<string, string>, value?: number): void;
  get(labels?: Record<string, string>): number;
}

export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
  getCount(labels?: Record<string, string>): number;
  getSum(labels?: Record<string, string>): number;
}

export interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY METRIC STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricData {
  counters: Map<string, Map<string, number>>;
  histograms: Map<string, { count: Map<string, number>; sum: Map<string, number>; buckets: Map<string, number[]> }>;
  gauges: Map<string, Map<string, number>>;
}

const metrics: MetricData = {
  counters: new Map(),
  histograms: new Map(),
  gauges: new Map(),
};

function labelsToKey(labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) return '_default_';
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

function createCounter(name: string): Counter {
  if (!metrics.counters.has(name)) {
    metrics.counters.set(name, new Map());
  }
  const counter = metrics.counters.get(name)!;
  
  return {
    inc(labels?: Record<string, string>, value: number = 1) {
      if (!isMetricsEnabled()) return;
      const key = labelsToKey(labels);
      counter.set(key, (counter.get(key) || 0) + value);
    },
    get(labels?: Record<string, string>): number {
      const key = labelsToKey(labels);
      return counter.get(key) || 0;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTOGRAM IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

function createHistogram(name: string, buckets: number[] = [10, 50, 100, 250, 500, 1000, 2500, 5000]): Histogram {
  if (!metrics.histograms.has(name)) {
    metrics.histograms.set(name, {
      count: new Map(),
      sum: new Map(),
      buckets: new Map(),
    });
  }
  const histogram = metrics.histograms.get(name)!;
  
  return {
    observe(value: number, labels?: Record<string, string>) {
      if (!isMetricsEnabled()) return;
      const key = labelsToKey(labels);
      histogram.count.set(key, (histogram.count.get(key) || 0) + 1);
      histogram.sum.set(key, (histogram.sum.get(key) || 0) + value);
    },
    getCount(labels?: Record<string, string>): number {
      const key = labelsToKey(labels);
      return histogram.count.get(key) || 0;
    },
    getSum(labels?: Record<string, string>): number {
      const key = labelsToKey(labels);
      return histogram.sum.get(key) || 0;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAUGE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

function createGauge(name: string): Gauge {
  if (!metrics.gauges.has(name)) {
    metrics.gauges.set(name, new Map());
  }
  const gauge = metrics.gauges.get(name)!;
  
  return {
    set(value: number, labels?: Record<string, string>) {
      if (!isMetricsEnabled()) return;
      const key = labelsToKey(labels);
      gauge.set(key, value);
    },
    get(labels?: Record<string, string>): number {
      const key = labelsToKey(labels);
      return gauge.get(key) || 0;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OMNISCORE METRICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculation latency in milliseconds
 * Labels: { sector, capBucket }
 */
export const omniscoreCalcLatencyMs = createHistogram(
  'omniscore_calc_latency_ms',
  [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
);

/**
 * Total calculations performed
 * Labels: { sector, capBucket, result: 'success' | 'error' }
 */
export const omniscoreCalcTotal = createCounter('omniscore_calc_total');

/**
 * Upstream source failures
 * Labels: { source: 'coingecko' | 'twitter' | 'github' | ... }
 */
export const omniscoreUpstreamFailuresTotal = createCounter('omniscore_upstream_failures_total');

/**
 * Insufficient data errors (fail-closed triggered)
 * Labels: { reason: 'qs_empty' | 'os_empty' | 'both_empty' | 'below_threshold' }
 */
export const omniscoreInsufficientDataTotal = createCounter('omniscore_insufficient_data_total');

/**
 * Version mismatch errors (critical!)
 * Labels: { type: 'engine' | 'formula' | 'methodology' }
 */
export const omniscoreVersionMismatchTotal = createCounter('omniscore_version_mismatch_total');

/**
 * Smoothing state missing (persistence issue)
 * Labels: { projectId } - be careful with cardinality
 */
export const omniscoreSmoothingMissingStateTotal = createCounter('omniscore_smoothing_missing_state_total');

/**
 * Invariant violations
 * Labels: { inv: 'INV-1' | 'INV-2' | ... }
 */
export const omniscoreInvariantViolationTotal = createCounter('omniscore_invariant_violation_total');

/**
 * Validation errors
 * Labels: { field: string }
 */
export const omniscoreValidationErrorTotal = createCounter('omniscore_validation_error_total');

/**
 * Current coverage gauge (last value per project)
 * Labels: { type: 'qs' | 'os' }
 */
export const omniscoreCoverageGauge = createGauge('omniscore_coverage');

/**
 * Degraded calculations (passed but with warnings)
 */
export const omniscoreDegradedTotal = createCounter('omniscore_degraded_total');

/**
 * Feature flag states
 * Labels: { flag: string }
 */
export const omniscoreFeatureFlagGauge = createGauge('omniscore_feature_flag');

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record a successful calculation with timing
 */
export function recordCalcSuccess(
  durationMs: number,
  labels: { sector?: string; capBucket?: string; degraded?: boolean }
): void {
  omniscoreCalcLatencyMs.observe(durationMs, {
    sector: labels.sector || 'unknown',
    capBucket: labels.capBucket || 'unknown',
  });
  
  omniscoreCalcTotal.inc({
    sector: labels.sector || 'unknown',
    capBucket: labels.capBucket || 'unknown',
    result: 'success',
  });
  
  if (labels.degraded) {
    omniscoreDegradedTotal.inc();
  }
}

/**
 * Record a calculation error
 */
export function recordCalcError(
  durationMs: number,
  errorCode: string,
  labels?: { sector?: string; capBucket?: string }
): void {
  omniscoreCalcLatencyMs.observe(durationMs, {
    sector: labels?.sector || 'unknown',
    capBucket: labels?.capBucket || 'unknown',
  });
  
  omniscoreCalcTotal.inc({
    sector: labels?.sector || 'unknown',
    capBucket: labels?.capBucket || 'unknown',
    result: 'error',
  });
  
  // Increment specific error counters
  if (errorCode === 'INSUFFICIENT_DATA') {
    omniscoreInsufficientDataTotal.inc();
  } else if (errorCode.includes('VERSION_MISMATCH')) {
    omniscoreVersionMismatchTotal.inc({ type: errorCode.includes('ENGINE') ? 'engine' : 'formula' });
  } else if (errorCode === 'INVARIANT_VIOLATION') {
    omniscoreInvariantViolationTotal.inc();
  } else if (errorCode === 'VALIDATION_ERROR') {
    omniscoreValidationErrorTotal.inc();
  }
}

/**
 * Record upstream failure
 */
export function recordUpstreamFailure(source: string): void {
  omniscoreUpstreamFailuresTotal.inc({ source });
}

/**
 * Record smoothing state miss
 */
export function recordSmoothingStateMiss(): void {
  omniscoreSmoothingMissingStateTotal.inc();
}

/**
 * Record coverage values
 */
export function recordCoverage(qsCoverage: number, osCoverage: number): void {
  omniscoreCoverageGauge.set(qsCoverage, { type: 'qs' });
  omniscoreCoverageGauge.set(osCoverage, { type: 'os' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMETHEUS EXPORT FORMAT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Export metrics in Prometheus text format
 */
export function getPrometheusMetrics(): string {
  const lines: string[] = [];
  
  // Add metadata
  lines.push(`# OmniScore Metrics`);
  lines.push(`# Engine Version: ${ENGINE_VERSION}`);
  lines.push(`# Build: ${BUILD_COMMIT_SHA}`);
  lines.push(``);
  
  // Export counters
  for (const [name, labelMap] of metrics.counters) {
    lines.push(`# HELP ${name} Counter metric`);
    lines.push(`# TYPE ${name} counter`);
    for (const [labels, value] of labelMap) {
      if (labels === '_default_') {
        lines.push(`${name} ${value}`);
      } else {
        lines.push(`${name}{${labels}} ${value}`);
      }
    }
    lines.push(``);
  }
  
  // Export histograms (simplified - count and sum only)
  for (const [name, data] of metrics.histograms) {
    lines.push(`# HELP ${name} Histogram metric`);
    lines.push(`# TYPE ${name} histogram`);
    for (const [labels, count] of data.count) {
      const sum = data.sum.get(labels) || 0;
      if (labels === '_default_') {
        lines.push(`${name}_count ${count}`);
        lines.push(`${name}_sum ${sum}`);
      } else {
        lines.push(`${name}_count{${labels}} ${count}`);
        lines.push(`${name}_sum{${labels}} ${sum}`);
      }
    }
    lines.push(``);
  }
  
  // Export gauges
  for (const [name, labelMap] of metrics.gauges) {
    lines.push(`# HELP ${name} Gauge metric`);
    lines.push(`# TYPE ${name} gauge`);
    for (const [labels, value] of labelMap) {
      if (labels === '_default_') {
        lines.push(`${name} ${value}`);
      } else {
        lines.push(`${name}{${labels}} ${value}`);
      }
    }
    lines.push(``);
  }
  
  return lines.join('\n');
}

/**
 * Export metrics as JSON (for custom dashboards)
 */
export function getMetricsJson(): object {
  return {
    engineVersion: ENGINE_VERSION,
    buildCommitSha: BUILD_COMMIT_SHA,
    timestamp: new Date().toISOString(),
    counters: Object.fromEntries(
      Array.from(metrics.counters).map(([name, labelMap]) => [
        name,
        Object.fromEntries(labelMap),
      ])
    ),
    histograms: Object.fromEntries(
      Array.from(metrics.histograms).map(([name, data]) => [
        name,
        {
          count: Object.fromEntries(data.count),
          sum: Object.fromEntries(data.sum),
        },
      ])
    ),
    gauges: Object.fromEntries(
      Array.from(metrics.gauges).map(([name, labelMap]) => [
        name,
        Object.fromEntries(labelMap),
      ])
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reset all metrics (for testing only)
 */
export function resetMetrics(): void {
  metrics.counters.clear();
  metrics.histograms.clear();
  metrics.gauges.clear();
}
