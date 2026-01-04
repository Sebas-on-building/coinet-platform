/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📋 CALIBRATION REPORT GENERATOR                                           ║
 * ║                                                                               ║
 * ║   Weekly calibration report for score distribution sanity                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ENGINE_VERSION, METHODOLOGY_ID } from '../constants';
import type { OmniScoreSnapshot } from '../pipeline';
import type {
  CalibrationReport,
  GoldenCaseResult,
  HealthStatus,
  ScoreDistribution,
} from './types';
import { CALIBRATION_THRESHOLDS, WELL_KNOWN_PRIORS } from './types';
import { analyzeScoreDistribution, checkDistributionHealth } from './distribution';
import { getPrior, checkPriorDeviation } from './priors';
import { ALL_GOLDEN_CASES, validateGoldenCase, type GoldenCaseInput } from './golden-cases';

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateReportInput {
  /** Snapshots to analyze */
  snapshots: OmniScoreSnapshot[];
  
  /** Golden case calculation function */
  calculateGoldenCase: (input: GoldenCaseInput) => Promise<{
    qs: number;
    os: number | null;
    risk: number;
    posFinal: number | null;
    legitimacy: string;
    tier: string | null;
    flag: string;
  }>;
}

/**
 * Generate a complete calibration report
 */
export async function generateCalibrationReport(
  input: GenerateReportInput
): Promise<CalibrationReport> {
  const { snapshots, calculateGoldenCase } = input;
  
  // 1. Analyze distribution
  const distribution = analyzeScoreDistribution(snapshots);
  
  // 2. Check distribution health
  const health = checkDistributionHealth(distribution);
  
  // 3. Run golden cases
  const goldenCaseResults: GoldenCaseResult[] = [];
  for (const goldenCase of ALL_GOLDEN_CASES) {
    try {
      const actual = await calculateGoldenCase(goldenCase.input);
      goldenCaseResults.push(validateGoldenCase(goldenCase, actual));
    } catch (err) {
      goldenCaseResults.push({
        case: goldenCase,
        passed: false,
        actual: {
          qs: 0,
          os: null,
          risk: 100,
          posFinal: null,
          legitimacy: 'ERROR',
          tier: null,
          flag: 'Error',
        },
        deviations: [{
          field: 'error',
          expected: 'success',
          actual: err instanceof Error ? err.message : String(err),
          withinTolerance: false,
        }],
      });
    }
  }
  
  // 4. Major asset spot checks
  const majorSpotChecks = checkMajorAssets(snapshots);
  
  // 5. Determine overall status
  const goldenCasesPassed = goldenCaseResults.filter(r => r.passed).length;
  const goldenCasesFailed = goldenCaseResults.filter(r => !r.passed).length;
  
  let overallStatus: HealthStatus = 'healthy';
  if (health.overall === 'critical' || goldenCasesFailed > 0) {
    overallStatus = 'critical';
  } else if (health.overall === 'warning') {
    overallStatus = 'warning';
  }
  
  // 6. Generate summary
  const summary = generateSummary({
    distribution,
    health,
    goldenCasesPassed,
    goldenCasesFailed,
    majorSpotChecks,
  });
  
  return {
    timestamp: new Date(),
    methodologyId: METHODOLOGY_ID,
    engineVersion: ENGINE_VERSION,
    universeSize: snapshots.length,
    distribution,
    health,
    goldenCases: {
      total: goldenCaseResults.length,
      passed: goldenCasesPassed,
      failed: goldenCasesFailed,
      results: goldenCaseResults,
    },
    majorSpotChecks,
    status: overallStatus,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAJOR ASSET SPOT CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

function checkMajorAssets(
  snapshots: OmniScoreSnapshot[]
): CalibrationReport['majorSpotChecks'] {
  const checks: CalibrationReport['majorSpotChecks'] = [];
  const majorIds = Object.keys(WELL_KNOWN_PRIORS);
  
  for (const majorId of majorIds) {
    const snapshot = snapshots.find(
      s => s.identity.id.toLowerCase() === majorId.toLowerCase()
    );
    
    if (!snapshot) continue;
    
    const prior = getPrior(majorId);
    if (!prior) continue;
    
    // Calculate expected POS from prior
    const priorPos = 
      0.50 * prior.qsPrior +
      0.30 * (prior.osPrior ?? 50) +
      0.20 * (100 - prior.riskPrior);
    
    const currentScore = snapshot.posFinal ?? 0;
    const delta = currentScore - priorPos;
    const maxDelta = CALIBRATION_THRESHOLDS.majors.maxDeltaFromPrior;
    
    const deviationCheck = checkPriorDeviation(majorId, {
      qs: snapshot.qs,
      os: snapshot.os,
      risk: snapshot.risk,
      pos: currentScore,
    });
    
    checks.push({
      assetId: majorId,
      currentScore,
      priorScore: priorPos,
      delta,
      withinExpected: Math.abs(delta) <= maxDelta,
      explanation: deviationCheck.deviates
        ? deviationCheck.explanation
        : undefined,
    });
  }
  
  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

interface SummaryInput {
  distribution: ScoreDistribution;
  health: { overall: HealthStatus; warnings: string[]; criticalIssues: string[] };
  goldenCasesPassed: number;
  goldenCasesFailed: number;
  majorSpotChecks: CalibrationReport['majorSpotChecks'];
}

function generateSummary(input: SummaryInput): string {
  const {
    distribution,
    health,
    goldenCasesPassed,
    goldenCasesFailed,
    majorSpotChecks,
  } = input;
  
  const lines: string[] = [];
  
  // Header
  lines.push(`=== Calibration Report ===`);
  lines.push(`Universe: ${distribution.universeSize} assets`);
  lines.push(`Health: ${health.overall.toUpperCase()}`);
  lines.push('');
  
  // Distribution summary
  lines.push(`📊 Distribution:`);
  lines.push(`  POS: mean=${distribution.pos.mean.toFixed(1)}, stdDev=${distribution.pos.stdDev.toFixed(1)}`);
  lines.push(`  QS: mean=${distribution.qs.mean.toFixed(1)}`);
  lines.push(`  Risk: mean=${distribution.risk.mean.toFixed(1)}`);
  lines.push(`  Gated: ${distribution.gatedPercent.toFixed(1)}%`);
  lines.push('');
  
  // Golden cases
  lines.push(`🏆 Golden Cases: ${goldenCasesPassed}/${goldenCasesPassed + goldenCasesFailed} passed`);
  if (goldenCasesFailed > 0) {
    lines.push(`  ⚠️ ${goldenCasesFailed} golden case(s) failed!`);
  }
  lines.push('');
  
  // Major spot checks
  const majorsOutOfRange = majorSpotChecks.filter(m => !m.withinExpected);
  if (majorsOutOfRange.length > 0) {
    lines.push(`⚠️ Major assets out of expected range:`);
    for (const m of majorsOutOfRange) {
      lines.push(`  ${m.assetId}: ${m.currentScore.toFixed(1)} (expected ~${m.priorScore.toFixed(1)}, delta=${m.delta.toFixed(1)})`);
    }
  } else if (majorSpotChecks.length > 0) {
    lines.push(`✅ All ${majorSpotChecks.length} major assets within expected range`);
  }
  lines.push('');
  
  // Warnings
  if (health.warnings.length > 0) {
    lines.push(`⚠️ Warnings:`);
    for (const w of health.warnings) {
      lines.push(`  - ${w}`);
    }
    lines.push('');
  }
  
  // Critical issues
  if (health.criticalIssues.length > 0) {
    lines.push(`🚨 Critical Issues:`);
    for (const c of health.criticalIssues) {
      lines.push(`  - ${c}`);
    }
  }
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format report as markdown
 */
export function formatReportAsMarkdown(report: CalibrationReport): string {
  const lines: string[] = [];
  
  lines.push(`# OmniScore Calibration Report`);
  lines.push('');
  lines.push(`**Generated:** ${report.timestamp.toISOString()}`);
  lines.push(`**Methodology:** ${report.methodologyId}`);
  lines.push(`**Engine:** ${report.engineVersion}`);
  lines.push(`**Status:** ${statusEmoji(report.status)} ${report.status.toUpperCase()}`);
  lines.push('');
  
  lines.push(`## Distribution Analysis`);
  lines.push('');
  lines.push(`| Metric | Mean | StdDev | Median | Min | Max |`);
  lines.push(`|--------|------|--------|--------|-----|-----|`);
  lines.push(`| POS | ${report.distribution.pos.mean.toFixed(1)} | ${report.distribution.pos.stdDev.toFixed(1)} | ${report.distribution.pos.median.toFixed(1)} | ${report.distribution.pos.min.toFixed(1)} | ${report.distribution.pos.max.toFixed(1)} |`);
  lines.push(`| QS | ${report.distribution.qs.mean.toFixed(1)} | ${report.distribution.qs.stdDev.toFixed(1)} | ${report.distribution.qs.median.toFixed(1)} | ${report.distribution.qs.min.toFixed(1)} | ${report.distribution.qs.max.toFixed(1)} |`);
  lines.push(`| OS | ${report.distribution.os.mean.toFixed(1)} | ${report.distribution.os.stdDev.toFixed(1)} | ${report.distribution.os.median.toFixed(1)} | ${report.distribution.os.min.toFixed(1)} | ${report.distribution.os.max.toFixed(1)} |`);
  lines.push(`| Risk | ${report.distribution.risk.mean.toFixed(1)} | ${report.distribution.risk.stdDev.toFixed(1)} | ${report.distribution.risk.median.toFixed(1)} | ${report.distribution.risk.min.toFixed(1)} | ${report.distribution.risk.max.toFixed(1)} |`);
  lines.push('');
  
  lines.push(`## Health Checks`);
  lines.push('');
  lines.push(`| Check | Expected | Actual | Status |`);
  lines.push(`|-------|----------|--------|--------|`);
  for (const check of report.health.checks) {
    lines.push(`| ${check.metric} | ${check.expected} | ${check.actual} | ${statusEmoji(check.status)} |`);
  }
  lines.push('');
  
  lines.push(`## Golden Cases`);
  lines.push('');
  lines.push(`**Passed:** ${report.goldenCases.passed}/${report.goldenCases.total}`);
  lines.push('');
  for (const result of report.goldenCases.results) {
    const emoji = result.passed ? '✅' : '❌';
    lines.push(`### ${emoji} ${result.case.name}`);
    lines.push('');
    if (!result.passed) {
      lines.push(`| Field | Expected | Actual | OK |`);
      lines.push(`|-------|----------|--------|-----|`);
      for (const d of result.deviations) {
        const ok = d.withinTolerance ? '✅' : '❌';
        lines.push(`| ${d.field} | ${d.expected} | ${d.actual} | ${ok} |`);
      }
      lines.push('');
    }
  }
  
  lines.push(`## Major Asset Spot Checks`);
  lines.push('');
  if (report.majorSpotChecks.length > 0) {
    lines.push(`| Asset | Current | Prior | Delta | Status |`);
    lines.push(`|-------|---------|-------|-------|--------|`);
    for (const check of report.majorSpotChecks) {
      const status = check.withinExpected ? '✅' : '⚠️';
      lines.push(`| ${check.assetId} | ${check.currentScore.toFixed(1)} | ${check.priorScore.toFixed(1)} | ${check.delta >= 0 ? '+' : ''}${check.delta.toFixed(1)} | ${status} |`);
    }
  } else {
    lines.push('No major assets in universe.');
  }
  lines.push('');
  
  return lines.join('\n');
}

function statusEmoji(status: HealthStatus): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'critical': return '🚨';
    default: return '❓';
  }
}

/**
 * Format report as JSON
 */
export function formatReportAsJSON(report: CalibrationReport): string {
  return JSON.stringify(report, null, 2);
}
