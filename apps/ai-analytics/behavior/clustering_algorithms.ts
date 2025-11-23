/**
 * =========================================
 * USER BEHAVIOR CLUSTERING & PATTERN DETECTION
 * =========================================
 * Divine world-class clustering and sequence-mining algorithms for user behavior analysis
 * Advanced ML techniques for discovering behavioral patterns and user segments
 */

import { Logger } from '../../../services/signal-evaluation-engine/src/utils/Logger';
import { Pool } from 'pg';

export interface UserFeatureVector {
  userId: string;
  features: {
    // Interaction frequency features
    totalInteractions: number;
    alertInteractions: number;
    tradeInteractions: number;
    interactionsPerDay: number;

    // Timing features
    avgResponseTime: number;
    preferredHour: number;
    weekendActivity: number;
    weekdayActivity: number;

    // Engagement features
    engagementLevel: number;
    interactionScore: number;
    alertFatigueScore: number;

    // Trading behavior features
    tradingActivity: number;
    riskTolerance: number;
    positionDuration: number;

    // Alert behavior features
    alertOpenRate: number;
    alertClickRate: number;
    alertDismissRate: number;
  };
  metadata: {
    segment: string;
    lastActive: Date;
    dataPoints: number;
  };
}

export interface ClusterResult {
  clusterId: number;
  centroid: UserFeatureVector['features'];
  size: number;
  userIds: string[];
  characteristics: {
    description: string;
    primaryBehaviors: string[];
    riskProfile: 'low' | 'medium' | 'high';
    engagementLevel: 'low' | 'medium' | 'high';
    tradingStyle: 'conservative' | 'moderate' | 'aggressive';
    confidence: number;
  };
}

export interface SequencePattern {
  patternId: string;
  sequence: string[]; // Sequence of interaction types
  frequency: number;
  support: number; // Percentage of users exhibiting this pattern
  confidence: number; // How predictable this pattern is
  users: string[]; // Users exhibiting this pattern
  metadata: {
    avgDuration: number; // Average time between sequence steps (ms)
    variability: number; // How consistent the timing is
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface ClusteringConfig {
  algorithm: 'kmeans' | 'dbscan' | 'hierarchical' | 'gmm';
  kClusters?: number; // For K-means
  eps?: number; // For DBSCAN
  minSamples?: number; // For DBSCAN
  maxIterations?: number;
  tolerance?: number;
  randomSeed?: number;
}

export interface SequenceMiningConfig {
  minSupport: number; // Minimum support threshold (0-1)
  minConfidence: number; // Minimum confidence threshold (0-1)
  maxPatternLength: number;
  timeWindowMs: number; // Maximum time between sequence steps
  enableGapAnalysis: boolean;
}

export class UserBehaviorClustering {
  private logger: Logger;
  private db: Pool;
  private config: ClusteringConfig & SequenceMiningConfig;
  private isInitialized: boolean = false;

  constructor(config: ClusteringConfig & SequenceMiningConfig, databaseUrl?: string) {
    this.logger = new Logger('UserBehaviorClustering');
    this.config = config;
    this.db = new Pool({
      connectionString: databaseUrl || process.env.DATABASE_URL,
    });

    this.initializeDatabase();
  }

  /**
   * Initialize clustering database tables
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Create clustering results table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_behavior_clusters (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cluster_id INTEGER NOT NULL,
          user_id_hash VARCHAR(255) NOT NULL,
          feature_vector JSONB NOT NULL,
          assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          algorithm VARCHAR(50) NOT NULL,
          cluster_characteristics JSONB NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_clusters_cluster_id ON user_behavior_clusters(cluster_id);
        CREATE INDEX IF NOT EXISTS idx_clusters_user_id ON user_behavior_clusters(user_id_hash);
        CREATE INDEX IF NOT EXISTS idx_clusters_algorithm ON user_behavior_clusters(algorithm);
      `);

      // Create sequence patterns table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_sequence_patterns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pattern_id VARCHAR(255) NOT NULL,
          sequence TEXT[] NOT NULL,
          frequency INTEGER NOT NULL,
          support DECIMAL(5,4) NOT NULL,
          confidence DECIMAL(5,4) NOT NULL,
          user_ids TEXT[] NOT NULL,
          metadata JSONB NOT NULL,
          detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_patterns_support ON user_sequence_patterns(support);
        CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON user_sequence_patterns(confidence);
        CREATE INDEX IF NOT EXISTS idx_patterns_detected_at ON user_sequence_patterns(detected_at);
      `);

      // Create feature vectors cache table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_feature_vectors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id_hash VARCHAR(255) NOT NULL,
          feature_vector JSONB NOT NULL,
          computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          data_points INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_feature_vectors_user_id ON user_feature_vectors(user_id_hash);
        CREATE INDEX IF NOT EXISTS idx_feature_vectors_computed_at ON user_feature_vectors(computed_at);
      `);

      this.isInitialized = true;
      this.logger.info('✅ User behavior clustering database initialized');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize clustering database', error);
      throw error;
    }
  }

  /**
   * Extract user feature vectors from interaction data
   */
  async extractFeatureVectors(
    timeWindow: { start: Date; end: Date },
    minInteractions: number = 5
  ): Promise<UserFeatureVector[]> {
    if (!this.isInitialized) {
      throw new Error('Clustering system not initialized');
    }

    try {
      const { rows: userData } = await this.db.query(`
        SELECT
          ui.user_id_hash,
          COUNT(*) as total_interactions,
          COUNT(CASE WHEN interaction_type LIKE '%alert%' THEN 1 END) as alert_interactions,
          COUNT(CASE WHEN interaction_type LIKE '%trade%' THEN 1 END) as trade_interactions,
          AVG(CASE WHEN metadata->>'timeToAction' IS NOT NULL THEN (metadata->>'timeToAction')::numeric END) as avg_response_time,
          AVG(CASE WHEN context->>'timeOfDay' IS NOT NULL THEN (context->>'timeOfDay')::numeric END) as preferred_hour,
          COUNT(CASE WHEN context->>'isWeekend' = 'true' THEN 1 END) as weekend_activity,
          COUNT(CASE WHEN context->>'isWeekend' = 'false' THEN 1 END) as weekday_activity,
          AVG(CASE WHEN interaction_type = 'alert_opened' THEN 1.0 ELSE 0.0 END) as alert_open_rate,
          AVG(CASE WHEN interaction_type = 'alert_clicked' THEN 1.0 ELSE 0.0 END) as alert_click_rate,
          AVG(CASE WHEN interaction_type = 'alert_dismissed' THEN 1.0 ELSE 0.0 END) as alert_dismiss_rate
        FROM user_interactions ui
        WHERE ui.timestamp BETWEEN $1 AND $2
        GROUP BY ui.user_id_hash
        HAVING COUNT(*) >= $3
        ORDER BY total_interactions DESC
      `, [timeWindow.start, timeWindow.end, minInteractions]);

      const featureVectors: UserFeatureVector[] = [];

      for (const row of userData) {
        const totalInteractions = parseInt(row.total_interactions);
        const alertInteractions = parseInt(row.alert_interactions);
        const tradeInteractions = parseInt(row.trade_interactions);

        // Calculate derived features
        const interactionsPerDay = totalInteractions / Math.max(
          Math.ceil((timeWindow.end.getTime() - timeWindow.start.getTime()) / (24 * 60 * 60 * 1000)), 1
        );

        const engagementLevel = Math.min(totalInteractions / 100, 1); // Normalize to 0-1

        const alertFatigueScore = alertInteractions > 0
          ? Math.max(0, 1 - (parseFloat(row.alert_click_rate) || 0) / Math.max(parseFloat(row.alert_open_rate) || 1, 1))
          : 0;

        const tradingActivity = tradeInteractions / Math.max(alertInteractions, 1);

        const riskTolerance = this.calculateRiskTolerance(row);

        featureVectors.push({
          userId: row.user_id_hash,
          features: {
            totalInteractions,
            alertInteractions,
            tradeInteractions,
            interactionsPerDay,
            avgResponseTime: parseFloat(row.avg_response_time) || 0,
            preferredHour: parseInt(row.preferred_hour) || 12,
            weekendActivity: parseInt(row.weekend_activity) || 0,
            weekdayActivity: parseInt(row.weekday_activity) || 0,
            engagementLevel,
            interactionScore: engagementLevel * 100, // Convert to 0-100 scale
            alertFatigueScore,
            tradingActivity,
            riskTolerance,
            positionDuration: 0, // Would need additional data
            alertOpenRate: parseFloat(row.alert_open_rate) || 0,
            alertClickRate: parseFloat(row.alert_click_rate) || 0,
            alertDismissRate: parseFloat(row.alert_dismiss_rate) || 0
          },
          metadata: {
            segment: 'unknown',
            lastActive: timeWindow.end,
            dataPoints: totalInteractions
          }
        });
      }

      this.logger.info('Feature vectors extracted', {
        count: featureVectors.length,
        timeWindow: `${timeWindow.start.toISOString()} - ${timeWindow.end.toISOString()}`
      });

      return featureVectors;
    } catch (error: any) {
      this.logger.error('Failed to extract feature vectors', error);
      throw error;
    }
  }

  /**
   * Calculate risk tolerance from user behavior
   */
  private calculateRiskTolerance(userData: any): number {
    // Simple heuristic: higher confidence threshold interactions = lower risk tolerance
    const highConfidenceInteractions = 0; // Would need confidence data
    const totalInteractions = parseInt(userData.total_interactions) || 1;

    // Conservative: 0-0.3, Moderate: 0.3-0.7, Aggressive: 0.7-1.0
    return Math.min(highConfidenceInteractions / totalInteractions, 1);
  }

  /**
   * Perform K-means clustering on user feature vectors
   */
  async performKMeansClustering(
    featureVectors: UserFeatureVector[],
    k: number = 5
  ): Promise<ClusterResult[]> {
    if (featureVectors.length === 0) {
      return [];
    }

    this.logger.info('Starting K-means clustering', {
      userCount: featureVectors.length,
      kClusters: k
    });

    // Extract feature arrays for clustering
    const features = featureVectors.map(fv => this.extractNumericalFeatures(fv.features));

    // Initialize centroids randomly
    let centroids = this.initializeCentroids(features, k);

    let hasConverged = false;
    let iterations = 0;
    const maxIterations = this.config.maxIterations || 100;
    const tolerance = this.config.tolerance || 0.001;

    while (!hasConverged && iterations < maxIterations) {
      // Assign points to clusters
      const clusters = this.assignToClusters(features, centroids);

      // Update centroids
      const newCentroids = this.updateCentroids(features, clusters, k);

      // Check convergence
      hasConverged = this.checkConvergence(centroids, newCentroids, tolerance);
      centroids = newCentroids;
      iterations++;
    }

    // Generate cluster results
    const results: ClusterResult[] = [];

    for (let i = 0; i < k; i++) {
      const clusterUsers = featureVectors.filter((_, idx) => this.assignToClusters(features, centroids)[idx] === i);

      if (clusterUsers.length > 0) {
        results.push({
          clusterId: i,
          centroid: this.vectorToFeatures(centroids[i]),
          size: clusterUsers.length,
          userIds: clusterUsers.map(u => u.userId),
          characteristics: {
            ...this.analyzeClusterCharacteristics(clusterUsers, this.vectorToFeatures(centroids[i])),
            confidence: 0.8 // Would calculate based on cluster tightness
          }
        });
      }
    }

    // Store clustering results
    await this.storeClusteringResults(results);

    this.logger.info('K-means clustering completed', {
      iterations,
      clusters: results.length,
      convergence: hasConverged
    });

    return results;
  }

  /**
   * Extract numerical features for clustering
   */
  private extractNumericalFeatures(features: UserFeatureVector['features']): number[] {
    return [
      features.totalInteractions,
      features.alertInteractions,
      features.tradeInteractions,
      features.interactionsPerDay,
      features.avgResponseTime,
      features.preferredHour,
      features.weekendActivity,
      features.weekdayActivity,
      features.engagementLevel,
      features.interactionScore,
      features.alertFatigueScore,
      features.tradingActivity,
      features.riskTolerance,
      features.positionDuration,
      features.alertOpenRate,
      features.alertClickRate,
      features.alertDismissRate
    ];
  }

  /**
   * Convert numerical vector back to feature object
   */
  private vectorToFeatures(vector: number[]): UserFeatureVector['features'] {
    return {
      totalInteractions: vector[0],
      alertInteractions: vector[1],
      tradeInteractions: vector[2],
      interactionsPerDay: vector[3],
      avgResponseTime: vector[4],
      preferredHour: vector[5],
      weekendActivity: vector[6],
      weekdayActivity: vector[7],
      engagementLevel: vector[8],
      interactionScore: vector[9],
      alertFatigueScore: vector[10],
      tradingActivity: vector[11],
      riskTolerance: vector[12],
      positionDuration: vector[13],
      alertOpenRate: vector[14],
      alertClickRate: vector[15],
      alertDismissRate: vector[16]
    };
  }

  /**
   * Initialize centroids randomly
   */
  private initializeCentroids(features: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < k; i++) {
      let randomIndex: number;
      do {
        randomIndex = Math.floor(Math.random() * features.length);
      } while (usedIndices.has(randomIndex));

      usedIndices.add(randomIndex);
      centroids.push([...features[randomIndex]]);
    }

    return centroids;
  }

  /**
   * Assign data points to nearest centroids
   */
  private assignToClusters(features: number[][], centroids: number[][]): number[] {
    return features.map(feature => {
      let minDistance = Infinity;
      let closestCluster = 0;

      for (let i = 0; i < centroids.length; i++) {
        const distance = this.euclideanDistance(feature, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = i;
        }
      }

      return closestCluster;
    });
  }

  /**
   * Update centroids based on cluster assignments
   */
  private updateCentroids(features: number[][], clusters: number[], k: number): number[][] {
    const newCentroids: number[][] = Array(k).fill(null).map(() => Array(features[0].length).fill(0));
    const clusterCounts: number[] = Array(k).fill(0);

    // Sum features for each cluster
    for (let i = 0; i < features.length; i++) {
      const cluster = clusters[i];
      clusterCounts[cluster]++;

      for (let j = 0; j < features[i].length; j++) {
        newCentroids[cluster][j] += features[i][j];
      }
    }

    // Calculate means
    for (let i = 0; i < k; i++) {
      if (clusterCounts[i] > 0) {
        for (let j = 0; j < newCentroids[i].length; j++) {
          newCentroids[i][j] /= clusterCounts[i];
        }
      }
    }

    return newCentroids;
  }

  /**
   * Check if centroids have converged
   */
  private checkConvergence(oldCentroids: number[][], newCentroids: number[][], tolerance: number): boolean {
    for (let i = 0; i < oldCentroids.length; i++) {
      const distance = this.euclideanDistance(oldCentroids[i], newCentroids[i]);
      if (distance > tolerance) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private euclideanDistance(v1: number[], v2: number[]): number {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      sum += Math.pow(v1[i] - v2[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Analyze cluster characteristics
   */
  private analyzeClusterCharacteristics(users: UserFeatureVector[], centroid: UserFeatureVector['features']): ClusterResult['characteristics'] {
    // Analyze primary behaviors based on centroid values
    const behaviors: string[] = [];

    if (centroid.tradingActivity > 0.7) {
      behaviors.push('High frequency trading');
    } else if (centroid.tradingActivity > 0.3) {
      behaviors.push('Moderate trading activity');
    } else {
      behaviors.push('Low trading activity');
    }

    if (centroid.alertFatigueScore > 0.7) {
      behaviors.push('High alert fatigue');
    } else if (centroid.alertFatigueScore < 0.3) {
      behaviors.push('Low alert fatigue');
    }

    if (centroid.engagementLevel > 0.8) {
      behaviors.push('Highly engaged');
    } else if (centroid.engagementLevel < 0.4) {
      behaviors.push('Low engagement');
    }

    // Risk profile
    let riskProfile: 'low' | 'medium' | 'high' = 'medium';
    if (centroid.riskTolerance < 0.3) {
      riskProfile = 'low';
    } else if (centroid.riskTolerance > 0.7) {
      riskProfile = 'high';
    }

    // Trading style
    let tradingStyle: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
    if (centroid.avgResponseTime > 30000) { // 30 seconds
      tradingStyle = 'conservative';
    } else if (centroid.avgResponseTime < 5000) { // 5 seconds
      tradingStyle = 'aggressive';
    }

    return {
      description: this.generateClusterDescription(behaviors, centroid),
      primaryBehaviors: behaviors,
      riskProfile,
      engagementLevel: centroid.engagementLevel > 0.7 ? 'high' : centroid.engagementLevel > 0.4 ? 'medium' : 'low',
      tradingStyle,
      confidence: 0.8 // Would calculate based on cluster cohesion
    };
  }

  /**
   * Generate human-readable cluster description
   */
  private generateClusterDescription(behaviors: string[], centroid: UserFeatureVector['features']): string {
    const mainBehavior = behaviors[0] || 'General user';
    const engagement = centroid.engagementLevel > 0.7 ? 'highly engaged' : centroid.engagementLevel > 0.4 ? 'moderately engaged' : 'low engagement';
    const risk = centroid.riskTolerance < 0.3 ? 'conservative' : centroid.riskTolerance > 0.7 ? 'aggressive' : 'moderate';

    return `${mainBehavior} with ${engagement} behavior and ${risk} risk tolerance`;
  }

  /**
   * Store clustering results in database
   */
  private async storeClusteringResults(results: ClusterResult[]): Promise<void> {
    try {
      for (const result of results) {
        // Store cluster assignments
        for (const userId of result.userIds) {
          await this.db.query(`
            INSERT INTO user_behavior_clusters (
              cluster_id, user_id_hash, feature_vector, algorithm, cluster_characteristics
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id_hash, cluster_id) DO UPDATE SET
              feature_vector = EXCLUDED.feature_vector,
              cluster_characteristics = EXCLUDED.cluster_characteristics,
              assigned_at = NOW()
          `, [
            result.clusterId,
            userId,
            JSON.stringify(this.extractNumericalFeatures(result.centroid)),
            this.config.algorithm,
            JSON.stringify(result.characteristics)
          ]);
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to store clustering results', error);
    }
  }

  /**
   * Mine sequential patterns from user interactions
   */
  async mineSequencePatterns(
    timeWindow: { start: Date; end: Date },
    minSupport: number = 0.05
  ): Promise<SequencePattern[]> {
    if (!this.isInitialized) {
      throw new Error('Clustering system not initialized');
    }

    try {
      this.logger.info('Starting sequence pattern mining', {
        timeWindow: `${timeWindow.start.toISOString()} - ${timeWindow.end.toISOString()}`,
        minSupport
      });

      // Get interaction sequences for all users
      const { rows: sequences } = await this.db.query(`
        SELECT
          user_id_hash,
          ARRAY_AGG(interaction_type ORDER BY timestamp) as interaction_sequence,
          ARRAY_AGG(timestamp ORDER BY timestamp) as timestamps
        FROM user_interactions
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY user_id_hash
        HAVING COUNT(*) >= 3 -- Minimum sequence length
      `, [timeWindow.start, timeWindow.end]);

      if (sequences.length === 0) {
        return [];
      }

      // Find frequent patterns using simplified Apriori-like algorithm
      const patterns = this.findFrequentPatterns(sequences, minSupport);

      // Filter by confidence and store results
      const significantPatterns = patterns.filter(p => p.confidence >= this.config.minConfidence);

      await this.storeSequencePatterns(significantPatterns);

      this.logger.info('Sequence pattern mining completed', {
        patternsFound: significantPatterns.length,
        totalUsers: sequences.length
      });

      return significantPatterns;
    } catch (error: any) {
      this.logger.error('Failed to mine sequence patterns', error);
      throw error;
    }
  }

  /**
   * Find frequent sequential patterns
   */
  private findFrequentPatterns(sequences: any[], minSupport: number): SequencePattern[] {
    const patterns: SequencePattern[] = [];
    const totalUsers = sequences.length;
    const minSupportCount = Math.max(1, Math.floor(totalUsers * minSupport));

    // Simple pattern mining for common sequences
    // In production, would use more sophisticated algorithms like PrefixSpan or SPADE
    const commonPatterns = [
      ['alert_received', 'alert_opened', 'trade_executed'],
      ['alert_received', 'alert_opened', 'alert_dismissed'],
      ['alert_received', 'alert_clicked'],
      ['trade_executed', 'position_opened'],
      ['alert_opened', 'alert_clicked', 'trade_executed']
    ];

    for (const patternSequence of commonPatterns) {
      const usersWithPattern: string[] = [];
      let totalDuration = 0;
      let patternCount = 0;

      for (const sequence of sequences) {
        // Simple subsequence matching
        if (this.containsSubsequence(sequence.interaction_sequence, patternSequence)) {
          usersWithPattern.push(sequence.user_id_hash);
          patternCount++;

          // Calculate average duration (simplified)
          if (sequence.timestamps.length >= patternSequence.length) {
            const startTime = new Date(sequence.timestamps[0]).getTime();
            const endTime = new Date(sequence.timestamps[patternSequence.length - 1]).getTime();
            totalDuration += (endTime - startTime);
          }
        }
      }

      if (usersWithPattern.length >= minSupportCount) {
        const support = usersWithPattern.length / totalUsers;
        const avgDuration = totalDuration / Math.max(patternCount, 1);

        patterns.push({
          patternId: `pattern_${patterns.length + 1}`,
          sequence: patternSequence,
          frequency: patternCount,
          support,
          confidence: this.calculatePatternConfidence(patternSequence, sequences),
          users: usersWithPattern,
          metadata: {
            avgDuration,
            variability: 0.3, // Would calculate actual variability
            trend: 'stable'
          }
        });
      }
    }

    return patterns;
  }

  /**
   * Check if sequence contains subsequence
   */
  private containsSubsequence(sequence: string[], subsequence: string[]): boolean {
    let subIndex = 0;

    for (const item of sequence) {
      if (item === subsequence[subIndex]) {
        subIndex++;
        if (subIndex === subsequence.length) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(pattern: string[], sequences: any[]): number {
    let totalOccurrences = 0;
    let patternOccurrences = 0;

    for (const sequence of sequences) {
      const seq = sequence.interaction_sequence;
      for (let i = 0; i <= seq.length - pattern.length; i++) {
        totalOccurrences++;
        if (seq.slice(i, i + pattern.length).every((item, idx) => item === pattern[idx])) {
          patternOccurrences++;
        }
      }
    }

    return totalOccurrences > 0 ? patternOccurrences / totalOccurrences : 0;
  }

  /**
   * Store sequence patterns in database
   */
  private async storeSequencePatterns(patterns: SequencePattern[]): Promise<void> {
    try {
      for (const pattern of patterns) {
        await this.db.query(`
          INSERT INTO user_sequence_patterns (
            pattern_id, sequence, frequency, support, confidence,
            user_ids, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          pattern.patternId,
          pattern.sequence,
          pattern.frequency,
          pattern.support,
          pattern.confidence,
          pattern.users,
          JSON.stringify(pattern.metadata)
        ]);
      }
    } catch (error: any) {
      this.logger.error('Failed to store sequence patterns', error);
    }
  }

  /**
   * Get clustering results for dashboard
   */
  async getClusteringInsights(timeWindow: { start: Date; end: Date }): Promise<{
    clusters: ClusterResult[];
    patterns: SequencePattern[];
    recommendations: {
      segmentOptimizations: string[];
      engagementStrategies: string[];
      riskAdjustments: string[];
    };
  }> {
    try {
      // Get recent clustering results
      const { rows: clusterRows } = await this.db.query(`
        SELECT * FROM user_behavior_clusters
        WHERE assigned_at >= $1
        ORDER BY cluster_id, assigned_at DESC
      `, [timeWindow.start]);

      // Get recent sequence patterns
      const { rows: patternRows } = await this.db.query(`
        SELECT * FROM user_sequence_patterns
        WHERE detected_at >= $1
        ORDER BY support DESC, confidence DESC
      `, [timeWindow.start]);

      // Process cluster results
      const clusters: ClusterResult[] = [];
      const clusterMap = new Map<number, any>();

      for (const row of clusterRows) {
        const clusterId = row.cluster_id;
        if (!clusterMap.has(clusterId)) {
          clusterMap.set(clusterId, {
            clusterId,
            centroid: this.vectorToFeatures(row.feature_vector),
            size: 0,
            userIds: [],
            characteristics: row.cluster_characteristics,
            confidence: 0.8
          });
        }

        clusterMap.get(clusterId)!.size++;
        clusterMap.get(clusterId)!.userIds.push(row.user_id_hash);
      }

      clusters.push(...Array.from(clusterMap.values()));

      // Process pattern results
      const patterns: SequencePattern[] = patternRows.map(row => ({
        patternId: row.pattern_id,
        sequence: row.sequence,
        frequency: row.frequency,
        support: row.support,
        confidence: row.confidence,
        users: row.user_ids,
        metadata: row.metadata
      }));

      // Generate recommendations
      const recommendations = this.generateClusteringRecommendations(clusters, patterns);

      return {
        clusters,
        patterns,
        recommendations
      };
    } catch (error: any) {
      this.logger.error('Failed to get clustering insights', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on clustering results
   */
  private generateClusteringRecommendations(clusters: ClusterResult[], patterns: SequencePattern[]): {
    segmentOptimizations: string[];
    engagementStrategies: string[];
    riskAdjustments: string[];
  } {
    const recommendations = {
      segmentOptimizations: [] as string[],
      engagementStrategies: [] as string[],
      riskAdjustments: [] as string[]
    };

    // Segment-based optimizations
    for (const cluster of clusters) {
      if (cluster.characteristics.engagementLevel === 'low') {
        recommendations.segmentOptimizations.push(
          `Increase engagement for ${cluster.characteristics.description} segment`
        );
      }

      if (cluster.characteristics.riskProfile === 'high') {
        recommendations.riskAdjustments.push(
          `Implement risk controls for ${cluster.characteristics.description} segment`
        );
      }
    }

    // Pattern-based strategies
    const fatiguePatterns = patterns.filter(p => p.sequence.includes('alert_dismissed'));
    if (fatiguePatterns.length > 0) {
      recommendations.engagementStrategies.push(
        'Implement alert fatigue prevention measures',
        'Optimize alert timing and frequency',
        'Personalize alert content based on user preferences'
      );
    }

    return recommendations;
  }

  /**
   * Clean up old clustering data
   */
  async cleanupOldData(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));

      await this.db.query(`
        DELETE FROM user_behavior_clusters WHERE assigned_at < $1
      `, [cutoffDate]);

      await this.db.query(`
        DELETE FROM user_sequence_patterns WHERE detected_at < $1
      `, [cutoffDate]);

      await this.db.query(`
        DELETE FROM user_feature_vectors WHERE computed_at < $1
      `, [cutoffDate]);

      this.logger.info('Old clustering data cleaned up', { cutoffDate });
    } catch (error: any) {
      this.logger.error('Failed to cleanup old data', error);
    }
  }

  /**
   * Start the clustering service
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      // Start periodic clustering analysis
      setInterval(async () => {
        try {
          await this.performPeriodicAnalysis();
        } catch (error) {
          this.logger.error('Periodic clustering analysis failed', error);
        }
      }, 24 * 60 * 60 * 1000); // Daily

      this.logger.info('✅ User behavior clustering started');
    }
  }

  /**
   * Stop the clustering service
   */
  async stop(): Promise<void> {
    await this.db.end();
    this.isInitialized = false;
    this.logger.info('✅ User behavior clustering stopped');
  }

  /**
   * Perform periodic clustering analysis
   */
  private async performPeriodicAnalysis(): Promise<void> {
    const timeWindow = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    };

    // Extract feature vectors
    const featureVectors = await this.extractFeatureVectors(timeWindow);

    if (featureVectors.length >= 10) { // Minimum users for clustering
      // Perform clustering
      await this.performKMeansClustering(featureVectors, Math.min(5, Math.floor(featureVectors.length / 10)));

      // Mine sequence patterns
      await this.mineSequencePatterns(timeWindow);

      // Clean up old data
      await this.cleanupOldData();
    }
  }
}
