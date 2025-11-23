/**
 * =========================================
 * USER BEHAVIOR PATTERN DETECTION ENGINE
 * =========================================
 * Divine world-class system for detecting user behavior patterns and generating personalized recommendations
 * Advanced pattern recognition for alert fatigue, dormant users, and engagement optimization
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../services/signal-evaluation-engine/src/utils/Logger';
import { MetricsCollector } from '../../../services/signal-evaluation-engine/src/monitoring/MetricsCollector';
import { Pool } from 'pg';

export interface PatternDetectionRule {
  patternType: string;
  name: string;
  description: string;
  conditions: PatternCondition[];
  actions: PatternAction[];
  priority: number; // Higher priority = more important
  enabled: boolean;
}

export interface PatternCondition {
  type: 'threshold' | 'trend' | 'frequency' | 'sequence' | 'comparison';
  metric: string; // e.g., 'alert_fatigue_score', 'engagement_level', 'response_time'
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'in' | 'not_in';
  value: number | string | string[];
  timeWindow?: number; // Days to look back
  aggregation?: 'avg' | 'sum' | 'count' | 'max' | 'min';
}

export interface PatternAction {
  type: 'recommendation' | 'alert_frequency' | 'content_personalization' | 'engagement_strategy' | 'risk_management';
  target: string; // Target metric or behavior to modify
  action: string; // Specific action to take
  parameters?: Record<string, any>;
  confidence: number; // 0-1, confidence in this action's effectiveness
}

export interface DetectedPattern {
  patternId: string;
  patternType: string;
  userId: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  description: string;
  evidence: {
    conditions: PatternCondition[];
    metrics: Record<string, number>;
    trends: Record<string, 'increasing' | 'decreasing' | 'stable'>;
  };
  recommendations: PatternAction[];
  expirationDate?: Date;
  status: 'active' | 'resolved' | 'expired';
}

export interface RecommendationEngine {
  generateRecommendations: (
    userProfile: any,
    detectedPatterns: DetectedPattern[],
    clusterInfo?: any
  ) => {
    engagement: string[];
    alertFrequency: string[];
    contentPersonalization: string[];
    riskManagement: string[];
  };
}

export interface PatternDetectionConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  detectionInterval: number; // Minutes between pattern detection runs
  minDataPoints: number; // Minimum interactions needed for pattern detection
  enableRealTimeDetection: boolean;
  enableBatchProcessing: boolean;
  patternRules: PatternDetectionRule[];
  recommendationEngine: RecommendationEngine;
}

export class PatternDetectionEngine extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private db: Pool;
  private config: PatternDetectionConfig;
  private isInitialized: boolean = false;
  private detectionInterval?: NodeJS.Timeout;

  constructor(config: PatternDetectionConfig) {
    super();
    this.logger = new Logger('PatternDetectionEngine');
    this.metrics = new MetricsCollector();
    this.config = config;
    this.db = new Pool(config.database);

    this.initializeDatabase();
  }

  /**
   * Initialize pattern detection database
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Create detected patterns table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS detected_patterns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pattern_id VARCHAR(255) NOT NULL,
          pattern_type VARCHAR(100) NOT NULL,
          user_id_hash VARCHAR(255) NOT NULL,
          confidence DECIMAL(5,4) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          description TEXT NOT NULL,
          evidence JSONB NOT NULL,
          recommendations JSONB NOT NULL,
          expiration_date TIMESTAMP WITH TIME ZONE,
          status VARCHAR(20) NOT NULL DEFAULT 'active'
        );

        CREATE INDEX IF NOT EXISTS idx_detected_patterns_user_id ON detected_patterns(user_id_hash);
        CREATE INDEX IF NOT EXISTS idx_detected_patterns_type ON detected_patterns(pattern_type);
        CREATE INDEX IF NOT EXISTS idx_detected_patterns_severity ON detected_patterns(severity);
        CREATE INDEX IF NOT EXISTS idx_detected_patterns_status ON detected_patterns(status);
        CREATE INDEX IF NOT EXISTS idx_detected_patterns_detected_at ON detected_patterns(detected_at);
      `);

      // Create pattern detection rules table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS pattern_detection_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pattern_type VARCHAR(100) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          conditions JSONB NOT NULL,
          actions JSONB NOT NULL,
          priority INTEGER NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_detection_rules_type ON pattern_detection_rules(pattern_type);
        CREATE INDEX IF NOT EXISTS idx_detection_rules_enabled ON pattern_detection_rules(enabled);
      `);

      // Create pattern detection logs
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS pattern_detection_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pattern_id VARCHAR(255),
          user_id_hash VARCHAR(255) NOT NULL,
          rule_applied VARCHAR(255) NOT NULL,
          result VARCHAR(50) NOT NULL,
          metrics_before JSONB,
          metrics_after JSONB,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          execution_time_ms INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_detection_logs_pattern_id ON pattern_detection_logs(pattern_id);
        CREATE INDEX IF NOT EXISTS idx_detection_logs_user_id ON pattern_detection_logs(user_id_hash);
        CREATE INDEX IF NOT EXISTS idx_detection_logs_timestamp ON pattern_detection_logs(timestamp);
      `);

      this.isInitialized = true;
      this.logger.info('✅ Pattern detection database initialized');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize pattern detection database', error);
      throw error;
    }
  }

  /**
   * Detect patterns for a specific user
   */
  async detectUserPatterns(userId: string): Promise<DetectedPattern[]> {
    if (!this.isInitialized) {
      throw new Error('Pattern detection engine not initialized');
    }

    try {
      // Get user interactions for pattern analysis
      const userInteractions = await this.getUserInteractions(userId);
      if (userInteractions.length < this.config.minDataPoints) {
        return [];
      }

      // Get user behavior profile
      const userProfile = await this.getUserProfile(userId);

      // Apply pattern detection rules
      const detectedPatterns: DetectedPattern[] = [];

      for (const rule of this.config.patternRules) {
        if (!rule.enabled) continue;

        const pattern = await this.evaluatePatternRule(rule, userInteractions, userProfile);
        if (pattern) {
          detectedPatterns.push(pattern);
        }
      }

      // Store detected patterns
      for (const pattern of detectedPatterns) {
        await this.storeDetectedPattern(pattern);
      }

      this.logger.debug('Pattern detection completed for user', {
        userId: userId.substring(0, 8) + '...',
        patternsDetected: detectedPatterns.length
      });

      return detectedPatterns;
    } catch (error: any) {
      this.logger.error('Failed to detect user patterns', error);
      throw error;
    }
  }

  /**
   * Evaluate a pattern detection rule against user data
   */
  private async evaluatePatternRule(
    rule: PatternDetectionRule,
    interactions: any[],
    userProfile: any
  ): Promise<DetectedPattern | null> {
    try {
      const metrics = this.calculateUserMetrics(interactions, userProfile);
      const trends = this.calculateTrends(interactions);

      // Evaluate all conditions
      const conditionsMet = rule.conditions.every(condition => {
        return this.evaluateCondition(condition, metrics, trends, interactions);
      });

      if (!conditionsMet) {
        return null;
      }

      // Calculate overall confidence
      const confidence = this.calculatePatternConfidence(rule, metrics, trends);

      // Generate recommendations
      const recommendations = rule.actions.map(action => ({
        type: action.type,
        target: action.target,
        action: action.action,
        parameters: action.parameters,
        confidence: action.confidence
      }));

      // Determine severity based on pattern type and metrics
      const severity = this.determineSeverity(rule.patternType, metrics);

      const detectedPattern: DetectedPattern = {
        patternId: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patternType: rule.patternType,
        userId: userProfile?.userId || 'unknown',
        confidence,
        severity,
        detectedAt: new Date(),
        description: rule.description,
        evidence: {
          conditions: rule.conditions,
          metrics,
          trends
        },
        recommendations,
        status: 'active'
      };

      return detectedPattern;
    } catch (error: any) {
      this.logger.error('Failed to evaluate pattern rule', error);
      return null;
    }
  }

  /**
   * Calculate user metrics from interactions
   */
  private calculateUserMetrics(interactions: any[], userProfile: any): Record<string, number> {
    const metrics: Record<string, number> = {};

    // Alert interaction metrics
    const alertInteractions = interactions.filter(i => i.interaction_type.includes('alert'));
    const totalAlerts = interactions.filter(i => i.interaction_type === 'alert_received').length;
    const openedAlerts = interactions.filter(i => i.interaction_type === 'alert_opened').length;
    const clickedAlerts = interactions.filter(i => i.interaction_type === 'alert_clicked').length;
    const dismissedAlerts = interactions.filter(i => i.interaction_type === 'alert_dismissed').length;

    metrics.alert_open_rate = totalAlerts > 0 ? openedAlerts / totalAlerts : 0;
    metrics.alert_click_rate = totalAlerts > 0 ? clickedAlerts / totalAlerts : 0;
    metrics.alert_dismiss_rate = totalAlerts > 0 ? dismissedAlerts / totalAlerts : 0;

    // Alert fatigue calculation
    if (openedAlerts > 0) {
      metrics.alert_fatigue_score = Math.max(0, 1 - (clickedAlerts / openedAlerts));
    } else {
      metrics.alert_fatigue_score = 0;
    }

    // Response time analysis
    const responseTimes = interactions
      .filter(i => i.metadata?.time_to_action)
      .map(i => parseFloat(i.metadata.time_to_action));

    metrics.avg_response_time = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Engagement level
    const daysActive = new Set(
      interactions.map(i => i.timestamp.toISOString().split('T')[0])
    ).size;

    metrics.engagement_level = Math.min(interactions.length / Math.max(daysActive, 1) / 10, 1);

    // Trading activity
    const tradeInteractions = interactions.filter(i => i.interaction_type.includes('trade'));
    metrics.trading_activity = tradeInteractions.length / Math.max(alertInteractions.length, 1);

    // Time-based patterns
    const hourCounts = new Array(24).fill(0);
    interactions.forEach(i => {
      const hour = i.context?.time_of_day ?? new Date(i.timestamp).getHours();
      hourCounts[hour]++;
    });

    const preferredHour = hourCounts.indexOf(Math.max(...hourCounts));
    metrics.preferred_hour = preferredHour;

    // Weekend vs weekday activity
    const weekendActivity = interactions.filter(i => i.context?.is_weekend === true).length;
    const weekdayActivity = interactions.filter(i => i.context?.is_weekend === false).length;
    metrics.weekend_activity_ratio = weekdayActivity > 0 ? weekendActivity / weekdayActivity : 0;

    // Copy from user profile if available
    if (userProfile) {
      metrics.interaction_score = userProfile.interactionScore || 0;
      metrics.risk_tolerance = userProfile.behavioralTraits?.riskTolerance || 0.5;
    }

    return metrics;
  }

  /**
   * Calculate trends from historical data
   */
  private calculateTrends(interactions: any[]): Record<string, 'increasing' | 'decreasing' | 'stable'> {
    const trends: Record<string, 'increasing' | 'decreasing' | 'stable'> = {};

    // Group interactions by day for trend analysis
    const dailyInteractions = new Map<string, number>();

    interactions.forEach(interaction => {
      const day = interaction.timestamp.toISOString().split('T')[0];
      dailyInteractions.set(day, (dailyInteractions.get(day) || 0) + 1);
    });

    const dailyCounts = Array.from(dailyInteractions.values());

    if (dailyCounts.length < 3) {
      trends.interaction_frequency = 'stable';
    } else {
      const firstHalf = dailyCounts.slice(0, Math.floor(dailyCounts.length / 2));
      const secondHalf = dailyCounts.slice(Math.floor(dailyCounts.length / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const change = (secondAvg - firstAvg) / firstAvg;

      if (change > 0.1) {
        trends.interaction_frequency = 'increasing';
      } else if (change < -0.1) {
        trends.interaction_frequency = 'decreasing';
      } else {
        trends.interaction_frequency = 'stable';
      }
    }

    // Alert fatigue trend
    const alertInteractions = interactions.filter(i => i.interaction_type.includes('alert'));
    const recentAlertInteractions = alertInteractions.filter(i =>
      i.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentAlertInteractions.length > 0) {
      const dismissRate = recentAlertInteractions.filter(i => i.interaction_type === 'alert_dismissed').length / recentAlertInteractions.length;
      if (dismissRate > 0.7) {
        trends.alert_fatigue = 'increasing';
      } else if (dismissRate < 0.3) {
        trends.alert_fatigue = 'decreasing';
      } else {
        trends.alert_fatigue = 'stable';
      }
    } else {
      trends.alert_fatigue = 'stable';
    }

    return trends;
  }

  /**
   * Evaluate a single condition against user data
   */
  private evaluateCondition(
    condition: PatternCondition,
    metrics: Record<string, number>,
    trends: Record<string, 'increasing' | 'decreasing' | 'stable'>,
    interactions: any[]
  ): boolean {
    let actualValue: number | string;

    switch (condition.type) {
      case 'threshold':
        actualValue = metrics[condition.metric] || 0;
        break;
      case 'trend':
        actualValue = trends[condition.metric] || 'stable';
        break;
      case 'frequency':
        actualValue = this.calculateFrequency(condition.metric, interactions, condition.timeWindow);
        break;
      case 'sequence':
        actualValue = this.checkSequencePattern(condition.metric, interactions);
        break;
      default:
        return false;
    }

    return this.compareValues(actualValue, condition.operator, condition.value);
  }

  /**
   * Calculate frequency of a metric over time window
   */
  private calculateFrequency(metric: string, interactions: any[], timeWindow?: number): number {
    const cutoffTime = timeWindow
      ? new Date(Date.now() - (timeWindow * 24 * 60 * 60 * 1000))
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const relevantInteractions = interactions.filter(i => i.timestamp > cutoffTime);
    return relevantInteractions.length;
  }

  /**
   * Check for specific sequence patterns
   */
  private checkSequencePattern(pattern: string, interactions: any[]): string {
    // Simple pattern matching - in production, use more sophisticated sequence mining
    const sequence = interactions.map(i => i.interaction_type);

    if (pattern === 'alert_fatigue' && sequence.includes('alert_dismissed')) {
      return 'detected';
    }

    if (pattern === 'dormant_user' && interactions.length < 5) {
      return 'detected';
    }

    return 'not_detected';
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: number | string, operator: string, expected: number | string | string[]): boolean {
    switch (operator) {
      case '>':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case '<':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case '>=':
        return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
      case '<=':
        return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
      case '==':
        return actual === expected;
      case '!=':
        return actual !== expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(actual as string);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual as string);
      default:
        return false;
    }
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(
    rule: PatternDetectionRule,
    metrics: Record<string, number>,
    trends: Record<string, string>
  ): number {
    // Simple confidence calculation based on how many conditions are strongly met
    let totalConfidence = 0;
    let conditionCount = 0;

    for (const condition of rule.conditions) {
      const metricValue = metrics[condition.metric];
      const trendValue = trends[condition.metric];

      if (typeof metricValue === 'number') {
        // Calculate how strongly the condition is met
        const threshold = typeof condition.value === 'number' ? condition.value : 0.5;
        const distance = Math.abs(metricValue - threshold);
        const maxDistance = Math.max(threshold, 1 - threshold);

        if (maxDistance > 0) {
          const strength = 1 - (distance / maxDistance);
          totalConfidence += Math.max(0, strength);
        }
        conditionCount++;
      } else if (trendValue) {
        // For trend conditions, use 0.8 confidence if trend matches expected
        totalConfidence += trendValue === condition.value ? 0.8 : 0.2;
        conditionCount++;
      }
    }

    return conditionCount > 0 ? totalConfidence / conditionCount : 0;
  }

  /**
   * Determine pattern severity
   */
  private determineSeverity(patternType: string, metrics: Record<string, number>): 'low' | 'medium' | 'high' | 'critical' {
    switch (patternType) {
      case 'alert_fatigue':
        const fatigueScore = metrics.alert_fatigue_score || 0;
        if (fatigueScore > 0.8) return 'critical';
        if (fatigueScore > 0.6) return 'high';
        if (fatigueScore > 0.4) return 'medium';
        return 'low';

      case 'dormant_user':
        const engagement = metrics.engagement_level || 0;
        if (engagement < 0.1) return 'critical';
        if (engagement < 0.3) return 'high';
        if (engagement < 0.5) return 'medium';
        return 'low';

      case 'high_frequency_trader':
        const tradingActivity = metrics.trading_activity || 0;
        if (tradingActivity > 0.9) return 'high';
        if (tradingActivity > 0.7) return 'medium';
        return 'low';

      default:
        const interactionScore = metrics.interaction_score || 0;
        if (interactionScore < 20) return 'high';
        if (interactionScore < 40) return 'medium';
        return 'low';
    }
  }

  /**
   * Get user interactions for analysis
   */
  private async getUserInteractions(userId: string): Promise<any[]> {
    const { rows } = await this.db.query(`
      SELECT * FROM user_interactions
      WHERE user_id_hash = $1
      ORDER BY timestamp DESC
      LIMIT 1000
    `, [userId]);

    return rows;
  }

  /**
   * Get user behavior profile
   */
  private async getUserProfile(userId: string): Promise<any | null> {
    const { rows } = await this.db.query(`
      SELECT * FROM user_behavior_profiles
      WHERE user_id_hash = $1
      ORDER BY last_updated DESC
      LIMIT 1
    `, [userId]);

    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Store detected pattern in database
   */
  private async storeDetectedPattern(pattern: DetectedPattern): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO detected_patterns (
          pattern_id, pattern_type, user_id_hash, confidence, severity,
          description, evidence, recommendations, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        pattern.patternId,
        pattern.patternType,
        pattern.userId,
        pattern.confidence,
        pattern.severity,
        pattern.description,
        JSON.stringify(pattern.evidence),
        JSON.stringify(pattern.recommendations),
        pattern.status
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store detected pattern', error);
    }
  }

  /**
   * Run pattern detection for all users
   */
  async runBatchPatternDetection(): Promise<{
    usersAnalyzed: number;
    patternsDetected: number;
    averageConfidence: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('Pattern detection engine not initialized');
    }

    try {
      // Get all users with sufficient data
      const { rows: users } = await this.db.query(`
        SELECT DISTINCT user_id_hash
        FROM user_interactions
        GROUP BY user_id_hash
        HAVING COUNT(*) >= $1
      `, [this.config.minDataPoints]);

      let totalPatterns = 0;
      let totalConfidence = 0;
      let analyzedUsers = 0;

      for (const user of users) {
        try {
          const patterns = await this.detectUserPatterns(user.user_id_hash);
          totalPatterns += patterns.length;
          analyzedUsers++;

          for (const pattern of patterns) {
            totalConfidence += pattern.confidence;
          }
        } catch (error) {
          this.logger.error('Failed to detect patterns for user', { userId: user.user_id_hash, error });
        }
      }

      const averageConfidence = totalPatterns > 0 ? totalConfidence / totalPatterns : 0;

      this.logger.info('Batch pattern detection completed', {
        usersAnalyzed: analyzedUsers,
        patternsDetected: totalPatterns,
        averageConfidence
      });

      return {
        usersAnalyzed: analyzedUsers,
        patternsDetected: totalPatterns,
        averageConfidence
      };
    } catch (error: any) {
      this.logger.error('Failed to run batch pattern detection', error);
      throw error;
    }
  }

  /**
   * Generate personalized recommendations for a user
   */
  async generateUserRecommendations(userId: string): Promise<{
    engagement: string[];
    alertFrequency: string[];
    contentPersonalization: string[];
    riskManagement: string[];
  }> {
    try {
      const patterns = await this.detectUserPatterns(userId);
      const userProfile = await this.getUserProfile(userId);

      return this.config.recommendationEngine.generateRecommendations(
        userProfile,
        patterns
      );
    } catch (error: any) {
      this.logger.error('Failed to generate user recommendations', error);
      return {
        engagement: [],
        alertFrequency: [],
        contentPersonalization: [],
        riskManagement: []
      };
    }
  }

  /**
   * Get pattern insights for dashboard
   */
  async getPatternInsights(timeWindow: { start: Date; end: Date }): Promise<{
    patternDistribution: Record<string, number>;
    topPatterns: DetectedPattern[];
    recommendations: {
      immediate: string[];
      longTerm: string[];
      segmentSpecific: string[];
    };
  }> {
    try {
      // Get pattern distribution
      const { rows: patternStats } = await this.db.query(`
        SELECT
          pattern_type,
          severity,
          COUNT(*) as count
        FROM detected_patterns
        WHERE detected_at BETWEEN $1 AND $2
        GROUP BY pattern_type, severity
        ORDER BY count DESC
      `, [timeWindow.start, timeWindow.end]);

      const patternDistribution: Record<string, number> = {};
      patternStats.forEach((row: any) => {
        const key = `${row.pattern_type}_${row.severity}`;
        patternDistribution[key] = parseInt(row.count);
      });

      // Get top patterns
      const { rows: topPatterns } = await this.db.query(`
        SELECT * FROM detected_patterns
        WHERE detected_at BETWEEN $1 AND $2
        ORDER BY confidence DESC, severity DESC
        LIMIT 10
      `, [timeWindow.start, timeWindow.end]);

      const recommendations = {
        immediate: [
          'Review high-severity alert fatigue patterns',
          'Contact dormant users with personalized re-engagement campaigns'
        ],
        longTerm: [
          'Implement machine learning-based pattern prediction',
          'Develop automated intervention strategies'
        ],
        segmentSpecific: [
          'Optimize alert timing for high-frequency traders',
          'Simplify content for casual users'
        ]
      };

      return {
        patternDistribution,
        topPatterns: topPatterns.map(this.mapPatternRow),
        recommendations
      };
    } catch (error: any) {
      this.logger.error('Failed to get pattern insights', error);
      throw error;
    }
  }

  /**
   * Map database row to DetectedPattern interface
   */
  private mapPatternRow(row: any): DetectedPattern {
    return {
      patternId: row.pattern_id,
      patternType: row.pattern_type,
      userId: row.user_id_hash,
      confidence: row.confidence,
      severity: row.severity,
      detectedAt: row.detected_at,
      description: row.description,
      evidence: row.evidence,
      recommendations: row.recommendations,
      status: row.status
    };
  }

  /**
   * Start the pattern detection engine
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      // Start periodic pattern detection
      this.detectionInterval = setInterval(async () => {
        try {
          await this.runBatchPatternDetection();
        } catch (error) {
          this.logger.error('Periodic pattern detection failed', error);
        }
      }, this.config.detectionInterval * 60 * 1000);

      this.logger.info('✅ Pattern detection engine started');
      this.emit('started');
    }
  }

  /**
   * Stop the pattern detection engine
   */
  async stop(): Promise<void> {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }

    await this.db.end();
    this.isInitialized = false;
    this.logger.info('✅ Pattern detection engine stopped');
    this.emit('stopped');
  }
}

/**
 * Default recommendation engine implementation
 */
export class DefaultRecommendationEngine implements RecommendationEngine {
  generateRecommendations(
    userProfile: any,
    detectedPatterns: DetectedPattern[],
    clusterInfo?: any
  ): {
    engagement: string[];
    alertFrequency: string[];
    contentPersonalization: string[];
    riskManagement: string[];
  } {
    const recommendations = {
      engagement: [] as string[],
      alertFrequency: [] as string[],
      contentPersonalization: [] as string[],
      riskManagement: [] as string[]
    };

    // Analyze user profile
    const engagementLevel = userProfile?.interactionScore || 0;
    const riskTolerance = userProfile?.behavioralTraits?.riskTolerance || 'medium';
    const preferredTimes = userProfile?.behavioralTraits?.preferredTimes || [];
    const alertFatigue = userProfile?.behavioralTraits?.alertFatigueScore || 0;

    // Analyze detected patterns
    const hasFatigue = detectedPatterns.some(p => p.patternType === 'alert_fatigue');
    const hasDormancy = detectedPatterns.some(p => p.patternType === 'dormant_user');
    const isPowerUser = clusterInfo?.characteristics?.engagementLevel === 'high';

    // Engagement recommendations
    if (hasDormancy) {
      recommendations.engagement.push(
        'Send personalized re-engagement emails',
        'Offer limited-time incentives to reactivate',
        'Reduce alert frequency temporarily'
      );
    } else if (isPowerUser) {
      recommendations.engagement.push(
        'Provide advanced analytics dashboard',
        'Enable priority support access',
        'Offer beta features for testing'
      );
    } else if (engagementLevel < 30) {
      recommendations.engagement.push(
        'Increase educational content',
        'Simplify onboarding process',
        'Add interactive tutorials'
      );
    }

    // Alert frequency recommendations
    if (hasFatigue || alertFatigue > 0.7) {
      recommendations.alertFrequency.push(
        'Reduce alert frequency by 50%',
        'Focus on high-confidence alerts only',
        'Implement gradual re-engagement strategy'
      );
    } else if (engagementLevel > 80) {
      recommendations.alertFrequency.push(
        'Increase alert frequency for active users',
        'Include more detailed market analysis',
        'Enable real-time alert customization'
      );
    }

    // Content personalization
    if (preferredTimes.length > 0) {
      recommendations.contentPersonalization.push(
        `Schedule alerts during preferred hours: ${preferredTimes.join(', ')}:00`,
        'Adjust notification timing based on timezone',
        'Optimize content for mobile vs desktop usage'
      );
    }

    if (riskTolerance === 'low') {
      recommendations.riskManagement.push(
        'Emphasize conservative strategies',
        'Highlight risk warnings prominently',
        'Include educational content on risk management'
      );
    } else if (riskTolerance === 'high') {
      recommendations.riskManagement.push(
        'Provide advanced risk management tools',
        'Include stop-loss recommendations',
        'Offer portfolio diversification suggestions'
      );
    }

    return recommendations;
  }
}
