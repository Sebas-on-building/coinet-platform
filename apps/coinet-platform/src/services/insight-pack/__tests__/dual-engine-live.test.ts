/**
 * Live test for Dual Engine (Grok + Gemini)
 * Run with: npx vitest run src/services/insight-pack/__tests__/dual-engine-live.test.ts
 */

import { describe, it, expect } from 'vitest';
import { executeDualEnginePass1, getValidInsightPacks, extractTelemetry } from '../dual-engine';
import { aggregateInsightPacks } from '../aggregator';
import { renderFallback } from '../pass2-renderer';
import { EvidencePack } from '../../evidence-pack/types';

// Mock Evidence Pack for testing
const mockEvidencePack: EvidencePack = {
  kind: 'TOKEN',
  meta: {
    version: '1.0.0',
    built_at_unix: Math.floor(Date.now() / 1000),
    build_duration_ms: 100,
    request_id: 'test-123',
  },
  request: {
    user_message: 'Why is BTC dumping today?',
    intent: 'EXPLAIN_MOVE',
    language: 'en',
    entities_detected: ['BTC'],
  },
  token: {
    resolved: true,
    confidence: 0.95,
    symbol: 'BTC',
    name: 'Bitcoin',
    chain: 'bitcoin',
    address: null,
    method: 'exact_match',
  },
  dexscreener: {
    ts: Math.floor(Date.now() / 1000),
    source: 'mock',
    freshness_seconds: 30,
    data: {
      price_usd: 95000,
      price_change_24h: -5.2,
      volume_24h: 45000000000,
      liquidity_usd: 1000000000,
      fdv: 1900000000000,
      txns_24h: { buys: 150000, sells: 180000 },
      pair_created_at: null,
    },
  },
  security: null,
  holders: null,
  sentiment: {
    ts: Math.floor(Date.now() / 1000),
    source: 'mock',
    freshness_seconds: 60,
    data: {
      label: 'bearish',
      score: 0.35,
      volume_mention_24h: 50000,
      top_keywords: ['dump', 'crash', 'sell'],
    },
  },
  news: {
    ts: Math.floor(Date.now() / 1000),
    source: 'mock',
    freshness_seconds: 120,
    data: {
      items: [
        {
          title: 'Bitcoin drops as ETF outflows hit record',
          source: 'CoinDesk',
          published_at: new Date().toISOString(),
          sentiment: 'negative',
          relevance_score: 0.9,
        },
        {
          title: 'Whale moves 10,000 BTC to exchange',
          source: 'Whale Alert',
          published_at: new Date().toISOString(),
          sentiment: 'negative',
          relevance_score: 0.85,
        },
      ],
    },
  },
  derivatives: {
    ts: Math.floor(Date.now() / 1000),
    source: 'mock',
    freshness_seconds: 30,
    data: {
      funding_rate: -0.015,
      open_interest_usd: 25000000000,
      oi_change_24h: -12.5,
      long_short_ratio: 0.85,
      liquidations_24h: {
        long_usd: 450000000,
        short_usd: 50000000,
      },
    },
  },
  onchain: null,
  market_snapshot: {
    ts: Math.floor(Date.now() / 1000),
    source: 'mock',
    freshness_seconds: 60,
    data: {
      btc_dominance: 58.5,
      total_market_cap_usd: 3200000000000,
      fear_greed_index: 25,
      fear_greed_label: 'Extreme Fear',
    },
  },
  coverage: {
    available: ['dexscreener', 'sentiment', 'news', 'derivatives', 'market_snapshot'],
    missing: ['security', 'holders', 'onchain'],
    stale: [],
    errors: [],
    freshness_seconds: {
      dexscreener: 30,
      sentiment: 60,
      news: 120,
      derivatives: 30,
      market_snapshot: 60,
    },
    quality_score: 0.72,
  },
};

describe('Dual Engine Live Test', () => {
  it('should run Grok + Gemini in parallel and aggregate results', async () => {
    console.log('\n🚀 Starting Dual Engine Test...\n');
    
    const result = await executeDualEnginePass1({
      userMessage: 'Why is BTC dumping today?',
      intent: 'explain_move',
      language: 'en',
      evidencePack: mockEvidencePack,
      assetFocus: 'BTC',
      chain: 'bitcoin',
      userTier: 'pro',  // Enable DUAL mode
      forceDual: true,  // Force dual even without all conditions
    });

    console.log('\n📊 Dual Engine Result:');
    console.log('  Status:', result.status);
    console.log('  Research Mode:', result.researchMode);
    console.log('  Grok Latency:', result.telemetry.grokLatencyMs, 'ms');
    console.log('  Gemini Latency:', result.telemetry.geminiLatencyMs, 'ms');
    console.log('  Total Latency:', result.telemetry.totalLatencyMs, 'ms');
    console.log('  Trigger Reason:', result.telemetry.triggerReason);

    // Check what we got
    const { grok, gemini, count } = getValidInsightPacks(result);
    console.log('\n✅ Valid Insight Packs:', count);

    if (grok) {
      console.log('\n🔵 GROK Insight Pack:');
      console.log('  Drivers:', grok.drivers?.length || 0);
      grok.drivers?.slice(0, 3).forEach((d, i) => {
        console.log(`    ${i + 1}. ${d.topic}: ${d.summary.slice(0, 60)}...`);
      });
      console.log('  Confidence:', grok.overall_confidence);
      console.log('  Unknowns:', grok.unknowns?.length || 0);
    } else {
      console.log('\n❌ Grok failed:', result.grokResult?.ok === false ? result.grokResult.error : 'null');
    }

    if (gemini) {
      console.log('\n🟣 GEMINI Insight Pack:');
      console.log('  Drivers:', gemini.drivers?.length || 0);
      gemini.drivers?.slice(0, 3).forEach((d, i) => {
        console.log(`    ${i + 1}. ${d.topic}: ${d.summary.slice(0, 60)}...`);
      });
      console.log('  Confidence:', gemini.overall_confidence);
      console.log('  Unknowns:', gemini.unknowns?.length || 0);
    } else {
      console.log('\n❌ Gemini failed:', result.geminiResult?.ok === false ? result.geminiResult.error : 'null');
    }

    // Aggregate if both succeeded
    if (result.status === 'both_ok') {
      console.log('\n🔀 AGGREGATING...');
      
      const final = aggregateInsightPacks({
        evidencePack: mockEvidencePack,
        grokInsight: grok,
        geminiInsight: gemini,
      });

      console.log('\n📦 FINAL INSIGHT OBJECT:');
      console.log('  Merged Drivers:', final.drivers.length);
      final.drivers.forEach((d, i) => {
        console.log(`    ${i + 1}. [${d.agreement}] ${d.topic}: ${d.summary.slice(0, 50)}...`);
      });
      console.log('  Disagreement Meter:', final.disagreement_meter, `(${final.disagreement_level})`);
      console.log('  Final Confidence:', final.confidence_final);
      console.log('  Unknowns:', final.unknowns.length);

      // Render fallback
      console.log('\n📝 RENDERED OUTPUT (fallback):');
      console.log('─'.repeat(60));
      const rendered = renderFallback(final, 'BTC');
      console.log(rendered);
      console.log('─'.repeat(60));
    }

    // Extract telemetry
    const telemetry = extractTelemetry(result);
    console.log('\n📈 TELEMETRY:');
    console.log(JSON.stringify(telemetry, null, 2));

    // Basic assertions
    expect(result.researchMode).toBe('DUAL');
    expect(['both_ok', 'grok_only', 'gemini_only', 'none_ok']).toContain(result.status);
    
  }, 30000); // 30s timeout for API calls
});
