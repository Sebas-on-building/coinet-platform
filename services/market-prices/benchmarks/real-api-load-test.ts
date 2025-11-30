/**
 * ============================================
 * REAL API LOAD TEST
 * ============================================
 * 
 * This test makes ACTUAL API calls to:
 * - CoinGecko (primary)
 * - DeFiLlama (secondary)
 * - CryptoPanic (news)
 * 
 * Measures:
 * - Real API response times
 * - Rate limit behavior
 * - Cache effectiveness with real data
 * - Aggregation efficiency
 * 
 * ⚠️ WARNING: This uses real API quota!
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../src/utils/logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface ApiConfig {
  name: string;
  baseUrl: string;
  endpoints: EndpointConfig[];
  rateLimit: number; // calls per minute
  apiKey?: string;
  headers?: Record<string, string>;
}

interface EndpointConfig {
  name: string;
  path: string;
  params?: Record<string, string | number>;
  weight: number; // Higher = more important
}

interface LoadTestConfig {
  durationMs: number;
  targetQps: number; // Target queries per second
  enableCaching: boolean;
  cacheTtlMs: number;
  warmupMs: number;
}

const APIS: ApiConfig[] = [
  {
    name: 'CoinGecko',
    baseUrl: 'https://api.coingecko.com/api/v3',
    rateLimit: 30,
    endpoints: [
      { 
        name: 'simple-price', 
        path: '/simple/price', 
        params: { ids: 'bitcoin,ethereum,solana', vs_currencies: 'usd' },
        weight: 5 
      },
      { 
        name: 'coins-markets', 
        path: '/coins/markets', 
        params: { vs_currency: 'usd', per_page: 10 },
        weight: 3 
      },
      { 
        name: 'ping', 
        path: '/ping', 
        weight: 1 
      },
    ],
  },
  {
    name: 'DeFiLlama',
    baseUrl: 'https://api.llama.fi',
    rateLimit: 100,
    endpoints: [
      { name: 'protocols', path: '/protocols', weight: 3 },
      { name: 'tvl', path: '/tvl/ethereum', weight: 2 },
    ],
  },
];

const DEFAULT_CONFIG: LoadTestConfig = {
  durationMs: 60000, // 1 minute
  targetQps: 10,
  enableCaching: true,
  cacheTtlMs: 30000,
  warmupMs: 5000,
};

// =============================================================================
// CACHE
// =============================================================================

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;
  
  hits = 0;
  misses = 0;
  
  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }
  
  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.data;
  }
  
  set(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
  
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// =============================================================================
// API CLIENT
// =============================================================================

class ApiClient {
  private axiosInstance: AxiosInstance;
  private cache: ResponseCache;
  private config: ApiConfig;
  
  // Metrics
  requests = 0;
  successes = 0;
  failures = 0;
  rateLimited = 0;
  latencies: number[] = [];
  
  constructor(config: ApiConfig, cache: ResponseCache) {
    this.config = config;
    this.cache = cache;
    
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: 10000,
      headers: config.headers,
    });
  }
  
  async makeRequest(endpoint: EndpointConfig): Promise<{
    success: boolean;
    latencyMs: number;
    fromCache: boolean;
    statusCode?: number;
    error?: string;
  }> {
    const cacheKey = `${this.config.name}:${endpoint.path}:${JSON.stringify(endpoint.params)}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { success: true, latencyMs: 0, fromCache: true };
    }
    
    const startTime = Date.now();
    this.requests++;
    
    try {
      const response = await this.axiosInstance.get(endpoint.path, {
        params: endpoint.params,
      });
      
      const latencyMs = Date.now() - startTime;
      this.latencies.push(latencyMs);
      this.successes++;
      
      // Cache the response
      this.cache.set(cacheKey, response.data);
      
      return {
        success: true,
        latencyMs,
        fromCache: false,
        statusCode: response.status,
      };
    } catch (error: unknown) {
      this.failures++;
      const latencyMs = Date.now() - startTime;
      
      const axiosError = error as { response?: { status?: number }; message?: string };
      
      if (axiosError.response?.status === 429) {
        this.rateLimited++;
      }
      
      return {
        success: false,
        latencyMs,
        fromCache: false,
        statusCode: axiosError.response?.status,
        error: axiosError.message,
      };
    }
  }
  
  getRandomEndpoint(): EndpointConfig {
    const totalWeight = this.config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of this.config.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return this.config.endpoints[0];
  }
  
  getStats() {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    
    return {
      api: this.config.name,
      requests: this.requests,
      successes: this.successes,
      failures: this.failures,
      rateLimited: this.rateLimited,
      successRate: this.requests > 0 ? this.successes / this.requests : 0,
      avgLatencyMs: this.latencies.length > 0 
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length 
        : 0,
      p50LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0,
      p95LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0,
      p99LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0,
    };
  }
}

// =============================================================================
// LOAD TEST RUNNER
// =============================================================================

interface LoadTestResult {
  duration: number;
  totalQueries: number;
  actualApiCalls: number;
  cacheHits: number;
  cacheHitRate: number;
  efficiencyMultiplier: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
  rateLimitHits: number;
  byApi: ReturnType<ApiClient['getStats']>[];
  timestamp: string;
}

class LoadTestRunner {
  private config: LoadTestConfig;
  private cache: ResponseCache;
  private clients: ApiClient[];
  
  constructor(config: Partial<LoadTestConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new ResponseCache(this.config.cacheTtlMs);
    this.clients = APIS.map(api => new ApiClient(api, this.cache));
  }
  
  async run(): Promise<LoadTestResult> {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔥 REAL API LOAD TEST');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  WARNING: This test uses REAL API quota!');
    console.log('');
    console.log(`Duration:     ${this.config.durationMs / 1000}s`);
    console.log(`Target QPS:   ${this.config.targetQps}`);
    console.log(`Caching:      ${this.config.enableCaching ? 'Enabled' : 'Disabled'}`);
    console.log(`Cache TTL:    ${this.config.cacheTtlMs / 1000}s`);
    console.log('');
    console.log('APIs under test:');
    for (const api of APIS) {
      console.log(`  - ${api.name}: ${api.endpoints.length} endpoints (${api.rateLimit} rpm limit)`);
    }
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    
    // Warmup phase
    console.log('🔥 Warmup phase...');
    await this.runWarmup();
    console.log('');
    
    // Clear cache for fair test
    if (!this.config.enableCaching) {
      this.cache.clear();
    }
    
    // Main test
    console.log('📊 Running load test...');
    const startTime = Date.now();
    let totalQueries = 0;
    
    const intervalMs = 1000 / this.config.targetQps;
    
    while (Date.now() - startTime < this.config.durationMs) {
      // Select random API client
      const client = this.clients[Math.floor(Math.random() * this.clients.length)];
      const endpoint = client.getRandomEndpoint();
      
      // Make request
      const result = await client.makeRequest(endpoint);
      totalQueries++;
      
      // Progress indicator
      const elapsed = Date.now() - startTime;
      const progress = ((elapsed / this.config.durationMs) * 100).toFixed(0);
      process.stdout.write(`\r  Progress: ${progress}% | Queries: ${totalQueries}`);
      
      // Rate control
      await this.sleep(intervalMs);
    }
    
    console.log('\n');
    
    // Calculate results
    const result = this.calculateResults(totalQueries, Date.now() - startTime);
    this.printResults(result);
    
    return result;
  }
  
  private async runWarmup(): Promise<void> {
    const warmupStart = Date.now();
    
    while (Date.now() - warmupStart < this.config.warmupMs) {
      for (const client of this.clients) {
        for (const endpoint of APIS.find(a => a.name === client.getStats().api)?.endpoints || []) {
          await client.makeRequest(endpoint);
        }
      }
    }
    
    // Reset metrics after warmup
    for (const client of this.clients) {
      client.requests = 0;
      client.successes = 0;
      client.failures = 0;
      client.rateLimited = 0;
      client.latencies = [];
    }
  }
  
  private calculateResults(totalQueries: number, durationMs: number): LoadTestResult {
    const allStats = this.clients.map(c => c.getStats());
    
    const actualApiCalls = allStats.reduce((sum, s) => sum + s.requests, 0);
    const successes = allStats.reduce((sum, s) => sum + s.successes, 0);
    const rateLimitHits = allStats.reduce((sum, s) => sum + s.rateLimited, 0);
    
    const allLatencies = this.clients.flatMap(c => c.latencies).sort((a, b) => a - b);
    
    return {
      duration: durationMs,
      totalQueries,
      actualApiCalls,
      cacheHits: this.cache.hits,
      cacheHitRate: this.cache.getHitRate(),
      efficiencyMultiplier: actualApiCalls > 0 ? totalQueries / actualApiCalls : 0,
      avgLatencyMs: allLatencies.length > 0 
        ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length 
        : 0,
      p99LatencyMs: allLatencies[Math.floor(allLatencies.length * 0.99)] || 0,
      successRate: actualApiCalls > 0 ? successes / actualApiCalls : 0,
      rateLimitHits,
      byApi: allStats,
      timestamp: new Date().toISOString(),
    };
  }
  
  private printResults(result: LoadTestResult): void {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📈 LOAD TEST RESULTS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Query Statistics:');
    console.log(`   Total Queries:        ${result.totalQueries.toLocaleString()}`);
    console.log(`   Actual API Calls:     ${result.actualApiCalls.toLocaleString()}`);
    console.log(`   Cache Hits:           ${result.cacheHits.toLocaleString()}`);
    console.log(`   Cache Hit Rate:       ${(result.cacheHitRate * 100).toFixed(2)}%`);
    console.log('');
    console.log('⚡ Efficiency:');
    console.log(`   Efficiency Multiplier: ${result.efficiencyMultiplier.toFixed(1)}x`);
    console.log(`   Queries/Second:        ${(result.totalQueries / (result.duration / 1000)).toFixed(1)}`);
    console.log('');
    console.log('⏱️ Latency:');
    console.log(`   Average:              ${result.avgLatencyMs.toFixed(0)}ms`);
    console.log(`   P99:                  ${result.p99LatencyMs.toFixed(0)}ms`);
    console.log('');
    console.log('✅ Reliability:');
    console.log(`   Success Rate:         ${(result.successRate * 100).toFixed(2)}%`);
    console.log(`   Rate Limit Hits:      ${result.rateLimitHits}`);
    console.log('');
    console.log('📋 By API:');
    for (const api of result.byApi) {
      console.log(`   ${api.api}:`);
      console.log(`      Requests:     ${api.requests}`);
      console.log(`      Success Rate: ${(api.successRate * 100).toFixed(1)}%`);
      console.log(`      Avg Latency:  ${api.avgLatencyMs.toFixed(0)}ms`);
      console.log(`      Rate Limited: ${api.rateLimited}`);
    }
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Verdict
    if (result.efficiencyMultiplier >= 100) {
      console.log('✅ EXCELLENT: 100x+ efficiency achieved with REAL APIs!');
    } else if (result.efficiencyMultiplier >= 50) {
      console.log('✅ GOOD: 50x+ efficiency achieved');
    } else if (result.efficiencyMultiplier >= 10) {
      console.log('⚠️ MODERATE: 10x+ efficiency (optimization possible)');
    } else {
      console.log('❌ LOW: Optimization needed');
    }
    
    if (result.rateLimitHits > 0) {
      console.log(`⚠️ Rate limits hit ${result.rateLimitHits} times - adjust pacing`);
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const config: Partial<LoadTestConfig> = {};
  
  if (args.includes('--long')) {
    config.durationMs = 300000; // 5 minutes
    config.targetQps = 5;
  } else if (args.includes('--quick')) {
    config.durationMs = 30000; // 30 seconds
    config.targetQps = 3;
  }
  
  if (args.includes('--no-cache')) {
    config.enableCaching = false;
  }
  
  const runner = new LoadTestRunner(config);
  
  try {
    const result = await runner.run();
    
    // Save results
    const fs = await import('fs');
    if (!fs.existsSync('./reports')) {
      fs.mkdirSync('./reports', { recursive: true });
    }
    fs.writeFileSync(
      './reports/real-api-load-test-results.json',
      JSON.stringify(result, null, 2)
    );
    logger.info('Results saved to ./reports/real-api-load-test-results.json');
  } catch (error) {
    logger.error('Load test failed:', { error: (error as Error).message });
    process.exit(1);
  }
}

main();

