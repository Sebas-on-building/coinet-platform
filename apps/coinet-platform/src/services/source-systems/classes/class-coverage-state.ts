/**
 * Class Coverage State — Strategy 2 (Negative-Space Intelligence).
 *
 * Tracks not just what is present, but what is missing.
 * Missing truth domains are not neutral — they change what Coinet can
 * honestly claim.
 */

import type { TruthClass, SourceClass } from '../registry';
import { SOURCE_CLASS_TO_TRUTH, getAllSourceClasses } from '../registry';
import { getClassHealth } from '../health-monitor';
import type { ClassVisibility, ClassCoverageEntry } from './types';

function visibilityFromHealth(healthScore: number, configuredCount: number, availableCount: number): ClassVisibility {
  if (configuredCount === 0) return 'blind';
  if (availableCount === 0) return 'blind';
  if (healthScore >= 0.8) return 'healthy';
  if (healthScore >= 0.5) return 'partial';
  if (healthScore >= 0.2) return 'degraded';
  if (healthScore > 0) return 'stale_dominant';
  return 'blind';
}

export function getClassCoverage(): ClassCoverageEntry[] {
  const entries: ClassCoverageEntry[] = [];

  for (const sc of getAllSourceClasses()) {
    const truthClass = SOURCE_CLASS_TO_TRUTH[sc];
    if (!truthClass) continue;

    const health = getClassHealth(sc);

    entries.push({
      truthClass,
      visibility: visibilityFromHealth(health.bestHealthScore, health.configuredCount, health.availableCount),
      providerCount: health.configuredCount,
      configuredCount: health.availableCount,
      healthScore: health.bestHealthScore,
      staleness: health.staleCount,
    });
  }

  return entries;
}

export function getBlindClasses(): TruthClass[] {
  return getClassCoverage()
    .filter(e => e.visibility === 'blind')
    .map(e => e.truthClass);
}

export function getDegradedClasses(): TruthClass[] {
  return getClassCoverage()
    .filter(e => e.visibility === 'degraded' || e.visibility === 'stale_dominant')
    .map(e => e.truthClass);
}

export function getHealthyClasses(): TruthClass[] {
  return getClassCoverage()
    .filter(e => e.visibility === 'healthy')
    .map(e => e.truthClass);
}

export function getClassVisibility(truthClass: TruthClass): ClassVisibility {
  const entry = getClassCoverage().find(e => e.truthClass === truthClass);
  return entry?.visibility ?? 'blind';
}

export function getCoverageMap(): Record<string, ClassVisibility> {
  const result: Record<string, ClassVisibility> = {};
  for (const entry of getClassCoverage()) {
    result[entry.truthClass] = entry.visibility;
  }
  return result;
}

export function getCoverageSummary(): {
  total: number;
  healthy: number;
  partial: number;
  degraded: number;
  blind: number;
  overallScore: number;
} {
  const coverage = getClassCoverage();
  const total = coverage.length;
  const healthy = coverage.filter(e => e.visibility === 'healthy').length;
  const partial = coverage.filter(e => e.visibility === 'partial').length;
  const degraded = coverage.filter(e => e.visibility === 'degraded' || e.visibility === 'stale_dominant').length;
  const blind = coverage.filter(e => e.visibility === 'blind').length;

  const weights: Record<ClassVisibility, number> = {
    healthy: 1.0,
    partial: 0.6,
    degraded: 0.3,
    stale_dominant: 0.1,
    blind: 0.0,
  };

  const overallScore = total > 0
    ? coverage.reduce((sum, e) => sum + (weights[e.visibility] ?? 0), 0) / total
    : 0;

  return { total, healthy, partial, degraded, blind, overallScore };
}
