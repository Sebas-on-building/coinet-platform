/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧠 COINET PROMPT COMPILER - Divine Perfection, Production-Ready          ║
 * ║                                                                               ║
 * ║   Eliminates instruction dilution by compiling policy layers into ONE        ║
 * ║   effective prompt. Moves enforceable rules to code validators.              ║
 * ║                                                                               ║
 * ║   ARCHITECTURE:                                                               ║
 * ║   - Minimal constitution (8 lines)                                           ║
 * ║   - Short runtime routine (6 steps)                                          ║
 * ║   - Code-enforced validators (language, facts, questions, JSON)              ║
 * ║   - Dynamic compilation based on session context                             ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, industry-outperforming                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';

// ============================================================================
// VERSION TRACKING
// ============================================================================

export const COMPILER_VERSION = {
  constitution: 'v1.0.0',
  contract: 'v1.0.0',
  compiler: 'v1.0.0',
} as const;

// ============================================================================
// IMMUTABLE CONSTITUTION (KEEP UNDER 10 LINES)
// ============================================================================

export const CONSTITUTION = `[CONSTITUTION]
1) Reply in the user's language. Do not mix languages.
2) Never invent token/market facts or numbers; use only provided payload data.
3) If required data is missing, say so plainly and ask permission to fetch (one question max).
4) Sound like a real trader friend: calm, direct, not performative, not cringe.
5) Don't interrogate; avoid menus. Ask at most one clarifier only when needed.
6) Takeaway first, then meaning. Keep it short unless the user asked for depth.
7) Separate facts (from payload) from interpretation (your take).
8) Output must follow the Strict Response Contract (JSON envelope).
END CONSTITUTION`;

// ============================================================================
// RUNTIME ROUTINE (SHORT, DETERMINISTIC)
// ============================================================================

export const RUNTIME_ROUTINE = `[RUNTIME ROUTINE]
Step A — Identify intent: SOCIAL / MARKET_OVERVIEW / COIN_CHECK / TOKEN_ANALYSIS / EXPLAIN_MOVE / SOURCES / OMNISCORE / LEARNING / TROUBLESHOOT / OTHER
Step B — Decide if data is required (current/today/numbers/news/token stats).
Step C — If data required but missing: ask to fetch, then stop.
Step D — Otherwise: answer human-first (takeaway → meaning → minimal facts).
Step E — End with no question by default. If needed, ask exactly one clarifier.
Step F — Produce Strict Response Contract JSON only.
END ROUTINE`;

// ============================================================================
// STRICT RESPONSE CONTRACT (JSON ENVELOPE)
// ============================================================================

export const STRICT_CONTRACT = `[STRICT RESPONSE CONTRACT]
Output exactly ONE valid JSON object with these keys:

{
  "output_language": "<lang>",
  "intent": "<INTENT>",
  "requires_data": true/false,
  "facts_used": ["<payload.path.key>", ...],
  "numbers_used": ["<number>", ...],
  "asked_question": true/false,
  "final_answer": "<human chat message>"
}

RULES:
- output_language must match session directive.
- intent must be one of: SOCIAL, MARKET_OVERVIEW, COIN_CHECK, TOKEN_ANALYSIS, EXPLAIN_MOVE, SOURCES, OMNISCORE, LEARNING, TROUBLESHOOT, OTHER.
- requires_data = true if user asks for current/today/numbers/stats.
- facts_used = dot-path keys from payload that you cited.
- numbers_used = every number in final_answer (as strings).
- asked_question = true only if final_answer has exactly one "?".
- final_answer = human chat text, no headings, no menus.

END CONTRACT`;

// ============================================================================
// TYPES
// ============================================================================

export type ResponseModeCap = 'S' | 'M' | 'L';
export type OutputLanguage = string;

export interface ResolvedTokenInfo {
  chain: string;
  address: string;
  symbol: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface PayloadSection {
  name: string;
  data: Record<string, any> | string | null;
  timestamp?: string;
  status: 'available' | 'missing' | 'partial' | 'not_applicable';
}

export interface SessionDirectives {
  outputLanguage: OutputLanguage;
  responseModeCap: ResponseModeCap;
  resolvedToken: ResolvedTokenInfo | null;
  toolAccess: {
    canFetchMarketData: boolean;
    canFetchTokenData: boolean;
    canFetchNews: boolean;
  };
}

export interface CompilerInput {
  sessionDirectives: SessionDirectives;
  payloads: PayloadSection[];
  /** Optional: Override constitution for testing */
  constitutionOverride?: string;
  /** Optional: Override routine for testing */
  routineOverride?: string;
}

export interface CompiledPrompt {
  systemPrompt: string;
  metadata: {
    constitutionVersion: string;
    contractVersion: string;
    compilerVersion: string;
    compiledAt: string;
    payloadCoverage: {
      available: string[];
      missing: string[];
    };
    characterCount: number;
  };
}

// ============================================================================
// PROMPT COMPILER
// ============================================================================

/**
 * Compile the final system prompt from constitution + routine + session + payloads
 */
export function compilePrompt(input: CompilerInput): CompiledPrompt {
  const startTime = Date.now();
  const { sessionDirectives, payloads } = input;
  
  // Track payload coverage
  const available: string[] = [];
  const missing: string[] = [];
  
  for (const payload of payloads) {
    if (payload.status === 'available' || payload.status === 'partial') {
      available.push(payload.name);
    } else if (payload.status === 'missing') {
      missing.push(payload.name);
    }
    // not_applicable payloads are not tracked
  }
  
  // Build session directives section
  const sessionSection = buildSessionDirectives(sessionDirectives);
  
  // Build payloads section with FACT GATE
  const payloadsSection = buildPayloadsSection(payloads, missing);
  
  // Compile final prompt
  const systemPrompt = `${input.constitutionOverride || CONSTITUTION}

${input.routineOverride || RUNTIME_ROUTINE}

${STRICT_CONTRACT}

${sessionSection}

${payloadsSection}

[FINAL REMINDER]
If a fact is not in the payload sections above, you must not mention it.
Produce JSON only. No other text.`;

  const compiledAt = new Date().toISOString();
  const characterCount = systemPrompt.length;
  
  logger.debug('📝 Prompt compiled', {
    characterCount,
    payloadsAvailable: available.length,
    payloadsMissing: missing.length,
    compilationTimeMs: Date.now() - startTime,
  });
  
  return {
    systemPrompt,
    metadata: {
      constitutionVersion: COMPILER_VERSION.constitution,
      contractVersion: COMPILER_VERSION.contract,
      compilerVersion: COMPILER_VERSION.compiler,
      compiledAt,
      payloadCoverage: { available, missing },
      characterCount,
    },
  };
}

/**
 * Build the session directives section
 */
function buildSessionDirectives(directives: SessionDirectives): string {
  const tokenInfo = directives.resolvedToken
    ? `${directives.resolvedToken.chain}/${directives.resolvedToken.address.slice(0, 10)}... (${directives.resolvedToken.symbol}, confidence: ${directives.resolvedToken.confidence})`
    : 'NONE';
  
  const toolFlags = [
    directives.toolAccess.canFetchMarketData ? 'market' : null,
    directives.toolAccess.canFetchTokenData ? 'token' : null,
    directives.toolAccess.canFetchNews ? 'news' : null,
  ].filter(Boolean).join(', ') || 'none';
  
  return `[SESSION DIRECTIVES]
output_language = ${directives.outputLanguage}
response_mode_cap = ${directives.responseModeCap}
resolved_token = ${tokenInfo}
tool_access = ${toolFlags}`;
}

/**
 * Build the payloads section with FACT GATE header
 */
function buildPayloadsSection(payloads: PayloadSection[], missing: string[]): string {
  const factGateHeader = `[FACT GATE + PAYLOADS]
You may ONLY cite facts from the sections below.
Missing modules: ${missing.length > 0 ? missing.join(', ') : 'none'}
`;

  const payloadBlocks: string[] = [];
  
  for (const payload of payloads) {
    if (payload.status === 'not_applicable') continue;
    
    if (payload.status === 'missing') {
      payloadBlocks.push(`--- ${payload.name.toUpperCase()} ---
Status: MISSING (do not cite)
`);
    } else if (payload.data) {
      const timestamp = payload.timestamp ? ` (as of ${payload.timestamp})` : '';
      const dataStr = typeof payload.data === 'string' 
        ? payload.data 
        : JSON.stringify(payload.data, null, 2);
      
      payloadBlocks.push(`--- ${payload.name.toUpperCase()}${timestamp} ---
${dataStr}
`);
    }
  }
  
  return factGateHeader + payloadBlocks.join('\n');
}

// ============================================================================
// QUICK PROMPT BUILDER (FOR SIMPLE CASES)
// ============================================================================

/**
 * Quick compile for simple messages without complex payloads
 */
export function compileSimplePrompt(
  outputLanguage: OutputLanguage,
  responseModeCap: ResponseModeCap = 'M'
): CompiledPrompt {
  return compilePrompt({
    sessionDirectives: {
      outputLanguage,
      responseModeCap,
      resolvedToken: null,
      toolAccess: {
        canFetchMarketData: true,
        canFetchTokenData: true,
        canFetchNews: true,
      },
    },
    payloads: [],
  });
}

/**
 * Compile with token context
 */
export function compileWithTokenContext(
  outputLanguage: OutputLanguage,
  tokenContext: {
    resolved: ResolvedTokenInfo;
    dexscreener?: Record<string, any>;
    security?: Record<string, any>;
    holders?: Record<string, any>;
    pumpfun?: Record<string, any>;
  }
): CompiledPrompt {
  const payloads: PayloadSection[] = [
    {
      name: 'token_context',
      data: {
        chain: tokenContext.resolved.chain,
        address: tokenContext.resolved.address,
        symbol: tokenContext.resolved.symbol,
      },
      status: 'available',
    },
  ];
  
  if (tokenContext.dexscreener) {
    payloads.push({
      name: 'dexscreener',
      data: tokenContext.dexscreener,
      timestamp: new Date().toISOString(),
      status: 'available',
    });
  } else {
    payloads.push({ name: 'dexscreener', data: null, status: 'missing' });
  }
  
  if (tokenContext.security) {
    payloads.push({
      name: 'security',
      data: tokenContext.security,
      timestamp: new Date().toISOString(),
      status: 'available',
    });
  } else {
    payloads.push({ name: 'security', data: null, status: 'missing' });
  }
  
  if (tokenContext.holders) {
    payloads.push({
      name: 'holders',
      data: tokenContext.holders,
      timestamp: new Date().toISOString(),
      status: 'available',
    });
  } else {
    payloads.push({ name: 'holders', data: null, status: 'missing' });
  }
  
  if (tokenContext.pumpfun) {
    payloads.push({
      name: 'pumpfun',
      data: tokenContext.pumpfun,
      timestamp: new Date().toISOString(),
      status: 'available',
    });
  } else if (tokenContext.resolved.chain === 'solana') {
    payloads.push({ name: 'pumpfun', data: null, status: 'missing' });
  } else {
    payloads.push({ name: 'pumpfun', data: null, status: 'not_applicable' });
  }
  
  return compilePrompt({
    sessionDirectives: {
      outputLanguage,
      responseModeCap: 'L', // Full analysis
      resolvedToken: tokenContext.resolved,
      toolAccess: {
        canFetchMarketData: true,
        canFetchTokenData: true,
        canFetchNews: true,
      },
    },
    payloads,
  });
}

/**
 * Compile with market snapshot
 */
export function compileWithMarketSnapshot(
  outputLanguage: OutputLanguage,
  marketSnapshot: Record<string, any>,
  derivativesSnapshot?: Record<string, any>,
  newsDigest?: string[]
): CompiledPrompt {
  const payloads: PayloadSection[] = [
    {
      name: 'market_snapshot',
      data: marketSnapshot,
      timestamp: new Date().toISOString(),
      status: 'available',
    },
  ];
  
  if (derivativesSnapshot) {
    payloads.push({
      name: 'derivatives_snapshot',
      data: derivativesSnapshot,
      timestamp: new Date().toISOString(),
      status: 'available',
    });
  }
  
  if (newsDigest && newsDigest.length > 0) {
    payloads.push({
      name: 'news_digest',
      data: { headlines: newsDigest },
      timestamp: new Date().toISOString(),
      status: 'available',
    });
  }
  
  return compilePrompt({
    sessionDirectives: {
      outputLanguage,
      responseModeCap: 'M',
      resolvedToken: null,
      toolAccess: {
        canFetchMarketData: true,
        canFetchTokenData: true,
        canFetchNews: true,
      },
    },
    payloads,
  });
}

// ============================================================================
// EXPORT CONSTITUTION FOR REFERENCE
// ============================================================================

export { CONSTITUTION as COINET_CONSTITUTION };
export { RUNTIME_ROUTINE as COINET_RUNTIME_ROUTINE };
export { STRICT_CONTRACT as COINET_STRICT_CONTRACT };
