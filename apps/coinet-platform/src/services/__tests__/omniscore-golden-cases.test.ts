/**
 * OmniScore v2.4.0 Golden Test Cases
 * 
 * These tests define the EXPECTED behavior for major crypto assets.
 * If these fail, the engine is broken or miscalibrated.
 * 
 * CRITICAL: These tests exist to catch bugs like:
 * - ETH showing 100/100 (impossible)
 * - SUI crashing 70→37 overnight without event
 * - Wrong tier labels (43 called "Neutral" instead of "Weak")
 * - ETH undervalued (v2.3: 43/Weak → v2.4: 75/Strong with high QS)
 * 
 * v2.4 CHANGES:
 * - New baseline+tilt formula: POS = QS + K_OS*(OS-50) - K_RISK*(Risk-50) + floor
 * - Fundamentals floor prevents high-QS projects from dropping too low
 * - Expected ranges adjusted for more intuitive tier alignment
 */

import {
  calculateOmniScoreProduction,
  toOmniScoreSnapshot,
  getQuadrantZone,
  type FeatureInput,
  type CalculateOmniScoreParams,
  type OmniScoreSnapshot,
} from '../omniscore-v2.3';

describe('OmniScore Golden Cases', () => {
  
  // Helper to create features
  const makeFeature = (key: string, segment: any, value: number): FeatureInput => ({
    key,
    segment,
    raw: value,
    timestamp: new Date().toISOString(),
    sources: ['test'],
  });
  
  describe('Bitcoin Golden Case', () => {
    it('should score Bitcoin in Strong-Elite tier (70-90 range) in Target zone [v2.4]', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'bitcoin',
        sector: 'L1',
        marketCapUsd: 1_300_000_000_000, // $1.3T (mega cap)
        
        qsInputs: [
          makeFeature('team_established', 'TEAM', 85),
          makeFeature('team_transparency', 'TEAM', 90),
          makeFeature('tech_github_activity', 'TECH', 80),
          makeFeature('tech_maturity', 'TECH', 95),
          makeFeature('sec_battle_tested', 'SEC', 95),
          makeFeature('sec_no_incidents', 'SEC', 98),
          makeFeature('gov_decentralization', 'GOV', 85),
          makeFeature('eco_lightning', 'ECO', 85),
          makeFeature('eco_institutional', 'ECO', 95),
        ],
        
        osInputs: [
          makeFeature('market_volume', 'MARKET', 90),
          makeFeature('market_liquidity', 'MARKET', 95),
          makeFeature('token_distribution', 'TOKEN', 85),
          makeFeature('val_mcap_rank', 'VAL', 100),
          makeFeature('adopt_addresses', 'ADOPT', 80),
          makeFeature('comm_followers', 'COMM', 85),
        ],
        
        eventRiskSeverity: 0,
        botRisk: 0.05,
        anomalyScore: 0.05,
      };
      
      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);
      
      // v2.4: Bitcoin should be Strong-Elite tier (baseline+tilt formula)
      expect(snapshot.tier).toMatch(/Strong|Elite/);
      expect(snapshot.posAdjusted).toBeGreaterThanOrEqual(70);  // v2.4: Higher baseline
      expect(snapshot.posAdjusted).toBeLessThanOrEqual(90);     // v2.4: Can reach Elite
      
      // Should be in Target zone (high QS + high OS)
      expect(snapshot.qs).toBeGreaterThanOrEqual(70);
      expect(snapshot.os).toBeGreaterThanOrEqual(60);
      const zone = getQuadrantZone(snapshot.qs, snapshot.os);
      expect(zone).toBe('TARGET');
      
      // Must NOT be 100/100
      expect(snapshot.posAdjusted).toBeLessThan(97);
      
      // v2.3.4: OS should be capped for mega-cap
      if (snapshot.os) {
        expect(snapshot.os).toBeLessThanOrEqual(92);
      }
      
      // ECO should be high (not 25!)
      expect(result.qualityScore.breakdown.ecosystem).toBeGreaterThan(0.7);
      
      // v2.4: Check formula version
      expect(snapshot.audit.formulaVersion).toBe('v2.4');
    });
  });
  
  describe('Ethereum Golden Case', () => {
    it('should score Ethereum in Neutral-Strong tier (55-80 range) in Builder/Target zone [v2.4]', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'ethereum',
        sector: 'L1',
        marketCapUsd: 400_000_000_000, // $400B (mega cap)
        
        qsInputs: [
          makeFeature('team_vitalik_ef', 'TEAM', 90),
          makeFeature('team_transparency', 'TEAM', 85),
          makeFeature('tech_dev_activity', 'TECH', 90),
          makeFeature('tech_innovation', 'TECH', 85),
          makeFeature('sec_audits', 'SEC', 75),
          makeFeature('sec_l2_bridges', 'SEC', 65), // Some L2 bridge issues
          makeFeature('gov_eip_process', 'GOV', 70),
          makeFeature('eco_defi_dominance', 'ECO', 95),
          makeFeature('eco_l2_ecosystem', 'ECO', 95),
        ],
        
        osInputs: [
          makeFeature('market_volume', 'MARKET', 70),
          makeFeature('market_liquidity', 'MARKET', 80),
          makeFeature('token_distribution', 'TOKEN', 60),
          makeFeature('val_drawdown', 'VAL', 40), // Significant drawdown from ATH
          makeFeature('adopt_addresses', 'ADOPT', 65),
          makeFeature('comm_social', 'COMM', 60),
        ],
        
        eventRiskSeverity: 0.05,
        botRisk: 0.1,
        anomalyScore: 0.08,
      };
      
      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);
      
      // v2.4: Ethereum with high QS should be Neutral-Strong, NOT Weak
      // v2.3 bug: could score 43 (Weak) - FIXED in v2.4
      expect(snapshot.tier).toMatch(/Neutral|Strong/);
      expect(snapshot.posAdjusted).toBeGreaterThanOrEqual(55);  // v2.4: Higher floor
      expect(snapshot.posAdjusted).toBeLessThanOrEqual(80);     // v2.4: Can reach Strong
      
      // High QS expected
      expect(snapshot.qs).toBeGreaterThanOrEqual(70);
      expect(snapshot.qsTier).toMatch(/Strong|Elite/);
      
      // OS variable depending on market conditions
      if (snapshot.os !== null) {
        expect(snapshot.os).toBeGreaterThanOrEqual(30);
        expect(snapshot.os).toBeLessThanOrEqual(92); // Mega-cap ceiling
      }
      
      // Must NOT be 100/100
      expect(snapshot.posAdjusted).not.toBe(100);
      expect(snapshot.posAdjusted).toBeLessThan(97);
      
      // ECO should be very high (largest DeFi ecosystem)
      expect(result.qualityScore.breakdown.ecosystem).toBeGreaterThan(0.85);
      
      // If QS high but OS moderate → Builder zone
      const zone = getQuadrantZone(snapshot.qs, snapshot.os);
      expect(['TARGET', 'BUILDER']).toContain(zone);
      
      // v2.4: Check formula version and floor application
      expect(snapshot.audit.formulaVersion).toBe('v2.4');
      if (snapshot.audit.fundamentalsFloorApplied) {
        expect(snapshot.audit.fundamentalsFloor).toBeGreaterThanOrEqual(50);
      }
    });
  });
  
  describe('Solana Golden Case', () => {
    it('should score Solana in Neutral tier (45-70 range) [v2.4]', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'solana',
        sector: 'L1',
        marketCapUsd: 80_000_000_000, // $80B (large cap)
        
        qsInputs: [
          makeFeature('team_credible', 'TEAM', 75),
          makeFeature('tech_performance', 'TECH', 85),
          makeFeature('tech_innovation', 'TECH', 80),
          makeFeature('sec_outages', 'SEC', 55), // Network outages hurt security score
          makeFeature('sec_audits', 'SEC', 70),
          makeFeature('gov_centralization', 'GOV', 50), // More centralized than ETH
          makeFeature('eco_defi_growing', 'ECO', 75),
          makeFeature('eco_nft_strong', 'ECO', 80),
        ],
        
        osInputs: [
          makeFeature('market_volume', 'MARKET', 75),
          makeFeature('token_distribution', 'TOKEN', 55),
          makeFeature('val_drawdown', 'VAL', 35),
          makeFeature('adopt_addresses', 'ADOPT', 70),
          makeFeature('comm_social', 'COMM', 75),
        ],
        
        eventRiskSeverity: 0.15, // Some network stability concerns
        botRisk: 0.15,
        anomalyScore: 0.12,
      };
      
      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);
      
      // v2.4: Solana typically in Neutral range (moderate QS gets fair treatment)
      expect(snapshot.tier).toMatch(/Weak|Neutral|Strong/);
      expect(snapshot.posAdjusted).toBeGreaterThanOrEqual(45);  // v2.4: Better baseline
      expect(snapshot.posAdjusted).toBeLessThanOrEqual(70);
      
      // QS should be decent (tech is good)
      expect(snapshot.qs).toBeGreaterThanOrEqual(60);
      
      // Must NOT be 100/100
      expect(snapshot.posAdjusted).not.toBe(100);
      expect(snapshot.posAdjusted).toBeLessThan(97);
      
      // Risk should be elevated due to outages
      expect(result.risk.eventRiskSeverity).toBeGreaterThan(0.1);
      
      // v2.4: Check formula version
      expect(snapshot.audit.formulaVersion).toBe('v2.4');
    });
  });
  
  describe('Temporal Smoothing Tests', () => {
    it('should prevent SUI from crashing 70→37 overnight without high ERS', () => {
      const baseParams: CalculateOmniScoreParams = {
        projectId: 'sui',
        sector: 'L1',
        marketCapUsd: 10_000_000_000,
        
        qsInputs: [
          makeFeature('team', 'TEAM', 75),
          makeFeature('tech', 'TECH', 80),
          makeFeature('sec', 'SEC', 70),
          makeFeature('gov', 'GOV', 65),
          makeFeature('eco', 'ECO', 70),
        ],
        
        osInputs: [
          makeFeature('market', 'MARKET', 75),
          makeFeature('token', 'TOKEN', 70),
          makeFeature('val', 'VAL', 65),
          makeFeature('adopt', 'ADOPT', 70),
          makeFeature('comm', 'COMM', 75),
        ],
        
        eventRiskSeverity: 0.05,
        botRisk: 0.1,
        anomalyScore: 0.08,
      };
      
      // Day 1: Calculate initial score
      const day1 = calculateOmniScoreProduction(baseParams);
      const snapshot1 = toOmniScoreSnapshot(day1);
      
      // Should be in Strong-Neutral range
      expect(snapshot1.posAdjusted).toBeGreaterThanOrEqual(60);
      expect(snapshot1.posAdjusted).toBeLessThanOrEqual(75);
      
      // Day 2: Simulate temporary data glitch (OS drops dramatically)
      const day2Params: CalculateOmniScoreParams = {
        ...baseParams,
        osInputs: [
          makeFeature('market', 'MARKET', 35), // Temporary data issue
          makeFeature('token', 'TOKEN', 30),
          makeFeature('val', 'VAL', 25),
          makeFeature('adopt', 'ADOPT', 30),
          makeFeature('comm', 'COMM', 35),
        ],
        eventRiskSeverity: 0.05, // No actual event
        previousPos: snapshot1.posAdjusted,
        previousTimestamp: day1.timestamp,
      };
      
      const day2 = calculateOmniScoreProduction(day2Params);
      const snapshot2 = toOmniScoreSnapshot(day2);
      
      // v2.3.4: Smoothing should prevent dramatic drop
      // With maxDeltaNoEvent = 12, change should be limited
      const actualDelta = snapshot2.posAdjusted - snapshot1.posAdjusted;
      expect(Math.abs(actualDelta)).toBeLessThanOrEqual(13); // 12 + margin
      
      // Should NOT crash to 37
      expect(snapshot2.posAdjusted).toBeGreaterThan(50);
      
      // Smoothing should be flagged in audit
      expect(snapshot2.audit.smoothingApplied).toBe(true);
    });
    
    it('should allow larger swings when ERS is high (real event)', () => {
      const baseParams: CalculateOmniScoreParams = {
        projectId: 'test-event',
        sector: 'DeFi',
        marketCapUsd: 500_000_000,
        
        qsInputs: [
          makeFeature('team', 'TEAM', 70),
          makeFeature('tech', 'TECH', 75),
          makeFeature('sec', 'SEC', 70),
          makeFeature('gov', 'GOV', 65),
          makeFeature('eco', 'ECO', 70),
        ],
        
        osInputs: [
          makeFeature('market', 'MARKET', 70),
          makeFeature('token', 'TOKEN', 65),
          makeFeature('val', 'VAL', 60),
          makeFeature('adopt', 'ADOPT', 65),
          makeFeature('comm', 'COMM', 70),
        ],
        
        eventRiskSeverity: 0.1,
        botRisk: 0.1,
        anomalyScore: 0.1,
      };
      
      const day1 = calculateOmniScoreProduction(baseParams);
      const snapshot1 = toOmniScoreSnapshot(day1);
      
      // Day 2: Major exploit (ERS = 0.8)
      const day2Params: CalculateOmniScoreParams = {
        ...baseParams,
        eventRiskSeverity: 0.8, // MAJOR EVENT
        qsInputs: [
          makeFeature('team', 'TEAM', 70),
          makeFeature('tech', 'TECH', 75),
          makeFeature('sec', 'SEC', 30), // Security compromised
          makeFeature('gov', 'GOV', 65),
          makeFeature('eco', 'ECO', 70),
        ],
        osInputs: [
          makeFeature('market', 'MARKET', 25), // Price crash
          makeFeature('token', 'TOKEN', 30),
          makeFeature('val', 'VAL', 20),
          makeFeature('adopt', 'ADOPT', 35),
          makeFeature('comm', 'COMM', 40),
        ],
        previousPos: snapshot1.posAdjusted,
        previousTimestamp: day1.timestamp,
      };
      
      const day2 = calculateOmniScoreProduction(day2Params);
      const snapshot2 = toOmniScoreSnapshot(day2);
      
      // With high ERS (0.8), larger deltas allowed (maxDeltaWithEvent = 30)
      const actualDelta = Math.abs(snapshot2.posAdjusted - snapshot1.posAdjusted);
      expect(actualDelta).toBeGreaterThan(12); // Exceeds normal limit
      expect(actualDelta).toBeLessThanOrEqual(35); // But still bounded
      
      // Should show event mode in debug
      expect(day2.audit.smoothingApplied?.eventMode).toBe(true);
    });
  });
  
  describe('Plausibility Cap Tests', () => {
    it('should cap POS at 97 even if raw calculation exceeds 100', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'impossible-perfect',
        sector: 'L1',
        marketCapUsd: 1_000_000_000,
        
        // Unrealistically perfect inputs (would give POS > 100 without cap)
        qsInputs: [
          makeFeature('team', 'TEAM', 100),
          makeFeature('tech', 'TECH', 100),
          makeFeature('sec', 'SEC', 100),
          makeFeature('gov', 'GOV', 100),
          makeFeature('eco', 'ECO', 100),
        ],
        
        osInputs: [
          makeFeature('market', 'MARKET', 100),
          makeFeature('token', 'TOKEN', 100),
          makeFeature('val', 'VAL', 100),
          makeFeature('adopt', 'ADOPT', 100),
          makeFeature('comm', 'COMM', 100),
        ],
        
        eventRiskSeverity: 0,
        botRisk: 0,
        anomalyScore: 0,
      };
      
      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);
      
      // Must be capped at 97
      expect(snapshot.posAdjusted).toBeLessThanOrEqual(97);
      
      // Should flag in audit
      expect(snapshot.audit.posPlausibilityCapped).toBe(true);
      expect(snapshot.audit.posBeforeCap).toBeGreaterThan(97);
      
      // Should have INV-POS-PLAU error
      expect(result.audit.violations.some(v => v.code === 'INV-POS-PLAU')).toBe(true);
    });
    
    it('should NEVER return POS=100 for any live project', () => {
      // Test multiple scenarios
      const scenarios = [
        { id: 'btc', sector: 'L1', cap: 1_300_000_000_000 },
        { id: 'eth', sector: 'L1', cap: 400_000_000_000 },
        { id: 'sol', sector: 'L1', cap: 80_000_000_000 },
        { id: 'perfect', sector: 'DeFi', cap: 1_000_000_000 },
      ];
      
      for (const scenario of scenarios) {
        const params: CalculateOmniScoreParams = {
          projectId: scenario.id,
          sector: scenario.sector as any,
          marketCapUsd: scenario.cap,
          
          qsInputs: [
            makeFeature('team', 'TEAM', 95),
            makeFeature('tech', 'TECH', 95),
            makeFeature('sec', 'SEC', 95),
            makeFeature('gov', 'GOV', 95),
            makeFeature('eco', 'ECO', 95),
          ],
          
          osInputs: [
            makeFeature('market', 'MARKET', 95),
            makeFeature('token', 'TOKEN', 95),
            makeFeature('val', 'VAL', 95),
            makeFeature('adopt', 'ADOPT', 95),
            makeFeature('comm', 'COMM', 95),
          ],
          
          eventRiskSeverity: 0,
          botRisk: 0,
          anomalyScore: 0,
        };
        
        const result = calculateOmniScoreProduction(params);
        const snapshot = toOmniScoreSnapshot(result);
        
        // MUST be < 100
        expect(snapshot.posAdjusted).toBeLessThan(100);
        expect(snapshot.posAdjusted).toBeLessThanOrEqual(97);
      }
    });
  });
  
  describe('Tier Label Consistency', () => {
    it('should use fixed threshold tiers, not conditioned tiers', () => {
      const testCases = [
        { pos: 43, expectedTier: 'Weak', notExpected: 'Neutral' },
        { pos: 49, expectedTier: 'Weak', notExpected: 'Neutral' },
        { pos: 50, expectedTier: 'Neutral', notExpected: 'Weak' },
        { pos: 69, expectedTier: 'Neutral', notExpected: 'Strong' },
        { pos: 70, expectedTier: 'Strong', notExpected: 'Neutral' },
        { pos: 84, expectedTier: 'Strong', notExpected: 'Elite' },
        { pos: 85, expectedTier: 'Elite', notExpected: 'Strong' },
      ];
      
      for (const test of testCases) {
        // Create params that will yield approximately this POS
        const qsTarget = test.pos + 10;
        const osTarget = test.pos;
        
        const params: CalculateOmniScoreParams = {
          projectId: `test-${test.pos}`,
          sector: 'DeFi',
          marketCapUsd: 100_000_000,
          
          qsInputs: [
            makeFeature('team', 'TEAM', qsTarget),
            makeFeature('tech', 'TECH', qsTarget),
            makeFeature('sec', 'SEC', qsTarget),
            makeFeature('gov', 'GOV', qsTarget),
            makeFeature('eco', 'ECO', qsTarget),
          ],
          
          osInputs: [
            makeFeature('market', 'MARKET', osTarget),
            makeFeature('token', 'TOKEN', osTarget),
            makeFeature('val', 'VAL', osTarget),
            makeFeature('adopt', 'ADOPT', osTarget),
            makeFeature('comm', 'COMM', osTarget),
          ],
          
          eventRiskSeverity: 0,
          botRisk: 0.1,
          anomalyScore: 0.05,
        };
        
        const result = calculateOmniScoreProduction(params);
        const snapshot = toOmniScoreSnapshot(result);
        
        // Allow some variance due to weights/risk
        const posInRange = Math.abs(snapshot.posAdjusted - test.pos) < 15;
        
        if (posInRange) {
          // If we're in the expected range, tier should match
          if (snapshot.posAdjusted >= 30 && snapshot.posAdjusted < 50) {
            expect(snapshot.tier).toBe('Weak');
          } else if (snapshot.posAdjusted >= 50 && snapshot.posAdjusted < 70) {
            expect(snapshot.tier).toBe('Neutral');
          } else if (snapshot.posAdjusted >= 70 && snapshot.posAdjusted < 85) {
            expect(snapshot.tier).toBe('Strong');
          } else if (snapshot.posAdjusted >= 85) {
            expect(snapshot.tier).toBe('Elite');
          }
        }
      }
    });
  });
  
  describe('Quadrant Zone Classification', () => {
    it('should correctly classify Target zone (high QS, high OS)', () => {
      const zone = getQuadrantZone(75, 75);
      expect(zone).toBe('TARGET');
    });
    
    it('should correctly classify Builder zone (high QS, low OS)', () => {
      const zone = getQuadrantZone(75, 35);
      expect(zone).toBe('BUILDER');
    });
    
    it('should correctly classify Hype zone (low QS, high OS)', () => {
      const zone = getQuadrantZone(45, 75);
      expect(zone).toBe('HYPE');
    });
    
    it('should correctly classify Avoid zone (low QS, low OS)', () => {
      const zone = getQuadrantZone(45, 35);
      expect(zone).toBe('AVOID');
    });
    
    it('should handle gated OS as Builder zone if QS high', () => {
      const zone = getQuadrantZone(75, null);
      expect(zone).toBe('BUILDER');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle all-null inputs gracefully', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'unknown',
        sector: 'Unknown',
        qsInputs: [],
        osInputs: [],
        eventRiskSeverity: 0,
      };
      
      const result = calculateOmniScoreProduction(params);
      const snapshot = toOmniScoreSnapshot(result);
      
      // Should not crash
      expect(snapshot).toBeDefined();
      expect(snapshot.posAdjusted).toBeGreaterThanOrEqual(0);
      expect(snapshot.posAdjusted).toBeLessThanOrEqual(100);
      
      // Should have low coverage
      expect(snapshot.coverageQS).toBeLessThan(0.6);
      expect(snapshot.confidence).toMatch(/low|insufficient/);
    });
  });
});
