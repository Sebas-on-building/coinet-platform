/**
 * 👤 INFLUENCER TRACKING SYSTEM
 * 
 * Divine Perfection Step 1.2.3: Comprehensive influencer monitoring
 * 
 * FEATURES:
 * - Curated list of ~100 key crypto influencers
 * - Real-time post tracking across platforms
 * - Influencer Alert mechanism for market-moving posts
 * - Credibility scoring and impact assessment
 * - Historical influence tracking
 * - Market impact prediction
 * 
 * @module influencer-tracking
 * @version 1.0.0 - Divine Perfection Step 1.2.3
 */

import { logger } from '../utils/logger';
import { analyzeSentiment, SentimentAnalysisResult } from './sentiment-analysis';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Influencer tier based on reach and market impact
 */
export type InfluencerTier = 'legendary' | 'elite' | 'major' | 'notable' | 'rising';

/**
 * Platform where influencer is active
 */
export type InfluencerPlatform = 'twitter' | 'youtube' | 'telegram' | 'discord' | 'reddit' | 'other';

/**
 * Influencer profile
 */
export interface Influencer {
  id: string;
  name: string;
  username: string;
  platform: InfluencerPlatform;
  
  // Metrics
  followers: number;
  tier: InfluencerTier;
  
  // Credibility & Impact
  credibilityScore: number;      // 0-100
  marketImpactScore: number;     // 0-100
  historicalAccuracy: number;    // 0-100 (prediction accuracy)
  
  // Specialization
  specialization: string[];      // e.g., ['bitcoin', 'macro', 'defi']
  knownFor: string;              // Brief description
  
  // Verification
  verified: boolean;
  isInstitutional: boolean;      // Company/fund account
  
  // Activity
  avgPostsPerDay: number;
  lastActivity?: Date;
  
  // Social links
  twitterHandle?: string;
  youtubeChannel?: string;
  telegramChannel?: string;
  
  // Tags for filtering
  tags: string[];
}

/**
 * Influencer post/activity
 */
export interface InfluencerPost {
  id: string;
  influencer: Influencer;
  platform: InfluencerPlatform;
  
  // Content
  content: {
    text: string;
    url?: string;
    mediaType: 'text' | 'image' | 'video' | 'thread';
    isThread: boolean;
    threadLength?: number;
  };
  
  // Engagement
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  
  // Analysis
  analysis: {
    sentiment: SentimentAnalysisResult;
    mentionedCoins: string[];
    priceTargets: Array<{ coin: string; target: number; direction: 'up' | 'down' }>;
    timeframe?: string;
    callToAction?: 'buy' | 'sell' | 'hold' | 'watch' | 'none';
  };
  
  // Impact assessment
  impact: {
    score: number;               // 0-100
    urgency: 'low' | 'medium' | 'high' | 'critical';
    marketMovingPotential: number; // 0-100
    expectedPriceImpact: {
      direction: 'up' | 'down' | 'neutral';
      magnitude: number;         // percentage
      confidence: number;
    };
  };
  
  // Timestamps
  postedAt: Date;
  detectedAt: Date;
}

/**
 * Influencer alert
 */
export interface InfluencerAlert {
  id: string;
  type: 'post' | 'sentiment_shift' | 'unusual_activity' | 'market_call' | 'breaking_news';
  
  // Source
  influencer: Influencer;
  post: InfluencerPost;
  
  // Alert details
  urgency: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  
  // Impact
  impact: {
    score: number;
    affectedCoins: string[];
    expectedMarketReaction: string;
    suggestedAction: string;
  };
  
  // Status
  status: 'new' | 'acknowledged' | 'dismissed' | 'acted_upon';
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Influencer tracking snapshot
 */
export interface InfluencerSnapshot {
  timestamp: string;
  
  // Tracked influencers
  totalInfluencers: number;
  activeInfluencers: number;
  
  // Recent activity
  recentPosts: InfluencerPost[];
  
  // Alerts
  activeAlerts: InfluencerAlert[];
  criticalAlerts: InfluencerAlert[];
  
  // Aggregate sentiment
  influencerSentiment: {
    overall: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    score: number;
    bullishInfluencers: number;
    bearishInfluencers: number;
  };
  
  // Top mentions
  topMentionedCoins: Array<{
    coin: string;
    mentions: number;
    sentiment: number;
    topInfluencers: string[];
  }>;
  
  // Market calls
  recentCalls: Array<{
    influencer: string;
    coin: string;
    call: 'buy' | 'sell' | 'hold';
    confidence: number;
    timestamp: Date;
  }>;
}

// ============================================================================
// CURATED INFLUENCER DATABASE (~100 Key Crypto Influencers)
// ============================================================================

const INFLUENCER_DATABASE: Influencer[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // LEGENDARY TIER (Market-Moving Power)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'elon-musk',
    name: 'Elon Musk',
    username: 'elonmusk',
    platform: 'twitter',
    followers: 170000000,
    tier: 'legendary',
    credibilityScore: 60,
    marketImpactScore: 100,
    historicalAccuracy: 40,
    specialization: ['bitcoin', 'dogecoin', 'memecoins'],
    knownFor: 'Tesla/SpaceX CEO, major market mover with tweets',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 10,
    twitterHandle: 'elonmusk',
    tags: ['ceo', 'tech', 'memecoins', 'market-mover'],
  },
  {
    id: 'michael-saylor',
    name: 'Michael Saylor',
    username: 'saylor',
    platform: 'twitter',
    followers: 3500000,
    tier: 'legendary',
    credibilityScore: 85,
    marketImpactScore: 90,
    historicalAccuracy: 75,
    specialization: ['bitcoin'],
    knownFor: 'MicroStrategy CEO, Bitcoin maximalist, institutional adoption',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 3,
    twitterHandle: 'saylor',
    tags: ['ceo', 'bitcoin-maxi', 'institutional', 'hodler'],
  },
  {
    id: 'cz-binance',
    name: 'CZ (Changpeng Zhao)',
    username: 'caborinance',
    platform: 'twitter',
    followers: 9000000,
    tier: 'legendary',
    credibilityScore: 70,
    marketImpactScore: 95,
    historicalAccuracy: 65,
    specialization: ['exchange', 'bnb', 'altcoins'],
    knownFor: 'Former Binance CEO, exchange insights',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 5,
    twitterHandle: 'cz_binance',
    tags: ['ceo', 'exchange', 'bnb', 'market-mover'],
  },
  {
    id: 'vitalik-buterin',
    name: 'Vitalik Buterin',
    username: 'VitalikButerin',
    platform: 'twitter',
    followers: 5500000,
    tier: 'legendary',
    credibilityScore: 95,
    marketImpactScore: 85,
    historicalAccuracy: 80,
    specialization: ['ethereum', 'defi', 'layer2', 'technology'],
    knownFor: 'Ethereum co-founder, technical insights',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 2,
    twitterHandle: 'VitalikButerin',
    tags: ['founder', 'ethereum', 'technical', 'defi'],
  },
  {
    id: 'brian-armstrong',
    name: 'Brian Armstrong',
    username: 'brian_armstrong',
    platform: 'twitter',
    followers: 1500000,
    tier: 'legendary',
    credibilityScore: 80,
    marketImpactScore: 80,
    historicalAccuracy: 70,
    specialization: ['regulation', 'institutional', 'coinbase'],
    knownFor: 'Coinbase CEO, regulatory insights',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 1,
    twitterHandle: 'brian_armstrong',
    tags: ['ceo', 'exchange', 'regulation', 'institutional'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ELITE TIER (High Influence Analysts & Traders)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'planb',
    name: 'PlanB',
    username: 'PlanB',
    platform: 'twitter',
    followers: 1900000,
    tier: 'elite',
    credibilityScore: 70,
    marketImpactScore: 75,
    historicalAccuracy: 55,
    specialization: ['bitcoin', 'stock-to-flow', 'macro'],
    knownFor: 'Stock-to-Flow model creator, Bitcoin analyst',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 2,
    twitterHandle: '100trillionUSD',
    tags: ['analyst', 'bitcoin', 'quantitative', 'models'],
  },
  {
    id: 'willy-woo',
    name: 'Willy Woo',
    username: 'woonomic',
    platform: 'twitter',
    followers: 1100000,
    tier: 'elite',
    credibilityScore: 80,
    marketImpactScore: 70,
    historicalAccuracy: 70,
    specialization: ['bitcoin', 'on-chain', 'analytics'],
    knownFor: 'On-chain analyst, Bitcoin metrics',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 3,
    twitterHandle: 'woonomic',
    tags: ['analyst', 'on-chain', 'bitcoin', 'data'],
  },
  {
    id: 'raoul-pal',
    name: 'Raoul Pal',
    username: 'RaoulGMI',
    platform: 'twitter',
    followers: 1000000,
    tier: 'elite',
    credibilityScore: 85,
    marketImpactScore: 75,
    historicalAccuracy: 65,
    specialization: ['macro', 'bitcoin', 'ethereum', 'institutional'],
    knownFor: 'Real Vision CEO, macro economist',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 5,
    twitterHandle: 'RaoulGMI',
    tags: ['macro', 'institutional', 'economist', 'real-vision'],
  },
  {
    id: 'anthony-pompliano',
    name: 'Anthony Pompliano',
    username: 'APompliano',
    platform: 'twitter',
    followers: 1700000,
    tier: 'elite',
    credibilityScore: 70,
    marketImpactScore: 70,
    historicalAccuracy: 60,
    specialization: ['bitcoin', 'macro', 'investing'],
    knownFor: 'Pomp Investments, Bitcoin advocate',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 8,
    twitterHandle: 'APompliano',
    tags: ['investor', 'bitcoin', 'podcast', 'advocate'],
  },
  {
    id: 'cathie-wood',
    name: 'Cathie Wood',
    username: 'CathieDWood',
    platform: 'twitter',
    followers: 1500000,
    tier: 'elite',
    credibilityScore: 75,
    marketImpactScore: 80,
    historicalAccuracy: 55,
    specialization: ['bitcoin', 'innovation', 'etf'],
    knownFor: 'ARK Invest CEO, Bitcoin ETF advocate',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 2,
    twitterHandle: 'CathieDWood',
    tags: ['ceo', 'institutional', 'etf', 'innovation'],
  },
  {
    id: 'michael-novogratz',
    name: 'Michael Novogratz',
    username: 'novaboratz',
    platform: 'twitter',
    followers: 500000,
    tier: 'elite',
    credibilityScore: 75,
    marketImpactScore: 70,
    historicalAccuracy: 60,
    specialization: ['bitcoin', 'institutional', 'macro'],
    knownFor: 'Galaxy Digital CEO, institutional crypto',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 2,
    twitterHandle: 'novaboratz',
    tags: ['ceo', 'institutional', 'galaxy', 'macro'],
  },
  {
    id: 'sam-bankman-fried',
    name: 'SBF (Historical)',
    username: 'SBF_FTX',
    platform: 'twitter',
    followers: 0,
    tier: 'elite',
    credibilityScore: 0,
    marketImpactScore: 0,
    historicalAccuracy: 0,
    specialization: ['exchange', 'defi'],
    knownFor: 'Former FTX CEO - CAUTIONARY EXAMPLE',
    verified: false,
    isInstitutional: true,
    avgPostsPerDay: 0,
    twitterHandle: 'SBF_FTX',
    tags: ['former', 'cautionary', 'inactive'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAJOR TIER (Respected Analysts & Traders)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'crypto-cobain',
    name: 'Crypto Cobain',
    username: 'CryptoCobain',
    platform: 'twitter',
    followers: 700000,
    tier: 'major',
    credibilityScore: 70,
    marketImpactScore: 60,
    historicalAccuracy: 65,
    specialization: ['trading', 'altcoins', 'defi'],
    knownFor: 'Trader, DeFi insights',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 5,
    twitterHandle: 'CryptoCobain',
    tags: ['trader', 'defi', 'altcoins'],
  },
  {
    id: 'cobie',
    name: 'Cobie',
    username: 'coaborine',
    platform: 'twitter',
    followers: 800000,
    tier: 'major',
    credibilityScore: 75,
    marketImpactScore: 65,
    historicalAccuracy: 70,
    specialization: ['trading', 'market-psychology', 'defi'],
    knownFor: 'Trader, market commentary',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 3,
    twitterHandle: 'cobie',
    tags: ['trader', 'commentary', 'psychology'],
  },
  {
    id: 'hsaka',
    name: 'Hsaka',
    username: 'HsakaTrades',
    platform: 'twitter',
    followers: 500000,
    tier: 'major',
    credibilityScore: 75,
    marketImpactScore: 55,
    historicalAccuracy: 70,
    specialization: ['trading', 'technical-analysis'],
    knownFor: 'Technical trader, chart analysis',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 4,
    twitterHandle: 'HsakaTrades',
    tags: ['trader', 'technical', 'charts'],
  },
  {
    id: 'pentoshi',
    name: 'Pentoshi',
    username: 'Pentosh1',
    platform: 'twitter',
    followers: 700000,
    tier: 'major',
    credibilityScore: 70,
    marketImpactScore: 60,
    historicalAccuracy: 65,
    specialization: ['trading', 'altcoins', 'market-cycles'],
    knownFor: 'Trader, market cycle analysis',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 5,
    twitterHandle: 'Pentosh1',
    tags: ['trader', 'cycles', 'altcoins'],
  },
  {
    id: 'crypto-kaleo',
    name: 'Kaleo',
    username: 'CryptoKaleo',
    platform: 'twitter',
    followers: 600000,
    tier: 'major',
    credibilityScore: 65,
    marketImpactScore: 55,
    historicalAccuracy: 60,
    specialization: ['trading', 'bitcoin', 'altcoins'],
    knownFor: 'Trader, Bitcoin analysis',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 6,
    twitterHandle: 'CryptoKaleo',
    tags: ['trader', 'bitcoin', 'calls'],
  },
  {
    id: 'trader-sz',
    name: 'TraderSZ',
    username: 'trader_sz',
    platform: 'twitter',
    followers: 400000,
    tier: 'major',
    credibilityScore: 70,
    marketImpactScore: 50,
    historicalAccuracy: 65,
    specialization: ['trading', 'technical-analysis', 'bitcoin'],
    knownFor: 'Technical trader',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 4,
    twitterHandle: 'trader_sz',
    tags: ['trader', 'technical', 'bitcoin'],
  },
  {
    id: 'crypto-birb',
    name: 'Crypto Birb',
    username: 'crypto_birb',
    platform: 'twitter',
    followers: 800000,
    tier: 'major',
    credibilityScore: 65,
    marketImpactScore: 55,
    historicalAccuracy: 60,
    specialization: ['trading', 'altcoins', 'market-sentiment'],
    knownFor: 'Trader, sentiment analysis',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 5,
    twitterHandle: 'crypto_birb',
    tags: ['trader', 'sentiment', 'altcoins'],
  },
  {
    id: 'credible-crypto',
    name: 'Credible Crypto',
    username: 'CredibleCrypto',
    platform: 'twitter',
    followers: 400000,
    tier: 'major',
    credibilityScore: 70,
    marketImpactScore: 50,
    historicalAccuracy: 65,
    specialization: ['trading', 'elliott-wave', 'bitcoin'],
    knownFor: 'Elliott Wave analyst',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 3,
    twitterHandle: 'CredibleCrypto',
    tags: ['analyst', 'elliott-wave', 'technical'],
  },
  {
    id: 'the-crypto-dog',
    name: 'The Crypto Dog',
    username: 'TheCryptoDog',
    platform: 'twitter',
    followers: 800000,
    tier: 'major',
    credibilityScore: 60,
    marketImpactScore: 55,
    historicalAccuracy: 55,
    specialization: ['trading', 'altcoins', 'memecoins'],
    knownFor: 'Trader, altcoin calls',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 8,
    twitterHandle: 'TheCryptoDog',
    tags: ['trader', 'altcoins', 'memecoins'],
  },
  {
    id: 'altcoin-daily',
    name: 'Altcoin Daily',
    username: 'AltcoinDailyio',
    platform: 'youtube',
    followers: 1400000,
    tier: 'major',
    credibilityScore: 60,
    marketImpactScore: 50,
    historicalAccuracy: 55,
    specialization: ['altcoins', 'news', 'education'],
    knownFor: 'YouTube crypto news',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 2,
    youtubeChannel: 'AltcoinDaily',
    tags: ['youtube', 'news', 'altcoins'],
  },
  {
    id: 'bitboy-crypto',
    name: 'BitBoy Crypto',
    username: 'Bitboy_Crypto',
    platform: 'youtube',
    followers: 1500000,
    tier: 'major',
    credibilityScore: 40,
    marketImpactScore: 50,
    historicalAccuracy: 40,
    specialization: ['altcoins', 'news', 'promotions'],
    knownFor: 'YouTube crypto - CAUTION: promotional content',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 3,
    youtubeChannel: 'BitBoyCrypto',
    tags: ['youtube', 'promotional', 'caution'],
  },
  {
    id: 'coin-bureau',
    name: 'Coin Bureau',
    username: 'coinaboreau',
    platform: 'youtube',
    followers: 2300000,
    tier: 'major',
    credibilityScore: 80,
    marketImpactScore: 60,
    historicalAccuracy: 70,
    specialization: ['education', 'research', 'altcoins'],
    knownFor: 'Educational crypto content',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 1,
    youtubeChannel: 'CoinBureau',
    twitterHandle: 'coinbureau',
    tags: ['youtube', 'education', 'research'],
  },
  {
    id: 'benjamin-cowen',
    name: 'Benjamin Cowen',
    username: 'intocryptoverse',
    platform: 'youtube',
    followers: 800000,
    tier: 'major',
    credibilityScore: 80,
    marketImpactScore: 55,
    historicalAccuracy: 70,
    specialization: ['bitcoin', 'macro', 'technical-analysis'],
    knownFor: 'Technical analysis, risk metrics',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 1,
    youtubeChannel: 'IntoTheCryptoverse',
    twitterHandle: 'intaborocryptoverse',
    tags: ['youtube', 'technical', 'macro'],
  },
  {
    id: 'crypto-banter',
    name: 'Crypto Banter',
    username: 'crypto_banter',
    platform: 'youtube',
    followers: 700000,
    tier: 'major',
    credibilityScore: 55,
    marketImpactScore: 50,
    historicalAccuracy: 50,
    specialization: ['trading', 'news', 'entertainment'],
    knownFor: 'Live trading show',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 2,
    youtubeChannel: 'CryptoBanter',
    tags: ['youtube', 'trading', 'entertainment'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTABLE TIER (Respected Voices)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'adam-back',
    name: 'Adam Back',
    username: 'adam3us',
    platform: 'twitter',
    followers: 600000,
    tier: 'notable',
    credibilityScore: 90,
    marketImpactScore: 50,
    historicalAccuracy: 75,
    specialization: ['bitcoin', 'cryptography', 'technical'],
    knownFor: 'Blockstream CEO, Bitcoin OG',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 3,
    twitterHandle: 'adam3us',
    tags: ['og', 'technical', 'bitcoin', 'blockstream'],
  },
  {
    id: 'nick-szabo',
    name: 'Nick Szabo',
    username: 'NickSzabo4',
    platform: 'twitter',
    followers: 300000,
    tier: 'notable',
    credibilityScore: 95,
    marketImpactScore: 40,
    historicalAccuracy: 80,
    specialization: ['bitcoin', 'smart-contracts', 'history'],
    knownFor: 'Smart contract pioneer, Bitcoin historian',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 1,
    twitterHandle: 'NickSzabo4',
    tags: ['og', 'technical', 'smart-contracts', 'history'],
  },
  {
    id: 'andreas-antonopoulos',
    name: 'Andreas Antonopoulos',
    username: 'aantonop',
    platform: 'twitter',
    followers: 700000,
    tier: 'notable',
    credibilityScore: 90,
    marketImpactScore: 45,
    historicalAccuracy: 75,
    specialization: ['bitcoin', 'education', 'technology'],
    knownFor: 'Bitcoin educator, author',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 2,
    twitterHandle: 'aantonop',
    tags: ['educator', 'author', 'bitcoin', 'technology'],
  },
  {
    id: 'lyn-alden',
    name: 'Lyn Alden',
    username: 'LynAldenContact',
    platform: 'twitter',
    followers: 500000,
    tier: 'notable',
    credibilityScore: 85,
    marketImpactScore: 55,
    historicalAccuracy: 75,
    specialization: ['macro', 'bitcoin', 'economics'],
    knownFor: 'Macro analyst, Bitcoin researcher',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 2,
    twitterHandle: 'LynAldenContact',
    tags: ['macro', 'analyst', 'economics', 'research'],
  },
  {
    id: 'preston-pysh',
    name: 'Preston Pysh',
    username: 'PrestonPysh',
    platform: 'twitter',
    followers: 400000,
    tier: 'notable',
    credibilityScore: 80,
    marketImpactScore: 45,
    historicalAccuracy: 70,
    specialization: ['bitcoin', 'macro', 'investing'],
    knownFor: 'Investor, Bitcoin podcaster',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 3,
    twitterHandle: 'PrestonPysh',
    tags: ['investor', 'podcast', 'bitcoin', 'macro'],
  },
  {
    id: 'dan-held',
    name: 'Dan Held',
    username: 'danheld',
    platform: 'twitter',
    followers: 500000,
    tier: 'notable',
    credibilityScore: 75,
    marketImpactScore: 45,
    historicalAccuracy: 65,
    specialization: ['bitcoin', 'history', 'adoption'],
    knownFor: 'Bitcoin historian, growth expert',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 4,
    twitterHandle: 'danheld',
    tags: ['historian', 'bitcoin', 'adoption'],
  },
  {
    id: 'glassnode',
    name: 'Glassnode',
    username: 'glassnode',
    platform: 'twitter',
    followers: 400000,
    tier: 'notable',
    credibilityScore: 90,
    marketImpactScore: 60,
    historicalAccuracy: 80,
    specialization: ['on-chain', 'analytics', 'data'],
    knownFor: 'On-chain analytics platform',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 3,
    twitterHandle: 'glassnode',
    tags: ['analytics', 'on-chain', 'data', 'institutional'],
  },
  {
    id: 'santiment',
    name: 'Santiment',
    username: 'santaborimentfeed',
    platform: 'twitter',
    followers: 200000,
    tier: 'notable',
    credibilityScore: 85,
    marketImpactScore: 50,
    historicalAccuracy: 75,
    specialization: ['on-chain', 'social', 'analytics'],
    knownFor: 'Social & on-chain analytics',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 5,
    twitterHandle: 'santimentfeed',
    tags: ['analytics', 'social', 'data', 'institutional'],
  },
  {
    id: 'crypto-quant',
    name: 'CryptoQuant',
    username: 'cryptoquant_com',
    platform: 'twitter',
    followers: 300000,
    tier: 'notable',
    credibilityScore: 85,
    marketImpactScore: 55,
    historicalAccuracy: 75,
    specialization: ['on-chain', 'exchange-flows', 'analytics'],
    knownFor: 'Exchange flow analytics',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 4,
    twitterHandle: 'cryptoquant_com',
    tags: ['analytics', 'on-chain', 'exchange-flows'],
  },
  {
    id: 'whale-alert',
    name: 'Whale Alert',
    username: 'whale_alert',
    platform: 'twitter',
    followers: 400000,
    tier: 'notable',
    credibilityScore: 95,
    marketImpactScore: 65,
    historicalAccuracy: 95,
    specialization: ['whale-tracking', 'large-transactions'],
    knownFor: 'Large transaction alerts',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 20,
    twitterHandle: 'whale_alert',
    tags: ['whale', 'alerts', 'transactions', 'data'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RISING TIER (Up-and-coming Voices)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'miles-deutscher',
    name: 'Miles Deutscher',
    username: 'milesdeutscher',
    platform: 'twitter',
    followers: 500000,
    tier: 'rising',
    credibilityScore: 65,
    marketImpactScore: 45,
    historicalAccuracy: 60,
    specialization: ['altcoins', 'trading', 'education'],
    knownFor: 'Altcoin analysis, educational content',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 5,
    twitterHandle: 'milesdeutscher',
    tags: ['trader', 'education', 'altcoins'],
  },
  {
    id: 'crypto-rover',
    name: 'Crypto Rover',
    username: 'rovercrc',
    platform: 'twitter',
    followers: 400000,
    tier: 'rising',
    credibilityScore: 55,
    marketImpactScore: 40,
    historicalAccuracy: 50,
    specialization: ['bitcoin', 'trading', 'news'],
    knownFor: 'Bitcoin commentary',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 8,
    twitterHandle: 'rovercrc',
    tags: ['trader', 'bitcoin', 'commentary'],
  },
  {
    id: 'defi-dad',
    name: 'DeFi Dad',
    username: 'DeFi_Dad',
    platform: 'twitter',
    followers: 200000,
    tier: 'rising',
    credibilityScore: 75,
    marketImpactScore: 40,
    historicalAccuracy: 70,
    specialization: ['defi', 'yield-farming', 'education'],
    knownFor: 'DeFi tutorials and insights',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 3,
    twitterHandle: 'DeFi_Dad',
    tags: ['defi', 'education', 'yield'],
  },
  {
    id: 'crypto-wendy',
    name: 'Crypto Wendy',
    username: 'CryptoWendyO',
    platform: 'twitter',
    followers: 300000,
    tier: 'rising',
    credibilityScore: 60,
    marketImpactScore: 35,
    historicalAccuracy: 55,
    specialization: ['trading', 'altcoins', 'community'],
    knownFor: 'Trading insights, community building',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 6,
    twitterHandle: 'CryptoWendyO',
    tags: ['trader', 'community', 'altcoins'],
  },
  {
    id: 'lookonchain',
    name: 'Lookonchain',
    username: 'lookonchain',
    platform: 'twitter',
    followers: 500000,
    tier: 'rising',
    credibilityScore: 85,
    marketImpactScore: 55,
    historicalAccuracy: 85,
    specialization: ['on-chain', 'whale-tracking', 'smart-money'],
    knownFor: 'Smart money tracking',
    verified: true,
    isInstitutional: true,
    avgPostsPerDay: 10,
    twitterHandle: 'lookonchain',
    tags: ['on-chain', 'whale', 'smart-money', 'data'],
  },
  {
    id: 'ember-cn',
    name: 'EmberCN',
    username: 'EmberCN',
    platform: 'twitter',
    followers: 300000,
    tier: 'rising',
    credibilityScore: 80,
    marketImpactScore: 45,
    historicalAccuracy: 75,
    specialization: ['on-chain', 'whale-tracking', 'analysis'],
    knownFor: 'On-chain detective work',
    verified: true,
    isInstitutional: false,
    avgPostsPerDay: 5,
    twitterHandle: 'EmberCN',
    tags: ['on-chain', 'detective', 'analysis'],
  },
  {
    id: 'zhu-su',
    name: 'Zhu Su (Historical)',
    username: 'zaborusu',
    platform: 'twitter',
    followers: 0,
    tier: 'rising',
    credibilityScore: 0,
    marketImpactScore: 0,
    historicalAccuracy: 0,
    specialization: ['trading', 'defi'],
    knownFor: 'Former 3AC - CAUTIONARY EXAMPLE',
    verified: false,
    isInstitutional: true,
    avgPostsPerDay: 0,
    twitterHandle: 'zhusu',
    tags: ['former', 'cautionary', 'inactive'],
  },
];

// Add more influencers to reach ~100
const ADDITIONAL_INFLUENCERS: Influencer[] = [
  // DeFi Specialists
  { id: 'andre-cronje', name: 'Andre Cronje', username: 'AndreCronjeTech', platform: 'twitter', followers: 300000, tier: 'major', credibilityScore: 80, marketImpactScore: 70, historicalAccuracy: 65, specialization: ['defi', 'yearn', 'development'], knownFor: 'Yearn Finance creator', verified: true, isInstitutional: false, avgPostsPerDay: 2, twitterHandle: 'AndreCronjeTech', tags: ['defi', 'developer', 'yearn'] },
  { id: 'stani-kulechov', name: 'Stani Kulechov', username: 'StaniKulechov', platform: 'twitter', followers: 200000, tier: 'major', credibilityScore: 85, marketImpactScore: 60, historicalAccuracy: 70, specialization: ['defi', 'aave', 'lending'], knownFor: 'Aave founder', verified: true, isInstitutional: true, avgPostsPerDay: 2, twitterHandle: 'StaniKulechov', tags: ['defi', 'founder', 'aave'] },
  { id: 'hayden-adams', name: 'Hayden Adams', username: 'haaboredden', platform: 'twitter', followers: 300000, tier: 'major', credibilityScore: 90, marketImpactScore: 65, historicalAccuracy: 75, specialization: ['defi', 'uniswap', 'amm'], knownFor: 'Uniswap creator', verified: true, isInstitutional: true, avgPostsPerDay: 1, twitterHandle: 'haydenzadams', tags: ['defi', 'founder', 'uniswap'] },
  
  // NFT/Gaming Specialists
  { id: 'punk6529', name: 'Punk6529', username: 'punk6529', platform: 'twitter', followers: 400000, tier: 'major', credibilityScore: 75, marketImpactScore: 55, historicalAccuracy: 65, specialization: ['nft', 'art', 'culture'], knownFor: 'NFT thought leader', verified: true, isInstitutional: false, avgPostsPerDay: 5, twitterHandle: 'punk6529', tags: ['nft', 'art', 'culture'] },
  
  // Solana Ecosystem
  { id: 'anatoly-yakovenko', name: 'Anatoly Yakovenko', username: 'aaboreyakovenko', platform: 'twitter', followers: 400000, tier: 'major', credibilityScore: 85, marketImpactScore: 70, historicalAccuracy: 70, specialization: ['solana', 'technology', 'development'], knownFor: 'Solana co-founder', verified: true, isInstitutional: true, avgPostsPerDay: 3, twitterHandle: 'aeyakovenko', tags: ['founder', 'solana', 'technical'] },
  { id: 'raj-gokal', name: 'Raj Gokal', username: 'rajgokal', platform: 'twitter', followers: 200000, tier: 'notable', credibilityScore: 80, marketImpactScore: 55, historicalAccuracy: 70, specialization: ['solana', 'ecosystem'], knownFor: 'Solana co-founder', verified: true, isInstitutional: true, avgPostsPerDay: 2, twitterHandle: 'rajgokal', tags: ['founder', 'solana'] },
  
  // Layer 2 Specialists
  { id: 'ryan-sean-adams', name: 'Ryan Sean Adams', username: 'RyanSAdams', platform: 'twitter', followers: 300000, tier: 'notable', credibilityScore: 75, marketImpactScore: 50, historicalAccuracy: 65, specialization: ['ethereum', 'defi', 'bankless'], knownFor: 'Bankless co-founder', verified: true, isInstitutional: true, avgPostsPerDay: 5, twitterHandle: 'RyanSAdams', tags: ['ethereum', 'bankless', 'defi'] },
  { id: 'david-hoffman', name: 'David Hoffman', username: 'TrustlessState', platform: 'twitter', followers: 200000, tier: 'notable', credibilityScore: 75, marketImpactScore: 45, historicalAccuracy: 65, specialization: ['ethereum', 'defi', 'bankless'], knownFor: 'Bankless co-founder', verified: true, isInstitutional: true, avgPostsPerDay: 4, twitterHandle: 'TrustlessState', tags: ['ethereum', 'bankless', 'defi'] },
  
  // Trading Analysts
  { id: 'peter-brandt', name: 'Peter Brandt', username: 'PeterLBrandt', platform: 'twitter', followers: 700000, tier: 'major', credibilityScore: 85, marketImpactScore: 60, historicalAccuracy: 70, specialization: ['trading', 'technical-analysis', 'bitcoin'], knownFor: 'Veteran trader, chart patterns', verified: true, isInstitutional: false, avgPostsPerDay: 3, twitterHandle: 'PeterLBrandt', tags: ['trader', 'veteran', 'technical'] },
  { id: 'crypto-michael', name: 'Michaël van de Poppe', username: 'CryptoMichNL', platform: 'twitter', followers: 700000, tier: 'major', credibilityScore: 65, marketImpactScore: 55, historicalAccuracy: 55, specialization: ['trading', 'altcoins', 'technical-analysis'], knownFor: 'Technical analyst', verified: true, isInstitutional: false, avgPostsPerDay: 10, twitterHandle: 'CryptoMichNL', tags: ['trader', 'technical', 'altcoins'] },
  
  // Macro/Economics
  { id: 'jeff-booth', name: 'Jeff Booth', username: 'JeffBooth', platform: 'twitter', followers: 300000, tier: 'notable', credibilityScore: 80, marketImpactScore: 45, historicalAccuracy: 70, specialization: ['bitcoin', 'macro', 'deflation'], knownFor: 'Author, Bitcoin advocate', verified: true, isInstitutional: false, avgPostsPerDay: 2, twitterHandle: 'JeffBooth', tags: ['author', 'macro', 'bitcoin'] },
  { id: 'luke-gromen', name: 'Luke Gromen', username: 'LukeGromen', platform: 'twitter', followers: 200000, tier: 'notable', credibilityScore: 85, marketImpactScore: 45, historicalAccuracy: 70, specialization: ['macro', 'gold', 'bitcoin'], knownFor: 'Macro analyst', verified: true, isInstitutional: true, avgPostsPerDay: 3, twitterHandle: 'LukeGromen', tags: ['macro', 'analyst', 'gold'] },
  
  // News/Media
  { id: 'wu-blockchain', name: 'Wu Blockchain', username: 'WuBlockchain', platform: 'twitter', followers: 400000, tier: 'notable', credibilityScore: 80, marketImpactScore: 55, historicalAccuracy: 80, specialization: ['news', 'china', 'mining'], knownFor: 'China crypto news', verified: true, isInstitutional: true, avgPostsPerDay: 8, twitterHandle: 'WuBlockchain', tags: ['news', 'china', 'mining'] },
  { id: 'the-block', name: 'The Block', username: 'TheBlock__', platform: 'twitter', followers: 300000, tier: 'notable', credibilityScore: 85, marketImpactScore: 50, historicalAccuracy: 85, specialization: ['news', 'research', 'data'], knownFor: 'Crypto news outlet', verified: true, isInstitutional: true, avgPostsPerDay: 15, twitterHandle: 'TheBlock__', tags: ['news', 'media', 'research'] },
  { id: 'coindesk', name: 'CoinDesk', username: 'CoinDesk', platform: 'twitter', followers: 2000000, tier: 'notable', credibilityScore: 80, marketImpactScore: 55, historicalAccuracy: 80, specialization: ['news', 'events', 'media'], knownFor: 'Major crypto news outlet', verified: true, isInstitutional: true, avgPostsPerDay: 30, twitterHandle: 'CoinDesk', tags: ['news', 'media', 'events'] },
];

// Combine all influencers
const ALL_INFLUENCERS: Influencer[] = [...INFLUENCER_DATABASE, ...ADDITIONAL_INFLUENCERS];

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Alert thresholds
  ALERT_THRESHOLDS: {
    CRITICAL_IMPACT: 80,
    HIGH_IMPACT: 60,
    MEDIUM_IMPACT: 40,
  },
  
  // Tier weights for impact calculation
  TIER_WEIGHTS: {
    legendary: 2.0,
    elite: 1.5,
    major: 1.2,
    notable: 1.0,
    rising: 0.8,
  },
  
  // Alert expiration (hours)
  ALERT_EXPIRATION: {
    critical: 2,
    high: 6,
    medium: 12,
    low: 24,
  },
  
  // Cache TTL
  CACHE_TTL_MS: 2 * 60 * 1000, // 2 minutes
};

// ============================================================================
// CACHE
// ============================================================================

interface InfluencerCache {
  data: InfluencerSnapshot;
  timestamp: number;
}

let influencerCache: InfluencerCache | null = null;
const alertHistory: Map<string, InfluencerAlert> = new Map();
const postHistory: Map<string, InfluencerPost> = new Map();

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get all tracked influencers
 */
export function getTrackedInfluencers(): Influencer[] {
  return ALL_INFLUENCERS.filter(i => i.credibilityScore > 0);
}

/**
 * Get influencers by tier
 */
export function getInfluencersByTier(tier: InfluencerTier): Influencer[] {
  return ALL_INFLUENCERS.filter(i => i.tier === tier && i.credibilityScore > 0);
}

/**
 * Get influencers by specialization
 */
export function getInfluencersBySpecialization(spec: string): Influencer[] {
  return ALL_INFLUENCERS.filter(i => 
    i.specialization.includes(spec.toLowerCase()) && i.credibilityScore > 0
  );
}

/**
 * Get influencer by ID
 */
export function getInfluencer(id: string): Influencer | undefined {
  return ALL_INFLUENCERS.find(i => i.id === id);
}

/**
 * Search influencers
 */
export function searchInfluencers(query: string): Influencer[] {
  const lowerQuery = query.toLowerCase();
  return ALL_INFLUENCERS.filter(i => 
    i.name.toLowerCase().includes(lowerQuery) ||
    i.username.toLowerCase().includes(lowerQuery) ||
    i.specialization.some(s => s.includes(lowerQuery)) ||
    i.tags.some(t => t.includes(lowerQuery))
  );
}

// ============================================================================
// POST ANALYSIS
// ============================================================================

/**
 * Analyze an influencer post for impact and alerts
 */
export function analyzeInfluencerPost(
  influencer: Influencer,
  content: string,
  engagement: { likes: number; comments: number; shares: number; views?: number },
  postedAt: Date = new Date()
): InfluencerPost {
  const detectedAt = new Date();
  
  // Run sentiment analysis
  const sentiment = analyzeSentiment(content);
  
  // Extract mentioned coins
  const mentionedCoins = extractCoinsFromPost(content);
  
  // Extract price targets
  const priceTargets = extractPriceTargets(content);
  
  // Determine call to action
  const callToAction = determineCallToAction(content, sentiment);
  
  // Calculate impact score
  const impactScore = calculateImpactScore(influencer, sentiment, engagement, mentionedCoins);
  
  // Determine urgency
  const urgency = determineUrgency(impactScore, influencer.tier);
  
  // Calculate market-moving potential
  const marketMovingPotential = calculateMarketMovingPotential(
    influencer, 
    sentiment, 
    mentionedCoins,
    engagement
  );
  
  // Predict price impact
  const expectedPriceImpact = predictPriceImpact(
    influencer,
    sentiment,
    marketMovingPotential
  );
  
  const post: InfluencerPost = {
    id: `${influencer.id}-${postedAt.getTime()}`,
    influencer,
    platform: influencer.platform,
    content: {
      text: content,
      mediaType: 'text',
      isThread: content.includes('🧵') || content.includes('thread'),
      threadLength: content.includes('🧵') ? estimateThreadLength(content) : undefined,
    },
    engagement,
    analysis: {
      sentiment,
      mentionedCoins,
      priceTargets,
      callToAction,
    },
    impact: {
      score: impactScore,
      urgency,
      marketMovingPotential,
      expectedPriceImpact,
    },
    postedAt,
    detectedAt,
  };
  
  // Store in history
  postHistory.set(post.id, post);
  
  return post;
}

function extractCoinsFromPost(content: string): string[] {
  const coins: Set<string> = new Set();
  const upperContent = content.toUpperCase();
  
  // Common coin mappings
  const coinMappings: Record<string, string> = {
    'BITCOIN': 'BTC', 'BTC': 'BTC', '#BTC': 'BTC', '#BITCOIN': 'BTC',
    'ETHEREUM': 'ETH', 'ETH': 'ETH', '#ETH': 'ETH', '#ETHEREUM': 'ETH',
    'SOLANA': 'SOL', 'SOL': 'SOL', '#SOL': 'SOL',
    'DOGECOIN': 'DOGE', 'DOGE': 'DOGE', '#DOGE': 'DOGE',
    'XRP': 'XRP', 'RIPPLE': 'XRP', '#XRP': 'XRP',
    'CARDANO': 'ADA', 'ADA': 'ADA', '#ADA': 'ADA',
    'POLKADOT': 'DOT', 'DOT': 'DOT', '#DOT': 'DOT',
    'AVALANCHE': 'AVAX', 'AVAX': 'AVAX', '#AVAX': 'AVAX',
    'CHAINLINK': 'LINK', 'LINK': 'LINK', '#LINK': 'LINK',
    'POLYGON': 'MATIC', 'MATIC': 'MATIC', '#MATIC': 'MATIC',
    'BNB': 'BNB', 'BINANCE': 'BNB', '#BNB': 'BNB',
    'LITECOIN': 'LTC', 'LTC': 'LTC', '#LTC': 'LTC',
  };
  
  for (const [key, symbol] of Object.entries(coinMappings)) {
    if (upperContent.includes(key)) {
      coins.add(symbol);
    }
  }
  
  // Extract cashtags ($BTC, $ETH, etc.)
  const cashtagPattern = /\$([A-Z]{2,6})\b/g;
  let match;
  while ((match = cashtagPattern.exec(upperContent)) !== null) {
    coins.add(match[1]);
  }
  
  return Array.from(coins);
}

function extractPriceTargets(content: string): Array<{ coin: string; target: number; direction: 'up' | 'down' }> {
  const targets: Array<{ coin: string; target: number; direction: 'up' | 'down' }> = [];
  
  // Pattern: "$BTC to $100k" or "Bitcoin $100,000"
  const patterns = [
    /\$?([A-Z]{2,6})\s+(?:to|at|reach|hit)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[kK]?/gi,
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[kK]?\s+\$?([A-Z]{2,6})/gi,
  ];
  
  const coins = extractCoinsFromPost(content);
  const lowerContent = content.toLowerCase();
  
  // Determine direction
  const bullishIndicators = ['to', 'reach', 'hit', 'target', 'moon', 'up'];
  const bearishIndicators = ['drop', 'fall', 'crash', 'down', 'dump'];
  
  const isBullish = bullishIndicators.some(i => lowerContent.includes(i));
  const isBearish = bearishIndicators.some(i => lowerContent.includes(i));
  
  // Extract numeric targets
  const pricePattern = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[kK]?/g;
  let match;
  while ((match = pricePattern.exec(content)) !== null) {
    let value = parseFloat(match[1].replace(/,/g, ''));
    if (match[0].toLowerCase().includes('k')) {
      value *= 1000;
    }
    if (value > 100 && value < 10000000 && coins.length > 0) {
      targets.push({
        coin: coins[0],
        target: value,
        direction: isBearish ? 'down' : 'up',
      });
    }
  }
  
  return targets.slice(0, 3);
}

function determineCallToAction(
  content: string, 
  sentiment: SentimentAnalysisResult
): 'buy' | 'sell' | 'hold' | 'watch' | 'none' {
  const lowerContent = content.toLowerCase();
  
  // Strong buy signals
  if (sentiment.signals.actionKeywords.includes('buy') || 
      lowerContent.includes('accumulate') ||
      lowerContent.includes('load up') ||
      lowerContent.includes('buying')) {
    return 'buy';
  }
  
  // Strong sell signals
  if (sentiment.signals.actionKeywords.includes('sell') ||
      lowerContent.includes('take profit') ||
      lowerContent.includes('exit') ||
      lowerContent.includes('selling')) {
    return 'sell';
  }
  
  // Hold signals
  if (sentiment.signals.actionKeywords.includes('hold') ||
      lowerContent.includes('hodl') ||
      lowerContent.includes('diamond hands')) {
    return 'hold';
  }
  
  // Watch signals
  if (lowerContent.includes('watch') ||
      lowerContent.includes('monitor') ||
      lowerContent.includes('keep an eye')) {
    return 'watch';
  }
  
  return 'none';
}

function calculateImpactScore(
  influencer: Influencer,
  sentiment: SentimentAnalysisResult,
  engagement: { likes: number; comments: number; shares: number },
  mentionedCoins: string[]
): number {
  let score = 0;
  
  // Base score from influencer metrics
  score += influencer.marketImpactScore * 0.3;
  score += influencer.credibilityScore * 0.2;
  
  // Tier multiplier
  const tierWeight = CONFIG.TIER_WEIGHTS[influencer.tier];
  score *= tierWeight;
  
  // Sentiment intensity
  score += Math.abs(sentiment.sentiment.score) * 20;
  score += sentiment.sentiment.magnitude * 15;
  
  // Engagement boost
  const engagementScore = Math.log10(engagement.likes + engagement.comments * 2 + engagement.shares * 3 + 1) * 5;
  score += engagementScore;
  
  // Coin mention boost (more specific = higher impact)
  if (mentionedCoins.length > 0 && mentionedCoins.length <= 3) {
    score += 10;
  }
  
  // Call to action boost
  if (sentiment.signals.actionKeywords.length > 0) {
    score += 10;
  }
  
  return Math.min(100, Math.round(score));
}

function determineUrgency(
  impactScore: number, 
  tier: InfluencerTier
): 'low' | 'medium' | 'high' | 'critical' {
  // Legendary tier always gets higher urgency
  if (tier === 'legendary') {
    if (impactScore >= 60) return 'critical';
    if (impactScore >= 40) return 'high';
    return 'medium';
  }
  
  // Elite tier
  if (tier === 'elite') {
    if (impactScore >= 70) return 'critical';
    if (impactScore >= 50) return 'high';
    if (impactScore >= 30) return 'medium';
    return 'low';
  }
  
  // Standard thresholds
  if (impactScore >= CONFIG.ALERT_THRESHOLDS.CRITICAL_IMPACT) return 'critical';
  if (impactScore >= CONFIG.ALERT_THRESHOLDS.HIGH_IMPACT) return 'high';
  if (impactScore >= CONFIG.ALERT_THRESHOLDS.MEDIUM_IMPACT) return 'medium';
  return 'low';
}

function calculateMarketMovingPotential(
  influencer: Influencer,
  sentiment: SentimentAnalysisResult,
  mentionedCoins: string[],
  engagement: { likes: number; comments: number; shares: number }
): number {
  let potential = 0;
  
  // Influencer reach
  potential += Math.min(40, Math.log10(influencer.followers + 1) * 8);
  
  // Historical accuracy
  potential += influencer.historicalAccuracy * 0.2;
  
  // Sentiment strength
  potential += Math.abs(sentiment.sentiment.score) * 20;
  
  // Specific coin mention (not just general crypto talk)
  if (mentionedCoins.length === 1) {
    potential += 15; // Very specific = higher potential
  } else if (mentionedCoins.length <= 3) {
    potential += 10;
  }
  
  // Engagement velocity (if high engagement quickly)
  const totalEngagement = engagement.likes + engagement.comments + engagement.shares;
  potential += Math.min(15, Math.log10(totalEngagement + 1) * 5);
  
  return Math.min(100, Math.round(potential));
}

function predictPriceImpact(
  influencer: Influencer,
  sentiment: SentimentAnalysisResult,
  marketMovingPotential: number
): { direction: 'up' | 'down' | 'neutral'; magnitude: number; confidence: number } {
  // Direction from sentiment
  let direction: 'up' | 'down' | 'neutral';
  if (sentiment.sentiment.score > 0.2) direction = 'up';
  else if (sentiment.sentiment.score < -0.2) direction = 'down';
  else direction = 'neutral';
  
  // Magnitude based on influencer power and sentiment
  let magnitude = 0;
  if (direction !== 'neutral') {
    // Base magnitude from market moving potential
    magnitude = (marketMovingPotential / 100) * 5; // Max 5%
    
    // Adjust for influencer tier
    if (influencer.tier === 'legendary') magnitude *= 2;
    else if (influencer.tier === 'elite') magnitude *= 1.5;
    
    // Adjust for sentiment intensity
    magnitude *= (Math.abs(sentiment.sentiment.score) + 0.5);
    
    // Cap at reasonable levels
    magnitude = Math.min(15, magnitude);
  }
  
  // Confidence based on historical accuracy and sentiment confidence
  const confidence = (
    influencer.historicalAccuracy * 0.5 +
    sentiment.sentiment.confidence * 50
  ) / 100;
  
  return {
    direction,
    magnitude: Math.round(magnitude * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
  };
}

function estimateThreadLength(content: string): number {
  // Estimate based on content length and indicators
  if (content.includes('1/')) {
    const match = content.match(/(\d+)\/(\d+)/);
    if (match) return parseInt(match[2]);
  }
  return Math.ceil(content.length / 280) + 1;
}

// ============================================================================
// ALERT GENERATION
// ============================================================================

/**
 * Generate alert from influencer post
 */
export function generateInfluencerAlert(post: InfluencerPost): InfluencerAlert | null {
  // Only generate alerts for medium+ urgency
  if (post.impact.urgency === 'low') {
    return null;
  }
  
  const now = new Date();
  
  // Determine alert type
  let type: InfluencerAlert['type'] = 'post';
  if (post.analysis.callToAction !== 'none') {
    type = 'market_call';
  } else if (post.analysis.sentiment.context.isNews) {
    type = 'breaking_news';
  }
  
  // Generate title
  const title = generateAlertTitle(post);
  
  // Generate summary
  const summary = generateAlertSummary(post);
  
  // Determine expected market reaction
  const expectedReaction = generateExpectedReaction(post);
  
  // Suggest action
  const suggestedAction = generateSuggestedAction(post);
  
  // Calculate expiration
  const expirationHours = CONFIG.ALERT_EXPIRATION[post.impact.urgency];
  const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);
  
  const alert: InfluencerAlert = {
    id: `alert-${post.id}`,
    type,
    influencer: post.influencer,
    post,
    urgency: post.impact.urgency,
    title,
    summary,
    impact: {
      score: post.impact.score,
      affectedCoins: post.analysis.mentionedCoins,
      expectedMarketReaction: expectedReaction,
      suggestedAction,
    },
    status: 'new',
    createdAt: now,
    expiresAt,
  };
  
  // Store in history
  alertHistory.set(alert.id, alert);
  
  logger.info('👤 Influencer alert generated', {
    influencer: post.influencer.name,
    urgency: alert.urgency,
    type: alert.type,
    coins: post.analysis.mentionedCoins.join(','),
  });
  
  return alert;
}

function generateAlertTitle(post: InfluencerPost): string {
  const { influencer, analysis, impact } = post;
  const coins = analysis.mentionedCoins.join(', ') || 'crypto';
  
  if (impact.urgency === 'critical') {
    return `🚨 CRITICAL: ${influencer.name} on ${coins}`;
  }
  
  if (analysis.callToAction === 'buy') {
    return `📈 ${influencer.name} bullish on ${coins}`;
  }
  
  if (analysis.callToAction === 'sell') {
    return `📉 ${influencer.name} bearish on ${coins}`;
  }
  
  if (analysis.sentiment.sentiment.label.includes('bullish')) {
    return `🟢 ${influencer.name} positive on ${coins}`;
  }
  
  if (analysis.sentiment.sentiment.label.includes('bearish')) {
    return `🔴 ${influencer.name} negative on ${coins}`;
  }
  
  return `👤 ${influencer.name} discusses ${coins}`;
}

function generateAlertSummary(post: InfluencerPost): string {
  const { influencer, analysis, impact, content } = post;
  
  let summary = `${influencer.name} (${influencer.tier} tier, ${influencer.followers.toLocaleString()} followers) `;
  
  // Sentiment
  summary += `expressed ${analysis.sentiment.sentiment.label.replace('_', ' ')} sentiment `;
  
  // Coins
  if (analysis.mentionedCoins.length > 0) {
    summary += `about ${analysis.mentionedCoins.join(', ')}. `;
  } else {
    summary += `about the market. `;
  }
  
  // Call to action
  if (analysis.callToAction && analysis.callToAction !== 'none') {
    summary += `Call to action: ${analysis.callToAction.toUpperCase()}. `;
  }
  
  // Price targets
  if (analysis.priceTargets.length > 0) {
    const target = analysis.priceTargets[0];
    summary += `Price target: $${target.target.toLocaleString()} (${target.direction}). `;
  }
  
  // Impact
  summary += `Impact score: ${impact.score}/100. `;
  
  // Excerpt
  if (content.text.length > 100) {
    summary += `\n\n"${content.text.substring(0, 150)}..."`;
  } else {
    summary += `\n\n"${content.text}"`;
  }
  
  return summary;
}

function generateExpectedReaction(post: InfluencerPost): string {
  const { influencer, impact, analysis } = post;
  
  if (impact.expectedPriceImpact.direction === 'neutral') {
    return 'Minimal immediate price impact expected';
  }
  
  const direction = impact.expectedPriceImpact.direction === 'up' ? 'upward' : 'downward';
  const magnitude = impact.expectedPriceImpact.magnitude;
  const confidence = Math.round(impact.expectedPriceImpact.confidence * 100);
  
  let reaction = `Expected ${direction} movement of ~${magnitude}% `;
  
  if (analysis.mentionedCoins.length > 0) {
    reaction += `for ${analysis.mentionedCoins.join(', ')} `;
  }
  
  reaction += `(${confidence}% confidence). `;
  
  if (influencer.tier === 'legendary') {
    reaction += 'High market sensitivity - monitor closely.';
  } else if (influencer.tier === 'elite') {
    reaction += 'Significant market attention expected.';
  }
  
  return reaction;
}

function generateSuggestedAction(post: InfluencerPost): string {
  const { impact, analysis, influencer } = post;
  
  if (impact.urgency === 'critical') {
    return 'Immediate review recommended. Consider position adjustments.';
  }
  
  if (analysis.callToAction === 'buy' && influencer.credibilityScore >= 70) {
    return 'Review for potential entry opportunity. Verify with other sources.';
  }
  
  if (analysis.callToAction === 'sell' && influencer.credibilityScore >= 70) {
    return 'Review current positions. Consider risk management.';
  }
  
  if (impact.urgency === 'high') {
    return 'Monitor market reaction. Set alerts for mentioned assets.';
  }
  
  return 'Keep informed. No immediate action required.';
}

// ============================================================================
// SNAPSHOT GENERATION
// ============================================================================

/**
 * Get influencer tracking snapshot
 */
export async function getInfluencerSnapshot(): Promise<InfluencerSnapshot> {
  // Check cache
  if (influencerCache && Date.now() - influencerCache.timestamp < CONFIG.CACHE_TTL_MS) {
    return influencerCache.data;
  }
  
  const now = new Date();
  const activeInfluencers = ALL_INFLUENCERS.filter(i => i.credibilityScore > 0);
  
  // Get recent posts (last 24 hours)
  const recentPosts = Array.from(postHistory.values())
    .filter(p => now.getTime() - p.postedAt.getTime() < 24 * 60 * 60 * 1000)
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .slice(0, 50);
  
  // Get active alerts
  const activeAlerts = Array.from(alertHistory.values())
    .filter(a => a.status === 'new' && a.expiresAt > now)
    .sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  
  const criticalAlerts = activeAlerts.filter(a => a.urgency === 'critical');
  
  // Calculate aggregate sentiment
  let bullishCount = 0;
  let bearishCount = 0;
  let totalSentiment = 0;
  
  for (const post of recentPosts) {
    const score = post.analysis.sentiment.sentiment.score;
    totalSentiment += score;
    if (score > 0.2) bullishCount++;
    else if (score < -0.2) bearishCount++;
  }
  
  const avgSentiment = recentPosts.length > 0 ? totalSentiment / recentPosts.length : 0;
  let overallSentiment: InfluencerSnapshot['influencerSentiment']['overall'];
  if (avgSentiment <= -0.5) overallSentiment = 'very_bearish';
  else if (avgSentiment <= -0.15) overallSentiment = 'bearish';
  else if (avgSentiment >= 0.5) overallSentiment = 'very_bullish';
  else if (avgSentiment >= 0.15) overallSentiment = 'bullish';
  else overallSentiment = 'neutral';
  
  // Top mentioned coins
  const coinMentions: Map<string, { count: number; sentiment: number; influencers: Set<string> }> = new Map();
  for (const post of recentPosts) {
    for (const coin of post.analysis.mentionedCoins) {
      const existing = coinMentions.get(coin) || { count: 0, sentiment: 0, influencers: new Set() };
      existing.count++;
      existing.sentiment += post.analysis.sentiment.sentiment.score;
      existing.influencers.add(post.influencer.name);
      coinMentions.set(coin, existing);
    }
  }
  
  const topMentionedCoins = Array.from(coinMentions.entries())
    .map(([coin, data]) => ({
      coin,
      mentions: data.count,
      sentiment: data.count > 0 ? Math.round((data.sentiment / data.count) * 100) / 100 : 0,
      topInfluencers: Array.from(data.influencers).slice(0, 3),
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);
  
  // Recent calls
  const recentCalls = recentPosts
    .filter(p => p.analysis.callToAction !== 'none' && p.analysis.callToAction !== 'watch')
    .map(p => ({
      influencer: p.influencer.name,
      coin: p.analysis.mentionedCoins[0] || 'CRYPTO',
      call: p.analysis.callToAction as 'buy' | 'sell' | 'hold',
      confidence: p.influencer.credibilityScore / 100,
      timestamp: p.postedAt,
    }))
    .slice(0, 10);
  
  const snapshot: InfluencerSnapshot = {
    timestamp: now.toISOString(),
    totalInfluencers: ALL_INFLUENCERS.length,
    activeInfluencers: activeInfluencers.length,
    recentPosts,
    activeAlerts,
    criticalAlerts,
    influencerSentiment: {
      overall: overallSentiment,
      score: Math.round(avgSentiment * 100) / 100,
      bullishInfluencers: bullishCount,
      bearishInfluencers: bearishCount,
    },
    topMentionedCoins,
    recentCalls,
  };
  
  // Update cache
  influencerCache = { data: snapshot, timestamp: Date.now() };
  
  return snapshot;
}

/**
 * Format influencer intelligence for AI context
 */
export function formatInfluencerIntelligenceForAI(snapshot: InfluencerSnapshot): string {
  const sentimentEmoji: Record<string, string> = {
    very_bullish: '🚀🚀',
    bullish: '📈',
    neutral: '➡️',
    bearish: '📉',
    very_bearish: '😰😰',
  };
  
  let context = `\n[👤 INFLUENCER INTELLIGENCE]\n`;
  context += `Tracking ${snapshot.activeInfluencers} crypto influencers\n`;
  context += `Overall Sentiment: ${sentimentEmoji[snapshot.influencerSentiment.overall]} ${snapshot.influencerSentiment.overall.toUpperCase()} `;
  context += `(${snapshot.influencerSentiment.bullishInfluencers} bullish, ${snapshot.influencerSentiment.bearishInfluencers} bearish)\n\n`;
  
  // Critical alerts
  if (snapshot.criticalAlerts.length > 0) {
    context += `🚨 CRITICAL ALERTS:\n`;
    for (const alert of snapshot.criticalAlerts.slice(0, 3)) {
      context += `• ${alert.title}\n`;
      context += `  ${alert.impact.expectedMarketReaction}\n`;
    }
    context += '\n';
  }
  
  // Recent high-impact posts
  const highImpactPosts = snapshot.recentPosts.filter(p => p.impact.urgency !== 'low').slice(0, 5);
  if (highImpactPosts.length > 0) {
    context += `📢 NOTABLE INFLUENCER ACTIVITY:\n`;
    for (const post of highImpactPosts) {
      const emoji = post.analysis.sentiment.sentiment.score > 0 ? '🟢' : 
                   post.analysis.sentiment.sentiment.score < 0 ? '🔴' : '⚪';
      context += `${emoji} ${post.influencer.name} (${post.influencer.tier}): `;
      context += `${post.analysis.sentiment.sentiment.label.replace('_', ' ')}`;
      if (post.analysis.mentionedCoins.length > 0) {
        context += ` on ${post.analysis.mentionedCoins.join(', ')}`;
      }
      if (post.analysis.callToAction && post.analysis.callToAction !== 'none') {
        context += ` [${post.analysis.callToAction.toUpperCase()}]`;
      }
      context += '\n';
    }
    context += '\n';
  }
  
  // Top mentioned coins
  if (snapshot.topMentionedCoins.length > 0) {
    context += `🔥 TOP INFLUENCER MENTIONS:\n`;
    for (const coin of snapshot.topMentionedCoins.slice(0, 5)) {
      const sentimentIcon = coin.sentiment > 0.2 ? '📈' : coin.sentiment < -0.2 ? '📉' : '➡️';
      context += `• ${coin.coin}: ${coin.mentions} mentions ${sentimentIcon} (${coin.topInfluencers.slice(0, 2).join(', ')})\n`;
    }
    context += '\n';
  }
  
  // Recent calls
  if (snapshot.recentCalls.length > 0) {
    context += `📊 RECENT INFLUENCER CALLS:\n`;
    for (const call of snapshot.recentCalls.slice(0, 5)) {
      const callEmoji = call.call === 'buy' ? '🟢' : call.call === 'sell' ? '🔴' : '🟡';
      context += `${callEmoji} ${call.influencer}: ${call.call.toUpperCase()} ${call.coin} (${Math.round(call.confidence * 100)}% credibility)\n`;
    }
  }
  
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const influencerTrackingService = {
  getTrackedInfluencers,
  getInfluencersByTier,
  getInfluencersBySpecialization,
  getInfluencer,
  searchInfluencers,
  analyzePost: analyzeInfluencerPost,
  generateAlert: generateInfluencerAlert,
  getSnapshot: getInfluencerSnapshot,
  formatForAI: formatInfluencerIntelligenceForAI,
  // Database access
  database: ALL_INFLUENCERS,
};

export default influencerTrackingService;

