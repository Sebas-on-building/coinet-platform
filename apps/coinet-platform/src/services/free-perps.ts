/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   FREE PER-TOKEN PERPETUALS — Bybit + OKX public APIs (no key, per symbol)     ║
 * ║                                                                               ║
 * ║   Path B. Coinglass is paywalled (401) and the CMC Agent Hub derivatives feed ║
 * ║   is market-wide, so the judgment snapshot's `derivatives` family was          ║
 * ║   APPLICABLE_NO_DATA for every token. Bybit and OKX expose per-symbol perp     ║
 * ║   data for free without a key:                                                 ║
 * ║     • funding_rate        — Bybit tickers (one call, all symbols) | OKX        ║
 * ║     • open_interest_usd   — Bybit openInterestValue | OKX oiUsd                ║
 * ║     • long_short_ratio    — OKX account-ratio (Bybit tickers has none)         ║
 * ║                                                                               ║
 * ║   HONESTY: a token with no perp market simply isn't returned → the caller's    ║
 * ║   `undefined` → APPLICABLE_NO_DATA. We NEVER fabricate a zero/neutral value    ║
 * ║   and NEVER fall back to a market-wide aggregate. Only genuinely-present       ║
 * ║   fields are set.                                                              ║
 * ║                                                                               ║
 * ║   This is the FREE FALLBACK for the per-token judgment snapshot only; the      ║
 * ║   Coinglass-backed getPerpsSnapshot()/AI-prose path is left untouched.         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import axios from 'axios';
import { logger } from '../utils/logger';

export interface FreePerpData {
  symbol: string;            // normalized base, e.g. 'BTC', 'PEPE'
  fundingRate?: number;      // decimal per funding period (e.g. 0.0001 = 0.01%)
  openInterestUsd?: number;  // open interest notional in USD
  longShortRatio?: number;   // account long/short ratio (>1 = more longs)
  sources: string[];         // which venues supplied data ('bybit' | 'okx')
}

const CONFIG = {
  BYBIT_TICKERS: 'https://api.bybit.com/v5/market/tickers?category=linear',
  OKX_FUNDING: 'https://www.okx.com/api/v5/public/funding-rate',
  OKX_OI: 'https://www.okx.com/api/v5/public/open-interest',
  OKX_LS: 'https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio',
  TIMEOUT_MS: 8000,
  CACHE_TTL_MS: 60_000,
  COOLDOWN_MS: 30 * 60 * 1000, // disable a venue for 30m after a geo-block
};

// ── per-venue circuit breaker (geo-block / repeated failure) ──────────────────
const venueDisabledUntil: Record<'bybit' | 'okx', number> = { bybit: 0, okx: 0 };

function venueDisabled(v: 'bybit' | 'okx'): boolean {
  return Date.now() < venueDisabledUntil[v];
}

function disableVenue(v: 'bybit' | 'okx', reason: string): void {
  venueDisabledUntil[v] = Date.now() + CONFIG.COOLDOWN_MS;
  logger.warn(`📉 free-perps: ${v} disabled for 30m`, { reason });
}

function isGeoBlock(err: any): boolean {
  const s = err?.response?.status;
  return s === 403 || s === 451;
}

const num = (v: any): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

// ── symbol normalization ──────────────────────────────────────────────────────
// Strip the quote suffix and any leverage-multiplier prefix venues bolt on for
// low-priced tokens (e.g. Bybit lists PEPE as 1000PEPEUSDT, SHIB as 1000SHIBUSDT,
// some as kSHIB). funding rate + L/S ratio are scale-invariant and OI is a USD
// total, so the multiplier ticker maps cleanly onto the base symbol.
const MULT_PREFIX = /^(1000000|100000|10000|1000|k)/i;

function stripQuote(sym: string): string {
  return sym.replace(/(USDT|USDC|USD)$/i, '');
}

function normalizeBase(raw: string): string {
  return raw.replace(MULT_PREFIX, '');
}

// ── cache (keyed on the sorted requested-symbol set) ──────────────────────────
const cache = new Map<string, { data: Record<string, FreePerpData>; ts: number }>();

// ─────────────────────────────────────────────────────────────────────────────
// BYBIT — one public tickers call returns EVERY linear symbol's funding + OI.
// Index by base symbol (exact first; multiplier alias only if the base is free).
// ─────────────────────────────────────────────────────────────────────────────
async function fetchBybitIndex(): Promise<Map<string, { fundingRate?: number; openInterestUsd?: number }> | null> {
  if (venueDisabled('bybit')) return null;
  try {
    const resp = await axios.get(CONFIG.BYBIT_TICKERS, { timeout: CONFIG.TIMEOUT_MS });
    const list = resp.data?.result?.list;
    if (!Array.isArray(list)) return null;

    const map = new Map<string, { fundingRate?: number; openInterestUsd?: number }>();
    for (const it of list) {
      const sym = String(it?.symbol ?? '');
      if (!/USDT$/i.test(sym)) continue; // USDT-margined linear perps only
      const raw = stripQuote(sym).toUpperCase();
      const entry = {
        fundingRate: num(it?.fundingRate),
        openInterestUsd: num(it?.openInterestValue),
      };
      // Exact symbol wins; never let a multiplier ticker clobber a real base.
      if (!map.has(raw)) map.set(raw, entry);
      const normd = normalizeBase(raw);
      if (normd && normd !== raw && !map.has(normd)) map.set(normd, entry);
    }
    return map;
  } catch (e: any) {
    if (isGeoBlock(e)) disableVenue('bybit', `geo-block ${e?.response?.status}`);
    logger.debug('free-perps: bybit tickers failed', { error: e?.message });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OKX — per-symbol fallback (fills funding/OI gaps) + the long/short ratio
// source (Bybit tickers has none). instId BASE-USDT-SWAP; L/S keyed by ccy.
// ─────────────────────────────────────────────────────────────────────────────
async function okxGet(url: string, params: Record<string, any>): Promise<any | null> {
  try {
    return await axios.get(url, { params, timeout: CONFIG.TIMEOUT_MS });
  } catch (e: any) {
    if (isGeoBlock(e)) disableVenue('okx', `geo-block ${e?.response?.status}`);
    return null;
  }
}

async function fetchOkxForSymbol(
  base: string,
): Promise<{ fundingRate?: number; openInterestUsd?: number; longShortRatio?: number } | null> {
  if (venueDisabled('okx')) return null;
  const instId = `${base}-USDT-SWAP`;
  const [f, oi, ls] = await Promise.all([
    okxGet(CONFIG.OKX_FUNDING, { instId }),
    okxGet(CONFIG.OKX_OI, { instType: 'SWAP', instId }),
    okxGet(CONFIG.OKX_LS, { ccy: base, period: '1H' }),
  ]);

  const fundingRate = num(f?.data?.data?.[0]?.fundingRate);
  const openInterestUsd = num(oi?.data?.data?.[0]?.oiUsd);
  // L/S history is an array of [ts, ratio] newest-first.
  const lsArr = ls?.data?.data;
  const longShortRatio = Array.isArray(lsArr) && lsArr.length > 0 ? num(lsArr[0]?.[1]) : undefined;

  if (fundingRate === undefined && openInterestUsd === undefined && longShortRatio === undefined) {
    return null;
  }
  return { fundingRate, openInterestUsd, longShortRatio };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — per-token free perps for the requested symbols.
// Bybit primary (funding + OI in one batch call), OKX fills gaps + supplies L/S.
// Returns only symbols with ≥1 genuinely-present field; absent → omitted.
// ─────────────────────────────────────────────────────────────────────────────
export async function getFreePerps(symbols: string[]): Promise<Record<string, FreePerpData>> {
  const bases = Array.from(
    new Set(symbols.map((s) => (s ?? '').toUpperCase()).filter(Boolean)),
  );
  if (bases.length === 0) return {};

  const cacheKey = bases.slice().sort().join(',');
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CONFIG.CACHE_TTL_MS) return cached.data;

  const bybit = await fetchBybitIndex();
  const out: Record<string, FreePerpData> = {};

  await Promise.all(
    bases.map(async (base) => {
      const b = bybit?.get(base);
      let fundingRate = b?.fundingRate;
      let openInterestUsd = b?.openInterestUsd;
      let longShortRatio: number | undefined;
      const sources: string[] = [];
      if (fundingRate !== undefined || openInterestUsd !== undefined) sources.push('bybit');

      // OKX is always consulted for the long/short ratio (Bybit tickers lacks it)
      // and to fill any funding/OI gap when the token isn't on Bybit.
      const okx = await fetchOkxForSymbol(base);
      if (okx) {
        let usedOkx = false;
        if (fundingRate === undefined && okx.fundingRate !== undefined) {
          fundingRate = okx.fundingRate;
          usedOkx = true;
        }
        if (openInterestUsd === undefined && okx.openInterestUsd !== undefined) {
          openInterestUsd = okx.openInterestUsd;
          usedOkx = true;
        }
        if (okx.longShortRatio !== undefined) {
          longShortRatio = okx.longShortRatio;
          usedOkx = true;
        }
        if (usedOkx) sources.push('okx');
      }

      if (fundingRate !== undefined || openInterestUsd !== undefined || longShortRatio !== undefined) {
        out[base] = { symbol: base, fundingRate, openInterestUsd, longShortRatio, sources };
      }
    }),
  );

  cache.set(cacheKey, { data: out, ts: Date.now() });
  return out;
}
