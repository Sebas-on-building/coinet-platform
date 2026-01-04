/**
 * 🛡️ AI HALLUCINATION GUARD
 * 
 * Post-processing validation to catch and correct AI hallucinations.
 * Even with strict prompts, LLMs can hallucinate - this is the safety net.
 * 
 * Features:
 * - Detects known hallucinated ATH values from training data
 * - Validates market data matches the provided context
 * - Redacts or flags suspicious values
 * 
 * @module ai-hallucination-guard
 */

import { logger } from '../utils/logger';

// ============================================================================
// KNOWN HALLUCINATED VALUES (from various LLM training cutoffs)
// ============================================================================

/**
 * Known incorrect ATH values that LLMs commonly hallucinate
 * These come from outdated training data
 */
const KNOWN_HALLUCINATED_ATH: Record<string, number[]> = {
  BTC: [69000, 68000, 67000, 64000, 108000, 108268, 108786, 109000],
  ETH: [4800, 4878, 4891, 4900, 5000],
  SOL: [260, 259, 258, 250],
};

/**
 * Known incorrect ATH dates that LLMs commonly hallucinate
 */
const KNOWN_HALLUCINATED_DATES: string[] = [
  'November 2021',
  'November 10, 2021',
  'Nov 2021',
  'December 2024',
  'December 17, 2024',
  'Dec 2024',
];

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  corrections: Array<{
    original: string;
    corrected: string;
    reason: string;
  }>;
  hallucinationsDetected: number;
}

export interface MarketDataContext {
  prices: Map<string, number>;
  aths: Map<string, { value: number; date: string }>;
  marketCaps: Map<string, number>;
}

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

/**
 * Extract market data values from the context string
 */
export function extractMarketDataFromContext(contextString: string): MarketDataContext {
  const prices = new Map<string, number>();
  const aths = new Map<string, { value: number; date: string }>();
  const marketCaps = new Map<string, number>();
  
  // Extract current prices: CURRENT_PRICE: $86,920
  const priceRegex = /│\s*(\w+)\s*\([^)]+\)[\s\S]*?│\s*CURRENT_PRICE:\s*\$?([\d,]+(?:\.\d+)?)/g;
  let match;
  
  // Simpler approach: look for structured data
  const lines = contextString.split('\n');
  let currentSymbol = '';
  
  for (const line of lines) {
    // Match symbol line: │ BTC (Bitcoin)
    const symbolMatch = line.match(/│\s*(\w+)\s*\([^)]+\)/);
    if (symbolMatch) {
      currentSymbol = symbolMatch[1].toUpperCase();
    }
    
    // Match CURRENT_PRICE
    const priceMatch = line.match(/CURRENT_PRICE:\s*\$?([\d,]+(?:\.\d+)?)/);
    if (priceMatch && currentSymbol) {
      prices.set(currentSymbol, parseFloat(priceMatch[1].replace(/,/g, '')));
    }
    
    // Match ALL_TIME_HIGH
    const athMatch = line.match(/ALL_TIME_HIGH:\s*\$?([\d,]+(?:\.\d+)?)/);
    if (athMatch && currentSymbol) {
      const athValue = parseFloat(athMatch[1].replace(/,/g, ''));
      aths.set(currentSymbol, { value: athValue, date: '' });
    }
    
    // Match ATH_DATE
    const athDateMatch = line.match(/ATH_DATE:\s*([A-Za-z]+\s+\d+,?\s+\d{4})/);
    if (athDateMatch && currentSymbol && aths.has(currentSymbol)) {
      const existing = aths.get(currentSymbol)!;
      aths.set(currentSymbol, { value: existing.value, date: athDateMatch[1] });
    }
    
    // Match MARKET_CAP
    const mcapMatch = line.match(/MARKET_CAP:\s*\$?([\d.]+)([BMT])/);
    if (mcapMatch && currentSymbol) {
      let value = parseFloat(mcapMatch[1]);
      const suffix = mcapMatch[2];
      if (suffix === 'T') value *= 1e12;
      else if (suffix === 'B') value *= 1e9;
      else if (suffix === 'M') value *= 1e6;
      marketCaps.set(currentSymbol, value);
    }
  }
  
  return { prices, aths, marketCaps };
}

/**
 * Extract ATH mentions from AI response
 */
function extractATHMentions(response: string): Array<{ symbol: string; value: number; dateStr?: string; fullMatch: string }> {
  const mentions: Array<{ symbol: string; value: number; dateStr?: string; fullMatch: string }> = [];
  
  // Pattern 1: "Bitcoin's all-time high was $108,786"
  const pattern1 = /(\w+)'?s?\s+(?:all[- ]?time[- ]?high|ATH)\s+(?:was|is|of|at|:)?\s*\$?([\d,]+)/gi;
  let match;
  while ((match = pattern1.exec(response)) !== null) {
    const symbol = normalizeSymbol(match[1]);
    if (symbol) {
      mentions.push({
        symbol,
        value: parseFloat(match[2].replace(/,/g, '')),
        fullMatch: match[0],
      });
    }
  }
  
  // Pattern 2: "ATH of $108,786" near "Bitcoin"
  const pattern2 = /ATH\s+(?:of|at|:)?\s*\$?([\d,]+)/gi;
  while ((match = pattern2.exec(response)) !== null) {
    // Look for nearby symbol
    const context = response.substring(Math.max(0, match.index - 50), match.index);
    const symbolMatch = context.match(/\b(Bitcoin|BTC|Ethereum|ETH|Solana|SOL)\b/i);
    if (symbolMatch) {
      const symbol = normalizeSymbol(symbolMatch[1]);
      if (symbol) {
        mentions.push({
          symbol,
          value: parseFloat(match[1].replace(/,/g, '')),
          fullMatch: match[0],
        });
      }
    }
  }
  
  return mentions;
}

/**
 * Normalize symbol name to ticker
 */
function normalizeSymbol(name: string): string | null {
  const normalized = name.toUpperCase();
  const mapping: Record<string, string> = {
    BITCOIN: 'BTC',
    BTC: 'BTC',
    ETHEREUM: 'ETH',
    ETH: 'ETH',
    SOLANA: 'SOL',
    SOL: 'SOL',
  };
  return mapping[normalized] || null;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate AI response against known hallucinations and context data
 */
export function validateAIResponse(
  response: string,
  contextString: string
): ValidationResult {
  const warnings: string[] = [];
  const corrections: ValidationResult['corrections'] = [];
  let hallucinationsDetected = 0;
  
  // Extract context data
  const contextData = extractMarketDataFromContext(contextString);
  
  // Extract ATH mentions from response
  const athMentions = extractATHMentions(response);
  
  for (const mention of athMentions) {
    const { symbol, value, fullMatch } = mention;
    
    // Check against known hallucinated values
    const knownHallucinations = KNOWN_HALLUCINATED_ATH[symbol] || [];
    const isKnownHallucination = knownHallucinations.some(h => 
      Math.abs(h - value) / h < 0.02 // Within 2%
    );
    
    if (isKnownHallucination) {
      hallucinationsDetected++;
      const contextATH = contextData.aths.get(symbol);
      
      if (contextATH) {
        corrections.push({
          original: fullMatch,
          corrected: `ATH of $${contextATH.value.toLocaleString()}`,
          reason: `Known hallucinated value $${value.toLocaleString()} from training data. Correct ATH is $${contextATH.value.toLocaleString()}`,
        });
        warnings.push(
          `⚠️ HALLUCINATION DETECTED: ${symbol} ATH "$${value.toLocaleString()}" is from outdated training data. ` +
          `Correct value from context: $${contextATH.value.toLocaleString()}`
        );
      } else {
        warnings.push(
          `⚠️ HALLUCINATION DETECTED: ${symbol} ATH "$${value.toLocaleString()}" appears to be from outdated training data. ` +
          `No ATH data was provided in context - AI should have said "data not available".`
        );
      }
    }
    
    // Check if value matches context (if context has data)
    const contextATH = contextData.aths.get(symbol);
    if (contextATH && !isKnownHallucination) {
      const deviation = Math.abs(value - contextATH.value) / contextATH.value;
      if (deviation > 0.05) { // More than 5% deviation
        warnings.push(
          `⚠️ VALUE MISMATCH: ${symbol} ATH in response ($${value.toLocaleString()}) differs from ` +
          `context ($${contextATH.value.toLocaleString()}) by ${(deviation * 100).toFixed(1)}%`
        );
      }
    }
  }
  
  // Check for hallucinated dates
  for (const dateStr of KNOWN_HALLUCINATED_DATES) {
    if (response.includes(dateStr)) {
      const isInContext = contextString.includes(dateStr);
      if (!isInContext) {
        hallucinationsDetected++;
        warnings.push(
          `⚠️ HALLUCINATED DATE: "${dateStr}" appears in response but not in context. ` +
          `This is likely from outdated training data.`
        );
      }
    }
  }
  
  return {
    isValid: hallucinationsDetected === 0,
    warnings,
    corrections,
    hallucinationsDetected,
  };
}

/**
 * Attempt to correct hallucinations in the response
 * Returns the corrected response and validation result
 */
export function correctHallucinations(
  response: string,
  contextString: string
): { correctedResponse: string; validation: ValidationResult } {
  const validation = validateAIResponse(response, contextString);
  
  if (validation.isValid) {
    return { correctedResponse: response, validation };
  }
  
  let correctedResponse = response;
  
  // Apply corrections
  for (const correction of validation.corrections) {
    // Simple replacement - could be more sophisticated
    correctedResponse = correctedResponse.replace(correction.original, correction.corrected);
  }
  
  // Log warnings
  for (const warning of validation.warnings) {
    logger.warn(warning);
  }
  
  if (validation.hallucinationsDetected > 0) {
    logger.error(`🚨 AI HALLUCINATION GUARD: Detected ${validation.hallucinationsDetected} hallucinations`, {
      warnings: validation.warnings,
      corrections: validation.corrections,
    });
  }
  
  return { correctedResponse, validation };
}

/**
 * Quick check if response likely contains hallucinations
 * Faster than full validation - use for quick filtering
 */
export function quickHallucinationCheck(response: string): boolean {
  // Check for known hallucinated ATH values
  for (const [symbol, values] of Object.entries(KNOWN_HALLUCINATED_ATH)) {
    for (const value of values) {
      // Check for the value with some formatting variations
      const patterns = [
        `$${value.toLocaleString()}`,
        `$${value}`,
        `${value.toLocaleString()}`,
      ];
      for (const pattern of patterns) {
        if (response.includes(pattern)) {
          // Double-check it's in an ATH context
          const index = response.indexOf(pattern);
          const context = response.substring(Math.max(0, index - 100), index + pattern.length + 50);
          if (/ATH|all[- ]?time[- ]?high|peak|record/i.test(context)) {
            return true;
          }
        }
      }
    }
  }
  
  // Check for hallucinated dates
  for (const dateStr of KNOWN_HALLUCINATED_DATES) {
    if (response.includes(dateStr)) {
      return true;
    }
  }
  
  return false;
}

export default {
  validateAIResponse,
  correctHallucinations,
  quickHallucinationCheck,
  extractMarketDataFromContext,
};
