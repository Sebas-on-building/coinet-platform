/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     SCORE DRIFT MONITOR                                                       ║
 * ║                                                                               ║
 * ║   Detects when scoring distributions shift from their calibrated baseline.   ║
 * ║   Runs on a schedule (default: every 6 hours) and produces DriftReports.     ║
 * ║                                                                               ║
 * ║   Key metrics:                                                               ║
 * ║   - Mean/median shift across all scored entities                             ║
 * ║   - Per-segment drift (QS, OS, Risk)                                         ║
 * ║   - Regime-conditional drift                                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  DistributionStats,
  DriftDimension,
  DriftReport,
  DriftSeverity,
  ScoreSnapshot,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DRIFT_THRESHOLDS = {
  minor: 0.08,
  moderate: 0.18,
  severe: 0.30,
} as const;

const DEFAULT_WINDOW_HOURS = 24;

// ═══════════════════════════════════════════════════════════════════════════════
// BASELINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The expected "healthy" distribution from golden cases and initial calibration.
 * This gets updated as the system learns from outcomes.
 */
let currentBaseline: DistributionStats = {
  mean: 55,
  median: 52,
  stddev: 18,
  p10: 28,
  p25: 40,
  p75: 68,
  p90: 80,
  count: 1000,
};

export function updateBaseline(stats: DistributionStats): void {
  currentBaseline = { ...stats };
}

export function getBaseline(): DistributionStats {
  return { ...currentBaseline };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeDistribution(values: number[]): DistributionStats {
  if (values.length === 0) {
    return { mean: 0, median: 0, stddev: 0, p10: 0, p25: 0, p75: 0, p90: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

  return {
    mean,
    median: percentile(sorted, 50),
    stddev: Math.sqrt(variance),
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    count: n,
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIVERGENCE SCORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute a normalized divergence between two distributions.
 *
 * Uses a combination of:
 * - Normalized mean shift
 * - KL-divergence approximation from moments
 * - Tail divergence (P10, P90)
 *
 * Returns 0–1 where 0 = identical distributions, 1 = completely different.
 */
function computeDivergence(current: DistributionStats, baseline: DistributionStats): number {
  if (baseline.count === 0 || current.count === 0) return 0;

  const range = Math.max(baseline.p90 - baseline.p10, 1);

  const meanShift = Math.abs(current.mean - baseline.mean) / range;
  const medianShift = Math.abs(current.median - baseline.median) / range;
  const stddevRatio = baseline.stddev > 0 ? Math.abs(current.stddev - baseline.stddev) / baseline.stddev : 0;
  const p10Shift = Math.abs(current.p10 - baseline.p10) / range;
  const p90Shift = Math.abs(current.p90 - baseline.p90) / range;

  const score =
    meanShift * 0.30 +
    medianShift * 0.25 +
    stddevRatio * 0.20 +
    p10Shift * 0.10 +
    p90Shift * 0.15;

  return Math.min(1, score);
}

function classifySeverity(divergence: number): DriftSeverity {
  if (divergence >= DRIFT_THRESHOLDS.severe) return 'severe';
  if (divergence >= DRIFT_THRESHOLDS.moderate) return 'moderate';
  if (divergence >= DRIFT_THRESHOLDS.minor) return 'minor';
  return 'none';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PER-DIMENSION DRIFT
// ═══════════════════════════════════════════════════════════════════════════════

interface DimensionInput {
  name: string;
  values: number[];
  baselineMean: number;
}

function analyzeDimensions(dimensions: DimensionInput[]): DriftDimension[] {
  const results: DriftDimension[] = [];

  for (const dim of dimensions) {
    if (dim.values.length === 0) continue;

    const currentMean = dim.values.reduce((s, v) => s + v, 0) / dim.values.length;
    const shift = currentMean - dim.baselineMean;
    const normalizedShift = dim.baselineMean !== 0 ? Math.abs(shift / dim.baselineMean) : Math.abs(shift);

    let severity: DriftSeverity;
    if (normalizedShift >= 0.25) severity = 'severe';
    else if (normalizedShift >= 0.15) severity = 'moderate';
    else if (normalizedShift >= 0.08) severity = 'minor';
    else severity = 'none';

    if (severity !== 'none') {
      results.push({ name: dim.name, currentMean, baselineMean: dim.baselineMean, shift, severity });
    }
  }

  return results.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze recent score snapshots for distribution drift.
 *
 * @param snapshots Recent scoring results
 * @param windowHours Time window to analyze (default: 24h)
 * @param baseline Optional custom baseline (defaults to stored baseline)
 */
export function detectDrift(
  snapshots: ScoreSnapshot[],
  windowHours = DEFAULT_WINDOW_HOURS,
  baseline?: DistributionStats,
): DriftReport {
  const effectiveBaseline = baseline ?? currentBaseline;
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
  const recent = snapshots.filter(s => s.timestamp >= cutoff);

  const posValues = recent.map(s => s.pos);
  const currentDistribution = computeDistribution(posValues);
  const divergenceScore = computeDivergence(currentDistribution, effectiveBaseline);
  const severity = classifySeverity(divergenceScore);

  const driftedDimensions = analyzeDimensions([
    { name: 'POS', values: posValues, baselineMean: effectiveBaseline.mean },
    { name: 'QS', values: recent.map(s => s.qs), baselineMean: 55 },
    { name: 'OS', values: recent.map(s => s.os), baselineMean: 50 },
    { name: 'Risk', values: recent.map(s => s.risk), baselineMean: 30 },
  ]);

  const recommendation = generateRecommendation(severity, driftedDimensions);

  return {
    timestamp: Date.now(),
    windowHours,
    currentDistribution,
    baselineDistribution: effectiveBaseline,
    divergenceScore,
    severity,
    driftedDimensions,
    recommendation,
  };
}

function generateRecommendation(severity: DriftSeverity, dimensions: DriftDimension[]): string {
  if (severity === 'none') return 'No drift detected. Distribution is within calibrated bounds.';

  if (severity === 'severe') {
    const top = dimensions.slice(0, 2).map(d => d.name).join(' and ');
    return `Severe drift in ${top}. Immediate investigation required. Consider pausing score publication and running golden case validation.`;
  }

  if (severity === 'moderate') {
    const top = dimensions[0]?.name ?? 'POS';
    return `Moderate drift in ${top}. Schedule golden case re-validation and review recent data source changes.`;
  }

  return 'Minor drift detected. Monitor over next 24h. If persistent, run calibration report.';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED MONITOR
// ═══════════════════════════════════════════════════════════════════════════════

let monitorInterval: ReturnType<typeof setInterval> | null = null;
let snapshotProvider: (() => Promise<ScoreSnapshot[]>) | null = null;
let driftCallback: ((report: DriftReport) => void) | null = null;

/**
 * Start the automated drift monitoring loop.
 *
 * @param getSnapshots Function that fetches recent score snapshots
 * @param onDrift Callback fired when drift is detected
 * @param intervalHours How often to check (default: 6h)
 */
export function startDriftMonitor(
  getSnapshots: () => Promise<ScoreSnapshot[]>,
  onDrift: (report: DriftReport) => void,
  intervalHours = 6,
): void {
  snapshotProvider = getSnapshots;
  driftCallback = onDrift;

  if (monitorInterval) clearInterval(monitorInterval);

  monitorInterval = setInterval(async () => {
    try {
      const snapshots = await snapshotProvider!();
      const report = detectDrift(snapshots);
      if (report.severity !== 'none') {
        driftCallback!(report);
      }
    } catch (err) {
      console.error('[drift-monitor] Error during scheduled drift check:', err);
    }
  }, intervalHours * 60 * 60 * 1000);
}

export function stopDriftMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
