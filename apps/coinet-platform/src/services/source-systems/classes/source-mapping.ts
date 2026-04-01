/**
 * Source-to-Class Mapping — maps every provider and endpoint scope to
 * one or more truth classes. Multi-purpose providers are scoped by
 * endpoint, not vaguely by brand.
 *
 * No provider enters runtime unmapped.
 */

import { TRUTH_CLASSES, PROVIDERS } from '../registry';
import type { TruthClass } from '../registry';

export interface ProviderClassMapping {
  providerId: string;
  primaryClass: TruthClass;
  secondaryScopes?: ProviderSecondaryScope[];
}

export interface ProviderSecondaryScope {
  truthClass: TruthClass;
  scope: string;
  confidence: number;
}

export const PROVIDER_CLASS_MAPPINGS: Record<string, ProviderClassMapping> = {
  coingecko: {
    providerId: 'coingecko',
    primaryClass: TRUTH_CLASSES.MARKET_SURFACE,
  },
  coinmarketcap: {
    providerId: 'coinmarketcap',
    primaryClass: TRUTH_CLASSES.MARKET_SURFACE,
  },
  birdeye: {
    providerId: 'birdeye',
    primaryClass: TRUTH_CLASSES.MARKET_SURFACE,
    secondaryScopes: [
      {
        truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
        scope: 'solana_dex_pairs',
        confidence: 0.6,
      },
    ],
  },
  dexscreener: {
    providerId: 'dexscreener',
    primaryClass: TRUTH_CLASSES.DEX_EMERGENCE,
  },
  geckoterminal: {
    providerId: 'geckoterminal',
    primaryClass: TRUTH_CLASSES.DEX_EMERGENCE,
  },
  coinglass: {
    providerId: 'coinglass',
    primaryClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
  },
  defillama: {
    providerId: 'defillama',
    primaryClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
  },
  alchemy: {
    providerId: 'alchemy',
    primaryClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
  },
  quicknode: {
    providerId: 'quicknode',
    primaryClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
  },
  goplus: {
    providerId: 'goplus',
    primaryClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
  },
  etherscan: {
    providerId: 'etherscan',
    primaryClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    secondaryScopes: [
      {
        truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
        scope: 'contract_verification_behavioral',
        confidence: 0.3,
      },
    ],
  },
  solscan: {
    providerId: 'solscan',
    primaryClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
  },
  cryptopanic: {
    providerId: 'cryptopanic',
    primaryClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
  },
  lunarcrush: {
    providerId: 'lunarcrush',
    primaryClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
  },
  twitter_api: {
    providerId: 'twitter_api',
    primaryClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
  },
  twitter_api_io: {
    providerId: 'twitter_api_io',
    primaryClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
  },
  arkham: {
    providerId: 'arkham',
    primaryClass: TRUTH_CLASSES.ENTITY_CONTEXT,
  },
  nansen: {
    providerId: 'nansen',
    primaryClass: TRUTH_CLASSES.ENTITY_CONTEXT,
  },
  openai: {
    providerId: 'openai',
    primaryClass: TRUTH_CLASSES.REASONING_EXPRESSION,
  },
  gemini: {
    providerId: 'gemini',
    primaryClass: TRUTH_CLASSES.REASONING_EXPRESSION,
  },
  xai: {
    providerId: 'xai',
    primaryClass: TRUTH_CLASSES.REASONING_EXPRESSION,
  },
};

export function getProviderMapping(providerId: string): ProviderClassMapping | undefined {
  return PROVIDER_CLASS_MAPPINGS[providerId];
}

export function getProviderPrimaryClass(providerId: string): TruthClass | undefined {
  return PROVIDER_CLASS_MAPPINGS[providerId]?.primaryClass;
}

export function getProviderSecondaryScopes(providerId: string): ProviderSecondaryScope[] {
  return PROVIDER_CLASS_MAPPINGS[providerId]?.secondaryScopes ?? [];
}

export function getProvidersForClass(truthClass: TruthClass): ProviderClassMapping[] {
  return Object.values(PROVIDER_CLASS_MAPPINGS).filter(
    m => m.primaryClass === truthClass
      || m.secondaryScopes?.some(s => s.truthClass === truthClass),
  );
}

export function getAllMappedProviderIds(): string[] {
  return Object.keys(PROVIDER_CLASS_MAPPINGS);
}

export function getUnmappedProviders(): string[] {
  const mapped = new Set(getAllMappedProviderIds());
  return Object.keys(PROVIDERS).filter(id => !mapped.has(id));
}

export function validateAllProvidersMapped(): { valid: boolean; unmapped: string[] } {
  const unmapped = getUnmappedProviders();
  return { valid: unmapped.length === 0, unmapped };
}
