/**
 * Truth Fingerprint Builder — Strategy 5.
 *
 * Every judgment should expose, at least internally, a truth fingerprint
 * showing what kind of truth is behind the conclusion.
 *
 * This lets users and downstream systems understand the epistemic
 * composition of every output.
 */

import type { TruthClass } from '../registry';
import { TRUTH_CLASSES } from '../registry';
import type { TruthFingerprint, TruthFingerprintEntry, ClassVisibility } from './types';
import { getClassCoverage, getCoverageMap, getCoverageSummary } from './class-coverage-state';
import { computeTensions, type TensionComputeInput } from './cross-class-tension';
import { getDegradationMessages } from './class-health';

interface FingerprintInput {
  classStrengths: Record<string, number>;
  overrideVisibilities?: Record<string, ClassVisibility>;
}

function authorityLevel(strength: number, visibility: ClassVisibility): 'high' | 'medium' | 'low' | 'absent' {
  if (visibility === 'blind') return 'absent';
  if (visibility === 'stale_dominant' || visibility === 'degraded') {
    return strength > 0.6 ? 'low' : 'absent';
  }
  if (strength >= 0.7) return 'high';
  if (strength >= 0.4) return 'medium';
  if (strength > 0.1) return 'low';
  return 'absent';
}

export function buildTruthFingerprint(input: FingerprintInput): TruthFingerprint {
  const coverageMap = input.overrideVisibilities ?? getCoverageMap();

  const allClasses = Object.values(TRUTH_CLASSES);
  const entries: TruthFingerprintEntry[] = [];

  for (const tc of allClasses) {
    const visibility = (coverageMap[tc] as ClassVisibility) ?? 'blind';
    const strength = input.classStrengths[tc] ?? 0;

    entries.push({
      truthClass: tc,
      visibility,
      strength,
      authorityLevel: authorityLevel(strength, visibility),
    });
  }

  const blindSpots = entries
    .filter(e => e.authorityLevel === 'absent')
    .map(e => e.truthClass);

  const tensionInput: TensionComputeInput = {
    classStates: entries.map(e => ({
      truthClass: e.truthClass,
      visibility: e.visibility,
      strength: e.strength,
    })),
  };
  const tensionResult = computeTensions(tensionInput);

  const coverageSummary = getCoverageSummary();

  return {
    timestamp: new Date().toISOString(),
    entries,
    blindSpots,
    tensionSummary: tensionResult.summary,
    overallCoverage: coverageSummary.overallScore,
  };
}

export function formatFingerprintForAI(fp: TruthFingerprint): string {
  const lines: string[] = ['## Truth Fingerprint'];

  for (const entry of fp.entries) {
    if (entry.truthClass === TRUTH_CLASSES.REASONING_EXPRESSION) continue;
    const label = entry.truthClass.replace(/_/g, ' ');
    lines.push(`  ${label}: ${entry.visibility} (authority: ${entry.authorityLevel})`);
  }

  if (fp.blindSpots.length > 0) {
    lines.push('');
    lines.push(`Blind spots: ${fp.blindSpots.join(', ')}`);
  }

  if (fp.tensionSummary.length > 0) {
    lines.push('');
    lines.push('Active tensions:');
    for (const t of fp.tensionSummary) {
      lines.push(`  - ${t}`);
    }
  }

  lines.push(`Overall coverage: ${(fp.overallCoverage * 100).toFixed(0)}%`);

  return lines.join('\n');
}

export function formatFingerprintCompact(fp: TruthFingerprint): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of fp.entries) {
    if (entry.truthClass === TRUTH_CLASSES.REASONING_EXPRESSION) continue;
    result[entry.truthClass] = entry.visibility;
  }
  return result;
}
