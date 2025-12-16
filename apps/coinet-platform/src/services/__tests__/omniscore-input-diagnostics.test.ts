/**
 * OmniScore Input Diagnostics
 * 
 * These tests help diagnose whether issues stem from INPUT VALUES
 * rather than the formula itself.
 * 
 * Use these tests to:
 * 1. Verify QS, OS, Risk segment calculations are reasonable
 * 2. Check for data quality issues (coverage, staleness)
 * 3. Identify biases in normalization/scaling
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOmniScoreProduction,
  toOmniScoreSnapshot,
  type FeatureInput,
  type CalculateOmniScoreParams,
} from '../omniscore';

describe('OmniScore Input Diagnostics', () => {
  
  const makeFeature = (key: string, segment: any, value: number): FeatureInput => ({
    key,
    segment,
    raw: value,
    timestamp: new Date().toISOString(),
    sources: ['test'],
  });

  const makeFeatureWithNull = (key: string, segment: any): FeatureInput => ({
    key,
    segment,
    raw: null as any, // Explicitly null to simulate missing data
    timestamp: new Date().toISOString(),
    sources: ['estimate'],
  });

  describe('QS Segment Aggregation', () => {
    it('should aggregate QS segments with reasonable weights', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'test-qs',
        sector: 'L1',
        qsInputs: [
          // All segments at 80
          makeFeature('team_score', 'TEAM', 80),
          makeFeature('tech_score', 'TECH', 80),
          makeFeature('sec_score', 'SEC', 80),
          makeFeature('gov_score', 'GOV', 80),
          makeFeature('eco_score', 'ECO', 80),
        ],
        osInputs: [],
        eventRiskSeverity: 0,
      };

      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);

      // QS should be close to 80 if all segments are 80
      expect(snapshot.qs).toBeGreaterThan(75);
      expect(snapshot.qs).toBeLessThan(85);
      
      console.log('QS Aggregation Test:', {
        inputSegments: 'All 80',
        outputQS: snapshot.qs,
        breakdown: result.qualityScore.breakdown,
      });
    });

    it('should detect when one QS segment is disproportionately low', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'test-qs-low-sec',
        sector: 'DeFi',
        qsInputs: [
          makeFeature('team_score', 'TEAM', 85),
          makeFeature('tech_score', 'TECH', 90),
          makeFeature('sec_score', 'SEC', 20),  // Very low security
          makeFeature('gov_score', 'GOV', 75),
          makeFeature('eco_score', 'ECO', 80),
        ],
        osInputs: [],
        eventRiskSeverity: 0,
      };

      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);

      // QS should be significantly impacted by low SEC (weight ~0.25 for DeFi)
      // Expected rough QS: 0.20*85 + 0.25*90 + 0.35*20 + 0.15*75 + 0.05*80 ≈ 57
      expect(snapshot.qs).toBeLessThan(70);
      
      console.log('Low SEC Impact:', {
        secInput: 20,
        outputQS: snapshot.qs,
        secBreakdown: result.qualityScore.breakdown.security,
      });
    });
  });

  describe('OS Segment Aggregation', () => {
    it('should aggregate OS segments with reasonable weights', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'test-os',
        sector: 'L1',
        qsInputs: [
          makeFeature('team_score', 'TEAM', 70),
          makeFeature('tech_score', 'TECH', 70),
          makeFeature('sec_score', 'SEC', 70),
          makeFeature('gov_score', 'GOV', 70),
          makeFeature('eco_score', 'ECO', 70),
        ],
        osInputs: [
          // All OS segments at 60
          makeFeature('market_score', 'MARKET', 60),
          makeFeature('val_score', 'VAL', 60),
          makeFeature('adopt_score', 'ADOPT', 60),
          makeFeature('comm_score', 'COMM', 60),
          makeFeature('token_score', 'TOKEN', 60),
        ],
        eventRiskSeverity: 0,
      };

      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);

      // OS should be close to 60 if all segments are 60
      if (snapshot.os !== null) {
        expect(snapshot.os).toBeGreaterThan(55);
        expect(snapshot.os).toBeLessThan(65);
      }
      
      console.log('OS Aggregation Test:', {
        inputSegments: 'All 60',
        outputOS: snapshot.os,
        osStatus: result.opportunityScore.status,
      });
    });

    it('should detect OS ceiling application for mega-caps', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'test-megacap',
        sector: 'L1',
        marketCapUsd: 1_000_000_000_000, // $1T mega-cap
        qsInputs: [
          makeFeature('team_score', 'TEAM', 80),
          makeFeature('tech_score', 'TECH', 80),
          makeFeature('sec_score', 'SEC', 80),
          makeFeature('gov_score', 'GOV', 80),
          makeFeature('eco_score', 'ECO', 80),
        ],
        osInputs: [
          // Very high OS segments
          makeFeature('market_score', 'MARKET', 95),
          makeFeature('val_score', 'VAL', 95),
          makeFeature('adopt_score', 'ADOPT', 95),
          makeFeature('comm_score', 'COMM', 95),
          makeFeature('token_score', 'TOKEN', 95),
        ],
        eventRiskSeverity: 0,
      };

      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);

      // OS should be capped at 92 for mega-caps
      if (snapshot.os !== null) {
        expect(snapshot.os).toBeLessThanOrEqual(92);
      }
      
      console.log('Mega-cap OS Ceiling:', {
        inputOSAvg: 95,
        outputOS: snapshot.os,
        capBucket: snapshot.capBucket,
        ceilingApplied: snapshot.audit.osCeilingApplied,
      });
    });
  });

  describe('Risk Calculation', () => {
    it('should calculate risk from LEGAL and MACRO segments', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'test-risk',
        sector: 'DeFi',
        qsInputs: [
          makeFeature('team_score', 'TEAM', 70),
          makeFeature('tech_score', 'TECH', 70),
          makeFeature('sec_score', 'SEC', 70),
          makeFeature('gov_score', 'GOV', 70),
          makeFeature('eco_score', 'ECO', 70),
          makeFeature('legal_risk', 'LEGAL', 60),  // Moderate legal risk
          makeFeature('macro_risk', 'MACRO', 40),  // Lower macro risk
        ],
        osInputs: [
          makeFeature('market_score', 'MARKET', 60),
        ],
        eventRiskSeverity: 0.1,  // Small ERS
      };

      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);

      // Risk should reflect LEGAL + MACRO + ERS
      console.log('Risk Calculation:', {
        legalInput: 60,
        macroInput: 40,
        ers: 0.1,
        outputRisk: snapshot.risk,
        riskBreakdown: result.risk,
      });

      // Basic sanity check
      expect(snapshot.risk).toBeGreaterThanOrEqual(0);
      expect(snapshot.risk).toBeLessThanOrEqual(100);
    });
  });

  describe('Coverage and Confidence', () => {
    it('should flag low confidence when coverage is insufficient', () => {
      // Coverage = inputs_with_data / total_inputs
      // To get low coverage, provide many inputs but only few with data
      const params: CalculateOmniScoreParams = {
        projectId: 'test-low-coverage',
        sector: 'Unknown',
        qsInputs: [
          // Only 2 out of 5 have data - coverage = 2/5 = 0.4
          makeFeature('team_score', 'TEAM', 60),
          makeFeature('tech_score', 'TECH', 70),
          makeFeatureWithNull('sec_score', 'SEC'),
          makeFeatureWithNull('gov_score', 'GOV'),
          makeFeatureWithNull('eco_score', 'ECO'),
        ],
        osInputs: [
          // Only 1 out of 5 has data - coverage = 1/5 = 0.2
          makeFeature('market_score', 'MARKET', 50),
          makeFeatureWithNull('token_score', 'TOKEN'),
          makeFeatureWithNull('val_score', 'VAL'),
          makeFeatureWithNull('adopt_score', 'ADOPT'),
          makeFeatureWithNull('comm_score', 'COMM'),
        ],
        eventRiskSeverity: 0,
      };

      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);

      // Low coverage should result in low confidence
      expect(snapshot.coverageQS).toBeLessThan(0.5);
      expect(snapshot.coverageOS).toBeLessThan(0.5);
      expect(snapshot.confidence).toMatch(/low|insufficient/);
      
      console.log('Low Coverage Test:', {
        coverageQS: snapshot.coverageQS,
        coverageOS: snapshot.coverageOS,
        confidence: snapshot.confidence,
      });
    });

    it('should have high confidence with full coverage', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'test-high-coverage',
        sector: 'L1',
        qsInputs: [
          makeFeature('team_score', 'TEAM', 75),
          makeFeature('tech_score', 'TECH', 80),
          makeFeature('sec_score', 'SEC', 70),
          makeFeature('gov_score', 'GOV', 65),
          makeFeature('eco_score', 'ECO', 75),
        ],
        osInputs: [
          makeFeature('market_score', 'MARKET', 70),
          makeFeature('val_score', 'VAL', 65),
          makeFeature('adopt_score', 'ADOPT', 75),
          makeFeature('comm_score', 'COMM', 70),
          makeFeature('token_score', 'TOKEN', 68),
        ],
        eventRiskSeverity: 0,
      };

      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);

      // Full coverage should result in high confidence
      expect(snapshot.coverageQS).toBeGreaterThan(0.9);
      expect(snapshot.coverageOS).toBeGreaterThan(0.9);
      expect(snapshot.confidence).toMatch(/high|medium/);
      
      console.log('High Coverage Test:', {
        coverageQS: snapshot.coverageQS,
        coverageOS: snapshot.coverageOS,
        confidence: snapshot.confidence,
      });
    });
  });

  describe('Real-World Scenario Diagnostics', () => {
    it('should provide diagnostic output for ETH-like scenario', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'eth-diagnostic',
        sector: 'L1',
        marketCapUsd: 400_000_000_000,
        qsInputs: [
          makeFeature('team_vitalik', 'TEAM', 90),
          makeFeature('tech_activity', 'TECH', 88),
          makeFeature('sec_audits', 'SEC', 75),
          makeFeature('gov_eips', 'GOV', 70),
          makeFeature('eco_defi', 'ECO', 95),
        ],
        osInputs: [
          makeFeature('market_volume', 'MARKET', 60),
          makeFeature('val_drawdown', 'VAL', 35),
          makeFeature('adopt_active', 'ADOPT', 70),
          makeFeature('comm_social', 'COMM', 50),
          makeFeature('token_dist', 'TOKEN', 55),
        ],
        eventRiskSeverity: 0.05,
      };

      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);

      console.log('\n=== ETH-LIKE SCENARIO DIAGNOSTIC ===');
      console.log('Input QS Segments:', {
        TEAM: 90,
        TECH: 88,
        SEC: 75,
        GOV: 70,
        ECO: 95,
      });
      console.log('Aggregated QS:', snapshot.qs);
      console.log('Input OS Segments:', {
        MARKET: 60,
        VAL: 35,
        ADOPT: 70,
        COMM: 50,
        TOKEN: 55,
      });
      console.log('Aggregated OS:', snapshot.os);
      console.log('Risk:', snapshot.risk);
      console.log('Raw POS (before floor/smoothing):', snapshot.posRaw);
      console.log('Final POS:', snapshot.posAdjusted);
      console.log('Tier:', snapshot.tier);
      console.log('Floor Applied:', snapshot.audit.fundamentalsFloorApplied);
      console.log('Formula Check: 0.6*' + snapshot.qs + ' + 0.25*' + (snapshot.os || 50) + ' + 0.15*(100-' + snapshot.risk + ') =', 
        0.6 * snapshot.qs + 0.25 * (snapshot.os || 50) + 0.15 * (100 - snapshot.risk));
      console.log('===================================\n');

      // Sanity checks
      expect(snapshot.qs).toBeGreaterThan(75);
      expect(snapshot.qs).toBeLessThan(95);
      if (snapshot.os !== null) {
        expect(snapshot.os).toBeGreaterThan(40);
        expect(snapshot.os).toBeLessThan(70);
      }
    });
  });
});
