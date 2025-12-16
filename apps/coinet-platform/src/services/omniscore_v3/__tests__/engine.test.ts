/**
 * OmniScore v3.0 Engine Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOmniScore,
  ENGINE_VERSION,
  FORMULA_VERSION,
  FIXED_WEIGHTS,
  getTierFromScore,
  type DataPoint,
  type CalculateOmniScoreParams,
} from '../index';

describe('OmniScore v3.0 Engine', () => {
  
  // Helper to create data points
  const createDataPoint = (
    key: string,
    segment: DataPoint['segment'],
    value: number
  ): DataPoint => ({
    key,
    segment,
    value,
    source: 'COINGECKO_API',
    sourceType: 'api',
    fetchedAt: new Date().toISOString(),
    reliability: 0.95,
  });
  
  describe('Version Constants', () => {
    it('should have correct engine version', () => {
      expect(ENGINE_VERSION).toBe('3.0.0');
    });
    
    it('should have correct formula version', () => {
      expect(FORMULA_VERSION).toBe('v3.0');
    });
    
    it('should have weights that sum to 1', () => {
      const sum = FIXED_WEIGHTS.w_qs + FIXED_WEIGHTS.w_os + FIXED_WEIGHTS.w_safety;
      expect(Math.abs(sum - 1)).toBeLessThan(0.001);
    });
  });
  
  describe('Tier Thresholds', () => {
    it('should classify Elite correctly (85+)', () => {
      expect(getTierFromScore(85)).toBe('Elite');
      expect(getTierFromScore(100)).toBe('Elite');
    });
    
    it('should classify Strong correctly (70-84)', () => {
      expect(getTierFromScore(70)).toBe('Strong');
      expect(getTierFromScore(84)).toBe('Strong');
    });
    
    it('should classify Neutral correctly (50-69)', () => {
      expect(getTierFromScore(50)).toBe('Neutral');
      expect(getTierFromScore(69)).toBe('Neutral');
    });
    
    it('should classify Weak correctly (30-49)', () => {
      expect(getTierFromScore(30)).toBe('Weak');
      expect(getTierFromScore(49)).toBe('Weak');
    });
    
    it('should classify Critical correctly (0-29)', () => {
      expect(getTierFromScore(0)).toBe('Critical');
      expect(getTierFromScore(29)).toBe('Critical');
    });
  });
  
  describe('Legitimacy Gate', () => {
    it('should fail-closed on rug pull history', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'scam-token',
        dataPoints: [
          createDataPoint('known_rug_pull', 'LEGAL', 1),
          createDataPoint('price_usd', 'MARKET', 100),
        ],
      };
      
      const result = calculateOmniScore(params);
      
      expect(result).not.toBeNull();
      expect(result!.audit.gated).toBe(true);
      expect(result!.legitimacy.status).toBe('failed');
    });
  });
  
  describe('Confidence Gate', () => {
    it('should fail-closed on insufficient data', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'unknown-token',
        dataPoints: [], // No data
      };
      
      const result = calculateOmniScore(params);
      
      expect(result).not.toBeNull();
      expect(result!.audit.gated).toBe(true);
      expect(result!.confidence.level).toBe('insufficient');
    });
  });
  
  describe('POS Formula', () => {
    it('should calculate POS with fixed weights', () => {
      // Create a well-covered project
      const params: CalculateOmniScoreParams = {
        projectId: 'bitcoin',
        sector: 'L1',
        marketCapUsd: 1_000_000_000_000,
        dataPoints: [
          // QS data
          createDataPoint('github_commits_30d', 'TECH', 200),
          createDataPoint('github_stars', 'TECH', 40000),
          createDataPoint('github_contributors', 'TEAM', 300),
          createDataPoint('audit_count', 'SEC', 5),
          createDataPoint('decentralization_score', 'GOV', 90),
          createDataPoint('tvl_usd', 'ECO', 5000000000),
          
          // OS data
          createDataPoint('price_usd', 'MARKET', 50000),
          createDataPoint('volume_24h', 'MARKET', 5000000000),
          createDataPoint('market_cap', 'MARKET', 1000000000000),
          createDataPoint('circulating_supply_ratio', 'TOKEN', 0.93),
          createDataPoint('price_vs_ath', 'VAL', 30),
          createDataPoint('active_addresses_30d', 'ADOPT', 1000000),
          createDataPoint('twitter_followers', 'COMM', 5000000),
          
          // Risk data
          createDataPoint('jurisdiction_risk_score', 'LEGAL', 20),
          createDataPoint('fear_greed_index', 'MACRO', 50),
        ],
      };
      
      const result = calculateOmniScore(params);
      
      expect(result).not.toBeNull();
      expect(result!.audit.gated).toBe(false);
      expect(result!.pos).toBeGreaterThan(0);
      expect(result!.pos).toBeLessThanOrEqual(97); // Plausibility cap
      expect(result!.qs).toBeGreaterThan(0);
      expect(result!.os).not.toBeNull();
    });
    
    it('should handle OS gating gracefully', () => {
      // Project with QS data but no OS data
      const params: CalculateOmniScoreParams = {
        projectId: 'new-project',
        dataPoints: [
          // Only QS data
          createDataPoint('github_commits_30d', 'TECH', 100),
          createDataPoint('github_stars', 'TECH', 5000),
          createDataPoint('github_contributors', 'TEAM', 50),
        ],
      };
      
      const result = calculateOmniScore(params);
      
      // Should still produce a result, but OS gated
      expect(result).not.toBeNull();
      if (result && !result.audit.gated) {
        expect(result.osStatus).toBe('gated');
        expect(result.os).toBeNull();
      }
    });
  });
  
  describe('Views', () => {
    it('should generate allocator view', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'eth',
        sector: 'L1',
        marketCapUsd: 400_000_000_000,
        dataPoints: [
          createDataPoint('github_commits_30d', 'TECH', 300),
          createDataPoint('github_stars', 'TECH', 45000),
          createDataPoint('github_contributors', 'TEAM', 500),
          createDataPoint('audit_count', 'SEC', 10),
          createDataPoint('price_usd', 'MARKET', 3000),
          createDataPoint('volume_24h', 'MARKET', 10000000000),
        ],
      };
      
      const result = calculateOmniScore(params);
      
      expect(result).not.toBeNull();
      if (result && !result.audit.gated) {
        expect(result.allocatorView).toBeDefined();
        expect(result.allocatorView.timeHorizon).toBe('6-12 months');
        expect(['accumulate', 'hold', 'reduce', 'avoid']).toContain(
          result.allocatorView.recommendation
        );
      }
    });
    
    it('should generate trader view', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'sol',
        sector: 'L1',
        marketCapUsd: 80_000_000_000,
        dataPoints: [
          createDataPoint('github_commits_30d', 'TECH', 200),
          createDataPoint('github_stars', 'TECH', 10000),
          createDataPoint('price_usd', 'MARKET', 150),
          createDataPoint('volume_24h', 'MARKET', 5000000000),
        ],
      };
      
      const result = calculateOmniScore(params);
      
      expect(result).not.toBeNull();
      if (result && !result.audit.gated) {
        expect(result.traderView).toBeDefined();
        expect(result.traderView.timeHorizon).toBe('1-4 weeks');
        expect(['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell']).toContain(
          result.traderView.signal
        );
      }
    });
  });
  
  describe('Audit Trail', () => {
    it('should include complete audit metadata', () => {
      const params: CalculateOmniScoreParams = {
        projectId: 'test-project',
        requestId: 'test-request-123',
        dataPoints: [
          createDataPoint('github_commits_30d', 'TECH', 100),
          createDataPoint('github_stars', 'TECH', 1000),
          createDataPoint('price_usd', 'MARKET', 10),
          createDataPoint('volume_24h', 'MARKET', 1000000),
        ],
      };
      
      const result = calculateOmniScore(params);
      
      expect(result).not.toBeNull();
      expect(result!.audit.engineVersion).toBe(ENGINE_VERSION);
      expect(result!.audit.formulaVersion).toBe(FORMULA_VERSION);
      expect(result!.audit.requestId).toBe('test-request-123');
      expect(result!.audit.timestamp).toBeDefined();
      expect(result!.audit.legitimacyChecked).toBe(true);
      expect(result!.audit.confidenceChecked).toBe(true);
    });
  });
});
