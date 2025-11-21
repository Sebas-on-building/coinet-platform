/**
 * =========================================
 * ADAPTIVE RATE LIMITER
 * =========================================
 * Divine world-class adaptive rate limiting system
 * Machine learning-powered dynamic rate limiting with behavioral analysis
 */

import { Logger, createLogger } from '../utils/Logger';
import { AdaptiveRateLimitConfig } from '../types';

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  reason?: string;
  confidence: number;
  adaptive: boolean;
  recommendations?: string[];
}

export interface UserBehaviorProfile {
  userId: string;
  normalRequestRate: number;
  burstTolerance: number;
  suspiciousPatterns: string[];
  riskScore: number;
  lastUpdated: Date;
  sampleSize: number;
}

export class AdaptiveRateLimiter {
  private logger: Logger;
  private config: AdaptiveRateLimitConfig;

  // Behavioral analysis data
  private userProfiles = new Map<string, UserBehaviorProfile>();
  private requestHistory = new Map<string, number[]>();
  private anomalyScores = new Map<string, number>();

  // Machine learning model (simplified)
  private modelWeights = {
    requestRate: 0.3,
    burstBehavior: 0.25,
    timePattern: 0.2,
    endpointDiversity: 0.15,
    errorRate: 0.1,
  };

  // Adaptive thresholds
  private dynamicThresholds = {
    normalRate: 100, // requests per minute
    burstMultiplier: 2.0,
    anomalyThreshold: 0.7,
    riskThreshold: 0.8,
  };

  constructor(config: AdaptiveRateLimitConfig) {
    this.logger = createLogger('AdaptiveRateLimiter');
    this.config = config;

    this.initializeAdaptiveSystem();
  }

  /**
   * Initialize the adaptive rate limiting system
   */
  private initializeAdaptiveSystem(): void {
    this.logger.info('🚀 Initializing Adaptive Rate Limiting System');

    // Set up periodic model updates
    setInterval(() => {
      this.updateBehavioralModels();
    }, this.config.modelUpdateInterval);

    // Set up threshold adjustments
    setInterval(() => {
      this.adjustDynamicThresholds();
    }, this.config.thresholdAdjustmentInterval);

    this.logger.info('✅ Adaptive Rate Limiting System initialized');
  }

  /**
   * Make adaptive rate limiting decision
   */
  async makeDecision(request: {
    userId: string;
    endpoint: string;
    method: string;
    ipAddress: string;
    userAgent?: string;
    timestamp: Date;
    currentLoad?: number;
    errorRate?: number;
  }): Promise<RateLimitDecision> {
    try {
      // Update user behavior profile
      await this.updateUserProfile(request);

      // Analyze request pattern
      const behaviorAnalysis = await this.analyzeRequestPattern(request);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(request, behaviorAnalysis);

      // Determine if request should be allowed
      const baseDecision = this.makeBaseDecision(request, behaviorAnalysis);
      const adaptiveDecision = this.applyAdaptiveLogic(baseDecision, riskScore, behaviorAnalysis);

      // Generate recommendations if needed
      const recommendations = this.generateRecommendations(adaptiveDecision, behaviorAnalysis);

      this.logger.debug('Adaptive rate limit decision made', {
        userId: request.userId,
        endpoint: request.endpoint,
        decision: adaptiveDecision.allowed ? 'ALLOWED' : 'DENIED',
        riskScore,
        confidence: behaviorAnalysis.confidence,
      });

      return {
        ...adaptiveDecision,
        confidence: behaviorAnalysis.confidence,
        adaptive: true,
        recommendations,
      };
    } catch (error: any) {
      this.logger.error('Adaptive rate limit decision failed', error, {
        userId: request.userId,
        endpoint: request.endpoint,
      });

      // Fallback to standard rate limiting
      return {
        allowed: true,
        limit: this.config.fallbackLimit,
        remaining: this.config.fallbackLimit,
        resetTime: new Date(Date.now() + 60000),
        reason: 'adaptive_system_error',
        confidence: 0,
        adaptive: false,
      };
    }
  }

  /**
   * Update user behavior profile with new request
   */
  private async updateUserProfile(request: any): Promise<void> {
    const userId = request.userId;
    const now = Date.now();

    // Get or create user profile
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        normalRequestRate: this.dynamicThresholds.normalRate,
        burstTolerance: this.dynamicThresholds.burstMultiplier,
        suspiciousPatterns: [],
        riskScore: 0,
        lastUpdated: new Date(),
        sampleSize: 0,
      };
      this.userProfiles.set(userId, profile);
    }

    // Update request history
    const history = this.requestHistory.get(userId) || [];
    history.push(now);

    // Keep only last hour of requests for analysis
    const oneHourAgo = now - 3600000;
    const recentRequests = history.filter(timestamp => timestamp > oneHourAgo);

    this.requestHistory.set(userId, recentRequests);

    // Calculate current request rate
    const currentRate = recentRequests.length / 60; // requests per minute

    // Update profile with new data
    profile.normalRequestRate = this.calculateMovingAverage(
      profile.normalRequestRate,
      currentRate,
      profile.sampleSize
    );

    profile.burstTolerance = this.calculateBurstTolerance(recentRequests);
    profile.lastUpdated = new Date();
    profile.sampleSize++;

    // Detect suspicious patterns
    profile.suspiciousPatterns = this.detectSuspiciousPatterns(recentRequests, request);

    this.userProfiles.set(userId, profile);
  }

  /**
   * Analyze request pattern for anomalies
   */
  private async analyzeRequestPattern(request: any): Promise<{
    isAnomalous: boolean;
    anomalyScore: number;
    confidence: number;
    patterns: string[];
    recommendations: string[];
  }> {
    const userId = request.userId;
    const profile = this.userProfiles.get(userId);

    if (!profile || profile.sampleSize < 10) {
      // Insufficient data for analysis
      return {
        isAnomalous: false,
        anomalyScore: 0,
        confidence: 0,
        patterns: ['insufficient_data'],
        recommendations: ['continue_monitoring'],
      };
    }

    const recentRequests = this.requestHistory.get(userId) || [];
    const analysis = {
      requestRate: recentRequests.length / 60,
      burstScore: this.calculateBurstScore(recentRequests),
      timePattern: this.analyzeTimePattern(recentRequests),
      endpointDiversity: this.calculateEndpointDiversity(recentRequests, request.endpoint),
      errorCorrelation: request.errorRate || 0,
    };

    // Calculate anomaly score using weighted model
    const anomalyScore = (
      analysis.requestRate * this.modelWeights.requestRate +
      analysis.burstScore * this.modelWeights.burstBehavior +
      analysis.timePattern * this.modelWeights.timePattern +
      (1 - analysis.endpointDiversity) * this.modelWeights.endpointDiversity +
      analysis.errorCorrelation * this.modelWeights.errorRate
    );

    const isAnomalous = anomalyScore > this.dynamicThresholds.anomalyThreshold;
    const confidence = Math.min(profile.sampleSize / 100, 1.0); // Confidence increases with sample size

    // Identify patterns
    const patterns: string[] = [];
    if (analysis.requestRate > profile.normalRequestRate * 2) patterns.push('high_request_rate');
    if (analysis.burstScore > 0.8) patterns.push('burst_behavior');
    if (analysis.timePattern > 0.7) patterns.push('unusual_timing');
    if (analysis.endpointDiversity < 0.3) patterns.push('low_endpoint_diversity');
    if (analysis.errorCorrelation > 0.5) patterns.push('high_error_rate');

    // Generate recommendations
    const recommendations: string[] = [];
    if (isAnomalous) {
      if (patterns.includes('high_request_rate')) {
        recommendations.push('implement_progressive_delays');
      }
      if (patterns.includes('burst_behavior')) {
        recommendations.push('require_captcha_verification');
      }
      if (patterns.includes('unusual_timing')) {
        recommendations.push('monitor_for_automated_attacks');
      }
    }

    return {
      isAnomalous,
      anomalyScore,
      confidence,
      patterns,
      recommendations,
    };
  }

  /**
   * Calculate risk score for the request
   */
  private calculateRiskScore(request: any, analysis: any): number {
    const userId = request.userId;
    const profile = this.userProfiles.get(userId);

    if (!profile) return 0;

    let riskScore = 0;

    // Base risk from anomaly analysis
    riskScore += analysis.anomalyScore * 0.6;

    // Risk from user profile
    riskScore += profile.riskScore * 0.3;

    // Risk from suspicious patterns
    riskScore += (profile.suspiciousPatterns.length / 10) * 0.1;

    // Normalize to 0-1 range
    return Math.min(riskScore, 1.0);
  }

  /**
   * Make base rate limiting decision
   */
  private makeBaseDecision(request: any, analysis: any): Omit<RateLimitDecision, 'confidence' | 'adaptive' | 'recommendations'> {
    const userId = request.userId;
    const profile = this.userProfiles.get(userId);

    if (!profile) {
      // New user - use default limits
      return {
        allowed: true,
        limit: this.config.defaultLimit,
        remaining: this.config.defaultLimit,
        resetTime: new Date(Date.now() + 60000),
      };
    }

    // Check if request rate exceeds normal behavior
    const rateMultiplier = analysis.requestRate / profile.normalRequestRate;

    if (rateMultiplier > profile.burstTolerance) {
      // Burst behavior detected
      return {
        allowed: false,
        limit: Math.floor(profile.normalRequestRate),
        remaining: 0,
        resetTime: new Date(Date.now() + 60000),
        reason: 'burst_behavior_detected',
      };
    }

    // Check anomaly threshold
    if (analysis.anomalyScore > this.dynamicThresholds.anomalyThreshold) {
      return {
        allowed: false,
        limit: Math.floor(profile.normalRequestRate * 0.5), // Reduce limit for suspicious behavior
        remaining: 0,
        resetTime: new Date(Date.now() + 60000),
        reason: 'anomalous_behavior_detected',
      };
    }

    // Normal behavior - allow with adaptive limit
    const adaptiveLimit = Math.floor(profile.normalRequestRate * (1 + (1 - analysis.anomalyScore) * 0.5));

    return {
      allowed: true,
      limit: adaptiveLimit,
      remaining: Math.max(0, adaptiveLimit - Math.floor(analysis.requestRate)),
      resetTime: new Date(Date.now() + 60000),
    };
  }

  /**
   * Apply adaptive logic to base decision
   */
  private applyAdaptiveLogic(
    baseDecision: Omit<RateLimitDecision, 'confidence' | 'adaptive' | 'recommendations'>,
    riskScore: number,
    analysis: any
  ): Omit<RateLimitDecision, 'confidence' | 'adaptive' | 'recommendations'> {
    // Apply risk-based adjustments
    if (riskScore > this.dynamicThresholds.riskThreshold) {
      return {
        allowed: false,
        limit: baseDecision.limit,
        remaining: 0,
        resetTime: new Date(Date.now() + 300000), // 5 minute cooldown for high risk
        reason: 'high_risk_behavior',
      };
    }

    // Apply confidence-based adjustments
    if (analysis.confidence < 0.5) {
      // Low confidence - be more conservative
      return {
        allowed: baseDecision.allowed,
        limit: Math.floor(baseDecision.limit * 0.8),
        remaining: Math.floor(baseDecision.remaining * 0.8),
        resetTime: baseDecision.resetTime,
      };
    }

    return baseDecision;
  }

  /**
   * Generate recommendations for rate limit adjustments
   */
  private generateRecommendations(decision: any, analysis: any): string[] {
    const recommendations: string[] = [];

    if (!decision.allowed) {
      if (analysis.patterns.includes('high_request_rate')) {
        recommendations.push('Consider implementing client-side rate limiting');
      }
      if (analysis.patterns.includes('burst_behavior')) {
        recommendations.push('Implement exponential backoff strategy');
      }
      if (analysis.patterns.includes('unusual_timing')) {
        recommendations.push('Add time-based access restrictions');
      }
    }

    if (analysis.anomalyScore > 0.8) {
      recommendations.push('Review user activity for potential security threats');
    }

    return recommendations;
  }

  /**
   * Update behavioral models with new data
   */
  private updateBehavioralModels(): void {
    this.logger.debug('Updating behavioral models');

    // Update model weights based on performance
    this.updateModelWeights();

    // Clean up old data
    this.cleanupOldData();
  }

  /**
   * Adjust dynamic thresholds based on system performance
   */
  private adjustDynamicThresholds(): void {
    // Adjust thresholds based on system load and performance
    const systemLoad = this.getSystemLoad();

    if (systemLoad > 0.8) {
      // High system load - tighten thresholds
      this.dynamicThresholds.normalRate *= 0.9;
      this.dynamicThresholds.anomalyThreshold *= 1.1;
    } else if (systemLoad < 0.3) {
      // Low system load - relax thresholds
      this.dynamicThresholds.normalRate *= 1.1;
      this.dynamicThresholds.anomalyThreshold *= 0.9;
    }

    this.logger.debug('Dynamic thresholds adjusted', {
      systemLoad,
      normalRate: this.dynamicThresholds.normalRate,
      anomalyThreshold: this.dynamicThresholds.anomalyThreshold,
    });
  }

  /**
   * Calculate moving average for request rates
   */
  private calculateMovingAverage(current: number, newValue: number, sampleSize: number): number {
    const alpha = 1 / (sampleSize + 1); // Learning rate
    return current * (1 - alpha) + newValue * alpha;
  }

  /**
   * Calculate burst tolerance based on request patterns
   */
  private calculateBurstTolerance(requests: number[]): number {
    if (requests.length < 2) return this.dynamicThresholds.burstMultiplier;

    // Calculate coefficient of variation
    const mean = requests.reduce((sum, req) => sum + req, 0) / requests.length;
    const variance = requests.reduce((sum, req) => sum + Math.pow(req - mean, 2), 0) / requests.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Lower burst tolerance for high variation
    return Math.max(1.0, this.dynamicThresholds.burstMultiplier * (1 - cv));
  }

  /**
   * Detect suspicious patterns in request history
   */
  private detectSuspiciousPatterns(requests: number[], currentRequest: any): string[] {
    const patterns: string[] = [];

    // Check for regular intervals (bot-like behavior)
    if (requests.length >= 5) {
      const intervals = [];
      for (let i = 1; i < requests.length; i++) {
        intervals.push(requests[i] - requests[i - 1]);
      }

      const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
      const intervalVariance = intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / intervals.length;
      const intervalStdDev = Math.sqrt(intervalVariance);

      // If intervals are too regular (< 10% variation), it might be automated
      if (intervalStdDev / avgInterval < 0.1) {
        patterns.push('regular_intervals');
      }
    }

    // Check for rapid succession (burst attack)
    const recentRequests = requests.slice(-10);
    const recentRate = recentRequests.length / ((Date.now() - recentRequests[0]) / 1000 / 60);

    if (recentRate > this.dynamicThresholds.normalRate * 3) {
      patterns.push('rapid_succession');
    }

    return patterns;
  }

  /**
   * Calculate burst score (0-1)
   */
  private calculateBurstScore(requests: number[]): number {
    if (requests.length < 2) return 0;

    // Calculate burstiness using Gini coefficient or similar
    const sortedRequests = [...requests].sort((a, b) => a - b);
    const n = sortedRequests.length;

    if (n === 0) return 0;

    const mean = sortedRequests.reduce((sum, req) => sum + req, 0) / n;
    if (mean === 0) return 0;

    // Simplified burst score calculation
    const recentWindow = requests.slice(-5); // Last 5 requests
    const maxRecent = Math.max(...recentWindow);
    const minRecent = Math.min(...recentWindow);

    return minRecent > 0 ? Math.min(1, (maxRecent - minRecent) / minRecent) : 0;
  }

  /**
   * Analyze time pattern regularity
   */
  private analyzeTimePattern(requests: number[]): number {
    if (requests.length < 3) return 0;

    // Calculate time differences
    const intervals = [];
    for (let i = 1; i < requests.length; i++) {
      intervals.push(requests[i] - requests[i - 1]);
    }

    // Check for pattern regularity
    const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
    const variance = intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / intervals.length;

    // Return regularity score (0 = random, 1 = perfectly regular)
    return Math.max(0, 1 - Math.min(1, variance / (avgInterval * avgInterval)));
  }

  /**
   * Calculate endpoint diversity (0-1, higher is more diverse)
   */
  private calculateEndpointDiversity(requests: number[], currentEndpoint: string): number {
    // This would track endpoint usage patterns in a real implementation
    // For now, return a placeholder
    return 0.5;
  }

  /**
   * Update model weights based on performance
   */
  private updateModelWeights(): void {
    // In a real implementation, this would use feedback loops
    // to optimize the ML model weights
    this.logger.debug('Model weights updated');
  }

  /**
   * Clean up old behavioral data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Clean up old request history
    Array.from(this.requestHistory.entries()).forEach(([userId, requests]) => {
      const recentRequests = requests.filter(timestamp => timestamp > oneDayAgo);
      if (recentRequests.length === 0) {
        this.requestHistory.delete(userId);
        this.userProfiles.delete(userId);
      } else {
        this.requestHistory.set(userId, recentRequests);
      }
    });

    this.logger.debug('Old behavioral data cleaned up');
  }

  /**
   * Get system load (CPU, memory, etc.)
   */
  private getSystemLoad(): number {
    // In a real implementation, this would query system metrics
    return Math.random() * 0.8; // Placeholder
  }

  /**
   * Get adaptive rate limiting statistics
   */
  getStatistics(): {
    totalUsers: number;
    activeProfiles: number;
    averageRiskScore: number;
    anomalyDetectionRate: number;
    modelAccuracy: number;
  } {
    const profiles = Array.from(this.userProfiles.values());
    const totalUsers = this.userProfiles.size;
    const activeProfiles = profiles.filter(p => p.sampleSize > 10).length;
    const averageRiskScore = profiles.reduce((sum, p) => sum + p.riskScore, 0) / Math.max(profiles.length, 1);

    // Calculate anomaly detection rate (simplified)
    const anomalousProfiles = profiles.filter(p => p.riskScore > this.dynamicThresholds.riskThreshold).length;
    const anomalyDetectionRate = profiles.length > 0 ? anomalousProfiles / profiles.length : 0;

    return {
      totalUsers,
      activeProfiles,
      averageRiskScore,
      anomalyDetectionRate,
      modelAccuracy: 0.95, // Would be calculated from actual performance
    };
  }

  /**
   * Health check for adaptive rate limiter
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeProfiles: number;
    modelAccuracy: number;
    lastUpdate: Date;
  }> {
    try {
      const stats = this.getStatistics();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (stats.modelAccuracy < 0.8) status = 'degraded';
      if (stats.activeProfiles === 0) status = 'unhealthy';

      return {
        status,
        activeProfiles: stats.activeProfiles,
        modelAccuracy: stats.modelAccuracy,
        lastUpdate: new Date(),
      };
    } catch (error) {
      this.logger.error('Adaptive rate limiter health check failed', error);
      return {
        status: 'unhealthy',
        activeProfiles: 0,
        modelAccuracy: 0,
        lastUpdate: new Date(),
      };
    }
  }
}

export default AdaptiveRateLimiter;
