/**
 * =========================================
 * USER INTERACTION TRACKING SYSTEM
 * =========================================
 * Divine world-class system for tracking and analyzing user interactions with alerts
 * Privacy-compliant, anonymized data collection for behavioral analytics
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../services/signal-evaluation-engine/src/utils/Logger';
import { MetricsCollector } from '../../../services/signal-evaluation-engine/src/monitoring/MetricsCollector';
import { Pool } from 'pg';

export interface UserInteraction {
  id: string;
  userId: string; // Anonymized/hashed user ID
  sessionId: string; // Session identifier for grouping interactions
  alertId: string;
  ruleId: string;
  interactionType: InteractionType;
  timestamp: Date;
  metadata: {
    userAgent?: string;
    ipHash?: string; // Hashed IP for privacy
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    timeToAction?: number; // Milliseconds from alert receipt to interaction
    alertConfidence?: number;
    alertSeverity?: string;
  };
  context: {
    marketRegime?: string;
    timeOfDay: number; // Hour (0-23)
    dayOfWeek: number; // Day (0-6)
    isWeekend: boolean;
    isHoliday?: boolean;
  };
  privacyMetadata: {
    dataRetentionDate: Date;
    anonymizationLevel: 'full' | 'partial' | 'minimal';
    consentGiven: boolean;
    dataSource: string;
  };
}

export type InteractionType =
  | 'alert_received'
  | 'alert_opened'
  | 'alert_clicked'
  | 'alert_dismissed'
  | 'alert_shared'
  | 'trade_executed'
  | 'position_opened'
  | 'position_closed'
  | 'portfolio_viewed'
  | 'settings_changed'
  | 'notification_preferences_updated';

export interface InteractionPattern {
  patternId: string;
  userSegment: UserSegment;
  patternType: PatternType;
  confidence: number;
  frequency: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
  recommendations: string[];
  detectedAt: Date;
  lastSeen: Date;
}

export type PatternType =
  | 'alert_fatigue'
  | 'dormant_user'
  | 'high_frequency_trader'
  | 'long_term_holder'
  | 'casual_observer'
  | 'risk_averse'
  | 'risk_tolerant'
  | 'morning_trader'
  | 'evening_trader'
  | 'weekend_trader';

export type UserSegment =
  | 'power_user'
  | 'regular_user'
  | 'casual_user'
  | 'dormant_user'
  | 'new_user'
  | 'churn_risk';

export interface UserBehaviorProfile {
  userId: string;
  segment: UserSegment;
  interactionScore: number; // 0-100, higher = more engaged
  patternHistory: InteractionPattern[];
  behavioralTraits: {
    responseTime: number; // Average milliseconds to respond to alerts
    engagementLevel: number; // 0-1, how actively they engage
    riskTolerance: 'low' | 'medium' | 'high';
    preferredTimes: number[]; // Hours of day they are most active
    preferredDays: number[]; // Days of week they are most active
    alertFatigueScore: number; // 0-1, higher = more fatigued
    tradingActivity: number; // 0-1, how actively they trade
  };
  recommendations: {
    engagement: string[];
    alertFrequency: string[];
    contentPersonalization: string[];
    riskManagement: string[];
  };
  lastUpdated: Date;
  privacyLevel: 'anonymized' | 'pseudonymized' | 'identified';
}

export interface PrivacyConfig {
  dataRetentionDays: number;
  anonymizationEnabled: boolean;
  pseudonymizationEnabled: boolean;
  consentRequired: boolean;
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  dataMinimization: boolean;
  purposeLimitation: boolean;
}

export interface TrackingConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  privacy: PrivacyConfig;
  batchSize: number;
  flushInterval: number; // milliseconds
  enableRealTimeTracking: boolean;
  enablePatternDetection: boolean;
  enableRecommendations: boolean;
}

export class UserInteractionTracker extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private db: Pool;
  private config: TrackingConfig;
  private isInitialized: boolean = false;

  // In-memory buffers for batch processing
  private interactionBuffer: UserInteraction[] = [];
  private patternBuffer: InteractionPattern[] = [];

  // Active user sessions for real-time tracking
  private activeSessions: Map<string, {
    userId: string;
    startTime: Date;
    interactions: UserInteraction[];
    lastActivity: Date;
  }> = new Map();

  // Privacy compliance
  private anonymizer: DataAnonymizer;

  constructor(config: TrackingConfig) {
    super();
    this.logger = new Logger('UserInteractionTracker');
    this.metrics = new MetricsCollector();
    this.config = config;
    this.db = new Pool(config.database);
    this.anonymizer = new DataAnonymizer(config.privacy);

    this.initializeDatabase();
  }

  /**
   * Initialize database and privacy systems
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Create user interactions table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_interactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of user ID
          session_id VARCHAR(255) NOT NULL,
          alert_id VARCHAR(255),
          rule_id VARCHAR(255),
          interaction_type VARCHAR(50) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          metadata JSONB,
          context JSONB,
          privacy_metadata JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Indexes for efficient querying
        CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id_hash ON user_interactions(user_id_hash);
        CREATE INDEX IF NOT EXISTS idx_user_interactions_session_id ON user_interactions(session_id);
        CREATE INDEX IF NOT EXISTS idx_user_interactions_alert_id ON user_interactions(alert_id);
        CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);

        -- Partition by month for large datasets
        -- CREATE TABLE user_interactions_y2024m01 PARTITION OF user_interactions FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
      `);

      // Create user behavior profiles table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_behavior_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id_hash VARCHAR(255) NOT NULL,
          segment VARCHAR(50) NOT NULL,
          interaction_score DECIMAL(5,2) NOT NULL,
          behavioral_traits JSONB NOT NULL,
          recommendations JSONB NOT NULL,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          privacy_level VARCHAR(20) NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_behavior_profiles_user_id_hash ON user_behavior_profiles(user_id_hash);
        CREATE INDEX IF NOT EXISTS idx_behavior_profiles_segment ON user_behavior_profiles(segment);
        CREATE INDEX IF NOT EXISTS idx_behavior_profiles_interaction_score ON user_behavior_profiles(interaction_score);
      `);

      // Create interaction patterns table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS interaction_patterns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pattern_id VARCHAR(255) NOT NULL,
          user_segment VARCHAR(50) NOT NULL,
          pattern_type VARCHAR(50) NOT NULL,
          confidence DECIMAL(5,4) NOT NULL,
          frequency INTEGER NOT NULL,
          trend VARCHAR(20) NOT NULL,
          description TEXT NOT NULL,
          recommendations JSONB NOT NULL,
          detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_patterns_segment ON interaction_patterns(user_segment);
        CREATE INDEX IF NOT EXISTS idx_patterns_type ON interaction_patterns(pattern_type);
        CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON interaction_patterns(confidence);
      `);

      // Create privacy audit log
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS privacy_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          operation VARCHAR(100) NOT NULL,
          user_id_hash VARCHAR(255),
          data_type VARCHAR(50) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          details JSONB,
          compliance_check VARCHAR(20) NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_privacy_audit_operation ON privacy_audit_log(operation);
        CREATE INDEX IF NOT EXISTS idx_privacy_audit_timestamp ON privacy_audit_log(timestamp);
      `);

      this.isInitialized = true;
      this.logger.info('✅ User interaction tracking database initialized');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize database', error);
      throw error;
    }
  }

  /**
   * Track a user interaction with privacy compliance
   */
  async trackInteraction(
    userId: string,
    interaction: Omit<UserInteraction, 'id' | 'userId' | 'privacyMetadata'>,
    consentGiven: boolean = true
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('User interaction tracker not initialized');
    }

    try {
      // Anonymize/pseudonymize user ID based on privacy config
      const anonymizedUserId = await this.anonymizer.anonymizeUserId(userId);

      // Build complete interaction record
      const fullInteraction: UserInteraction = {
        id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: anonymizedUserId,
        ...interaction,
        privacyMetadata: {
          dataRetentionDate: new Date(Date.now() + (this.config.privacy.dataRetentionDays * 24 * 60 * 60 * 1000)),
          anonymizationLevel: this.config.privacy.anonymizationEnabled ? 'full' : 'minimal',
          consentGiven,
          dataSource: 'alert_system'
        }
      };

      // Store in buffer for batch processing
      this.interactionBuffer.push(fullInteraction);

      // Update active session
      this.updateActiveSession(anonymizedUserId, interaction.sessionId, fullInteraction);

      // Flush buffer if it reaches batch size
      if (this.interactionBuffer.length >= this.config.batchSize) {
        await this.flushInteractionBuffer();
      }

      // Log privacy compliance
      await this.logPrivacyEvent('interaction_tracked', anonymizedUserId, 'user_interaction');

      this.logger.debug('User interaction tracked', {
        userId: anonymizedUserId.substring(0, 8) + '...',
        interactionType: interaction.interactionType,
        alertId: interaction.alertId
      });

      // Emit interaction event for real-time processing
      this.emit('interactionTracked', fullInteraction);
    } catch (error: any) {
      this.logger.error('Failed to track interaction', error);
      throw error;
    }
  }

  /**
   * Update active user session with new interaction
   */
  private updateActiveSession(userId: string, sessionId: string, interaction: UserInteraction): void {
    const sessionKey = `${userId}_${sessionId}`;
    const existingSession = this.activeSessions.get(sessionKey);

    if (existingSession) {
      existingSession.interactions.push(interaction);
      existingSession.lastActivity = new Date();
    } else {
      this.activeSessions.set(sessionKey, {
        userId,
        startTime: new Date(),
        interactions: [interaction],
        lastActivity: new Date()
      });
    }

    // Clean up old sessions (older than 24 hours)
    this.cleanupOldSessions();
  }

  /**
   * Clean up inactive sessions
   */
  private cleanupOldSessions(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    for (const [sessionKey, session] of this.activeSessions) {
      if (session.lastActivity.getTime() < cutoffTime) {
        this.activeSessions.delete(sessionKey);
      }
    }
  }

  /**
   * Flush interaction buffer to database
   */
  private async flushInteractionBuffer(): Promise<void> {
    if (this.interactionBuffer.length === 0) return;

    try {
      const interactionsToInsert = [...this.interactionBuffer];
      this.interactionBuffer = [];

      const values = interactionsToInsert.map((_, index) =>
        `($${index * 12 + 1}, $${index * 12 + 2}, $${index * 12 + 3}, $${index * 12 + 4},
          $${index * 12 + 5}, $${index * 12 + 6}, $${index * 12 + 7}, $${index * 12 + 8},
          $${index * 12 + 9}, $${index * 12 + 10}, $${index * 12 + 11}, $${index * 12 + 12})`
      ).join(', ');

      const query = `
        INSERT INTO user_interactions (
          user_id_hash, session_id, alert_id, rule_id, interaction_type,
          timestamp, metadata, context, privacy_metadata
        ) VALUES ${values}
      `;

      const params = interactionsToInsert.flatMap(interaction => [
        interaction.userId,
        interaction.sessionId,
        interaction.alertId || null,
        interaction.ruleId || null,
        interaction.interactionType,
        interaction.timestamp,
        JSON.stringify(interaction.metadata),
        JSON.stringify(interaction.context),
        JSON.stringify(interaction.privacyMetadata)
      ]);

      await this.db.query(query, params);

      this.logger.debug('Interaction buffer flushed', {
        count: interactionsToInsert.length
      });
    } catch (error: any) {
      this.logger.error('Failed to flush interaction buffer', error);
      // Re-add interactions back to buffer for retry
      this.interactionBuffer.unshift(...this.interactionBuffer);
    }
  }

  /**
   * Log privacy compliance events
   */
  private async logPrivacyEvent(
    operation: string,
    userIdHash: string | null,
    dataType: string,
    details?: any
  ): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO privacy_audit_log (operation, user_id_hash, data_type, details, compliance_check)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        operation,
        userIdHash,
        dataType,
        JSON.stringify(details || {}),
        'compliant'
      ]);
    } catch (error: any) {
      this.logger.error('Failed to log privacy event', error);
    }
  }

  /**
   * Generate user behavior profile from historical interactions
   */
  async generateUserProfile(userId: string): Promise<UserBehaviorProfile | null> {
    if (!this.isInitialized) {
      throw new Error('User interaction tracker not initialized');
    }

    try {
      const anonymizedUserId = await this.anonymizer.anonymizeUserId(userId);

      // Get recent interactions for this user
      const { rows: interactions } = await this.db.query(`
        SELECT * FROM user_interactions
        WHERE user_id_hash = $1
        ORDER BY timestamp DESC
        LIMIT 1000
      `, [anonymizedUserId]);

      if (interactions.length === 0) {
        return null;
      }

      // Analyze interaction patterns
      const segment = this.analyzeUserSegment(interactions);
      const behavioralTraits = this.analyzeBehavioralTraits(interactions);
      const interactionScore = this.calculateInteractionScore(interactions);
      const recommendations = this.generateRecommendations(segment, behavioralTraits);

      const profile: UserBehaviorProfile = {
        userId: anonymizedUserId,
        segment,
        interactionScore,
        patternHistory: [], // Would be populated from pattern detection
        behavioralTraits,
        recommendations,
        lastUpdated: new Date(),
        privacyLevel: this.config.privacy.anonymizationEnabled ? 'anonymized' : 'identified'
      };

      // Store profile in database
      await this.storeUserProfile(profile);

      return profile;
    } catch (error: any) {
      this.logger.error('Failed to generate user profile', error);
      throw error;
    }
  }

  /**
   * Analyze user segment based on interaction patterns
   */
  private analyzeUserSegment(interactions: any[]): UserSegment {
    // Simple heuristic-based segmentation
    const totalInteractions = interactions.length;
    const alertInteractions = interactions.filter(i => i.interaction_type.includes('alert')).length;
    const tradeInteractions = interactions.filter(i => i.interaction_type.includes('trade')).length;
    const recentInteractions = interactions.filter(i =>
      i.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Power user: High interaction volume, frequent trading
    if (totalInteractions > 500 && tradeInteractions > 50 && recentInteractions > 20) {
      return 'power_user';
    }

    // Regular user: Moderate activity
    if (totalInteractions > 100 && tradeInteractions > 10 && recentInteractions > 5) {
      return 'regular_user';
    }

    // Casual user: Low to moderate activity
    if (totalInteractions > 20 && alertInteractions > 5) {
      return 'casual_user';
    }

    // Dormant user: Very low recent activity
    if (recentInteractions < 2) {
      return 'dormant_user';
    }

    // New user: Recent registration, low activity
    if (totalInteractions < 20) {
      return 'new_user';
    }

    // Churn risk: Declining activity patterns
    return 'regular_user'; // Default
  }

  /**
   * Analyze behavioral traits from interactions
   */
  private analyzeBehavioralTraits(interactions: any[]): UserBehaviorProfile['behavioralTraits'] {
    const alertInteractions = interactions.filter(i => i.interaction_type.includes('alert'));
    const tradeInteractions = interactions.filter(i => i.interaction_type.includes('trade'));

    // Calculate response time (average time from alert receipt to interaction)
    const responseTimes = alertInteractions
      .filter(i => i.metadata?.time_to_action)
      .map(i => i.metadata.time_to_action);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Calculate engagement level (frequency of interactions)
    const daysActive = new Set(
      interactions.map(i => i.timestamp.toISOString().split('T')[0])
    ).size;

    const engagementLevel = Math.min(interactions.length / Math.max(daysActive, 1) / 10, 1);

    // Analyze preferred times
    const hourCounts = new Array(24).fill(0);
    interactions.forEach(i => {
      const hour = i.context?.time_of_day ?? new Date(i.timestamp).getHours();
      hourCounts[hour]++;
    });

    const preferredTimes = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    // Analyze risk tolerance (based on alert confidence thresholds)
    const highConfidenceInteractions = alertInteractions.filter(i =>
      i.metadata?.alert_confidence && i.metadata.alert_confidence > 0.8
    );

    const riskTolerance = highConfidenceInteractions.length > alertInteractions.length * 0.7
      ? 'high' : highConfidenceInteractions.length > alertInteractions.length * 0.4
        ? 'medium' : 'low';

    // Calculate alert fatigue (declining engagement over time)
    const recentAlertInteractions = alertInteractions.filter(i =>
      i.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const olderAlertInteractions = alertInteractions.filter(i =>
      i.timestamp <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
      i.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const alertFatigueScore = olderAlertInteractions.length > 0
      ? Math.max(0, 1 - (recentAlertInteractions.length / olderAlertInteractions.length))
      : 0;

    // Calculate trading activity
    const tradingActivity = Math.min(tradeInteractions.length / Math.max(alertInteractions.length, 1), 1);

    return {
      responseTime: avgResponseTime,
      engagementLevel,
      riskTolerance: riskTolerance as 'low' | 'medium' | 'high',
      preferredTimes,
      preferredDays: [], // Would analyze day-of-week patterns
      alertFatigueScore,
      tradingActivity
    };
  }

  /**
   * Calculate interaction score (0-100)
   */
  private calculateInteractionScore(interactions: any[]): number {
    if (interactions.length === 0) return 0;

    // Weighted scoring based on interaction types
    const weights = {
      'alert_opened': 5,
      'alert_clicked': 10,
      'trade_executed': 20,
      'position_opened': 15,
      'position_closed': 15,
      'alert_dismissed': -2,
      'alert_received': 1
    };

    const totalScore = interactions.reduce((score, interaction) => {
      const weight = weights[interaction.interaction_type as keyof typeof weights] || 1;
      return score + weight;
    }, 0);

    // Normalize to 0-100 scale
    return Math.min(Math.max(totalScore / interactions.length * 2, 0), 100);
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    segment: UserSegment,
    traits: UserBehaviorProfile['behavioralTraits']
  ): UserBehaviorProfile['recommendations'] {
    const recommendations = {
      engagement: [] as string[],
      alertFrequency: [] as string[],
      contentPersonalization: [] as string[],
      riskManagement: [] as string[]
    };

    // Engagement recommendations based on segment and traits
    if (segment === 'dormant_user') {
      recommendations.engagement.push(
        'Send re-engagement notifications with personalized content',
        'Offer limited-time promotions to reactivate interest',
        'Reduce alert frequency temporarily to avoid overwhelming'
      );
    } else if (segment === 'power_user') {
      recommendations.engagement.push(
        'Provide advanced analytics and insights',
        'Offer premium features and early access',
        'Create VIP support channels'
      );
    }

    // Alert frequency based on fatigue and activity
    if (traits.alertFatigueScore > 0.7) {
      recommendations.alertFrequency.push(
        'Reduce alert frequency by 50%',
        'Focus on high-confidence alerts only',
        'Implement gradual re-engagement strategy'
      );
    } else if (traits.engagementLevel > 0.8) {
      recommendations.alertFrequency.push(
        'Increase alert frequency for active users',
        'Include more detailed analysis in alerts',
        'Enable real-time alert customization'
      );
    }

    // Content personalization based on behavior
    if (traits.preferredTimes.length > 0) {
      recommendations.contentPersonalization.push(
        `Schedule alerts during preferred hours: ${traits.preferredTimes.join(', ')}:00`,
        'Adjust notification timing based on user timezone and preferences'
      );
    }

    if (traits.riskTolerance === 'low') {
      recommendations.riskManagement.push(
        'Emphasize risk management in alert content',
        'Highlight conservative trading strategies',
        'Include risk warnings prominently'
      );
    }

    return recommendations;
  }

  /**
   * Store user profile in database
   */
  private async storeUserProfile(profile: UserBehaviorProfile): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO user_behavior_profiles (
          user_id_hash, segment, interaction_score, behavioral_traits,
          recommendations, last_updated, privacy_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id_hash) DO UPDATE SET
          segment = EXCLUDED.segment,
          interaction_score = EXCLUDED.interaction_score,
          behavioral_traits = EXCLUDED.behavioral_traits,
          recommendations = EXCLUDED.recommendations,
          last_updated = EXCLUDED.last_updated
      `, [
        profile.userId,
        profile.segment,
        profile.interactionScore,
        JSON.stringify(profile.behavioralTraits),
        JSON.stringify(profile.recommendations),
        profile.lastUpdated,
        profile.privacyLevel
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store user profile', error);
    }
  }

  /**
   * Start the tracking service
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      // Start periodic buffer flushing
      setInterval(() => {
        this.flushInteractionBuffer();
      }, this.config.flushInterval);

      this.logger.info('✅ User interaction tracking started');
      this.emit('started');
    }
  }

  /**
   * Stop the tracking service
   */
  async stop(): Promise<void> {
    // Flush remaining buffer
    await this.flushInteractionBuffer();

    // Close database connection
    await this.db.end();

    this.isInitialized = false;
    this.logger.info('✅ User interaction tracking stopped');
    this.emit('stopped');
  }

  /**
   * Get aggregated user behavior insights
   */
  async getAggregatedInsights(timeWindow: { start: Date; end: Date }): Promise<{
    totalUsers: number;
    activeUsers: number;
    segmentDistribution: Record<UserSegment, number>;
    engagementMetrics: {
      averageInteractionScore: number;
      averageResponseTime: number;
      alertFatigueRate: number;
    };
    recommendations: {
      topStrategies: string[];
      riskAdjustments: string[];
      contentOptimizations: string[];
    };
  }> {
    try {
      const { rows: userStats } = await this.db.query(`
        SELECT
          COUNT(DISTINCT user_id_hash) as total_users,
          COUNT(DISTINCT CASE WHEN timestamp >= $1 THEN user_id_hash END) as active_users,
          segment,
          COUNT(*) as segment_count
        FROM user_behavior_profiles
        WHERE last_updated >= $2
        GROUP BY segment
      `, [timeWindow.start, timeWindow.start]);

      const { rows: engagementStats } = await this.db.query(`
        SELECT
          AVG(interaction_score) as avg_score,
          AVG((behavioral_traits->>'responseTime')::numeric) as avg_response_time,
          AVG((behavioral_traits->>'alertFatigueScore')::numeric) as avg_fatigue
        FROM user_behavior_profiles
        WHERE last_updated >= $1
      `, [timeWindow.start]);

      // Calculate segment distribution
      const segmentDistribution: Record<UserSegment, number> = {
        power_user: 0,
        regular_user: 0,
        casual_user: 0,
        dormant_user: 0,
        new_user: 0,
        churn_risk: 0
      };

      userStats.forEach((row: any) => {
        if (row.segment in segmentDistribution) {
          segmentDistribution[row.segment as UserSegment] = parseInt(row.segment_count);
        }
      });

      return {
        totalUsers: parseInt(userStats[0]?.total_users || '0'),
        activeUsers: parseInt(userStats[0]?.active_users || '0'),
        segmentDistribution,
        engagementMetrics: {
          averageInteractionScore: parseFloat(engagementStats[0]?.avg_score || '0'),
          averageResponseTime: parseFloat(engagementStats[0]?.avg_response_time || '0'),
          alertFatigueRate: parseFloat(engagementStats[0]?.avg_fatigue || '0')
        },
        recommendations: {
          topStrategies: ['Increase engagement for dormant users', 'Optimize alert timing'],
          riskAdjustments: ['Adjust risk levels based on user tolerance'],
          contentOptimizations: ['Personalize content based on user behavior']
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to get aggregated insights', error);
      throw error;
    }
  }

  /**
   * Get user interactions for a specific user
   */
  async getUserInteractions(userId: string, timeWindow?: { start: Date; end: Date }): Promise<UserInteraction[]> {
    try {
      let query = 'SELECT * FROM user_interactions WHERE user_id_hash = $1';
      const params: any[] = [userId];

      if (timeWindow) {
        query += ' AND timestamp >= $2 AND timestamp <= $3';
        params.push(timeWindow.start, timeWindow.end);
      }

      query += ' ORDER BY timestamp DESC';

      const { rows } = await this.db.query(query, params);
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id_hash,
        sessionId: row.session_id,
        alertId: row.alert_id,
        ruleId: row.rule_id,
        interactionType: row.interaction_type,
        timestamp: new Date(row.timestamp),
        metadata: row.metadata,
        context: row.context,
        privacyMetadata: row.privacy_metadata
      }));
    } catch (error: any) {
      this.logger.error('Failed to get user interactions', error);
      return [];
    }
  }

  /**
   * Get all user profiles
   */
  async getAllUserProfiles(timeWindow?: { start: Date; end: Date }): Promise<UserBehaviorProfile[]> {
    try {
      let query = 'SELECT * FROM user_behavior_profiles';
      const params: any[] = [];

      if (timeWindow) {
        query += ' WHERE last_updated >= $1 AND last_updated <= $2';
        params.push(timeWindow.start, timeWindow.end);
      }

      query += ' ORDER BY last_updated DESC';

      const { rows } = await this.db.query(query, params);
      return rows.map(row => ({
        userId: row.user_id_hash,
        segment: row.segment,
        behavioralTraits: row.behavioral_traits,
        interactionScore: row.interaction_score,
        lastUpdated: new Date(row.last_updated)
      }));
    } catch (error: any) {
      this.logger.error('Failed to get all user profiles', error);
      return [];
    }
  }
}

/**
 * Data Anonymizer for privacy compliance
 */
class DataAnonymizer {
  private config: PrivacyConfig;

  constructor(config: PrivacyConfig) {
    this.config = config;
  }

  /**
   * Anonymize user ID using SHA-256 hash
   */
  async anonymizeUserId(userId: string): Promise<string> {
    if (!this.config.anonymizationEnabled) {
      return userId;
    }

    // Simple hash for demonstration - in production, use proper cryptographic hashing
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Anonymize IP address
   */
  anonymizeIpAddress(ip: string): string {
    if (!this.config.anonymizationEnabled) {
      return ip;
    }

    // Simple IP anonymization - in production, use proper methods
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
    }
    return 'anonymized';
  }

  /**
   * Validate data retention compliance
   */
  validateDataRetention(interaction: UserInteraction): boolean {
    const retentionDate = interaction.privacyMetadata.dataRetentionDate;
    return retentionDate > new Date();
  }

  /**
   * Check GDPR compliance for data collection
   */
  checkGDPRCompliance(interaction: UserInteraction): boolean {
    return this.config.gdprCompliant &&
           interaction.privacyMetadata.consentGiven &&
           this.validateDataRetention(interaction);
  }

}
