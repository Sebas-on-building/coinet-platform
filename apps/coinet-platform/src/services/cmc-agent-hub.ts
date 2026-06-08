/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   CMC AI AGENT HUB — CoinMarketCap MCP client (Layer-1 macro/derivatives source)║
 * ║                                                                               ║
 * ║   Standard MCP (StreamableHTTP) → https://mcp.coinmarketcap.com/mcp            ║
 * ║   Auth header: X-CMC-MCP-API-KEY (env CMC_MCP_API_KEY, falls back CMC_API_KEY).║
 * ║                                                                               ║
 * ║   DOCTRINE (frozen Phase 1):                                                   ║
 * ║   - Defensive read-by-path: every field is read through a list of candidate    ║
 * ║     dot-paths; the FIRST numeric match wins, otherwise the field stays          ║
 * ║     undefined. Nothing is ever invented. Exact field paths are pinned against  ║
 * ║     the first real response after deploy — until then, unmatched fields simply ║
 * ║     stay defaulted downstream (regime engine `withDefaults`).                   ║
 * ║   - Never throws to the caller: returns null on any failure (no key, transport,║
 * ║     parse, or tool error). The chat pipeline wraps this in trackFetch, so null ║
 * ║     degrades honestly rather than aborting judgment.                            ║
 * ║   - 5-min cache: macro/derivatives metrics move slowly and MCP calls are billed.║
 * ║                                                                               ║
 * ║   GOVERNANCE: CMC is registered per-atom in services/source-systems/authority  ║
 * ║   (co-primary with CoinGecko on macro atoms; challenger on derivatives). It has ║
 * ║   no vague global authority.                                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';

// ── Config ──────────────────────────────────────────────────────────────────
const CMC_MCP_URL = process.env.CMC_MCP_URL || 'https://mcp.coinmarketcap.com/mcp';
// CMC_MCP_API_KEY is preferred; the standard CMC_API_KEY is accepted as a fallback
// so a single CoinMarketCap key works for both the REST path and the Agent Hub.
const CMC_MCP_API_KEY = process.env.CMC_MCP_API_KEY || process.env.CMC_API_KEY || '';
const CMC_MCP_HEADER = 'X-CMC-MCP-API-KEY';

const TTL_MS = 5 * 60 * 1000; // 5-min cache (global + per-symbol derivatives)
const CONNECT_TIMEOUT_MS = 8000;

// Tool names per the documented CMC Agent Hub tool set. Overridable via env in
// case the published tool slugs differ from what we pin here (verified live).
const TOOL_GLOBAL = process.env.CMC_MCP_TOOL_GLOBAL || 'getGlobalMetrics';
const TOOL_DERIVATIVES = process.env.CMC_MCP_TOOL_DERIVATIVES || 'getDerivativesData';

// ── Public shapes (all fields optional — present only when really mapped) ──────
export interface CmcGlobalMetrics {
  fearGreed?: number;               // 0–100 Fear & Greed index
  btcDominance?: number;            // % of total market cap
  totalMarketCap?: number;          // USD
  totalMarketCapChange24h?: number; // % change (24h)
  btcPriceChange7d?: number;        // % (coverage win vs CoinGecko /global)
  btcDominanceChange7d?: number;    // % points (coverage win)
  stablecoinMcapChange7d?: number;  // % (coverage win)
}

export interface CmcDerivatives {
  aggFunding?: number;       // aggregate funding rate
  oiChange24h?: number;      // open-interest % change (24h)
  longShortRatio?: number;   // aggregate long/short ratio
  liquidations24h?: number;  // total liquidations (USD, 24h)
}

// ── Defensive path readers (read-by-path, neutral-on-missing) ─────────────────
function getByPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  let cur: any = obj;
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[key];
  }
  return cur;
}

/** First finite number found across candidate paths, else undefined. */
function readNum(obj: unknown, paths: string[]): number | undefined {
  for (const p of paths) {
    const v = getByPath(obj, p);
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

/** Drop undefined keys so callers only ever see fields we actually mapped. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

// ── MCP transport (loaded via runtime dynamic import) ─────────────────────────
// tsconfig uses `moduleResolution: node` (classic), which does NOT honor the
// SDK's package `exports` map for type resolution — a static import would fail
// `tsc`. Node's native `import()` DOES honor it at runtime. Routing the import
// through `new Function` keeps the specifier opaque to tsc while preserving a
// genuine ESM dynamic import at runtime.
const nativeImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<any>;

/**
 * Open an MCP client, call a single tool, return its parsed payload, then close.
 * Per-call connect keeps the client stateless and robust (no session lifecycle
 * to leak); the 5-min cache keeps call volume low. Returns null on any failure.
 */
async function callCmcTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown | null> {
  if (!CMC_MCP_API_KEY) return null;

  let client: any = null;
  try {
    const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
      nativeImport('@modelcontextprotocol/sdk/client/index.js'),
      nativeImport('@modelcontextprotocol/sdk/client/streamableHttp.js'),
    ]);

    const transport = new StreamableHTTPClientTransport(new URL(CMC_MCP_URL), {
      requestInit: { headers: { [CMC_MCP_HEADER]: CMC_MCP_API_KEY } },
    });

    client = new Client(
      { name: 'coinet-cmc-agent-hub', version: '1.0.0' },
      { capabilities: {} },
    );

    const connectPromise = client.connect(transport);
    await withTimeout(connectPromise, CONNECT_TIMEOUT_MS, 'cmc-mcp connect');

    let result: any;
    try {
      result = await withTimeout(
        client.callTool({ name: toolName, arguments: args }),
        CONNECT_TIMEOUT_MS,
        `cmc-mcp ${toolName}`,
      );
    } catch (callError: any) {
      // The tool call failed AFTER a successful connect+auth (an auth failure
      // surfaces on connect, not here). The most common cause is a wrong tool
      // slug ("Unknown tool"). Self-report the server's REAL tool names so the
      // correct slug can be pinned via CMC_MCP_TOOL_* env with no code change.
      await logAvailableCmcTools(client, toolName, callError?.message);
      return null;
    }

    const payload = extractToolPayload(result);
    // One-shot field-path pinning aid: with CMC_MCP_DEBUG_RAW set, log the raw
    // payload (truncated) so the exact field paths can be pinned against the
    // real response. Off by default — never logs provider payloads in prod.
    if (payload && process.env.CMC_MCP_DEBUG_RAW) {
      logger.info('CMC Agent Hub RAW payload', {
        tool: toolName,
        raw: JSON.stringify(payload).slice(0, 2000),
      });
    }
    return payload;
  } catch (error: any) {
    logger.warn('CMC Agent Hub MCP call failed', { tool: toolName, error: error?.message });
    return null;
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        /* best-effort close */
      }
    }
  }
}

/**
 * Diagnostic: when a tool call fails (e.g. unknown slug), ask the server for
 * its real tool list and log the exact names. This is how the correct slugs
 * get discovered and then pinned via CMC_MCP_TOOL_GLOBAL / CMC_MCP_TOOL_DERIVATIVES
 * (env, no code change). Best-effort — swallows its own errors.
 */
async function logAvailableCmcTools(
  client: any,
  attemptedTool: string,
  callErrorMessage: string | undefined,
): Promise<void> {
  try {
    const listed: any = await withTimeout(client.listTools(), CONNECT_TIMEOUT_MS, 'cmc-mcp tools/list');
    const names = Array.isArray(listed?.tools)
      ? listed.tools.map((t: any) => t?.name).filter(Boolean)
      : [];
    logger.warn('CMC Agent Hub tool call failed — server tool slugs follow', {
      attempted_tool: attemptedTool,
      error: callErrorMessage,
      available_tools: names,
    });
  } catch (listError: any) {
    logger.warn('CMC Agent Hub tool call failed and tools/list also failed', {
      attempted_tool: attemptedTool,
      call_error: callErrorMessage,
      list_error: listError?.message,
    });
  }
}

/**
 * MCP tool results carry `structuredContent` (preferred) and/or a `content`
 * array of `{ type:'text', text }` items. Prefer structured; else parse the
 * first JSON-looking text block. Returns the raw payload object or null.
 */
function extractToolPayload(result: any): unknown | null {
  if (!result) return null;
  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const content = Array.isArray(result.content) ? result.content : [];
  for (const item of content) {
    if (item?.type === 'text' && typeof item.text === 'string') {
      try {
        return JSON.parse(item.text);
      } catch {
        /* not JSON — try next block */
      }
    }
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// ── Caches ────────────────────────────────────────────────────────────────────
let globalCache: { data: CmcGlobalMetrics | null; timestamp: number } = { data: null, timestamp: 0 };
const derivCache = new Map<string, { data: CmcDerivatives | null; timestamp: number }>();

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Global macro metrics from the CMC Agent Hub Global Market Metrics tool.
 * Co-primary with CoinGecko /global on dominance + total market cap; sole source
 * for the 7-day coverage-win fields when CMC exposes them. Returns null on any
 * failure; only maps fields that are actually present (never invents).
 */
export async function getCmcGlobalMetrics(): Promise<CmcGlobalMetrics | null> {
  if (globalCache.data && Date.now() - globalCache.timestamp < TTL_MS) {
    return globalCache.data;
  }

  const payload = await callCmcTool(TOOL_GLOBAL, {});
  if (!payload) return null;

  const data = mapCmcGlobalPayload(payload);
  globalCache = { data, timestamp: Date.now() };
  if (data) {
    logger.debug('🟡 CMC Agent Hub /global mapped', {
      fields: Object.keys(data),
      btcDominance: data.btcDominance,
    });
  }
  return data;
}

/**
 * Pure, defensive projection of a raw CMC global-metrics payload → CmcGlobalMetrics.
 * Reads each field through a list of candidate dot-paths (first numeric match
 * wins); unmatched fields stay undefined. Returns null when nothing mapped.
 * Exported for unit testing the field-path mapping with zero network.
 */
export function mapCmcGlobalPayload(payload: unknown): CmcGlobalMetrics | null {
  // Defensive candidate paths spanning documented CMC global-metrics shapes.
  const mapped: CmcGlobalMetrics = compact({
    fearGreed: readNum(payload, [
      'data.fear_and_greed.value',
      'fear_and_greed.value',
      'data.fear_greed_index',
      'fear_greed_index',
    ]),
    btcDominance: readNum(payload, [
      'data.btc_dominance',
      'btc_dominance',
      'data.quote.USD.btc_dominance',
    ]),
    totalMarketCap: readNum(payload, [
      'data.quote.USD.total_market_cap',
      'quote.USD.total_market_cap',
      'data.total_market_cap',
    ]),
    totalMarketCapChange24h: readNum(payload, [
      'data.quote.USD.total_market_cap_yesterday_percentage_change',
      'quote.USD.total_market_cap_yesterday_percentage_change',
      'data.total_market_cap_change_24h',
      'total_market_cap_change_24h',
    ]),
    btcPriceChange7d: readNum(payload, [
      'data.btc_price_change_7d',
      'btc_price_change_7d',
      'data.quote.USD.btc_percent_change_7d',
    ]),
    btcDominanceChange7d: readNum(payload, [
      'data.btc_dominance_change_7d',
      'btc_dominance_change_7d',
    ]),
    stablecoinMcapChange7d: readNum(payload, [
      'data.stablecoin_market_cap_change_7d',
      'stablecoin_market_cap_change_7d',
      'data.quote.USD.stablecoin_volume_24h_percentage_change',
    ]),
  });

  return Object.keys(mapped).length > 0 ? mapped : null;
}

/**
 * Aggregate derivatives metrics from the CMC Agent Hub Derivatives tool.
 * Registered as a CHALLENGER to Coinglass (the ABSOLUTE primary) — used to
 * widen coverage / cross-check, not to override. Returns null on any failure.
 */
export async function getCmcDerivatives(symbol: string): Promise<CmcDerivatives | null> {
  const key = (symbol || '').toUpperCase();
  if (!key) return null;

  const cached = derivCache.get(key);
  if (cached && Date.now() - cached.timestamp < TTL_MS) {
    return cached.data;
  }

  const payload = await callCmcTool(TOOL_DERIVATIVES, { symbol: key });
  if (!payload) return null;

  const data = mapCmcDerivativesPayload(payload);
  derivCache.set(key, { data, timestamp: Date.now() });
  if (data) {
    logger.debug('🟡 CMC Agent Hub derivatives mapped', { symbol: key, fields: Object.keys(data) });
  }
  return data;
}

/**
 * Pure, defensive projection of a raw CMC derivatives payload → CmcDerivatives.
 * Same read-by-path / neutral-on-missing discipline as the global mapper.
 * Exported for unit testing with zero network.
 */
export function mapCmcDerivativesPayload(payload: unknown): CmcDerivatives | null {
  const mapped: CmcDerivatives = compact({
    aggFunding: readNum(payload, [
      'data.funding_rate',
      'funding_rate',
      'data.aggregate_funding_rate',
      'data.quote.USD.funding_rate',
    ]),
    oiChange24h: readNum(payload, [
      'data.open_interest_change_24h',
      'open_interest_change_24h',
      'data.quote.USD.open_interest_24h_percentage_change',
    ]),
    longShortRatio: readNum(payload, [
      'data.long_short_ratio',
      'long_short_ratio',
      'data.quote.USD.long_short_ratio',
    ]),
    liquidations24h: readNum(payload, [
      'data.liquidations_24h',
      'liquidations_24h',
      'data.quote.USD.liquidations_24h',
    ]),
  });

  return Object.keys(mapped).length > 0 ? mapped : null;
}

/** True when a CMC key is configured (REST or MCP). Used for diagnostics only. */
export function isCmcAgentHubConfigured(): boolean {
  return !!CMC_MCP_API_KEY;
}
