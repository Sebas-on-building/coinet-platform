/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 INSIGHT PACK — TEST FIXTURES                                           ║
 * ║                                                                               ║
 * ║   Golden fixtures for testing enforcement and validation.                     ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { InsightPackV1, INSIGHT_PACK_VERSION } from '../types';
import { TokenEvidencePack, CoverageMap } from '../../evidence-pack/types';

// ============================================================================
// MOCK EVIDENCE PACK
// ============================================================================

export const MOCK_COVERAGE: CoverageMap = {
  kind: 'TOKEN',
  available: ['dexscreener', 'security'],
  missing: ['holders', 'pumpfun'],
  freshness_seconds: { dexscreener: 15, security: 60 },
  errors: { holders: { code: 'TIMEOUT', message: 'Timeout' } },
  planned_modules: ['dexscreener', 'security', 'holders', 'pumpfun'],
  used_budget_tier: 'full',
  total_latency_ms: 500,
};

export const MOCK_EVIDENCE_PACK: TokenEvidencePack = {
  kind: 'TOKEN',
  request: {
    user_message: 'analyze this token',
    language: 'en',
    intent: 'new_coin_analysis',
  },
  resolution: {
    status: 'CONFIRMED',
    primary: {
      chain: 'solana',
      address: 'ABC123xyz456',
      symbol: 'PEPE',
      name: 'Pepe Coin',
      confidence: 0.95,
    },
    candidates: [],
    clarification_question: null,
    resolution_source: 'address_direct',
  },
  evidence: {
    dexscreener: {
      module: 'dexscreener',
      status: 'success',
      ts: Date.now(),
      freshness_seconds: 15,
      source: 'dexscreener.com',
      data: {
        price: 0.00042,
        price_change_24h: 12.5,
        price_change_1h: 2.1,
        price_change_5m: 0.5,
        volume_24h: 125000,
        liquidity: 45000,
        market_cap: null,
        fdv: null,
        pair_age_hours: 4.5,
        pair_created_at: '2024-01-01T00:00:00Z',
        txns_24h: { buys: 342, sells: 128, total: 470 },
        pair_address: '0xabc123',
        dex_id: 'raydium',
      },
      from_cache: false,
      latency_ms: 250,
    },
    security: {
      module: 'security',
      status: 'success',
      ts: Date.now(),
      freshness_seconds: 60,
      source: 'rugcheck.xyz',
      data: {
        risk_level: 'medium',
        risk_score: 45,
        flags: [
          { code: 'MINTABLE', severity: 'warning', description: 'Token is mintable' },
          { code: 'NO_SOCIALS', severity: 'info', description: 'No verified socials' },
        ],
        is_honeypot: false,
        is_mintable: true,
        is_proxy: false,
        is_open_source: true,
        can_take_back_ownership: false,
        has_blacklist: false,
        has_trading_cooldown: false,
        buy_tax: 0,
        sell_tax: 0,
        is_freeze_authority: false,
        is_mint_authority: true,
        notes: [],
      },
      from_cache: false,
      latency_ms: 350,
    },
    holders: null,
    pumpfun: null,
    smartmoney: null,
  },
  coverage: MOCK_COVERAGE,
  built_at: new Date().toISOString(),
};

// ============================================================================
// VALID INSIGHT PACK
// ============================================================================

export const VALID_INSIGHT_PACK: InsightPackV1 = {
  meta: {
    version: INSIGHT_PACK_VERSION,
    engine: 'grok',
    intent: 'new_coin_analysis',  // Now an enum
    language: 'en',
    asset_focus: 'PEPE',
    chain: 'solana',
    timeframe: 'snapshot',
    created_at_unix: Math.floor(Date.now() / 1000),
  },
  coverage_used: {
    available_modules: ['dexscreener', 'security'],
    missing_modules: ['holders', 'pumpfun'],
    max_data_age_seconds: 60,
  },
  drivers: [
    {
      id: 'd1',
      topic: 'Strong trading momentum',
      summary: 'Buy-side pressure significantly exceeds sell-side, indicating accumulation phase',
      evidence_keys: ['evidence.dexscreener.data.txns_24h.buys', 'evidence.dexscreener.data.txns_24h.sells'],
      confidence: 'high',
      direction: 'bullish',
    },
    {
      id: 'd2',
      topic: 'Recently launched token',
      summary: 'Token pair was created very recently, still in early price discovery phase',
      evidence_keys: ['evidence.dexscreener.data.pair_age_hours'],
      confidence: 'medium',
    },
  ],
  risks: [
    {
      id: 'r1',
      risk: 'Mintable token supply',
      why: 'Token authority can mint additional supply, potentially diluting holders',
      evidence_keys: ['evidence.security.data.is_mintable', 'evidence.security.data.flags[0].code'],
      severity: 'medium',
      confidence: 'high',
    },
    {
      id: 'r2',
      risk: 'Limited liquidity depth',
      why: 'Liquidity pool is relatively shallow for the trading volume, which could lead to high slippage',
      evidence_keys: ['evidence.dexscreener.data.liquidity', 'evidence.dexscreener.data.volume_24h'],
      severity: 'medium',
      confidence: 'high',
    },
  ],
  catalysts_next: [
    {
      id: 'c1',
      topic: 'Volume continuation',
      why_it_matters: 'Current trading activity suggests potential for continued price discovery if momentum persists',
      evidence_keys: ['evidence.dexscreener.data.volume_24h', 'evidence.dexscreener.data.txns_24h.total'],
      horizon: 'days',
      confidence: 'medium',
    },
  ],
  scenarios: {
    bull: {
      summary: 'Continued buying pressure and positive social sentiment could drive significant price appreciation. Early discovery phase offers asymmetric upside potential.',
      probability: 'possible',
      key_triggers: ['Sustained buying momentum', 'Social media virality', 'Exchange listing announcement'],
    },
    base: {
      summary: 'Trading activity stabilizes at current levels, with price consolidating as the market digests the initial launch.',
      probability: 'likely',
      key_triggers: ['Volume normalization', 'Liquidity growth', 'Community building'],
    },
    bear: {
      summary: 'Early holders take profits, combined with general market weakness, could lead to significant price decline. Mintable supply adds downside risk.',
      probability: 'possible',
      key_triggers: ['Large sell orders', 'Negative market sentiment', 'Supply inflation'],
    },
  },
  unknowns: [
    {
      id: 'u1',
      what: 'Holder distribution and whale concentration',
      why_unknown: 'missing_module',
      would_help: 'Solscan holder data',
    },
    {
      id: 'u2',
      what: 'Bonding curve status if pump.fun token',
      why_unknown: 'missing_module',
      would_help: 'pump.fun API data',
    },
  ],
  overall_confidence: 'medium',
  required_clarifier: null,
};

export const VALID_INSIGHT_PACK_JSON = JSON.stringify(VALID_INSIGHT_PACK, null, 2);

// ============================================================================
// INVALID FIXTURES
// ============================================================================

/**
 * Prose + JSON mix (should fail extraction initially)
 */
export const INVALID_PROSE_JSON = `
Here's my analysis of the token:

Based on the evidence pack, I can see several key factors.

${VALID_INSIGHT_PACK_JSON}

I hope this helps with your trading decision!
`;

/**
 * JSON with markdown fences
 */
export const FENCED_JSON = `\`\`\`json
${VALID_INSIGHT_PACK_JSON}
\`\`\``;

/**
 * JSON with extra keys (should fail schema validation)
 */
export const EXTRA_KEYS_JSON = JSON.stringify({
  ...VALID_INSIGHT_PACK,
  extra_field: 'this should not be here',
  another_extra: { nested: 'value' },
}, null, 2);

/**
 * JSON with invalid evidence_keys
 */
export const INVALID_EVIDENCE_KEYS_JSON = JSON.stringify({
  ...VALID_INSIGHT_PACK,
  drivers: [
    {
      id: 'd1',
      topic: 'Invalid evidence',
      summary: 'This driver references non-existent evidence paths',
      evidence_keys: [
        'evidence.fake_module.data.field',
        'evidence.dexscreener.nonexistent.path',
        'this.is.not.valid.evidence.key.format',
      ],
      confidence: 'high',
    },
  ],
}, null, 2);

/**
 * JSON with numeric literals in summaries (should fail policy check)
 */
export const NUMERIC_LITERALS_JSON = JSON.stringify({
  ...VALID_INSIGHT_PACK,
  drivers: [
    {
      id: 'd1',
      topic: 'Price movement',
      summary: 'Price increased 15% in the last 24 hours, with volume at $125,000',
      evidence_keys: ['evidence.dexscreener.data.price_change_24h'],
      confidence: 'high',
    },
  ],
  risks: [
    {
      id: 'r1',
      risk: 'Holder concentration',
      why: 'Top 10 holders own 58% of supply, with 3 wallets holding over 5% each',
      evidence_keys: ['evidence.security.data.risk_score'],
      severity: 'high',
      confidence: 'high',
    },
  ],
}, null, 2);

/**
 * JSON with missing required fields
 */
export const MISSING_FIELDS_JSON = JSON.stringify({
  meta: {
    version: INSIGHT_PACK_VERSION,
    engine: 'grok',
    // Missing: intent, language, asset_focus, chain, timeframe, created_at_unix
  },
  // Missing: coverage_used, drivers, risks, catalysts_next, scenarios, unknowns, overall_confidence, required_clarifier
}, null, 2);

/**
 * JSON with wrong enum values
 */
export const WRONG_ENUM_JSON = JSON.stringify({
  ...VALID_INSIGHT_PACK,
  overall_confidence: 'very_high',  // Invalid: should be high|medium|low
  drivers: [
    {
      id: 'd1',
      topic: 'Test',
      summary: 'Test driver with wrong confidence enum',
      evidence_keys: ['evidence.dexscreener.data.price'],
      confidence: 'super_high',  // Invalid
      direction: 'up',  // Invalid: should be bullish|bearish|neutral|mixed
    },
  ],
}, null, 2);

/**
 * Grok error output
 */
export const GROK_ERROR_OUTPUT = JSON.stringify({
  error: 'SCHEMA_VIOLATION',
  reason: 'Unable to generate valid InsightPack due to insufficient evidence',
});

/**
 * Empty JSON object
 */
export const EMPTY_JSON = '{}';

/**
 * Invalid JSON (syntax error)
 */
export const INVALID_JSON_SYNTAX = `{
  "meta": {
    "version": "${INSIGHT_PACK_VERSION}",
    "engine": "grok",
    // This is a comment which makes it invalid JSON
    invalid syntax here
  }
}`;

/**
 * JSON with user-facing language (Pass-1 should not speak to user)
 */
export const USER_FACING_LANGUAGE_JSON = JSON.stringify({
  ...VALID_INSIGHT_PACK,
  drivers: [
    {
      id: 'd1',
      topic: 'Market analysis',
      summary: "I don't have enough data to analyze this token properly. Could you provide more information?",
      evidence_keys: ['evidence.dexscreener.data.price'],
      confidence: 'low',
    },
  ],
}, null, 2);

// ============================================================================
// EDGE CASE MATRIX
// ============================================================================

/**
 * Edge case matrix for enforcer tests.
 * NOTE: All tests run with STRICT mode (FIX #7, #8):
 * - strictJsonExtraction: true (no leading/trailing text)
 * - strictUserTalk: true (no user-facing language)
 */
export const EDGE_CASE_FIXTURES = [
  {
    name: 'Valid InsightPack',
    input: VALID_INSIGHT_PACK_JSON,
    expectedOk: true,
    expectedDegraded: false,
  },
  {
    name: 'Prose + JSON mix (FIX #7 - strict extraction fails)',
    input: INVALID_PROSE_JSON,
    expectedOk: false,  // FIX #7: Strict mode rejects leading/trailing text
    expectedDegraded: false,
  },
  {
    name: 'Fenced JSON (FIX #7 - strict extraction fails)',
    input: FENCED_JSON,
    expectedOk: false,  // FIX #7: Strict mode rejects code fences
    expectedDegraded: false,
  },
  {
    name: 'Extra keys in JSON (FIX #1 - .strict())',
    input: EXTRA_KEYS_JSON,
    expectedOk: false,  // FIX #1: Zod .strict() rejects extra keys
    expectedDegraded: false,
  },
  {
    name: 'Invalid evidence keys',
    input: INVALID_EVIDENCE_KEYS_JSON,
    expectedOk: true,  // Should succeed but be degraded
    expectedDegraded: true,
  },
  {
    name: 'Numeric literals in summaries (FIX #4)',
    input: NUMERIC_LITERALS_JSON,
    expectedOk: false,  // FIX #4: Strict mode fails on numeric literals
    expectedDegraded: false,
  },
  {
    name: 'Missing required fields',
    input: MISSING_FIELDS_JSON,
    expectedOk: false,
    expectedDegraded: false,
  },
  {
    name: 'Wrong enum values',
    input: WRONG_ENUM_JSON,
    expectedOk: false,
    expectedDegraded: false,
  },
  {
    name: 'Grok error output',
    input: GROK_ERROR_OUTPUT,
    expectedOk: false,
    expectedDegraded: false,
  },
  {
    name: 'Empty JSON object',
    input: EMPTY_JSON,
    expectedOk: false,
    expectedDegraded: false,
  },
  {
    name: 'Invalid JSON syntax',
    input: INVALID_JSON_SYNTAX,
    expectedOk: false,
    expectedDegraded: false,
  },
  {
    name: 'User-facing language (FIX #8)',
    input: USER_FACING_LANGUAGE_JSON,
    expectedOk: false,  // FIX #8: Strict mode fails on user-facing language
    expectedDegraded: false,
  },
];
