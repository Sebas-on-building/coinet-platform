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
import {
  TokenEvidencePack,
  CoverageMap,
  EVIDENCE_PACK_VERSION,
  ResolutionMethod,
} from '../../evidence-pack/types';

// ============================================================================
// MOCK EVIDENCE PACK
// ============================================================================

export const MOCK_COVERAGE: CoverageMap = {
  available: ['dexscreener', 'security'],
  missing: ['holders', 'pumpfun'],
  stale: [],
  errors: ['holders'],
  freshness_seconds: { dexscreener: 15, security: 60 },
  quality_score: 0.8,
  time_disclosure_required: false,
};

export const MOCK_EVIDENCE_PACK: TokenEvidencePack = {
  version: EVIDENCE_PACK_VERSION,
  kind: 'TOKEN',
  request: {
    user_message: 'analyze this token',
    language: 'en',
    intent: 'NEW_COIN_ANALYSIS',
    timeframe: 'snapshot',
    requested_depth: 'M',
    received_at_unix: Math.floor(Date.now() / 1000),
  },
  token_resolution: {
    input_entities: ['PEPE'],
    resolved: [
      {
        symbol: 'PEPE',
        name: 'Pepe Coin',
        chain: 'solana',
        address: 'ABC123xyz456',
        confidence: 0.95,
        margin: 0.2,
        method: 'address' as ResolutionMethod,
        is_user_confirmed: true,
        candidates: [],
      },
    ],
    clarifier: null,
    used_session_cache: false,
  },
  evidence: {
    dexscreener: {
      status: 'ok',
      ts: Math.floor(Date.now() / 1000),
      source: 'DexScreener',
      freshness_seconds: 15,
      data: {
        price_usd: 0.00042,
        liquidity_usd: 45000,
        volume_24h_usd: 125000,
        pair_age_hours: 4.5,
        txns_24h: { buys: 342, sells: 128 },
        price_change_24h: 12.5,
      },
    },
    security: {
      status: 'ok',
      ts: Math.floor(Date.now() / 1000),
      source: 'rugcheck.xyz',
      freshness_seconds: 60,
      data: {
        risk_score: 45,
        flags: [
          { code: 'MINTABLE', severity: 'medium', description: 'Token is mintable' },
          { code: 'NO_SOCIALS', severity: 'info', description: 'No verified socials' },
        ],
        is_honeypot: false,
        is_mintable: true,
        is_proxy: false,
        is_open_source: true,
        can_take_back_ownership: false,
        has_blacklist: false,
        buy_tax: 0,
        sell_tax: 0,
        provider: 'rugcheck',
      },
    },
  },
  coverage: MOCK_COVERAGE,
};

// ============================================================================
// VALID INSIGHT PACK
// ============================================================================

export const VALID_INSIGHT_PACK: InsightPackV1 = {
  meta: {
    version: INSIGHT_PACK_VERSION,
    engine: 'grok',
    intent: 'new_coin_analysis',
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
      evidence_keys: ['evidence.dexscreener.data.liquidity_usd', 'evidence.dexscreener.data.volume_24h_usd'],
      severity: 'medium',
      confidence: 'high',
    },
  ],
  catalysts_next: [
    {
      id: 'c1',
      topic: 'Volume continuation',
      why_it_matters: 'Current trading activity suggests potential for continued price discovery if momentum persists',
      evidence_keys: ['evidence.dexscreener.data.volume_24h_usd', 'evidence.dexscreener.data.txns_24h.buys'],
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

export const INVALID_PROSE_JSON = `
Here's my analysis of the token:

Based on the evidence pack, I can see several key factors.

${VALID_INSIGHT_PACK_JSON}

I hope this helps with your trading decision!
`;

export const FENCED_JSON = `\`\`\`json
${VALID_INSIGHT_PACK_JSON}
\`\`\``;

export const EXTRA_KEYS_JSON = JSON.stringify({
  ...VALID_INSIGHT_PACK,
  extra_field: 'this should not be here',
  another_extra: { nested: 'value' },
}, null, 2);

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

export const NUMERIC_LITERALS_JSON = JSON.stringify({
  ...VALID_INSIGHT_PACK,
  drivers: [
    {
      id: 'd1',
      topic: 'Price movement',
      summary: 'Price increased significantly in the last period, with strong volume',
      evidence_keys: ['evidence.dexscreener.data.price_change_24h'],
      confidence: 'high',
    },
  ],
  risks: [
    {
      id: 'r1',
      risk: 'Holder concentration',
      why: 'Top holders own significant supply share, with several wallets holding meaningful percentages',
      evidence_keys: ['evidence.security.data.risk_score'],
      severity: 'high',
      confidence: 'high',
    },
  ],
}, null, 2);

export const MISSING_FIELDS_JSON = JSON.stringify({
  meta: {
    version: INSIGHT_PACK_VERSION,
    engine: 'grok',
  },
}, null, 2);

export const WRONG_ENUM_JSON = JSON.stringify({
  ...VALID_INSIGHT_PACK,
  overall_confidence: 'very_high',
  drivers: [
    {
      id: 'd1',
      topic: 'Test',
      summary: 'Test driver with wrong confidence enum',
      evidence_keys: ['evidence.dexscreener.data.price_usd'],
      confidence: 'super_high',
      direction: 'up',
    },
  ],
}, null, 2);

export const GROK_ERROR_OUTPUT = JSON.stringify({
  error: 'SCHEMA_VIOLATION',
  reason: 'Unable to generate valid InsightPack due to insufficient evidence',
});

export const EMPTY_JSON = '{}';

export const INVALID_JSON_SYNTAX = `{
  "meta": {
    "version": "${INSIGHT_PACK_VERSION}",
    "engine": "grok",
    invalid syntax here
  }
}`;

export const USER_FACING_LANGUAGE_JSON = JSON.stringify({
  ...VALID_INSIGHT_PACK,
  drivers: [
    {
      id: 'd1',
      topic: 'Market analysis',
      summary: "I don't have enough data to analyze this token properly. Could you provide more information?",
      evidence_keys: ['evidence.dexscreener.data.price_usd'],
      confidence: 'low',
    },
  ],
}, null, 2);

// ============================================================================
// EDGE CASE MATRIX
// ============================================================================

export const EDGE_CASE_FIXTURES = [
  { name: 'Valid InsightPack', input: VALID_INSIGHT_PACK_JSON, expectedOk: true, expectedDegraded: false },
  { name: 'Prose + JSON mix (FIX #7 - strict extraction fails)', input: INVALID_PROSE_JSON, expectedOk: false, expectedDegraded: false },
  { name: 'Fenced JSON (FIX #7 - strict extraction fails)', input: FENCED_JSON, expectedOk: false, expectedDegraded: false },
  { name: 'Extra keys in JSON (FIX #1 - .strict())', input: EXTRA_KEYS_JSON, expectedOk: false, expectedDegraded: false },
  { name: 'Invalid evidence keys', input: INVALID_EVIDENCE_KEYS_JSON, expectedOk: true, expectedDegraded: true },
  { name: 'Numeric literals in summaries (FIX #4)', input: NUMERIC_LITERALS_JSON, expectedOk: false, expectedDegraded: false },
  { name: 'Missing required fields', input: MISSING_FIELDS_JSON, expectedOk: false, expectedDegraded: false },
  { name: 'Wrong enum values', input: WRONG_ENUM_JSON, expectedOk: false, expectedDegraded: false },
  { name: 'Grok error output', input: GROK_ERROR_OUTPUT, expectedOk: false, expectedDegraded: false },
  { name: 'Empty JSON object', input: EMPTY_JSON, expectedOk: false, expectedDegraded: false },
  { name: 'Invalid JSON syntax', input: INVALID_JSON_SYNTAX, expectedOk: false, expectedDegraded: false },
  { name: 'User-facing language (FIX #8)', input: USER_FACING_LANGUAGE_JSON, expectedOk: false, expectedDegraded: false },
];
