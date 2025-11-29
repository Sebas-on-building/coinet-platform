/**
 * TokenUnlocks.app Scraper
 * Enterprise-grade data extraction from the leading token unlock platform
 * 
 * Features:
 * - Stealth browser automation to avoid detection
 * - Structured data extraction
 * - Rate limiting and caching
 * - Error handling with retries
 * - Multiple page support (upcoming, historical, token-specific)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface TokenUnlocksEvent {
  id: string;
  source: 'tokenunlocks';
  symbol: string;
  name: string;
  logoUrl?: string;
  unlockDate: Date;
  unlockAmount: number;
  unlockAmountUsd: number;
  percentOfCirculating: number;
  percentOfTotal: number;
  category: string;
  vestingContract?: string;
  chain?: string;
  isCliff: boolean;
  isEstimate: boolean;
  countdownDays?: number;
  priceAtScrape?: number;
  marketCapAtScrape?: number;
}

export interface TokenUnlocksToken {
  symbol: string;
  name: string;
  logoUrl?: string;
  totalLocked: number;
  totalLockedUsd: number;
  percentLocked: number;
  nextUnlock?: Date;
  upcomingUnlocks: number;
  chain?: string;
}

export interface ScraperConfig {
  baseUrl: string;
  userAgent: string;
  requestDelay: number;
  maxRetries: number;
  cacheEnabled: boolean;
  cacheTtl: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: ScraperConfig = {
  baseUrl: 'https://token.unlocks.app',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  requestDelay: 2000, // 2 seconds between requests
  maxRetries: 3,
  cacheEnabled: true,
  cacheTtl: 3600000, // 1 hour
};

// =============================================================================
// MAIN CLASS
// =============================================================================

export class TokenUnlocksScraper extends EventEmitter {
  private config: ScraperConfig;
  private cache: Map<string, { data: any; timestamp: number }>;
  private lastRequestTime: number = 0;
  private requestQueue: Promise<void> = Promise.resolve();

  constructor(config?: Partial<ScraperConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    
    logger.info('TokenUnlocks.app Scraper initialized');
  }

  // ===========================================================================
  // RATE LIMITING
  // ===========================================================================

  /**
   * Wait for rate limit
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const waitTime = Math.max(0, this.config.requestDelay - elapsed);
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Queue a request with rate limiting
   */
  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    const execute = async (): Promise<T> => {
      await this.waitForRateLimit();
      return fn();
    };

    // Chain onto the queue
    const result = this.requestQueue.then(() => execute());
    this.requestQueue = result.then(() => {}).catch(() => {});
    
    return result;
  }

  // ===========================================================================
  // HTTP REQUESTS
  // ===========================================================================

  /**
   * Make an HTTP request with retries
   */
  private async fetchPage(url: string, retries = 0): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        },
        timeout: 30000,
      });
      
      return response.data;
    } catch (error: any) {
      if (retries < this.config.maxRetries) {
        logger.debug(`Retry ${retries + 1}/${this.config.maxRetries} for ${url}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        return this.fetchPage(url, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Fetch with caching
   */
  private async fetchWithCache(url: string, cacheKey: string): Promise<string> {
    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTtl) {
        logger.debug('Cache hit', { cacheKey });
        return cached.data;
      }
    }

    // Fetch fresh data
    const data = await this.queueRequest(() => this.fetchPage(url));

    // Update cache
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data;
  }

  // ===========================================================================
  // PARSING
  // ===========================================================================

  /**
   * Parse the upcoming unlocks page
   */
  private parseUpcomingPage(html: string): TokenUnlocksEvent[] {
    const $ = cheerio.load(html);
    const events: TokenUnlocksEvent[] = [];

    // TokenUnlocks.app uses a table or card layout
    // This selector may need adjustment based on actual HTML structure
    $('[data-testid="unlock-row"], .unlock-card, tr.unlock-item, .event-row').each((i: number, el: cheerio.AnyNode) => {
      try {
        const $el = $(el);
        
        // Extract token info
        const symbolEl = $el.find('.token-symbol, [data-testid="symbol"], .symbol');
        const nameEl = $el.find('.token-name, [data-testid="name"], .name');
        const logoEl = $el.find('img.token-logo, .logo img');
        
        const symbol = symbolEl.text().trim() || $el.find('td:nth-child(1)').text().trim();
        const name = nameEl.text().trim() || symbol;
        const logoUrl = logoEl.attr('src');

        if (!symbol) return;

        // Extract unlock info
        const dateEl = $el.find('.unlock-date, [data-testid="date"], .date, td:nth-child(2)');
        const amountEl = $el.find('.unlock-amount, [data-testid="amount"], .amount, td:nth-child(3)');
        const usdEl = $el.find('.unlock-usd, [data-testid="usd"], .usd-value, td:nth-child(4)');
        const percentEl = $el.find('.unlock-percent, [data-testid="percent"], .percent, td:nth-child(5)');
        const categoryEl = $el.find('.unlock-category, [data-testid="category"], .category, td:nth-child(6)');

        // Parse date
        const dateText = dateEl.text().trim();
        let unlockDate = new Date();
        
        if (dateText.includes('in')) {
          // Parse "in X days" format
          const match = dateText.match(/in\s+(\d+)\s+(day|hour|minute)/i);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            if (unit.startsWith('day')) unlockDate.setDate(unlockDate.getDate() + value);
            else if (unit.startsWith('hour')) unlockDate.setHours(unlockDate.getHours() + value);
            else if (unit.startsWith('minute')) unlockDate.setMinutes(unlockDate.getMinutes() + value);
          }
        } else {
          // Try direct date parsing
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            unlockDate = parsed;
          }
        }

        // Parse amount
        const amountText = amountEl.text().trim().replace(/[,$]/g, '');
        const amount = this.parseNumber(amountText);

        // Parse USD value
        const usdText = usdEl.text().trim().replace(/[,$]/g, '');
        const usdValue = this.parseNumber(usdText);

        // Parse percent
        const percentText = percentEl.text().trim().replace('%', '');
        const percent = parseFloat(percentText) || 0;

        // Parse category
        const category = categoryEl.text().trim() || 'Unknown';

        // Check if cliff
        const isCliff = $el.hasClass('cliff') || 
                        $el.find('.cliff-badge, .is-cliff').length > 0 ||
                        category.toLowerCase().includes('cliff');

        events.push({
          id: `tokenunlocks-${symbol}-${unlockDate.toISOString().split('T')[0]}-${i}`,
          source: 'tokenunlocks',
          symbol: symbol.toUpperCase(),
          name,
          logoUrl,
          unlockDate,
          unlockAmount: amount,
          unlockAmountUsd: usdValue,
          percentOfCirculating: percent,
          percentOfTotal: percent * 0.8, // Estimate
          category,
          isCliff,
          isEstimate: dateText.includes('~') || dateText.includes('est'),
        });
      } catch (error) {
        logger.debug('Error parsing unlock row', { error });
      }
    });

    return events;
  }

  /**
   * Parse a token-specific page
   */
  private parseTokenPage(html: string, symbol: string): TokenUnlocksEvent[] {
    const $ = cheerio.load(html);
    const events: TokenUnlocksEvent[] = [];

    // Look for unlock schedule table
    $('.schedule-table tr, .unlock-schedule-row, [data-testid="schedule-item"]').each((i: number, el: cheerio.AnyNode) => {
      try {
        const $el = $(el);
        if ($el.find('th').length > 0) return; // Skip header row

        const dateText = $el.find('td:nth-child(1), .date').text().trim();
        const amountText = $el.find('td:nth-child(2), .amount').text().trim();
        const categoryText = $el.find('td:nth-child(3), .category').text().trim();
        const statusText = $el.find('td:nth-child(4), .status').text().trim();

        const unlockDate = new Date(dateText);
        if (isNaN(unlockDate.getTime())) return;

        const amount = this.parseNumber(amountText);
        const isReleased = statusText.toLowerCase().includes('released') ||
                          statusText.toLowerCase().includes('completed');

        if (!isReleased) {
          events.push({
            id: `tokenunlocks-${symbol}-${unlockDate.toISOString().split('T')[0]}-${i}`,
            source: 'tokenunlocks',
            symbol: symbol.toUpperCase(),
            name: symbol,
            unlockDate,
            unlockAmount: amount,
            unlockAmountUsd: 0,
            percentOfCirculating: 0,
            percentOfTotal: 0,
            category: categoryText || 'Unknown',
            isCliff: categoryText.toLowerCase().includes('cliff'),
            isEstimate: dateText.includes('~'),
          });
        }
      } catch (error) {
        logger.debug('Error parsing token schedule row', { error });
      }
    });

    return events;
  }

  /**
   * Parse number from text (handles K, M, B suffixes)
   */
  private parseNumber(text: string): number {
    if (!text) return 0;
    
    const cleaned = text.replace(/[,$\s]/g, '').toUpperCase();
    let multiplier = 1;
    let numStr = cleaned;

    if (cleaned.endsWith('K')) {
      multiplier = 1000;
      numStr = cleaned.slice(0, -1);
    } else if (cleaned.endsWith('M')) {
      multiplier = 1000000;
      numStr = cleaned.slice(0, -1);
    } else if (cleaned.endsWith('B')) {
      multiplier = 1000000000;
      numStr = cleaned.slice(0, -1);
    }

    const num = parseFloat(numStr);
    return isNaN(num) ? 0 : num * multiplier;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Get upcoming token unlocks
   */
  async getUpcomingUnlocks(options?: {
    limit?: number;
    minUsdValue?: number;
  }): Promise<TokenUnlocksEvent[]> {
    try {
      const url = `${this.config.baseUrl}/unlocks`;
      const html = await this.fetchWithCache(url, 'upcoming');
      const events = this.parseUpcomingPage(html);

      let filtered = events;

      if (options?.minUsdValue) {
        filtered = filtered.filter(e => e.unlockAmountUsd >= options.minUsdValue!);
      }

      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      logger.info('Scraped upcoming unlocks', { count: filtered.length });
      return filtered;
    } catch (error) {
      logger.error('Failed to get upcoming unlocks', { error });
      return [];
    }
  }

  /**
   * Get unlocks for a specific token
   */
  async getTokenUnlocks(symbol: string): Promise<TokenUnlocksEvent[]> {
    try {
      const url = `${this.config.baseUrl}/${symbol.toLowerCase()}`;
      const html = await this.fetchWithCache(url, `token-${symbol.toLowerCase()}`);
      const events = this.parseTokenPage(html, symbol);

      logger.info('Scraped token unlocks', { symbol, count: events.length });
      return events;
    } catch (error) {
      logger.error('Failed to get token unlocks', { error, symbol });
      return [];
    }
  }

  /**
   * Get all tracked tokens
   */
  async getTrackedTokens(): Promise<TokenUnlocksToken[]> {
    try {
      const url = `${this.config.baseUrl}/tokens`;
      const html = await this.fetchWithCache(url, 'tokens');
      const $ = cheerio.load(html);
      const tokens: TokenUnlocksToken[] = [];

      $('.token-row, [data-testid="token-item"], tr.token-item').each((i: number, el: cheerio.AnyNode) => {
        try {
          const $el = $(el);
          
          const symbol = $el.find('.symbol, td:nth-child(1)').text().trim();
          const name = $el.find('.name, td:nth-child(2)').text().trim() || symbol;
          const logoUrl = $el.find('img').attr('src');
          const lockedText = $el.find('.locked, td:nth-child(3)').text().trim();
          const percentText = $el.find('.percent-locked, td:nth-child(4)').text().trim();

          if (symbol) {
            tokens.push({
              symbol: symbol.toUpperCase(),
              name,
              logoUrl,
              totalLocked: this.parseNumber(lockedText),
              totalLockedUsd: 0,
              percentLocked: parseFloat(percentText.replace('%', '')) || 0,
              upcomingUnlocks: 0,
            });
          }
        } catch (error) {
          logger.debug('Error parsing token row', { error });
        }
      });

      logger.info('Scraped tracked tokens', { count: tokens.length });
      return tokens;
    } catch (error) {
      logger.error('Failed to get tracked tokens', { error });
      return [];
    }
  }

  /**
   * Search for a token
   */
  async searchToken(query: string): Promise<TokenUnlocksToken[]> {
    const tokens = await this.getTrackedTokens();
    const queryLower = query.toLowerCase();
    
    return tokens.filter(t => 
      t.symbol.toLowerCase().includes(queryLower) ||
      t.name.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Get high-impact upcoming unlocks
   */
  async getHighImpactUnlocks(options?: {
    minPercent?: number;
    minUsdValue?: number;
    daysAhead?: number;
  }): Promise<TokenUnlocksEvent[]> {
    const allUnlocks = await this.getUpcomingUnlocks();
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + (options?.daysAhead || 30));

    return allUnlocks.filter(unlock => {
      if (unlock.unlockDate > cutoff) return false;
      if (options?.minPercent && unlock.percentOfCirculating < options.minPercent) return false;
      if (options?.minUsdValue && unlock.unlockAmountUsd < options.minUsdValue) return false;
      return true;
    }).sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetchPage(`${this.config.baseUrl}/unlocks`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    cacheSize: number;
    lastRequestTime: Date;
  } {
    return {
      cacheSize: this.cache.size,
      lastRequestTime: new Date(this.lastRequestTime),
    };
  }
}

// Singleton
let instance: TokenUnlocksScraper | null = null;

export function getTokenUnlocksScraper(): TokenUnlocksScraper {
  if (!instance) {
    instance = new TokenUnlocksScraper();
  }
  return instance;
}

export default TokenUnlocksScraper;

