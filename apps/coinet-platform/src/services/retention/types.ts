/**
 * 🎯 COINET AI RETENTION SYSTEM - TYPE DEFINITIONS
 * 
 * The Intelligence Ritual: Type-safe foundations for retention mechanics
 * 
 * Following 10/10 Divine Perfection standards:
 * - Complete type coverage for all retention concepts
 * - Discriminated unions for type safety
 * - Branded types for domain concepts
 * 
 * @module retention/types
 * @version 1.0.0
 */

// =============================================================================
// CORE METRICS & TARGETS (North Star)
// =============================================================================

/**
 * North Star + Supporting Metrics
 * Target: WAU with ≥1 meaningful interaction
 */
export interface RetentionMetrics {
  // North Star
  weeklyActiveUsers: number;
  weeklyActiveSessionsWithInteraction: number;
  
  // Supporting Metrics
  dailyHabitFormationRate: number;    // % of Week 2 users with 4+ session days/week
  medianTimeToFirstInsight: number;   // Seconds
  watchlistReturnRate: number;        // % within 24h of watchlist setup
  omniscoreEngagementDepth: number;   // % who expand beyond headlines
  alertResponseRate: number;          // % of alerts triggering sessions
  
  // Confidence & Quality
  sampleSize: number;
  dataQuality: number;                // 0-1
  calculatedAt: Date;
}

/**
 * 90-Day Success Criteria Targets
 */
export const RETENTION_TARGETS = {
  D1_TO_W2_RETENTION: 0.40,           // 40%
  HABIT_FORMATION_RATE: 0.35,         // 35% of W2 users
  AVG_SESSIONS_PER_WEEK: 6.5,
  TIME_TO_FIRST_INSIGHT_P50: 5,       // 5 seconds
  WATCHLIST_SETUP_RATE: 0.70,         // 70% of signups
  ALERT_SET_RATE: 0.45,               // 45% of D3 users
  MORNING_DIGEST_OPTIN: 0.55,         // 55% by W2
  HUNT_REWARD_CTR: 0.25,              // >25%
  PUSH_NOTIFICATION_CTR: 0.18,        // >18%
  CHURN_AFTER_BAD_CALL: 0.05,         // <5%
} as const;

// =============================================================================
// USER LIFECYCLE SEGMENTS
// =============================================================================

export type LifecycleSegment = 
  | 'new_user'        // Day 0-1
  | 'early'           // Day 2-7
  | 'habit_forming'   // Week 2-4
  | 'power_user'      // Month 2+
  | 'churning'        // Risk of leaving
  | 'dormant';        // No activity 14+ days

export interface LifecycleSegmentConfig {
  segment: LifecycleSegment;
  description: string;
  jobToBeDone: string;
  loopEmphasis: ('trigger' | 'action' | 'variable_reward' | 'investment')[];
  nextBestActions: string[];
  notificationRules: NotificationRule[];
}

export interface UserLifecycleContext {
  userId: string;
  segment: LifecycleSegment;
  segmentEnteredAt: Date;
  
  // Key metrics
  daysSinceSignup: number;
  totalSessions: number;
  sessionsLast7Days: number;
  currentStreak: number;
  longestStreak: number;
  
  // Investment depth
  watchlistSize: number;
  alertsConfigured: number;
  portfolioShared: boolean;
  riskToleranceSet: boolean;
  morningDigestEnabled: boolean;
  
  // Risk indicators
  churnProbability: number;
  lastSessionDate: Date | null;
}

// =============================================================================
// TRIGGER SYSTEM
// =============================================================================

export type TriggerType = 
  | 'regime_shift'
  | 'watchlist_threshold'
  | 'morning_digest'
  | 'opportunity_moment'
  | 'conversation_memory'
  | 'social_proof'
  | 'habit_reinforcement';

export type ExternalTriggerChannel = 'push' | 'email' | 'in_app';

export type InternalTrigger = 
  | 'uncertainty'         // User seeks "ground truth"
  | 'fomo'               // Validates if opportunity is real
  | 'validation_seeking'  // Confirms trade decision
  | 'boredom_habit'      // Morning routine check
  | 'anxiety'            // Portfolio down, unclear why
  | 'curiosity';         // Heard about new coin

export interface TriggerConfig {
  type: TriggerType;
  channel: ExternalTriggerChannel;
  maxFrequencyHours: number;
  requiresWatchlist: boolean;
  minQueryHistory?: number;
}

export interface TriggerEvent {
  id: string;
  type: TriggerType;
  userId: string;
  
  // Context
  symbol?: string;
  symbols?: string[];
  
  // Content
  title: string;
  body: string;
  
  // Targeting
  channel: ExternalTriggerChannel;
  priority: 'low' | 'medium' | 'high';
  
  // Metadata
  metadata: Record<string, unknown>;
  createdAt: Date;
  
  // Quality metrics
  signalStrength: number;     // 0-1
  relevanceScore: number;     // 0-1
}

// =============================================================================
// TRIGGER-SPECIFIC TYPES
// =============================================================================

export interface RegimeShiftTrigger extends TriggerEvent {
  type: 'regime_shift';
  metadata: {
    previousRegime: string;
    newRegime: string;
    affectedWatchlistCoins: string[];
    fearGreedIndex: number;
    summary: string;
  };
}

export interface WatchlistThresholdTrigger extends TriggerEvent {
  type: 'watchlist_threshold';
  symbol: string;
  metadata: {
    alertType: 'price' | 'omniscore_change';
    threshold: number;
    currentValue: number;
    delta: number;
    whatChanged: string;
  };
}

export interface MorningDigestTrigger extends TriggerEvent {
  type: 'morning_digest';
  metadata: {
    overnightMoves: Array<{
      symbol: string;
      change: number;
      direction: 'up' | 'down' | 'flat';
    }>;
    regimeInsight: string;
    omniscoreSpotlight?: {
      symbol: string;
      change: number;
      reason: string;
    };
    skipped: boolean;
    skipReason?: string;
  };
}

export interface OpportunityMomentTrigger extends TriggerEvent {
  type: 'opportunity_moment';
  symbol: string;
  metadata: {
    opportunityType: 'quadrant_transition' | 'derivatives_reversal';
    previousQuadrant?: string;
    currentQuadrant?: string;
    priorQueries: number;
    signalDescription: string;
  };
}

export interface ConversationMemoryTrigger extends TriggerEvent {
  type: 'conversation_memory';
  symbol: string;
  metadata: {
    originalQuery: string;
    originalQueryDate: Date;
    omniscoreDelta: number;
    previousOmniscore: number;
    currentOmniscore: number;
    whatChanged: string;
    daysSinceQuery: number;
  };
}

export interface SocialProofTrigger extends TriggerEvent {
  type: 'social_proof';
  symbol: string;
  metadata: {
    watchlistAdds: number;
    normalDailyAdds: number;
    multiplier: number;
    userSearchedBefore: boolean;
  };
}

export interface HabitReinforcementTrigger extends TriggerEvent {
  type: 'habit_reinforcement';
  metadata: {
    currentStreak: number;
    typicalCheckInTime: string;
    hoursSinceLastSession: number;
  };
}

// =============================================================================
// VARIABLE REWARDS SYSTEM
// =============================================================================

export type RewardCategory = 'tribe' | 'hunt' | 'self';

export type TribeRewardType = 
  | 'consensus_divergence'
  | 'early_adopter'
  | 'watchlist_overlap'
  | 'influencer_divergence'
  | 'community_discovery';

export type HuntRewardType = 
  | 'quadrant_transition'
  | 'regime_aligned_opportunity'
  | 'hidden_gem'
  | 'derivatives_edge'
  | 'confluence_moment';

export type SelfRewardType = 
  | 'decision_validation'
  | 'learning_milestone'
  | 'prediction_accuracy'
  | 'portfolio_insight'
  | 'complexity_unlocked';

export type RewardType = TribeRewardType | HuntRewardType | SelfRewardType;

export interface RewardConfig {
  type: RewardType;
  category: RewardCategory;
  maxPerWeek: number;
  maxPerDay?: number;
  requiresWatchlist: boolean;
  requiresQueryHistory?: boolean;
  minSignalStrength: number;
  surfaceTypes: RewardSurface[];
  neverPush: boolean;         // Tribe rewards never push
}

export type RewardSurface = 
  | 'in_app_banner'
  | 'in_app_card'
  | 'chat_footer'
  | 'notification_badge'
  | 'watchlist_icon';

export interface Reward {
  id: string;
  userId: string;
  
  // Classification
  category: RewardCategory;
  type: RewardType;
  
  // Content
  icon: string;              // Emoji
  title: string;
  body: string;
  cta: string;
  ctaAction: string;
  
  // Context
  symbol?: string;
  metadata: Record<string, unknown>;
  
  // Quality metrics
  signalStrength: number;    // 0-1
  dataQuality: number;       // 0-1
  
  // Delivery
  surfaceType: RewardSurface;
  expiresAt?: Date;
  
  // Engagement tracking
  isViewed: boolean;
  viewedAt?: Date;
  isClicked: boolean;
  clickedAt?: Date;
  
  createdAt: Date;
}

// =============================================================================
// REWARD-SPECIFIC TYPES
// =============================================================================

export interface TribeReward extends Reward {
  category: 'tribe';
  metadata: {
    rewardType: TribeRewardType;
    // Consensus Divergence
    socialSentiment?: 'bullish' | 'bearish';
    omniscoreSignal?: 'declining' | 'improving';
    // Early Adopter
    daysAhead?: number;
    watchlistIncreasePercent?: number;
    // Watchlist Overlap
    similarTraders?: number;
    overlapCoins?: string[];
    // Influencer Divergence
    ctSentiment?: string;
    derivativesSignal?: string;
    // Community Discovery
    weeklyAnalysisCount?: number;
  };
}

export interface HuntReward extends Reward {
  category: 'hunt';
  metadata: {
    rewardType: HuntRewardType;
    // Quadrant Transition
    previousQuadrant?: string;
    currentQuadrant?: string;
    // Regime Aligned
    marketRegime?: string;
    coinBehavior?: string;
    // Hidden Gem
    qs?: number;
    os?: number;
    // Derivatives Edge
    fundingRate?: number;
    spotPriceChange?: number;
    // Confluence
    alignedSignals?: string[];
  };
}

export interface SelfReward extends Reward {
  category: 'self';
  metadata: {
    rewardType: SelfRewardType;
    // Decision Validation
    originalQueryDate?: Date;
    priceChangePercent?: number;
    direction?: 'positive' | 'negative';
    // Learning Milestone
    milestoneType?: string;
    count?: number;
    // Prediction Accuracy
    correctCalls?: number;
    totalCalls?: number;
    // Portfolio Insight
    avgQs?: number;
    tier?: string;
    // Complexity Unlocked
    concept?: string;
  };
}

// =============================================================================
// ACTION SYSTEM
// =============================================================================

export interface ActionConfig {
  type: string;
  timeToValueTarget: number;  // Seconds
  defaultCTAs: string[];
  quickReplyChips: string[];
}

export interface InsightCard {
  id: string;
  type: 'watchlist_summary' | 'market_regime' | 'top_mover' | 'opportunity' | 'alert_triggered';
  
  // Content
  title: string;
  subtitle?: string;
  body: string;
  
  // Coins involved
  coins?: Array<{
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    omniscore?: number;
  }>;
  
  // Actions
  primaryCTA: string;
  secondaryCTA?: string;
  quickReplies?: string[];
  
  // Metadata
  priority: number;
  isPreGenerated: boolean;
  generatedAt: Date;
  expiresAt?: Date;
}

// =============================================================================
// INVESTMENT MECHANICS
// =============================================================================

export type InvestmentAction = 
  | 'watchlist_add'
  | 'price_alert'
  | 'morning_digest'
  | 'save_history'
  | 'risk_tolerance'
  | 'portfolio_set'
  | 'regime_prefs'
  | 'trading_notes'
  | 'wallet_connect'
  | 'referral';

export type InvestmentFriction = 'very_low' | 'low' | 'medium_low' | 'medium' | 'medium_high' | 'high';

export interface InvestmentActionConfig {
  action: InvestmentAction;
  friction: InvestmentFriction;
  userValue: string;
  systemValue: string;
  promptMoment: string;
  antiAnnoyance: string;
  cooldownDays: number;
}

export interface InvestmentPrompt {
  id: string;
  userId: string;
  action: InvestmentAction;
  
  // Prompt content
  promptText: string;
  ctaText: string;
  skipText: string;
  
  // Context
  contextTrigger: string;
  symbol?: string;
  
  // Timing
  promptedAt: Date;
  respondedAt?: Date;
  accepted: boolean;
  skipped: boolean;
  
  // Anti-annoyance
  canPromptAgainAt?: Date;
}

// =============================================================================
// DAILY RITUAL
// =============================================================================

export type RitualTime = 'morning' | 'midday' | 'evening';

export interface DailyRitualConfig {
  time: RitualTime;
  localTimeRange: [string, string];  // ["06:00", "09:00"]
  timeToValueTarget: number;         // Seconds
  defaultCTAs: string[];
  skipConditions: string[];
}

export interface RitualCard {
  time: RitualTime;
  userId: string;
  
  // Layout
  layout: 'morning_summary' | 'market_update' | 'evening_recap';
  
  // Content blocks
  headline: string;
  metrics: Array<{
    label: string;
    value: string;
    change?: number;
    indicator: 'up' | 'down' | 'neutral';
  }>;
  
  // Watchlist performance
  watchlistSummary?: {
    upCount: number;
    downCount: number;
    flatCount: number;
    avgChange: number;
    bestPerformer?: { symbol: string; change: number };
    worstPerformer?: { symbol: string; change: number };
  };
  
  // Market context
  marketContext?: {
    regime: string;
    regimeStable: boolean;
    fearGreedIndex: number;
    fearGreedLabel: string;
  };
  
  // Spotlight
  spotlight?: {
    type: 'top_mover' | 'hidden_gem' | 'builder_opportunity' | 'best_call';
    symbol: string;
    reason: string;
  };
  
  // CTAs
  primaryCTA: string;
  secondaryCTA: string;
  
  // Metadata
  generatedAt: Date;
  wasSkipped: boolean;
  skipReason?: string;
}

// =============================================================================
// NOTIFICATION SYSTEM
// =============================================================================

export interface NotificationRule {
  id: string;
  segment: LifecycleSegment;
  type: TriggerType | RewardType;
  channel: ExternalTriggerChannel;
  
  // Rate limiting
  maxPerDay: number;
  minIntervalHours: number;
  
  // Content
  copyTemplate: string;
  
  // Conditions
  conditions: NotificationCondition[];
}

export interface NotificationCondition {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'exists';
  value: unknown;
}

export interface NotificationDeliveryRequest {
  userId: string;
  type: TriggerType | RewardType | 'daily_ritual';
  channel: ExternalTriggerChannel;
  
  // Content
  title: string;
  body: string;
  
  // Context
  symbol?: string;
  metadata?: Record<string, unknown>;
  
  // A/B testing
  abTestId?: string;
  variant?: string;
  
  // Priority
  priority: 'low' | 'medium' | 'high';
  
  // Scheduling
  sendAt?: Date;       // For scheduled delivery
  ttl?: number;        // Time-to-live in seconds
}

export interface NotificationDeliveryResult {
  success: boolean;
  notificationId?: string;
  throttled: boolean;
  throttleReason?: string;
  scheduledFor?: Date;
  error?: string;
}

// =============================================================================
// A/B TESTING
// =============================================================================

export type ABTestType = 
  | 'trigger_timing'
  | 'watchlist_size'
  | 'notification_copy'
  | 'reward_frequency'
  | 'investment_prompt_timing'
  | 'self_reward_framing'
  | 'regime_explainer_length'
  | 'watchlist_default_view';

export interface ABTestConfig {
  id: string;
  name: string;
  type: ABTestType;
  hypothesis: string;
  
  // Variants
  variants: ABTestVariant[];
  trafficSplit: Record<string, number>;
  
  // Targeting
  targetSegments: LifecycleSegment[];
  minSampleSize: number;
  
  // Metrics
  primaryMetric: string;
  secondaryMetrics: string[];
  
  // Risk assessment
  expectedRisk: string;
  
  // Status
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  startedAt?: Date;
  endedAt?: Date;
}

export interface ABTestVariant {
  id: string;
  description: string;
  config: Record<string, unknown>;
}

export interface ABTestResult {
  testId: string;
  
  // Sample sizes
  totalSamples: number;
  variantSamples: Record<string, number>;
  
  // Primary metric
  primaryMetricResults: Record<string, number>;
  winningVariant?: string;
  statisticalSignificance: number;
  confidenceInterval: [number, number];
  
  // Secondary metrics
  secondaryMetricResults: Record<string, Record<string, number>>;
  
  // Conclusion
  recommendedAction: string;
  analysisNotes: string;
  
  analyzedAt: Date;
}

// =============================================================================
// FAILURE MODES
// =============================================================================

export type FailureMode = 
  | 'spam_notifications'
  | 'random_rewards'
  | 'slow_analysis'
  | 'stale_watchlist'
  | 'forgotten_context'
  | 'regime_not_actionable'
  | 'digest_ignored'
  | 'repeated_queries'
  | 'slow_chat'
  | 'trust_lost';

export interface FailureModeConfig {
  type: FailureMode;
  description: string;
  symptoms: string[];
  rootCause: string;
  fixes: string[];
  detectionQuery: string;
  threshold: number;
}

export interface FailureDetection {
  type: FailureMode;
  severity: 'warning' | 'critical';
  userId?: string;
  description: string;
  metadata: Record<string, unknown>;
  detectedAt: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

// =============================================================================
// PERSONALIZATION
// =============================================================================

export interface PersonalizationContext {
  userId: string;
  
  // From watchlist/portfolio
  watchlistSymbols: string[];
  portfolioSymbols: string[];
  
  // Preferences
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  tradingTimeframe?: 'day_trader' | 'swing_trader' | 'hodler';
  preferredDepth?: 'quick' | 'medium' | 'deep';
  
  // Learned behavior
  typicalSessionTime?: string;
  sessionFrequency: number;        // Sessions per day
  avgQueryDepth: number;           // 1-3 (quick to deep)
  
  // Intent history
  intentDistribution: Record<string, number>;
  
  // Recent topics
  recentSymbols: string[];
  recentTopics: string[];
}

export interface PersonalizedContent {
  // Alert prioritization
  alertPriority: 'risk_alerts' | 'opportunity_alerts' | 'balanced';
  
  // Notification frequency
  regimeUpdateFrequency: 'frequent' | 'daily' | 'weekly';
  
  // Response format
  defaultResponseFormat: 'quick' | 'decision_help' | 'deep_analysis';
  
  // Digest timing
  digestTime: 'morning' | 'evening' | 'none';
  
  // Content adaptation
  educationalPrompts: boolean;
  showAdvancedMetrics: boolean;
}

// =============================================================================
// GUARDRAILS
// =============================================================================

export const GUARDRAILS = {
  // No panic engineering
  FORBIDDEN_WORDS: ['URGENT', 'DON\'T MISS', 'ACT NOW', 'LIMITED TIME', 'LAST CHANCE'],
  
  // Silence is golden
  MAX_PUSH_PER_DAY: 2,
  MIN_NOTIFICATION_INTERVAL_HOURS: 6,
  
  // Intelligence over noise
  MIN_SIGNAL_STRENGTH: 0.3,
  MIN_DATA_QUALITY: 0.5,
  
  // Opt-out first
  DEFAULT_OPT_OUT: true,
  ONE_TAP_DISABLE: true,
  
  // Calm by default
  NO_RED_FOR_NON_CRITICAL: true,
  NEUTRAL_REGIME_COLORS: true,
  
  // No addiction metrics
  NO_TIME_ON_APP_OPTIMIZATION: true,
  NO_ENDLESS_SCROLL: true,
} as const;

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

export interface RetentionService {
  // Trigger evaluation
  evaluateTriggers(userId: string): Promise<TriggerEvent[]>;
  
  // Reward generation
  generateRewards(userId: string): Promise<Reward[]>;
  
  // Daily ritual
  generateRitualCard(userId: string, time: RitualTime): Promise<RitualCard>;
  
  // Lifecycle management
  updateLifecycleState(userId: string): Promise<UserLifecycleContext>;
  
  // Investment tracking
  recordInvestmentAction(userId: string, action: InvestmentAction, metadata?: Record<string, unknown>): Promise<void>;
  
  // Notification delivery
  deliverNotification(request: NotificationDeliveryRequest): Promise<NotificationDeliveryResult>;
  
  // A/B testing
  getVariantForUser(userId: string, testId: string): Promise<string>;
  recordConversion(userId: string, testId: string, metricValue: number): Promise<void>;
  
  // Failure detection
  detectFailures(userId?: string): Promise<FailureDetection[]>;
  
  // Personalization
  getPersonalizationContext(userId: string): Promise<PersonalizationContext>;
  getPersonalizedContent(userId: string): Promise<PersonalizedContent>;
}
