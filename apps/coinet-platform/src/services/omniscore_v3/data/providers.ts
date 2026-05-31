/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔌 DATA PROVIDERS                                                         ║
 * ║                                                                               ║
 * ║   External API clients for OmniScore data fetching.                          ║
 * ║   CoinGecko, DefiLlama, GitHub - stubbed for pipeline integration.           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { MarketData, OnChainData, DevelopmentData, TokenomicsData } from './fetcher';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProviderStatus {
  provider: string;
  healthy: boolean;
  lastCheck: Date;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COINGECKO
// ═══════════════════════════════════════════════════════════════════════════════

export class CoinGeckoClient {
  constructor(private _apiKey?: string) {}
  async getCoin(id: string): Promise<unknown> {
    return null;
  }
  async getMarketData(id: string): Promise<Partial<MarketData>> {
    return {};
  }
}

let _coinGeckoClient: CoinGeckoClient | null = null;

export function getCoinGeckoClient(apiKey?: string): CoinGeckoClient {
  if (!_coinGeckoClient) _coinGeckoClient = new CoinGeckoClient(apiKey);
  return _coinGeckoClient;
}

export function coinGeckoToMarketData(_raw: unknown): Partial<MarketData> {
  return {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFILLAMA
// ═══════════════════════════════════════════════════════════════════════════════

export class DefiLlamaClient {
  async getTvl(chainOrProtocol: string): Promise<number | null> {
    return null;
  }
  async getFees(protocol: string): Promise<number | null> {
    return null;
  }
}

let _defiLlamaClient: DefiLlamaClient | null = null;

export function getDefiLlamaClient(): DefiLlamaClient {
  if (!_defiLlamaClient) _defiLlamaClient = new DefiLlamaClient();
  return _defiLlamaClient;
}

export function defiLlamaToTvlData(_chain: string, _tvl: number): Partial<OnChainData> {
  return {};
}

export function defiLlamaToFeesData(_protocol: string, _fees: number): Partial<OnChainData> {
  return {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// GITHUB
// ═══════════════════════════════════════════════════════════════════════════════

export class GitHubClient {
  constructor(private _token?: string) {}
  async getRepo(repo: string): Promise<unknown> {
    return null;
  }
  async getCommitActivity(repo: string, _weeks?: number): Promise<number[]> {
    return [];
  }
}

let _githubClient: GitHubClient | null = null;

export function getGitHubClient(token?: string): GitHubClient {
  if (!_githubClient) _githubClient = new GitHubClient(token);
  return _githubClient;
}

export async function fetchGitHubDevelopmentData(
  _repo: string,
  _token?: string
): Promise<Partial<DevelopmentData>> {
  return {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════════════════════════

export async function checkProviderHealth(): Promise<ProviderStatus[]> {
  return [
    { provider: 'coingecko', healthy: true, lastCheck: new Date() },
    { provider: 'defillama', healthy: true, lastCheck: new Date() },
    { provider: 'github', healthy: true, lastCheck: new Date() },
  ];
}

export function resetAllProviders(): void {
  _coinGeckoClient = null;
  _defiLlamaClient = null;
  _githubClient = null;
}
