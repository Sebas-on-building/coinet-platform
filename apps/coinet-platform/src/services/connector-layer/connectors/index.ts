/**
 * Connector instantiation and registration.
 *
 * Call initializeConnectors() at startup to register all provider connectors
 * with the connector registry. After this, the registry can route any module
 * request to the correct connector with automatic fallback.
 */

import { registerConnector } from '../connector-registry';
import { DexScreenerConnector } from './dexscreener';
import { CoinGlassConnector } from './coinglass';
import { GoPlusSecurityConnector, GoPlusHoldersConnector } from './goplus';
import { LunarCrushConnector } from './lunarcrush';
import { CryptoPanicConnector } from './cryptopanic';
import { AlchemyConnector } from './alchemy';
import { CoinGeckoConnector } from './coingecko';

let initialized = false;

export function initializeConnectors(): void {
  if (initialized) return;

  // ── Market Data (market_surface truth domain) ───────────────────────────
  registerConnector('market_snapshot', new CoinGeckoConnector(), 0);

  // ── DEX Discovery (dex_emergence truth domain) ──────────────────────────
  registerConnector('dexscreener', new DexScreenerConnector(), 0);

  // ── Derivatives (derivatives_pressure truth domain) ─────────────────────
  registerConnector('derivatives', new CoinGlassConnector(), 0);

  // ── Security (structural_safety truth domain) ───────────────────────────
  registerConnector('security', new GoPlusSecurityConnector(), 0);
  registerConnector('holders', new GoPlusHoldersConnector(), 0);

  // ── Narrative (narrative_attention truth domain) ─────────────────────────
  registerConnector('sentiment', new LunarCrushConnector(), 0);
  registerConnector('news', new CryptoPanicConnector(), 0);

  // ── On-Chain (onchain_behavior truth domain) ────────────────────────────
  registerConnector('onchain', new AlchemyConnector(), 0);

  initialized = true;
}

export {
  DexScreenerConnector,
  CoinGlassConnector,
  GoPlusSecurityConnector,
  GoPlusHoldersConnector,
  LunarCrushConnector,
  CryptoPanicConnector,
  AlchemyConnector,
  CoinGeckoConnector,
};
