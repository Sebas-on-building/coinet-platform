/**
 * OmniScore Snapshot Shape Test
 * 
 * Ensures toOmniScoreSnapshot() always produces a consistent shape
 * that matches the OmniScoreSnapshot interface.
 * 
 * This prevents breaking changes to the canonical snapshot format.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOmniScoreProduction,
  toOmniScoreSnapshot,
  getQuadrantZone,
  type OmniScoreSnapshot,
  type CalculateOmniScoreParams,
  type FeatureInput,
} from '../omniscore';

describe('OmniScore Snapshot Shape', () => {
  const makeFeature = (key: string, segment: string, value: number): FeatureInput => ({
    key,
    segment: segment as any,
    raw: value,
    timestamp: new Date().toISOString(),
    sources: ['test'],
  });

  const createTestParams = (): CalculateOmniScoreParams => ({
    projectId: 'test-coin',
    sector: 'L1',
    marketCapUsd: 1_000_000_000,
    qsInputs: [
      makeFeature('team', 'TEAM', 75),
      makeFeature('tech', 'TECH', 80),
      makeFeature('sec', 'SEC', 70),
      makeFeature('gov', 'GOV', 65),
      makeFeature('eco', 'ECO', 75),
    ],
    osInputs: [
      makeFeature('market', 'MARKET', 70),
      makeFeature('token', 'TOKEN', 65),
      makeFeature('val', 'VAL', 60),
      makeFeature('adopt', 'ADOPT', 65),
      makeFeature('comm', 'COMM', 70),
    ],
    eventRiskSeverity: 0.05,
    botRisk: 0.1,
    anomalyScore: 0.08,
  });

  it('should produce valid OmniScoreSnapshot shape', () => {
    const params = createTestParams();
    const response = calculateOmniScoreProduction(params);
    const snapshot = toOmniScoreSnapshot(response);

    // Required fields
    expect(snapshot).toHaveProperty('id');
    expect(snapshot).toHaveProperty('symbol');
    expect(snapshot).toHaveProperty('name');
    expect(snapshot).toHaveProperty('sector');
    expect(snapshot).toHaveProperty('capBucket');

    // Core scores
    expect(snapshot).toHaveProperty('qs');
    expect(snapshot).toHaveProperty('qsTier');
    expect(snapshot).toHaveProperty('os');
    expect(snapshot).toHaveProperty('osTier');
    expect(snapshot).toHaveProperty('osStatus');
    expect(snapshot).toHaveProperty('risk');

    // POS progression
    expect(snapshot).toHaveProperty('posRaw');
    expect(snapshot).toHaveProperty('posSmoothed');
    expect(snapshot).toHaveProperty('posAdjusted');
    expect(snapshot).toHaveProperty('tier');

    // Narrative metrics
    expect(snapshot).toHaveProperty('nrg');
    expect(snapshot).toHaveProperty('nrgTier');
    expect(snapshot).toHaveProperty('nmi');
    expect(snapshot).toHaveProperty('nmiTier');

    // Coverage & confidence
    expect(snapshot).toHaveProperty('coverageQS');
    expect(snapshot).toHaveProperty('coverageOS');
    expect(snapshot).toHaveProperty('confidence');

    // Audit metadata
    expect(snapshot).toHaveProperty('audit');
    expect(snapshot.audit).toHaveProperty('engineVersion');
    expect(snapshot.audit).toHaveProperty('methodologyVersion');
    expect(snapshot.audit).toHaveProperty('timestamp');
    expect(snapshot.audit).toHaveProperty('formulaVersion');
    expect(snapshot.audit).toHaveProperty('invariantStatus');
    expect(snapshot.audit).toHaveProperty('smoothingApplied');
    expect(snapshot.audit).toHaveProperty('osCeilingApplied');
    expect(snapshot.audit).toHaveProperty('posPlausibilityCapped');
    expect(snapshot.audit).toHaveProperty('posBeforeCap');
    expect(snapshot.audit).toHaveProperty('fundamentalsFloor');
    expect(snapshot.audit).toHaveProperty('fundamentalsFloorApplied');
  });

  it('should have correct types for all fields', () => {
    const params = createTestParams();
    const response = calculateOmniScoreProduction(params);
    const snapshot = toOmniScoreSnapshot(response);

    // String fields
    expect(typeof snapshot.id).toBe('string');
    expect(typeof snapshot.symbol).toBe('string');
    expect(typeof snapshot.name).toBe('string');
    expect(typeof snapshot.tier).toBe('string');
    expect(['Elite', 'Strong', 'Neutral', 'Weak', 'Critical']).toContain(snapshot.tier);

    // Number fields
    expect(typeof snapshot.qs).toBe('number');
    expect(snapshot.qs).toBeGreaterThanOrEqual(0);
    expect(snapshot.qs).toBeLessThanOrEqual(100);
    
    expect(typeof snapshot.posAdjusted).toBe('number');
    expect(snapshot.posAdjusted).toBeGreaterThanOrEqual(0);
    expect(snapshot.posAdjusted).toBeLessThanOrEqual(100);

    // Nullable fields
    if (snapshot.os !== null) {
      expect(typeof snapshot.os).toBe('number');
      expect(snapshot.os).toBeGreaterThanOrEqual(0);
      expect(snapshot.os).toBeLessThanOrEqual(100);
    }

    // Audit version fields
    expect(typeof snapshot.audit.engineVersion).toBe('string');
    expect(snapshot.audit.formulaVersion).toMatch(/^v2\.(3|4|5|6)$/); // Updated for v2.6
  });

  it('should match engine version in audit', () => {
    const params = createTestParams();
    const response = calculateOmniScoreProduction(params);
    const snapshot = toOmniScoreSnapshot(response);

    // Version consistency check
    expect(response.version).toBe(snapshot.audit.engineVersion);
    expect(snapshot.audit.engineVersion).toBe('2.6.0'); // Updated for v2.6.0
  });

  it('should have valid quadrant zone when using getQuadrantZone', () => {
    const params = createTestParams();
    const response = calculateOmniScoreProduction(params);
    const snapshot = toOmniScoreSnapshot(response);

    // getQuadrantZone is imported at the top of the file
    const zone = getQuadrantZone(snapshot.qs, snapshot.os);

    expect(['TARGET', 'BUILDER', 'HYPE', 'AVOID']).toContain(zone);
  });
});
