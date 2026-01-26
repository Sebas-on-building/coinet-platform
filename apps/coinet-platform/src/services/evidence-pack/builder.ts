/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏗️ EVIDENCE PACK — BUILDER                                                ║
 * ║                                                                               ║
 * ║   Main orchestration for building Evidence Packs.                             ║
 * ║   Plans modules → fetches in parallel → tracks coverage → returns pack.       ║
 * ║                                                                               ║
 * ║   INVARIANTS ENFORCED:                                                        ║
 * ║   I1. No analysis-intent response without Evidence Pack attached              ║
 * ║   I2. No token-specific metrics unless present in Evidence Pack               ║
 * ║   I3. Coverage map always includes available, missing, freshness_seconds      ║
 * ║   I4. Same inputs → same module plan (deterministic)                          ║
 * ║   I5. Ticker ambiguity must be confidence-gated                               ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import { emitPackPlanned, emitPackComplete, emitResolution } from './observability';
import { CoverageTracker, formatCoverageForAI, buildFactGate } from './coverage';
import {
  TOKEN_MODULES,
  MARKET_MODULES,
  fetchDexScreener,
  fetchSecurity,
  fetchHolders,
  fetchPumpFun,
  fetchSmartMoney,
  fetchMarketSnapshot,
  fetchDerivatives,
  fetchSentiment,
  fetchNews,
} from './modules';
import {
  EvidencePackBuilderInput,
  EvidencePack,
  TokenEvidencePack,
  MarketEvidencePack,
  CombinedEvidencePack,
  TokenResolution,
  ResolutionStatus,
  ChainId,
  DetectedTokenEntity,
  CONFIDENCE_THRESHOLDS,
  EvidenceModule,
} from './types';

// ============================================================================
// TOKEN RESOLUTION
// ============================================================================

/**
 * Resolve a token entity to chain + address with confidence gating
 */
async function resolveTokenEntity(
  entity: DetectedTokenEntity,
  conversationId?: string
): Promise<TokenResolution> {
  const ref = entity.ref;

  // Direct address → CONFIRMED immediately
  if (ref.type === 'contract_address') {
    const chain = ref.chain || detectChainFromAddress(ref.normalized);
    
    emitResolution('CONFIRMED', ref.raw, 0, 1.0, chain, 'address_direct');
    
    return {
      status: 'CONFIRMED',
      primary: {
        chain,
        address: ref.normalized,
        symbol: '', // Will be filled by DexScreener
        name: '',
        confidence: 1.0,
      },
      candidates: [],
      clarification_question: null,
      resolution_source: 'address_direct',
    };
  }

  // Ticker → need to search
  if (ref.type === 'ticker') {
    try {
      // Search DexScreener for matches
      const searchResults = await searchTokenByTicker(ref.normalized);

      if (searchResults.length === 0) {
        emitResolution('UNRESOLVED', ref.raw, 0, undefined, undefined, 'ticker_search');
        
        return {
          status: 'UNRESOLVED',
          primary: null,
          candidates: [],
          clarification_question: `I couldn't find a token called "${ref.raw}". Can you share the contract address?`,
          resolution_source: 'ticker_search',
        };
      }

      const top = searchResults[0];
      const runner = searchResults[1];
      const margin = runner ? (top.confidence - runner.confidence) : 1.0;

      // High confidence + good margin → CONFIRMED
      if (top.confidence >= CONFIDENCE_THRESHOLDS.HIGH && margin >= CONFIDENCE_THRESHOLDS.MARGIN_REQUIRED) {
        emitResolution('CONFIRMED', ref.raw, searchResults.length, top.confidence, top.chain, 'ticker_search');
        
        return {
          status: 'CONFIRMED',
          primary: {
            chain: top.chain,
            address: top.address,
            symbol: top.symbol,
            name: top.name,
            confidence: top.confidence,
          },
          candidates: searchResults.slice(1, 4).map(c => ({
            chain: c.chain,
            address: c.address,
            symbol: c.symbol,
            name: c.name,
            confidence: c.confidence,
            liquidity: c.liquidity,
            volume_24h: c.volume_24h,
            why: `${c.chain} chain, $${formatNumber(c.liquidity)} liquidity`,
          })),
          clarification_question: null,
          resolution_source: 'ticker_search',
        };
      }

      // Medium confidence → TENTATIVE
      if (top.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
        emitResolution('TENTATIVE', ref.raw, searchResults.length, top.confidence, top.chain, 'ticker_search');
        
        return {
          status: 'TENTATIVE',
          primary: {
            chain: top.chain,
            address: top.address,
            symbol: top.symbol,
            name: top.name,
            confidence: top.confidence,
          },
          candidates: searchResults.slice(1, 4).map(c => ({
            chain: c.chain,
            address: c.address,
            symbol: c.symbol,
            name: c.name,
            confidence: c.confidence,
            liquidity: c.liquidity,
            volume_24h: c.volume_24h,
            why: `${c.chain} chain, $${formatNumber(c.liquidity)} liquidity`,
          })),
          clarification_question: null,
          resolution_source: 'ticker_search',
        };
      }

      // Low confidence → NEEDS_CONFIRMATION
      const clarificationQuestion = searchResults.length > 1
        ? `I found multiple tokens called "${ref.raw}". Which one do you mean?\n${searchResults.slice(0, 3).map((c, i) => `${i + 1}. ${c.name} on ${c.chain}`).join('\n')}`
        : `Is "${ref.raw}" the ${top.name} on ${top.chain}? Can you confirm or share the contract address?`;

      emitResolution('NEEDS_CONFIRMATION', ref.raw, searchResults.length, top.confidence, top.chain, 'ticker_search');
      
      return {
        status: 'NEEDS_CONFIRMATION',
        primary: {
          chain: top.chain,
          address: top.address,
          symbol: top.symbol,
          name: top.name,
          confidence: top.confidence,
        },
        candidates: searchResults.slice(0, 4).map(c => ({
          chain: c.chain,
          address: c.address,
          symbol: c.symbol,
          name: c.name,
          confidence: c.confidence,
          liquidity: c.liquidity,
          volume_24h: c.volume_24h,
          why: `${c.chain} chain, $${formatNumber(c.liquidity)} liquidity`,
        })),
        clarification_question: clarificationQuestion,
        resolution_source: 'ticker_search',
      };

    } catch (error: any) {
      logger.error('Token resolution failed', { ticker: ref.raw, error: error.message });
      
      emitResolution('UNRESOLVED', ref.raw, 0, undefined, undefined, 'ticker_search');
      
      return {
        status: 'UNRESOLVED',
        primary: null,
        candidates: [],
        clarification_question: `I had trouble looking up "${ref.raw}". Can you share the contract address?`,
        resolution_source: 'ticker_search',
      };
    }
  }

  // URL parsing
  if (ref.type === 'dexscreener_url' || ref.type === 'pumpfun_url') {
    const parsed = parseTokenUrl(ref.raw);
    if (parsed) {
      emitResolution('CONFIRMED', ref.raw, 0, 1.0, parsed.chain, 'url_parse');
      
      return {
        status: 'CONFIRMED',
        primary: {
          chain: parsed.chain,
          address: parsed.address,
          symbol: '',
          name: '',
          confidence: 1.0,
        },
        candidates: [],
        clarification_question: null,
        resolution_source: 'url_parse',
      };
    }
  }

  // Fallback
  return {
    status: 'UNRESOLVED',
    primary: null,
    candidates: [],
    clarification_question: 'I need more information about which token you mean. Can you share the contract address?',
    resolution_source: 'ticker_search',
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectChainFromAddress(address: string): ChainId {
  if (address.startsWith('0x') && address.length === 42) {
    return 'ethereum'; // Could be any EVM chain
  }
  if (address.length >= 32 && address.length <= 44 && !address.startsWith('0x')) {
    return 'solana';
  }
  return 'unknown';
}

interface SearchResult {
  chain: ChainId;
  address: string;
  symbol: string;
  name: string;
  confidence: number;
  liquidity: number;
  volume_24h: number;
}

async function searchTokenByTicker(ticker: string): Promise<SearchResult[]> {
  // Use DexScreener search API
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(ticker)}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`DexScreener search failed: ${response.status}`);
    }

    const data = await response.json();
    const pairs = data.pairs || [];

    // Filter and rank by liquidity
    const results: SearchResult[] = pairs
      .filter((p: any) => 
        p.baseToken?.symbol?.toUpperCase() === ticker.toUpperCase() ||
        p.baseToken?.name?.toLowerCase().includes(ticker.toLowerCase())
      )
      .slice(0, 10)
      .map((p: any) => {
        const liquidity = p.liquidity?.usd || 0;
        const volume = p.volume?.h24 || 0;
        
        // Calculate confidence based on liquidity and name match
        let confidence = 0.3; // Base confidence
        if (p.baseToken?.symbol?.toUpperCase() === ticker.toUpperCase()) {
          confidence += 0.3; // Exact symbol match
        }
        if (liquidity > 100000) confidence += 0.2;
        if (liquidity > 1000000) confidence += 0.1;
        if (volume > 50000) confidence += 0.1;

        return {
          chain: mapDexScreenerChain(p.chainId),
          address: p.baseToken?.address || '',
          symbol: p.baseToken?.symbol || '',
          name: p.baseToken?.name || '',
          confidence: Math.min(confidence, 0.95),
          liquidity,
          volume_24h: volume,
        };
      })
      .sort((a: SearchResult, b: SearchResult) => b.confidence - a.confidence);

    return results;
  } catch (error) {
    logger.error('Token search failed', { ticker, error });
    return [];
  }
}

function mapDexScreenerChain(chainId: string): ChainId {
  const chainMap: Record<string, ChainId> = {
    ethereum: 'ethereum',
    bsc: 'bsc',
    polygon: 'polygon',
    arbitrum: 'arbitrum',
    base: 'base',
    optimism: 'optimism',
    avalanche: 'avalanche',
    solana: 'solana',
  };
  return chainMap[chainId.toLowerCase()] || 'unknown';
}

function parseTokenUrl(url: string): { chain: ChainId; address: string } | null {
  // DexScreener URL: https://dexscreener.com/{chain}/{address}
  const dexMatch = url.match(/dexscreener\.com\/(\w+)\/([a-zA-Z0-9]+)/);
  if (dexMatch) {
    return {
      chain: mapDexScreenerChain(dexMatch[1]),
      address: dexMatch[2],
    };
  }

  // pump.fun URL: https://pump.fun/{address}
  const pumpMatch = url.match(/pump\.fun\/([a-zA-Z0-9]+)/);
  if (pumpMatch) {
    return {
      chain: 'solana',
      address: pumpMatch[1],
    };
  }

  return null;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

// ============================================================================
// TOKEN EVIDENCE PACK BUILDER
// ============================================================================

async function buildTokenEvidencePack(
  input: EvidencePackBuilderInput,
  resolution: TokenResolution
): Promise<TokenEvidencePack> {
  const { userMessage, language, intent, budgetTier, forceRefresh } = input;
  const tracker = new CoverageTracker('TOKEN', budgetTier);

  // If not resolved, return minimal pack
  if (!resolution.primary || resolution.status === 'UNRESOLVED') {
    return {
      kind: 'TOKEN',
      request: { user_message: userMessage, language, intent },
      resolution,
      evidence: {
        dexscreener: null,
        security: null,
        holders: null,
        pumpfun: null,
        smartmoney: null,
      },
      coverage: tracker.build(),
      built_at: new Date().toISOString(),
    };
  }

  const { chain, address } = resolution.primary;

  // Plan modules based on budget and chain
  const conditions = new Set<string>();
  if (chain === 'solana' && userMessage.toLowerCase().includes('pump')) {
    conditions.add('pumpfun_context');
  }
  
  const plannedModules = tracker.planModules(chain, conditions);
  
  emitPackPlanned(plannedModules, budgetTier, 'TOKEN', resolution.status, address, chain);

  // Fetch all planned modules in parallel
  const fetchPromises: Promise<void>[] = [];
  const results: {
    dexscreener: EvidenceModule<any> | null;
    security: EvidenceModule<any> | null;
    holders: EvidenceModule<any> | null;
    pumpfun: EvidenceModule<any> | null;
    smartmoney: EvidenceModule<any> | null;
  } = {
    dexscreener: null,
    security: null,
    holders: null,
    pumpfun: null,
    smartmoney: null,
  };

  if (plannedModules.includes('dexscreener')) {
    fetchPromises.push(
      fetchDexScreener(chain, address, forceRefresh).then(r => {
        results.dexscreener = r;
        tracker.recordModule('dexscreener', r);
        
        // If DexScreener returned data, update resolution with symbol/name
        if (r.status === 'success' && r.data && resolution.primary) {
          // Symbol might come from pair data
        }
      })
    );
  }

  if (plannedModules.includes('security')) {
    fetchPromises.push(
      fetchSecurity(chain, address, forceRefresh).then(r => {
        results.security = r;
        tracker.recordModule('security', r);
      })
    );
  }

  if (plannedModules.includes('holders')) {
    fetchPromises.push(
      fetchHolders(chain, address, forceRefresh).then(r => {
        results.holders = r;
        tracker.recordModule('holders', r);
      })
    );
  }

  if (plannedModules.includes('pumpfun') && chain === 'solana') {
    fetchPromises.push(
      fetchPumpFun(address, forceRefresh).then(r => {
        results.pumpfun = r;
        tracker.recordModule('pumpfun', r);
      })
    );
  } else if (plannedModules.includes('pumpfun')) {
    tracker.recordNotApplicable('pumpfun');
  }

  if (plannedModules.includes('smartmoney')) {
    fetchPromises.push(
      fetchSmartMoney(chain, address, forceRefresh).then(r => {
        results.smartmoney = r;
        tracker.recordModule('smartmoney', r);
      })
    );
  }

  // Wait for all fetches
  await Promise.allSettled(fetchPromises);

  const coverage = tracker.build();
  emitPackComplete(coverage, resolution.status);

  return {
    kind: 'TOKEN',
    request: { user_message: userMessage, language, intent },
    resolution,
    evidence: results,
    coverage,
    built_at: new Date().toISOString(),
  };
}

// ============================================================================
// MARKET EVIDENCE PACK BUILDER
// ============================================================================

async function buildMarketEvidencePack(
  input: EvidencePackBuilderInput
): Promise<MarketEvidencePack> {
  const { userMessage, language, intent, budgetTier, forceRefresh } = input;
  const tracker = new CoverageTracker('MARKET', budgetTier);

  // Check if news context is needed
  const conditions = new Set<string>();
  if (/\b(today|news|happened|event|announcement)\b/i.test(userMessage)) {
    conditions.add('news_context');
  }

  const plannedModules = tracker.planModules(undefined, conditions);
  
  emitPackPlanned(plannedModules, budgetTier, 'MARKET', 'NOT_REQUIRED');

  // Fetch all planned modules in parallel
  const fetchPromises: Promise<void>[] = [];
  const results: {
    market_snapshot: EvidenceModule<any> | null;
    derivatives: EvidenceModule<any> | null;
    sentiment: EvidenceModule<any> | null;
    news: EvidenceModule<any> | null;
  } = {
    market_snapshot: null,
    derivatives: null,
    sentiment: null,
    news: null,
  };

  if (plannedModules.includes('market_snapshot')) {
    fetchPromises.push(
      fetchMarketSnapshot(forceRefresh).then(r => {
        results.market_snapshot = r;
        tracker.recordModule('market_snapshot', r);
      })
    );
  }

  if (plannedModules.includes('derivatives')) {
    fetchPromises.push(
      fetchDerivatives(forceRefresh).then(r => {
        results.derivatives = r;
        tracker.recordModule('derivatives', r);
      })
    );
  }

  if (plannedModules.includes('sentiment')) {
    fetchPromises.push(
      fetchSentiment(forceRefresh).then(r => {
        results.sentiment = r;
        tracker.recordModule('sentiment', r);
      })
    );
  }

  if (plannedModules.includes('news')) {
    fetchPromises.push(
      fetchNews(forceRefresh).then(r => {
        results.news = r;
        tracker.recordModule('news', r);
      })
    );
  }

  // Wait for all fetches
  await Promise.allSettled(fetchPromises);

  const coverage = tracker.build();
  emitPackComplete(coverage, 'NOT_REQUIRED');

  return {
    kind: 'MARKET',
    request: { user_message: userMessage, language, intent },
    evidence: results,
    coverage,
    built_at: new Date().toISOString(),
  };
}

// ============================================================================
// MAIN BUILDER FUNCTION
// ============================================================================

/**
 * Build an Evidence Pack based on the input.
 * This is the main entry point for Evidence Pack construction.
 * 
 * @param input - Builder input with message, entities, budget, kind
 * @returns EvidencePack (Token, Market, or Combined)
 */
export async function buildEvidencePack(
  input: EvidencePackBuilderInput
): Promise<EvidencePack> {
  const { kind, tokenEntities, conversationId } = input;

  logger.info('🏗️ Building Evidence Pack', {
    kind,
    budget: input.budgetTier,
    tokenEntities: tokenEntities.length,
    intent: input.intent,
  });

  // TOKEN pack
  if (kind === 'TOKEN') {
    const primaryEntity = tokenEntities[0];
    if (!primaryEntity) {
      throw new Error('TOKEN kind requires at least one token entity');
    }

    const resolution = await resolveTokenEntity(primaryEntity, conversationId);
    return buildTokenEvidencePack(input, resolution);
  }

  // MARKET pack
  if (kind === 'MARKET') {
    return buildMarketEvidencePack(input);
  }

  // BOTH pack
  if (kind === 'BOTH') {
    const primaryEntity = tokenEntities[0];
    if (!primaryEntity) {
      throw new Error('BOTH kind requires at least one token entity');
    }

    const resolution = await resolveTokenEntity(primaryEntity, conversationId);
    
    const [tokenPack, marketPack] = await Promise.all([
      buildTokenEvidencePack(input, resolution),
      buildMarketEvidencePack(input),
    ]);

    // Merge coverage
    const combinedCoverage = {
      kind: 'BOTH' as const,
      available: [...tokenPack.coverage.available, ...marketPack.coverage.available],
      missing: [...tokenPack.coverage.missing, ...marketPack.coverage.missing],
      freshness_seconds: {
        ...tokenPack.coverage.freshness_seconds,
        ...marketPack.coverage.freshness_seconds,
      },
      errors: {
        ...tokenPack.coverage.errors,
        ...marketPack.coverage.errors,
      },
      planned_modules: [...tokenPack.coverage.planned_modules, ...marketPack.coverage.planned_modules],
      used_budget_tier: input.budgetTier,
      total_latency_ms: Math.max(tokenPack.coverage.total_latency_ms, marketPack.coverage.total_latency_ms),
    };

    return {
      kind: 'BOTH',
      token: tokenPack,
      market: marketPack,
      coverage: combinedCoverage,
      built_at: new Date().toISOString(),
    };
  }

  throw new Error(`Unknown Evidence Pack kind: ${kind}`);
}

// ============================================================================
// CONTEXT FORMATTER
// ============================================================================

/**
 * Format Evidence Pack for AI context injection
 */
export function formatEvidencePackForAI(pack: EvidencePack): string {
  const parts: string[] = [];

  // Header
  parts.push('═══════════════════════════════════════════════════════════════════════════════');
  parts.push('📦 EVIDENCE PACK — Single Source of Truth');
  parts.push('═══════════════════════════════════════════════════════════════════════════════');
  parts.push('');

  // Token data
  if (pack.kind === 'TOKEN' || pack.kind === 'BOTH') {
    const tokenPack = pack.kind === 'BOTH' ? pack.token : pack;
    parts.push(formatTokenDataForAI(tokenPack));
  }

  // Market data
  if (pack.kind === 'MARKET' || pack.kind === 'BOTH') {
    const marketPack = pack.kind === 'BOTH' ? pack.market : pack;
    parts.push(formatMarketDataForAIFromPack(marketPack));
  }

  // Coverage
  parts.push(formatCoverageForAI(pack.coverage));

  // Fact gate
  parts.push(buildFactGate(pack.coverage));

  return parts.join('\n');
}

function formatTokenDataForAI(pack: TokenEvidencePack): string {
  const lines: string[] = [];
  const { resolution, evidence } = pack;

  if (!resolution.primary) {
    return '[TOKEN DATA: Not resolved]\n';
  }

  lines.push(`🪙 TOKEN: ${resolution.primary.symbol || 'Unknown'} on ${resolution.primary.chain}`);
  lines.push(`   Address: ${resolution.primary.address}`);
  lines.push(`   Resolution confidence: ${(resolution.primary.confidence * 100).toFixed(0)}%`);
  lines.push('');

  if (evidence.dexscreener?.data) {
    const d = evidence.dexscreener.data;
    lines.push('💹 PRICE & TRADING (DexScreener)');
    lines.push(`   Price: $${d.price}`);
    lines.push(`   24h Change: ${d.price_change_24h >= 0 ? '+' : ''}${d.price_change_24h.toFixed(2)}%`);
    lines.push(`   Volume 24h: $${formatNumber(d.volume_24h)}`);
    lines.push(`   Liquidity: $${formatNumber(d.liquidity)}`);
    if (d.market_cap) lines.push(`   Market Cap: $${formatNumber(d.market_cap)}`);
    lines.push(`   Pair Age: ${d.pair_age_hours.toFixed(1)} hours`);
    lines.push(`   Txns 24h: ${d.txns_24h.buys} buys / ${d.txns_24h.sells} sells`);
    lines.push('');
  }

  if (evidence.security?.data) {
    const s = evidence.security.data;
    lines.push('🛡️ SECURITY');
    lines.push(`   Risk Level: ${s.risk_level.toUpperCase()} (${s.risk_score}/100)`);
    if (s.is_honeypot !== null) lines.push(`   Honeypot: ${s.is_honeypot ? '⚠️ YES' : '✅ No'}`);
    if (s.is_mintable !== null) lines.push(`   Mintable: ${s.is_mintable ? '⚠️ Yes' : '✅ No'}`);
    if (s.buy_tax !== null) lines.push(`   Buy Tax: ${s.buy_tax}%`);
    if (s.sell_tax !== null) lines.push(`   Sell Tax: ${s.sell_tax}%`);
    if (s.flags.length > 0) {
      lines.push(`   Flags: ${s.flags.map(f => f.code).join(', ')}`);
    }
    lines.push('');
  }

  if (evidence.pumpfun?.data) {
    const p = evidence.pumpfun.data;
    lines.push('🚀 PUMP.FUN');
    lines.push(`   Bonding Progress: ${p.bonding_progress}%`);
    lines.push(`   Graduated: ${p.is_graduated ? 'Yes' : 'No'}`);
    lines.push(`   Age: ${p.age_minutes} minutes`);
    lines.push(`   Creator Selling: ${p.is_creator_selling ? `⚠️ Yes (${p.creator_sell_percent}%)` : '✅ No'}`);
    lines.push('');
  }

  if (evidence.holders?.data) {
    const h = evidence.holders.data;
    lines.push('👥 HOLDERS');
    lines.push(`   Total: ${h.total_holders.toLocaleString()}`);
    lines.push(`   Top 10 Concentration: ${h.top_10_concentration.toFixed(1)}%`);
    lines.push(`   Whales (>1%): ${h.whale_count}`);
    lines.push(`   Distribution Score: ${h.distribution_score}/100`);
    lines.push('');
  }

  return lines.join('\n');
}

function formatMarketDataForAIFromPack(pack: MarketEvidencePack): string {
  const lines: string[] = [];
  const { evidence } = pack;

  if (evidence.market_snapshot?.data) {
    const m = evidence.market_snapshot.data;
    lines.push('📊 MARKET SNAPSHOT');
    lines.push(`   BTC: $${m.btc.price.toLocaleString()} (${m.btc.change_24h >= 0 ? '+' : ''}${m.btc.change_24h.toFixed(2)}%)`);
    lines.push(`   ETH: $${m.eth.price.toLocaleString()} (${m.eth.change_24h >= 0 ? '+' : ''}${m.eth.change_24h.toFixed(2)}%)`);
    lines.push(`   SOL: $${m.sol.price.toLocaleString()} (${m.sol.change_24h >= 0 ? '+' : ''}${m.sol.change_24h.toFixed(2)}%)`);
    lines.push(`   Total Market Cap: $${formatNumber(m.total_market_cap)}`);
    lines.push(`   Fear & Greed: ${m.fear_greed_index} (${m.fear_greed_label})`);
    lines.push(`   BTC Dominance: ${m.btc.dominance.toFixed(1)}%`);
    lines.push('');
  }

  if (evidence.derivatives?.data) {
    const d = evidence.derivatives.data;
    lines.push('💹 DERIVATIVES');
    lines.push(`   BTC Funding: ${(d.funding_btc * 100).toFixed(4)}%`);
    lines.push(`   ETH Funding: ${(d.funding_eth * 100).toFixed(4)}%`);
    lines.push(`   24h Liquidations: $${formatNumber(d.liquidations_24h)}`);
    lines.push(`   Long/Short Ratio: ${d.long_short_ratio.toFixed(2)}`);
    lines.push(`   Market Bias: ${d.market_bias.toUpperCase()}`);
    lines.push('');
  }

  if (evidence.sentiment?.data) {
    const s = evidence.sentiment.data;
    lines.push('🎭 SENTIMENT');
    lines.push(`   Overall: ${s.overall_score}/100 (${s.label})`);
    lines.push(`   Social: ${s.social_score}/100`);
    lines.push(`   News: ${s.news_score}/100`);
    lines.push('');
  }

  if (evidence.news?.data) {
    const n = evidence.news.data;
    lines.push('📰 NEWS');
    lines.push(`   Dominant Sentiment: ${n.dominant_sentiment}`);
    lines.push(`   Articles: ${n.articles.length}`);
    if (n.breaking_news) lines.push('   ⚠️ BREAKING NEWS DETECTED');
    if (n.key_events.length > 0) {
      lines.push(`   Key Events: ${n.key_events.slice(0, 3).join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  resolveTokenEntity,
  buildTokenEvidencePack,
  buildMarketEvidencePack,
  formatTokenDataForAI,
  formatMarketDataForAIFromPack,
};
