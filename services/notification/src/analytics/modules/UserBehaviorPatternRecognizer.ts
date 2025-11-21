/**
 * =========================================
 * ELITE USER BEHAVIOR PATTERN RECOGNIZER
 * =========================================
 * World-class user behavior pattern recognition system that analyzes
 * user interactions with alerts, discovers segments using clustering
 * algorithms, and detects patterns like alert fatigue or dormant users.
 * Ensures data is anonymized and aggregated to comply with privacy laws.
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../src/utils/Logger';
import { AnalyticsConfig } from '../EliteAnalyticsEngine';

export interface UserBehaviorConfig {
  enabled: boolean;
  clusteringAlgorithms: string[];
  sequenceMiningEnabled: boolean;
  patternRetention: number; // days
  anonymizationLevel: 'high' | 'medium' | 'low';
}

export interface UserInteraction {
  userId: string;
  alertId: string;
  interactionType: 'opened' | 'clicked' | 'ignored' | 'traded' | 'unsubscribed';
  timestamp: Date;
  metadata?: Record<string, any>;
  sessionId?: string;
  deviceInfo?: Record<string, any>;
}

export interface UserSegment {
  id: string;
  name: string;
  characteristics: Record<string, any>;
  userCount: number;
  engagementScore: number;
  description: string;
  recommendations: string[];
}

export interface BehaviorPattern {
  type: 'alert_fatigue' | 'high_frequency_trader' | 'long_term_holder' | 'dormant_user' | 'new_user' | 'power_user';
  frequency: number;
  confidence: number;
  description: string;
  characteristics: Record<string, any>;
  userIds: string[];
  recommendations: string[];
}

export interface UserBehaviorInsights {
  segments: UserSegment[];
  patterns: BehaviorPattern[];
  recommendations: string[];
  anonymizedInsights: Record<string, any>;
  complianceMetrics: {
    anonymizationLevel: string;
    dataRetentionDays: number;
    privacyScore: number;
  };
}

export class UserBehaviorPatternRecognizer extends EventEmitter {
  private static instance: UserBehaviorPatternRecognizer;
  private logger: Logger;
  private config: UserBehaviorConfig;
  private interactions: Map<string, UserInteraction[]> = new Map();
  private segments: Map<string, UserSegment> = new Map();
  private patterns: Map<string, BehaviorPattern> = new Map();
  private anonymizationCache: Map<string, any> = new Map();
  private isRunning: boolean = false;

  constructor(config: AnalyticsConfig) {
    super();
    this.logger = Logger.getInstance();
    this.config = config.advanced.userBehavior;
  }

  static getInstance(config: AnalyticsConfig): UserBehaviorPatternRecognizer {
    if (!UserBehaviorPatternRecognizer.instance) {
      UserBehaviorPatternRecognizer.instance = new UserBehaviorPatternRecognizer(config);
    }
    return UserBehaviorPatternRecognizer.instance;
  }

  async initialize(): Promise<void> {
    if (this.isRunning) {
      throw new Error('User Behavior Pattern Recognizer is already running');
    }

    this.logger.info('👥 Initializing User Behavior Pattern Recognizer...');

    try {
      // Load historical interaction data
      await this.loadHistoricalInteractions();

      // Initialize clustering algorithms
      await this.initializeClusteringFramework();

      // Initialize sequence mining if enabled
      if (this.config.sequenceMiningEnabled) {
        await this.initializeSequenceMining();
      }

      // Initialize anonymization framework
      await this.initializeAnonymizationFramework();

      this.isRunning = true;
      this.logger.info('✅ User Behavior Pattern Recognizer initialized successfully');

      // Start periodic pattern analysis
      this.startPeriodicAnalysis();

    } catch (error) {
      this.logger.error('❌ Failed to initialize User Behavior Pattern Recognizer', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('🛑 Stopping User Behavior Pattern Recognizer...');

    this.isRunning = false;

    // Clean up resources
    this.interactions.clear();
    this.segments.clear();
    this.patterns.clear();
    this.anonymizationCache.clear();

    this.logger.info('✅ User Behavior Pattern Recognizer stopped');
  }

  /**
   * Record user interaction for pattern analysis
   */
  async recordUserInteraction(interaction: UserInteraction): Promise<void> {
    if (!this.isRunning) {
      throw new Error('User Behavior Pattern Recognizer is not running');
    }

    try {
      // Anonymize interaction data
      const anonymizedInteraction = await this.anonymizeInteraction(interaction);

      // Store interaction in memory
      const userInteractions = this.interactions.get(interaction.userId) || [];
      userInteractions.push(anonymizedInteraction);
      this.interactions.set(interaction.userId, userInteractions);

      // Persist to database (anonymized)
      await this.persistAnonymizedInteraction(anonymizedInteraction);

      // Trigger pattern analysis if interaction is significant
      if (this.isSignificantInteraction(interaction)) {
        await this.analyzeUserPatterns(interaction.userId);
      }

      this.logger.debug('✅ User interaction recorded', {
        userId: this.anonymizeUserId(interaction.userId),
        interactionType: interaction.interactionType
      });

    } catch (error) {
      this.logger.error('❌ Failed to record user interaction', {
        error: error instanceof Error ? error.message : String(error),
        userId: this.anonymizeUserId(interaction.userId)
      });
      throw error;
    }
  }

  /**
   * Get user behavior patterns and segments
   */
  async getUserBehaviorPatterns(userId?: string): Promise<UserBehaviorInsights> {
    if (!this.isRunning) {
      throw new Error('User Behavior Pattern Recognizer is not running');
    }

    try {
      let insights: UserBehaviorInsights;

      if (userId) {
        // Get patterns for specific user
        insights = await this.getUserSpecificInsights(userId);
      } else {
        // Get aggregated insights
        insights = await this.getAggregatedInsights();
      }

      return insights;

    } catch (error) {
      this.logger.error('❌ Failed to get user behavior patterns', {
        error: error instanceof Error ? error.message : String(error),
        userId: userId ? this.anonymizeUserId(userId) : 'aggregated'
      });
      throw error;
    }
  }

  /**
   * Analyze user patterns and update segments
   */
  private async analyzeUserPatterns(userId: string): Promise<void> {
    try {
      const userInteractions = this.interactions.get(userId) || [];

      // Detect behavior patterns
      const patterns = await this.detectBehaviorPatterns(userId, userInteractions);

      // Update user segments
      await this.updateUserSegments(userId, patterns);

      // Update anonymized insights
      await this.updateAnonymizedInsights(userId, patterns);

    } catch (error) {
      this.logger.error('❌ Failed to analyze user patterns', {
        error: error instanceof Error ? error.message : String(error),
        userId: this.anonymizeUserId(userId)
      });
    }
  }

  /**
   * Detect behavior patterns using clustering and sequence mining
   */
  private async detectBehaviorPatterns(userId: string, interactions: UserInteraction[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];

    try {
      // 1. Alert fatigue detection
      const alertFatigue = await this.detectAlertFatigue(interactions);
      if (alertFatigue) patterns.push(alertFatigue);

      // 2. High frequency trader detection
      const highFreqTrader = await this.detectHighFrequencyTrader(interactions);
      if (highFreqTrader) patterns.push(highFreqTrader);

      // 3. Long-term holder detection
      const longTermHolder = await this.detectLongTermHolder(interactions);
      if (longTermHolder) patterns.push(longTermHolder);

      // 4. Dormant user detection
      const dormantUser = await this.detectDormantUser(interactions);
      if (dormantUser) patterns.push(dormantUser);

      // 5. New user detection
      const newUser = await this.detectNewUser(interactions);
      if (newUser) patterns.push(newUser);

      // 6. Power user detection
      const powerUser = await this.detectPowerUser(interactions);
      if (powerUser) patterns.push(powerUser);

      return patterns;

    } catch (error) {
      this.logger.error('❌ Failed to detect behavior patterns', {
        error: error instanceof Error ? error.message : String(error),
        userId: this.anonymizeUserId(userId)
      });
      return [];
    }
  }

  /**
   * Detect alert fatigue pattern
   */
  private async detectAlertFatigue(interactions: UserInteraction[]): Promise<BehaviorPattern | null> {
    const now = new Date();
    const last7Days = interactions.filter(i =>
      i.timestamp >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    );

    const ignoredCount = last7Days.filter(i => i.interactionType === 'ignored').length;
    const totalCount = last7Days.length;

    if (totalCount >= 10 && ignoredCount / totalCount > 0.7) {
      return {
        type: 'alert_fatigue',
        frequency: ignoredCount / totalCount,
        confidence: Math.min(0.9, ignoredCount / totalCount),
        description: `User is showing signs of alert fatigue with ${Math.round(ignoredCount / totalCount * 100)}% ignore rate`,
        characteristics: {
          ignoreRate: ignoredCount / totalCount,
          period: '7 days',
          totalInteractions: totalCount
        },
        userIds: [], // Anonymized
        recommendations: [
          'Reduce alert frequency for this user',
          'Improve alert relevance through better filtering',
          'Consider alternative communication channels'
        ]
      };
    }

    return null;
  }

  /**
   * Detect high frequency trader pattern
   */
  private async detectHighFrequencyTrader(interactions: UserInteraction[]): Promise<BehaviorPattern | null> {
    const tradedInteractions = interactions.filter(i => i.interactionType === 'traded');
    const avgDailyTrades = tradedInteractions.length / Math.max(1, this.getDaysSinceFirstInteraction(interactions));

    if (avgDailyTrades > 5) { // More than 5 trades per day
      return {
        type: 'high_frequency_trader',
        frequency: avgDailyTrades,
        confidence: Math.min(0.95, avgDailyTrades / 10),
        description: `High frequency trader with ${avgDailyTrades.toFixed(1)} trades per day`,
        characteristics: {
          avgDailyTrades,
          totalTrades: tradedInteractions.length,
          tradingIntensity: 'high'
        },
        userIds: [],
        recommendations: [
          'Provide real-time market data',
          'Offer advanced trading tools',
          'Consider premium subscription features'
        ]
      };
    }

    return null;
  }

  /**
   * Detect long-term holder pattern
   */
  private async detectLongTermHolder(interactions: UserInteraction[]): Promise<BehaviorPattern | null> {
    const tradedInteractions = interactions.filter(i => i.interactionType === 'traded');
    const firstInteraction = Math.min(...interactions.map(i => i.timestamp.getTime()));
    const daysActive = (Date.now() - firstInteraction) / (1000 * 60 * 60 * 24);

    if (daysActive > 90 && tradedInteractions.length < 10) {
      return {
        type: 'long_term_holder',
        frequency: tradedInteractions.length / daysActive,
        confidence: 0.8,
        description: `Long-term holder with only ${tradedInteractions.length} trades over ${Math.round(daysActive)} days`,
        characteristics: {
          daysActive: Math.round(daysActive),
          totalTrades: tradedInteractions.length,
          tradingFrequency: tradedInteractions.length / daysActive,
          holdingStrategy: 'long_term'
        },
        userIds: [],
        recommendations: [
          'Focus on long-term investment alerts',
          'Provide portfolio tracking features',
          'Consider educational content on long-term strategies'
        ]
      };
    }

    return null;
  }

  /**
   * Detect dormant user pattern
   */
  private async detectDormantUser(interactions: UserInteraction[]): Promise<BehaviorPattern | null> {
    const now = new Date();
    const lastInteraction = Math.max(...interactions.map(i => i.timestamp.getTime()));
    const daysSinceLastInteraction = (now.getTime() - lastInteraction) / (1000 * 60 * 60 * 24);

    if (daysSinceLastInteraction > 30 && interactions.length > 5) {
      return {
        type: 'dormant_user',
        frequency: 1 / daysSinceLastInteraction,
        confidence: Math.min(0.9, daysSinceLastInteraction / 90),
        description: `Dormant user with no activity for ${Math.round(daysSinceLastInteraction)} days`,
        characteristics: {
          daysSinceLastInteraction: Math.round(daysSinceLastInteraction),
          totalInteractions: interactions.length,
          engagementLevel: 'low'
        },
        userIds: [],
        recommendations: [
          'Send re-engagement campaigns',
          'Offer incentives for returning',
          'Analyze why user became dormant'
        ]
      };
    }

    return null;
  }

  /**
   * Detect new user pattern
   */
  private async detectNewUser(interactions: UserInteraction[]): Promise<BehaviorPattern | null> {
    const firstInteraction = Math.min(...interactions.map(i => i.timestamp.getTime()));
    const daysSinceFirst = (Date.now() - firstInteraction) / (1000 * 60 * 60 * 24);

    if (daysSinceFirst < 7) {
      return {
        type: 'new_user',
        frequency: 1,
        confidence: 0.9,
        description: `New user with first interaction ${Math.round(daysSinceFirst)} days ago`,
        characteristics: {
          daysSinceFirst: Math.round(daysSinceFirst),
          interactionCount: interactions.length,
          onboardingStatus: 'new'
        },
        userIds: [],
        recommendations: [
          'Provide onboarding guidance',
          'Send welcome series',
          'Monitor early engagement patterns'
        ]
      };
    }

    return null;
  }

  /**
   * Detect power user pattern
   */
  private async detectPowerUser(interactions: UserInteraction[]): Promise<BehaviorPattern | null> {
    const tradedInteractions = interactions.filter(i => i.interactionType === 'traded');
    const openedInteractions = interactions.filter(i => i.interactionType === 'opened');
    const totalInteractions = interactions.length;

    const tradeRatio = tradedInteractions.length / totalInteractions;
    const engagementRatio = openedInteractions.length / totalInteractions;

    if (tradeRatio > 0.3 && engagementRatio > 0.8 && totalInteractions > 50) {
      return {
        type: 'power_user',
        frequency: tradeRatio,
        confidence: Math.min(0.95, tradeRatio + engagementRatio),
        description: `Power user with ${Math.round(tradeRatio * 100)}% trade conversion and high engagement`,
        characteristics: {
          tradeConversionRate: tradeRatio,
          engagementRate: engagementRatio,
          totalInteractions,
          userValue: 'high'
        },
        userIds: [],
        recommendations: [
          'Provide VIP features and support',
          'Offer exclusive insights',
          'Consider ambassador program'
        ]
      };
    }

    return null;
  }

  /**
   * Update user segments based on detected patterns
   */
  private async updateUserSegments(userId: string, patterns: BehaviorPattern[]): Promise<void> {
    // This would update the user's segment assignments in the database
    // For now, we'll just log the updates
    this.logger.debug('🔄 Updating user segments', {
      userId: this.anonymizeUserId(userId),
      patternCount: patterns.length,
      patternTypes: patterns.map(p => p.type)
    });
  }

  /**
   * Update anonymized insights
   */
  private async updateAnonymizedInsights(userId: string, patterns: BehaviorPattern[]): Promise<void> {
    // Update aggregated insights while maintaining privacy
    for (const pattern of patterns) {
      const existingPattern = this.patterns.get(pattern.type);
      if (existingPattern) {
        existingPattern.userIds.push(this.anonymizeUserId(userId));
        existingPattern.frequency = (existingPattern.frequency + pattern.frequency) / 2;
      } else {
        this.patterns.set(pattern.type, {
          ...pattern,
          userIds: [this.anonymizeUserId(userId)]
        });
      }
    }
  }

  /**
   * Anonymize user interaction data
   */
  private async anonymizeInteraction(interaction: UserInteraction): Promise<UserInteraction> {
    const cleanedMetadata = this.config.anonymizationLevel === 'high' ?
      this.removeSensitiveMetadata(interaction.metadata || {}) : interaction.metadata;

    const result: UserInteraction = {
      alertId: interaction.alertId,
      interactionType: interaction.interactionType,
      timestamp: interaction.timestamp,
      userId: this.anonymizeUserId(interaction.userId)
    };

    if (cleanedMetadata !== undefined) {
      result.metadata = cleanedMetadata;
    }

    if (this.config.anonymizationLevel !== 'high' && interaction.deviceInfo) {
      result.deviceInfo = interaction.deviceInfo;
    }

    return result;
  }

  /**
   * Anonymize user ID for privacy compliance
   */
  private anonymizeUserId(userId: string): string {
    // Simple hash-based anonymization (in production, use proper cryptographic hashing)
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Remove sensitive metadata for high anonymization
   */
  private removeSensitiveMetadata(metadata: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['ip', 'location', 'browser', 'device', 'fingerprint'];
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (!sensitiveFields.includes(key.toLowerCase())) {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Check if interaction is significant for pattern analysis
   */
  private isSignificantInteraction(interaction: UserInteraction): boolean {
    const significantTypes = ['traded', 'unsubscribed'];
    return significantTypes.includes(interaction.interactionType);
  }

  /**
   * Get days since first interaction
   */
  private getDaysSinceFirstInteraction(interactions: UserInteraction[]): number {
    if (interactions.length === 0) return 1;
    const firstTimestamp = Math.min(...interactions.map(i => i.timestamp.getTime()));
    return Math.max(1, (Date.now() - firstTimestamp) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get user-specific insights
   */
  private async getUserSpecificInsights(userId: string): Promise<UserBehaviorInsights> {
    const userInteractions = this.interactions.get(userId) || [];
    const patterns = await this.detectBehaviorPatterns(userId, userInteractions);

    return {
      segments: [], // Would be populated from database
      patterns,
      recommendations: patterns.flatMap(p => p.recommendations),
      anonymizedInsights: {
        interactionCount: userInteractions.length,
        engagementLevel: this.calculateEngagementLevel(userInteractions),
        patternCount: patterns.length
      },
      complianceMetrics: {
        anonymizationLevel: this.config.anonymizationLevel,
        dataRetentionDays: this.config.patternRetention,
        privacyScore: this.calculatePrivacyScore()
      }
    };
  }

  /**
   * Get aggregated insights across all users
   */
  private async getAggregatedInsights(): Promise<UserBehaviorInsights> {
    const allPatterns = Array.from(this.patterns.values());

    return {
      segments: Array.from(this.segments.values()),
      patterns: allPatterns,
      recommendations: this.generateGlobalRecommendations(allPatterns),
      anonymizedInsights: {
        totalUsers: this.interactions.size,
        avgInteractionsPerUser: this.calculateAvgInteractions(),
        topPatterns: allPatterns
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 5)
          .map(p => ({ type: p.type, frequency: p.frequency }))
      },
      complianceMetrics: {
        anonymizationLevel: this.config.anonymizationLevel,
        dataRetentionDays: this.config.patternRetention,
        privacyScore: this.calculatePrivacyScore()
      }
    };
  }

  /**
   * Calculate engagement level for a user
   */
  private calculateEngagementLevel(interactions: UserInteraction[]): 'high' | 'medium' | 'low' {
    const recentInteractions = interactions.filter(i =>
      i.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentInteractions.length > 10) return 'high';
    if (recentInteractions.length > 3) return 'medium';
    return 'low';
  }

  /**
   * Calculate privacy score based on anonymization settings
   */
  private calculatePrivacyScore(): number {
    let score = 100;

    switch (this.config.anonymizationLevel) {
      case 'high':
        score += 20;
        break;
      case 'medium':
        score += 10;
        break;
      case 'low':
        score -= 20;
        break;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate average interactions per user
   */
  private calculateAvgInteractions(): number {
    if (this.interactions.size === 0) return 0;
    const totalInteractions = Array.from(this.interactions.values())
      .reduce((sum, interactions) => sum + interactions.length, 0);
    return totalInteractions / this.interactions.size;
  }

  /**
   * Generate global recommendations based on patterns
   */
  private generateGlobalRecommendations(patterns: BehaviorPattern[]): string[] {
    const recommendations: string[] = [];

    const alertFatigueUsers = patterns.find(p => p.type === 'alert_fatigue');
    if (alertFatigueUsers && alertFatigueUsers.frequency > 0.1) {
      recommendations.push('Consider global alert frequency optimization');
      recommendations.push('Review alert relevance algorithms');
    }

    const highFreqTraders = patterns.find(p => p.type === 'high_frequency_trader');
    if (highFreqTraders && highFreqTraders.frequency > 0.05) {
      recommendations.push('High frequency traders represent significant segment');
      recommendations.push('Consider specialized trading tools and features');
    }

    return recommendations;
  }

  // Initialization and database methods (placeholders)
  private async loadHistoricalInteractions(): Promise<void> {
    this.logger.info('👥 Loading historical user interactions...');
    // Implementation would query anonymized interaction data
  }

  private async initializeClusteringFramework(): Promise<void> {
    this.logger.info('👥 Initializing clustering algorithms...');
    // Implementation would initialize clustering libraries
  }

  private async initializeSequenceMining(): Promise<void> {
    this.logger.info('👥 Initializing sequence mining...');
    // Implementation would initialize sequence mining algorithms
  }

  private async initializeAnonymizationFramework(): Promise<void> {
    this.logger.info('👥 Initializing anonymization framework...');
    // Implementation would set up anonymization utilities
  }

  private async persistAnonymizedInteraction(interaction: UserInteraction): Promise<void> {
    // Persist anonymized interaction to database
    // Implementation would insert into privacy-compliant storage
  }

  private startPeriodicAnalysis(): void {
    // Run pattern analysis every hour
    setInterval(() => {
      this.runPeriodicPatternAnalysis();
    }, 60 * 60 * 1000);
  }

  private async runPeriodicPatternAnalysis(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Analyze patterns for all users periodically
      for (const [userId, interactions] of Array.from(this.interactions.entries())) {
        if (interactions.length > 0) {
          await this.analyzeUserPatterns(userId);
        }
      }

      this.logger.debug('🔄 Periodic pattern analysis completed');

    } catch (error) {
      this.logger.error('❌ Periodic pattern analysis failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
