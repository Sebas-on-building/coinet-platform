/**
 * =========================================
 * TOKEN TAGGER
 * =========================================
 * Intelligent tagging of news articles with relevant cryptocurrency tokens and projects
 */

import { Logger } from '../utils/Logger';
import type { NewsArticle, TokenProjectMapping } from '../types';

export interface TaggingResult {
  tokens: string[];
  projects: string[];
  relevance: Record<string, number>;
  confidence: number;
}

export class TokenTagger {
  private logger: Logger;
  private isInitialized: boolean = false;
  private tokenMappings: TokenProjectMapping[] = [];

  constructor(tokenMappings: TokenProjectMapping[] = []) {
    this.logger = new Logger('TokenTagger');
    this.tokenMappings = tokenMappings;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Token Tagger...');

      // Validate token mappings
      if (this.tokenMappings.length === 0) {
        this.logger.warn('No token mappings provided - tagging will be limited');
      }

      // Build lookup maps for faster searching
      this.buildLookupMaps();

      this.isInitialized = true;
      this.logger.info(`✅ Token Tagger initialized with ${this.tokenMappings.length} token mappings`);

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Token Tagger', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ Token Tagger stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Token Tagger', error);
      throw error;
    }
  }

  async tagArticle(article: NewsArticle): Promise<TaggingResult> {
    if (!this.isInitialized) {
      throw new Error('Token Tagger is not initialized');
    }

    try {
      const text = `${article.title} ${article.content}`.toLowerCase();

      // Find relevant tokens and projects
      const { tokens, projects, relevance } = this.findRelevantTokens(text);

      // Calculate overall confidence
      const confidence = this.calculateTaggingConfidence(tokens, projects, relevance);

      const result: TaggingResult = {
        tokens,
        projects,
        relevance,
        confidence
      };

      this.logger.debug('Article tagging completed', {
        article_id: article.id,
        tokens_found: tokens.length,
        projects_found: projects.length,
        confidence: confidence.toFixed(2)
      });

      return result;

    } catch (error: any) {
      this.logger.error('Failed to tag article', {
        article_id: article.id,
        error: error.message
      });

      return {
        tokens: [],
        projects: [],
        relevance: {},
        confidence: 0
      };
    }
  }

  private findRelevantTokens(text: string): { tokens: string[]; projects: string[]; relevance: Record<string, number> } {
    const foundTokens: string[] = [];
    const foundProjects: string[] = [];
    const relevance: Record<string, number> = {};

    for (const mapping of this.tokenMappings) {
      let tokenRelevance = 0;
      let foundInText = false;

      // Check token symbol
      if (text.includes(mapping.symbol.toLowerCase())) {
        foundInText = true;
        tokenRelevance += 0.8; // High relevance for symbol matches
      }

      // Check token name
      if (text.includes(mapping.token.toLowerCase())) {
        foundInText = true;
        tokenRelevance += 0.6; // Medium relevance for name matches
      }

      // Check project name
      if (text.includes(mapping.project.toLowerCase())) {
        foundInText = true;
        tokenRelevance += 0.7; // High relevance for project matches
      }

      // Check aliases
      for (const alias of mapping.aliases) {
        if (text.includes(alias.toLowerCase())) {
          foundInText = true;
          tokenRelevance += 0.5; // Medium relevance for alias matches
        }
      }

      if (foundInText) {
        foundTokens.push(mapping.symbol);
        foundProjects.push(mapping.project);
        relevance[mapping.symbol] = Math.min(1, tokenRelevance);

        // Boost relevance if multiple matches
        if (tokenRelevance > 0.5) {
          relevance[mapping.symbol] = Math.min(1, relevance[mapping.symbol] + 0.2);
        }
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueTokens = [...new Set(foundTokens)];
    const uniqueProjects = [...new Set(foundProjects)];

    // Sort tokens by relevance
    const sortedTokens = uniqueTokens.sort((a, b) => (relevance[b] || 0) - (relevance[a] || 0));

    return {
      tokens: sortedTokens,
      projects: uniqueProjects,
      relevance
    };
  }

  private calculateTaggingConfidence(tokens: string[], projects: string[], relevance: Record<string, number>): number {
    if (tokens.length === 0) {
      return 0;
    }

    // Calculate average relevance
    const avgRelevance = Object.values(relevance).reduce((sum, score) => sum + score, 0) / Object.values(relevance).length;

    // Boost confidence for multiple tokens
    const tokenCountBoost = Math.min(0.3, tokens.length * 0.1);

    // Boost confidence for project mentions
    const projectBoost = projects.length > 0 ? 0.2 : 0;

    return Math.min(1, avgRelevance + tokenCountBoost + projectBoost);
  }

  private buildLookupMaps(): void {
    // Build reverse lookup maps for faster searching
    // This could be optimized with a trie or other data structure for large token lists

    // Group by symbol for quick lookup
    const symbolMap = new Map<string, TokenProjectMapping>();
    const projectMap = new Map<string, TokenProjectMapping[]>();

    for (const mapping of this.tokenMappings) {
      symbolMap.set(mapping.symbol, mapping);

      if (!projectMap.has(mapping.project)) {
        projectMap.set(mapping.project, []);
      }
      projectMap.get(mapping.project)!.push(mapping);
    }

    // Store maps as instance variables for use in findRelevantTokens
    (this as any).symbolMap = symbolMap;
    (this as any).projectMap = projectMap;
  }

  // Method to add new token mappings dynamically
  addTokenMapping(mapping: TokenProjectMapping): void {
    this.tokenMappings.push(mapping);
    this.buildLookupMaps(); // Rebuild lookup maps
    this.logger.info(`Added token mapping: ${mapping.symbol} -> ${mapping.project}`);
  }

  // Method to remove token mappings
  removeTokenMapping(symbol: string): boolean {
    const initialLength = this.tokenMappings.length;
    this.tokenMappings = this.tokenMappings.filter(m => m.symbol !== symbol);

    if (this.tokenMappings.length < initialLength) {
      this.buildLookupMaps(); // Rebuild lookup maps
      this.logger.info(`Removed token mapping: ${symbol}`);
      return true;
    }

    return false;
  }

  getStatus(): string {
    return this.isInitialized ? `Ready (${this.tokenMappings.length} mappings)` : 'Not Initialized';
  }
}
