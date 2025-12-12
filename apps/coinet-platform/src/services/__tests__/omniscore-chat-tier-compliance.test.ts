/**
 * OmniScore Chat Tier Compliance Tests
 * 
 * These tests validate that the AI chat layer correctly uses tier labels
 * from the OmniScore engine without improvising, softening, or renaming.
 * 
 * CRITICAL: These tests exist because the LLM has a tendency to:
 * - Call "Weak" tier "Neutral" or "Moderate"
 * - Improvise tier labels from scores instead of using payload tier
 * - Confuse quadrant position (Builder/Target) with global tier (Weak/Strong)
 */

import { formatOmniScoreForAI } from '../omniscore-data-fetcher-v23';
import type { OmniScoreProductionResponse } from '../omniscore-v2.3';

describe('OmniScore Chat Tier Compliance', () => {
  
  // Helper to create a mock OmniScore response
  const createMockResponse = (
    pos: number, 
    posTier: string,
    qs: number,
    qsTier: string,
    os: number,
    osTier: string,
    projectId: string = 'TEST'
  ): OmniScoreProductionResponse => ({
    success: true,
    engine: 'OmniScore',
    version: '2.3.3',
    project: projectId,
    timestamp: new Date().toISOString(),
    
    qualityScore: {
      score: qs,
      tier: qsTier as any,
      confidence: 'medium' as any,
      coverage: 0.8,
      breakdown: {
        team: 0.7,
        tech: 0.75,
        security: 0.8,
        governance: 0.65,
        ecosystem: 0.7,
      },
    },
    
    opportunityScore: {
      status: 'ok' as any,
      score: os,
      tier: osTier as any,
      coverage: 0.75,
    },
    
    risk: {
      score: 20,
      eventRiskSeverity: 0.1,
      adjustmentGamma: 15,
    },
    
    pos: {
      raw: pos + 2,
      adjusted: pos,
      tier: posTier as any,
      confidenceBand: [pos - 5, pos + 5] as [number, number],
    },
    
    nrg: {
      value: 0.15,
      percentile: 0.6,
      interpretation: 'balanced' as any,
    },
    
    explainability: {
      qsDrivers: [],
      osDrivers: [],
    },
    
    upgradeRecommendations: {
      note: 'controllable-only',
      highImpact: [],
      quickWins: [],
      strategicBet: null,
    },
    
    nmi: {
      score: 15,
      tier: 'clean' as any,
      components: {
        botLikelihood: 0.1,
        anomalyBursts: 0.05,
        influencerConcentrationComposite: 0.15,
        influencerConcentrationTop3: 0.2,
        influencerConcentrationTop10: 0.18,
        influencerConcentrationGini: 0.12,
        sentimentDispersion: 0.1,
        crossSourceDivergence: 0.08,
        socialRealityMismatch: 0.05,
      },
      icrBreakdown: {
        top3: 0.2,
        top10: 0.18,
        gini: 0.12,
        composite: 0.15,
      },
      socialRealityCheck: {
        value: 0.05,
        interpretation: 'aligned' as any,
        penalty: 0,
      },
      nmiFormula: 'NMI = 100 × (...)',
      confidence: 'medium' as any,
    },
    
    stressTest: {
      scenarios: [],
      worstCase: {
        scenario: 'BTC crash',
        posImpact: -10,
        tierChange: null,
      },
      bestCase: {
        scenario: 'Bull run',
        posImpact: 10,
        tierChange: null,
      },
    },
    
    tierContext: {
      regime: 'neutral' as any,
      sector: 'DeFi' as any,
      capBucket: 'mid' as any,
      historicalMean: 60,
      historicalStd: 15,
      percentile: 0.5,
      rawTier: posTier as any,
      conditionedTier: posTier as any,
      tierMismatch: false,
    },
    
    coldStart: {
      isEarlyStage: false,
      ageInDays: 500,
      mode: 'standard' as any,
      adjustments: {
        priorStrength: 0,
        uncertaintyMultiplier: 1,
        osExposureReduction: 0,
        tierConservatism: 0,
      },
      reason: 'Standard mode',
    },
    
    identityGraph: null,
    
    threatModel: {
      threats: [],
      overallRisk: 'low' as any,
      mitigationsApplied: [],
    },
    
    audit: {
      engineVersion: '2.3.3',
      methodologyVersion: '2.3.3',
      requestId: 'test-123',
      dataAsOf: new Date().toISOString(),
      sourcesUsed: ['coingecko', 'github'],
      coverageQS: 0.8,
      coverageOS: 0.75,
      confidence: 'medium' as any,
      gatingApplied: false,
      invariantStatus: 'pass' as any,
      violations: [],
      warnings: [],
      regimeSnapshot: {
        bull: 0.2,
        bear: 0.2,
        neutral: 0.4,
        crisis: 0.1,
        recovery: 0.1,
      },
      clampApplied: {
        qs: false,
        os: false,
        pos: false,
        posAdj: false,
      },
      methodology: {
        id: 'OMNISCORE_V2.3.2_DIABOLICAL',
        hash: 'sha256:abc123',
        url: '/docs/omniscore/v2.3',
      },
      reflexivitySentinel: {
        corrQsPrice30d: 0.1,
        status: 'healthy' as any,
        threshold: 0.3,
      },
      featureSchemaVersion: '2.3.3-core40',
      sectorPackId: 'defi-core40',
      clampHistoryCount: 0,
      coldStartMode: 'standard' as any,
      tierConditioningApplied: false,
      tierMismatch: false,
      rawTierUsed: posTier as any,
      conditionedTierInternal: posTier as any,
      capBucket: 'mid' as any,
    },
  });

  describe('Tier Label Accuracy', () => {
    it('should include exact tier string for Weak tier (30-49)', () => {
      const response = createMockResponse(43, 'Weak', 74, 'Strong', 31, 'Weak', 'ETH');
      const output = formatOmniScoreForAI(response);
      
      // Must include the exact tier string
      expect(output).toContain('tier = "Weak"');
      expect(output).toContain('Tier:       Weak');
      expect(output).toContain('43/100 (Weak tier)');
      
      // Must NOT contain "Neutral" when tier is "Weak"
      expect(output).not.toMatch(/43.*Neutral/);
      expect(output).not.toMatch(/Neutral.*43/);
    });

    it('should include exact tier string for Strong tier (70-84)', () => {
      const response = createMockResponse(72, 'Strong', 75, 'Strong', 70, 'Strong', 'BTC');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('tier = "Strong"');
      expect(output).toContain('Tier:       Strong');
      expect(output).toContain('72/100');
    });

    it('should include exact tier string for Elite tier (85+)', () => {
      const response = createMockResponse(87, 'Elite', 88, 'Elite', 86, 'Elite', 'TOP');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('tier = "Elite"');
      expect(output).toContain('Tier:       Elite');
      expect(output).toContain('87/100');
    });

    it('should include exact tier string for Critical tier (<30)', () => {
      const response = createMockResponse(25, 'Critical', 28, 'Weak', 22, 'Weak', 'TRASH');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('tier = "Critical"');
      expect(output).toContain('Tier:       Critical');
      expect(output).toContain('25/100');
    });
  });

  describe('Tier Threshold Documentation', () => {
    it('should include tier thresholds in output', () => {
      const response = createMockResponse(43, 'Weak', 74, 'Strong', 31, 'Weak');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('Elite:    85-100');
      expect(output).toContain('Strong:   70-84');
      expect(output).toContain('Neutral:  50-69');
      expect(output).toContain('Weak:     30-49');
      expect(output).toContain('Critical: 0-29');
    });
  });

  describe('Quadrant vs Tier Separation', () => {
    it('should explain difference between quadrant position and global tier', () => {
      const response = createMockResponse(43, 'Weak', 74, 'Strong', 31, 'Weak', 'ETH');
      const output = formatOmniScoreForAI(response);
      
      // Should explain quadrant zones
      expect(output).toContain('BUILDER ZONE');
      expect(output).toContain('TARGET ZONE');
      
      // Should explain that these are different from tier labels
      expect(output).toMatch(/Builder.*quadrant/i);
      expect(output).toMatch(/Weak.*tier/i);
    });
  });

  describe('Compliance Rules', () => {
    it('should include mandatory compliance rules', () => {
      const response = createMockResponse(43, 'Weak', 74, 'Strong', 31, 'Weak');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('MANDATORY COMPLIANCE RULES');
      expect(output).toContain('USE EXACT TIER STRING');
      expect(output).toContain('NEVER rename tiers');
      expect(output).toContain('DO NOT improvise');
    });

    it('should include forbidden patterns section', () => {
      const response = createMockResponse(43, 'Weak', 74, 'Strong', 31, 'Weak');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('FORBIDDEN PATTERNS');
      expect(output).toMatch(/Score is 43.*Neutral.*NO!/);
    });
  });

  describe('Exact Numbers Requirement', () => {
    it('should include exact QS/OS/POS numbers in structured format', () => {
      const response = createMockResponse(43, 'Weak', 74, 'Strong', 31, 'Weak', 'ETH');
      const output = formatOmniScoreForAI(response);
      
      // Must show exact numbers, not ranges
      expect(output).toContain('Score:      43/100');
      expect(output).toContain('74/100');
      expect(output).toContain('31/100');
      
      // Should NOT have fuzzy language
      expect(output).not.toMatch(/around.*74-ish/);
      expect(output).not.toMatch(/roughly.*43/);
    });
  });

  describe('Presentation Format', () => {
    it('should include step-by-step presentation rules', () => {
      const response = createMockResponse(43, 'Weak', 74, 'Strong', 31, 'Weak', 'ETH');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('HOW TO PRESENT THIS TO THE USER');
      expect(output).toContain('STEP 1:');
      expect(output).toContain('STEP 2:');
      expect(output).toContain('STEP 3:');
    });

    it('should include correct example narrative', () => {
      const response = createMockResponse(43, 'Weak', 74, 'Strong', 31, 'Weak', 'Ethereum');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('CORRECT EXAMPLE');
      expect(output).toMatch(/Ethereum.*43.*Weak tier/);
      expect(output).toMatch(/Quality Score.*74.*Strong/);
      expect(output).toMatch(/Opportunity Score.*31.*Weak/);
      expect(output).toMatch(/Builder Zone/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle score exactly at tier boundary (50 = Neutral)', () => {
      const response = createMockResponse(50, 'Neutral', 60, 'Neutral', 55, 'Neutral');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('tier = "Neutral"');
      expect(output).toContain('50/100');
    });

    it('should handle score just below tier boundary (49 = Weak)', () => {
      const response = createMockResponse(49, 'Weak', 60, 'Neutral', 55, 'Neutral');
      const output = formatOmniScoreForAI(response);
      
      expect(output).toContain('tier = "Weak"');
      expect(output).toContain('49/100');
    });

    it('should handle Builder Zone profile (high QS, low OS, overall Weak)', () => {
      const response = createMockResponse(43, 'Weak', 74, 'Strong', 31, 'Weak', 'ETH');
      const output = formatOmniScoreForAI(response);
      
      // Should clearly differentiate quadrant from tier
      expect(output).toContain('Weak');
      expect(output).toContain('Builder');
      expect(output).toMatch(/QS.*74/);
      expect(output).toMatch(/OS.*31/);
    });
  });
});
