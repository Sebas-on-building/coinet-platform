/**
 * =========================================
 * SIGNAL CLUSTERING ENGINE
 * =========================================
 * Detects convergence patterns and signal clusters
 * for predictive analysis and dimensionality reduction
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  NormalizedSignal,
  SignalType
} from '../types';
import type {
  SignalCluster,
  ConvergencePattern,
  CorrelationMatrix,
  CorrelationPair,
  PCAResult
} from './types';

export class SignalClustering extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;

  // Clustering data
  private signalClusters: Map<string, SignalCluster> = new Map();
  private convergencePatterns: ConvergencePattern[] = [];
  private clusterHistory: Map<string, SignalCluster[]> = new Map();

  // Analysis state
  private lastClustering: Date = new Date();
  private convergenceWindow: number = 60; // minutes

  constructor() {
    super();
    this.logger = new Logger('SignalClustering');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Signal Clustering...');

      this.signalClusters.clear();
      this.convergencePatterns = [];
      this.clusterHistory.clear();

      this.isInitialized = true;
      this.logger.info('✅ Signal Clustering initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Signal Clustering', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.signalClusters.clear();
      this.convergencePatterns = [];
      this.clusterHistory.clear();

      this.isInitialized = false;
      this.logger.info('✅ Signal Clustering stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Signal Clustering', error);
      throw error;
    }
  }

  /**
   * Add signal for clustering analysis
   */
  addSignal(signal: NormalizedSignal): void {
    if (!this.isInitialized) {
      throw new Error('Signal Clustering is not initialized');
    }

    this.logger.debug('Signal added to clustering analysis', {
      signal_id: signal.id,
      signal_type: signal.type
    });
  }

  /**
   * Perform clustering analysis on correlation matrix
   */
  async performClustering(
    correlationMatrix: CorrelationMatrix,
    signals: NormalizedSignal[]
  ): Promise<SignalCluster[]> {
    if (!this.isInitialized) {
      throw new Error('Signal Clustering is not initialized');
    }

    try {
      this.logger.info('Starting signal clustering analysis');

      // Extract signal data for clustering
      const signalData = this.prepareSignalDataForClustering(signals);

      // Perform hierarchical clustering
      const clusters = this.performHierarchicalClustering(correlationMatrix, signalData);

      // Identify convergence patterns
      const convergencePatterns = await this.identifyConvergencePatterns(clusters, signals);

      // Update cluster storage
      this.updateClusters(clusters);

      // Update convergence patterns
      this.convergencePatterns.push(...convergencePatterns);

      // Keep only recent patterns
      this.cleanupOldPatterns();

      this.lastClustering = new Date();

      this.logger.info('Signal clustering completed', {
        cluster_count: clusters.length,
        convergence_patterns: convergencePatterns.length
      });

      this.emit('clustering_complete', { clusters, convergencePatterns });

      return clusters;

    } catch (error: any) {
      this.logger.error('Signal clustering failed', error);
      throw error;
    }
  }

  /**
   * Prepare signal data for clustering analysis
   */
  private prepareSignalDataForClustering(signals: NormalizedSignal[]): Record<SignalType, number[]> {
    const signalData: Record<SignalType, number[]> = {} as Record<SignalType, number[]>;

    // Group signals by type and extract features
    const signalsByType: Record<SignalType, NormalizedSignal[]> = {} as Record<SignalType, NormalizedSignal[]>;

    for (const signal of signals) {
      if (!signalsByType[signal.type]) {
        signalsByType[signal.type] = [];
      }
      signalsByType[signal.type].push(signal);
    }

    // For each signal type, create a feature vector
    for (const [signalType, typeSignals] of Object.entries(signalsByType)) {
      const featureVector = this.extractFeaturesForClustering(typeSignals);
      signalData[signalType as SignalType] = featureVector;
    }

    return signalData;
  }

  /**
   * Extract features for clustering from signals
   */
  private extractFeaturesForClustering(signals: NormalizedSignal[]): number[] {
    if (signals.length === 0) return [];

    // Extract multiple features for clustering
    const features: number[] = [];

    // Basic statistical features
    const values = signals.map(s => {
      const vals = Object.values(s.normalizedValues);
      return vals.length > 0 ? vals[0] as number : 0;
    });

    features.push(...[
      this.mean(values),
      this.std(values),
      this.skewness(values),
      this.kurtosis(values),
      this.min(values),
      this.max(values),
      this.range(values),
      signals.length // count
    ]);

    // Temporal features
    const timestamps = signals.map(s => s.timestamp.getTime());
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);

    features.push(...[
      timeSpan / (1000 * 60), // time span in minutes
      this.trendSlope(values, timestamps),
      this.volatility(values)
    ]);

    // Signal characteristics
    const avgMagnitude = signals.reduce((sum, s) => {
      const vals = Object.values(s.normalizedValues);
      return sum + (vals.length > 0 ? Math.abs(vals[0] as number) : 0);
    }, 0) / signals.length;

    features.push(avgMagnitude);

    return features;
  }

  /**
   * Perform hierarchical clustering on correlation matrix
   */
  private performHierarchicalClustering(
    correlationMatrix: CorrelationMatrix,
    signalData: Record<SignalType, number[]>
  ): SignalCluster[] {
    const signalTypes = correlationMatrix.signalTypes;
    const distanceMatrix = this.calculateDistanceMatrix(correlationMatrix);

    // Start with each signal as its own cluster
    const clusters: SignalCluster[] = signalTypes.map((signalType, index) => ({
      id: `cluster_${index}`,
      signals: [signalType],
      convergenceScore: 0,
      predictivePower: 0,
      cohesion: 1.0, // Single signal has perfect cohesion
      centroid: signalData[signalType] || [],
      size: 1,
      lastUpdated: new Date()
    }));

    // Hierarchical clustering algorithm (simplified)
    while (clusters.length > 1) {
      // Find closest clusters
      let minDistance = Infinity;
      let mergeIndices: [number, number] = [0, 1];

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const distance = this.clusterDistance(clusters[i], clusters[j], distanceMatrix, signalTypes);
          if (distance < minDistance) {
            minDistance = distance;
            mergeIndices = [i, j];
          }
        }
      }

      // Merge closest clusters
      const [i, j] = mergeIndices;
      const mergedCluster = this.mergeClusters(clusters[i], clusters[j], signalData);

      // Replace first cluster with merged, remove second
      clusters[i] = mergedCluster;
      clusters.splice(j, 1);
    }

    return clusters;
  }

  /**
   * Calculate distance matrix from correlation matrix
   */
  private calculateDistanceMatrix(correlationMatrix: CorrelationMatrix): number[][] {
    const n = correlationMatrix.signalTypes.length;
    const distanceMatrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      distanceMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        // Convert correlation to distance (1 - correlation)
        distanceMatrix[i][j] = 1 - Math.abs(correlationMatrix.matrix[i][j]);
      }
    }

    return distanceMatrix;
  }

  /**
   * Calculate distance between two clusters
   */
  private clusterDistance(
    cluster1: SignalCluster,
    cluster2: SignalCluster,
    distanceMatrix: number[][],
    signalTypes: SignalType[]
  ): number {
    let minDistance = Infinity;

    // Find minimum distance between any two signals from different clusters
    for (const signal1 of cluster1.signals) {
      for (const signal2 of cluster2.signals) {
        const i = signalTypes.indexOf(signal1);
        const j = signalTypes.indexOf(signal2);

        if (i !== -1 && j !== -1) {
          minDistance = Math.min(minDistance, distanceMatrix[i][j]);
        }
      }
    }

    return minDistance;
  }

  /**
   * Merge two clusters
   */
  private mergeClusters(
    cluster1: SignalCluster,
    cluster2: SignalCluster,
    signalData: Record<SignalType, number[]>
  ): SignalCluster {
    const mergedSignals = [...cluster1.signals, ...cluster2.signals];
    const mergedSize = cluster1.size + cluster2.size;

    // Calculate new centroid (average of signal features)
    const newCentroid: number[] = [];
    for (let i = 0; i < cluster1.centroid.length; i++) {
      newCentroid[i] = (cluster1.centroid[i] * cluster1.size + cluster2.centroid[i] * cluster2.size) / mergedSize;
    }

    // Calculate cohesion (internal consistency)
    const cohesion = this.calculateClusterCohesion(mergedSignals, newCentroid, signalData);

    return {
      id: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      signals: mergedSignals,
      convergenceScore: Math.max(cluster1.convergenceScore, cluster2.convergenceScore),
      predictivePower: Math.max(cluster1.predictivePower, cluster2.predictivePower),
      cohesion,
      centroid: newCentroid,
      size: mergedSize,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate cluster cohesion (internal consistency)
   */
  private calculateClusterCohesion(
    signals: SignalType[],
    centroid: number[],
    signalData: Record<SignalType, number[]>
  ): number {
    if (signals.length <= 1) return 1.0;

    let totalDistance = 0;
    let count = 0;

    for (const signalType of signals) {
      const signalFeatures = signalData[signalType];
      if (signalFeatures) {
        const distance = this.euclideanDistance(signalFeatures, centroid);
        totalDistance += distance;
        count++;
      }
    }

    if (count === 0) return 1.0;

    const avgDistance = totalDistance / count;
    // Convert distance to cohesion (lower distance = higher cohesion)
    return Math.max(0, 1 - (avgDistance / Math.sqrt(centroid.length)));
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private euclideanDistance(v1: number[], v2: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
      sum += Math.pow(v1[i] - v2[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Identify convergence patterns
   */
  private async identifyConvergencePatterns(
    clusters: SignalCluster[],
    signals: NormalizedSignal[]
  ): Promise<ConvergencePattern[]> {
    const patterns: ConvergencePattern[] = [];

    // Group signals by time windows
    const timeWindows = this.groupSignalsByTime(signals);

    for (const [windowStart, windowSignals] of timeWindows) {
      // Find clusters that converge in this window
      const convergingClusters = this.findConvergingClusters(windowSignals, clusters);

      for (const cluster of convergingClusters) {
        const pattern = await this.analyzeConvergencePattern(cluster, windowSignals, windowStart);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  /**
   * Group signals by time windows
   */
  private groupSignalsByTime(signals: NormalizedSignal[]): Map<number, NormalizedSignal[]> {
    const windows = new Map<number, NormalizedSignal[]>();
    const windowSize = this.convergenceWindow * 60 * 1000; // Convert to milliseconds

    for (const signal of signals) {
      const windowStart = Math.floor(signal.timestamp.getTime() / windowSize) * windowSize;

      if (!windows.has(windowStart)) {
        windows.set(windowStart, []);
      }

      windows.get(windowStart)!.push(signal);
    }

    return windows;
  }

  /**
   * Find clusters that are converging in a time window
   */
  private findConvergingClusters(
    windowSignals: NormalizedSignal[],
    clusters: SignalCluster[]
  ): SignalCluster[] {
    const convergingClusters: SignalCluster[] = [];

    for (const cluster of clusters) {
      // Check if cluster signals are present in this window
      const clusterSignalsInWindow = windowSignals.filter(s =>
        cluster.signals.includes(s.type)
      );

      if (clusterSignalsInWindow.length >= 2) { // At least 2 signals in cluster
        // Check if signals are converging (similar direction and magnitude)
        const convergenceScore = this.calculateConvergenceScore(clusterSignalsInWindow);

        if (convergenceScore > 0.6) { // Threshold for convergence
          convergingClusters.push(cluster);
        }
      }
    }

    return convergingClusters;
  }

  /**
   * Calculate convergence score for signals in a cluster
   */
  private calculateConvergenceScore(signals: NormalizedSignal[]): number {
    if (signals.length < 2) return 0;

    // Extract primary values
    const values = signals.map(s => {
      const vals = Object.values(s.normalizedValues);
      return vals.length > 0 ? vals[0] as number : 0;
    });

    // Calculate directional consistency
    const mean = this.mean(values);
    const directionalConsistency = values.reduce((sum, val) =>
      sum + (val > mean ? 1 : -1), 0
    ) / values.length;

    // Calculate magnitude consistency
    const magnitudes = values.map(Math.abs);
    const magnitudeConsistency = 1 - this.coefficientOfVariation(magnitudes);

    // Combine directional and magnitude consistency
    return (Math.abs(directionalConsistency) + magnitudeConsistency) / 2;
  }

  /**
   * Analyze convergence pattern for price prediction
   */
  private async analyzeConvergencePattern(
    cluster: SignalCluster,
    windowSignals: NormalizedSignal[],
    windowStart: number
  ): Promise<ConvergencePattern | null> {
    // Look for price moves following convergence
    const windowEnd = windowStart + (this.convergenceWindow * 60 * 1000);

    // Find price signals in the next window
    const futurePriceSignals = windowSignals.filter(s =>
      s.type === 'price' &&
      s.timestamp.getTime() > windowEnd &&
      s.timestamp.getTime() <= windowEnd + (2 * this.convergenceWindow * 60 * 1000)
    );

    if (futurePriceSignals.length === 0) {
      return null;
    }

    // Calculate price move
    const priceMove = this.calculatePriceMove(futurePriceSignals);

    // Calculate pattern strength and frequency
    const strength = cluster.convergenceScore * cluster.cohesion;
    const frequency = await this.calculatePatternFrequency(cluster);

    return {
      clusterId: cluster.id,
      signals: cluster.signals,
      convergenceTime: new Date(windowStart),
      duration: this.convergenceWindow,
      strength,
      priceMove,
      frequency
    };
  }

  /**
   * Calculate price move following convergence
   */
  private calculatePriceMove(priceSignals: NormalizedSignal[]): ConvergencePattern['priceMove'] {
    if (priceSignals.length < 2) {
      return {
        direction: 'sideways',
        magnitude: 0,
        confidence: 0
      };
    }

    const values = priceSignals.map(s => {
      const vals = Object.values(s.normalizedValues);
      return vals.length > 0 ? vals[0] as number : 0;
    });

    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const magnitude = (lastValue - firstValue) / Math.abs(firstValue);

    let direction: 'up' | 'down' | 'sideways' = 'sideways';
    if (magnitude > 0.02) direction = 'up';
    else if (magnitude < -0.02) direction = 'down';

    const confidence = Math.min(1, priceSignals.length / 5); // More signals = higher confidence

    return {
      direction,
      magnitude: Math.abs(magnitude),
      confidence
    };
  }

  /**
   * Calculate pattern frequency
   */
  private async calculatePatternFrequency(cluster: SignalCluster): Promise<number> {
    // Count how often this pattern has occurred in historical data
    const historicalClusters = this.clusterHistory.get(cluster.id) || [];
    const totalOccurrences = historicalClusters.length;
    const lookbackDays = 30; // Consider last 30 days

    // Simple frequency calculation
    return Math.min(1, totalOccurrences / (lookbackDays * 24)); // Normalize to 0-1
  }

  /**
   * Update cluster storage
   */
  private updateClusters(clusters: SignalCluster[]): void {
    for (const cluster of clusters) {
      this.signalClusters.set(cluster.id, cluster);

      // Update cluster history
      if (!this.clusterHistory.has(cluster.id)) {
        this.clusterHistory.set(cluster.id, []);
      }

      const history = this.clusterHistory.get(cluster.id)!;
      history.push({ ...cluster });

      // Keep only recent history
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      this.clusterHistory.set(cluster.id, history.filter(c =>
        c.lastUpdated.getTime() > cutoffTime
      ));
    }
  }

  /**
   * Clean up old convergence patterns
   */
  private cleanupOldPatterns(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.convergencePatterns = this.convergencePatterns.filter(p =>
      p.convergenceTime.getTime() > cutoffTime
    );
  }

  /**
   * Get predictive clusters
   */
  getPredictiveClusters(minPredictivePower: number = 0.7): SignalCluster[] {
    return Array.from(this.signalClusters.values())
      .filter(cluster => cluster.predictivePower >= minPredictivePower)
      .sort((a, b) => b.predictivePower - a.predictivePower);
  }

  /**
   * Get recent convergence patterns
   */
  getRecentConvergencePatterns(hoursBack: number = 24): ConvergencePattern[] {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    return this.convergencePatterns.filter(p =>
      p.convergenceTime.getTime() > cutoffTime
    );
  }

  /**
   * Update cluster predictive power based on outcomes
   */
  updateClusterPredictivePower(clusterId: string, priceMoveAccuracy: number): void {
    const cluster = this.signalClusters.get(clusterId);
    if (!cluster) return;

    // Update predictive power using exponential moving average
    const alpha = 0.1; // Learning rate
    cluster.predictivePower = (1 - alpha) * cluster.predictivePower + alpha * priceMoveAccuracy;

    this.signalClusters.set(clusterId, cluster);

    this.logger.debug('Cluster predictive power updated', {
      cluster_id: clusterId,
      new_predictive_power: cluster.predictivePower,
      accuracy: priceMoveAccuracy
    });
  }

  // Utility functions for statistical calculations
  private mean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private std(values: number[]): number {
    const mean = this.mean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private skewness(values: number[]): number {
    const n = values.length;
    const mean = this.mean(values);
    const std = this.std(values);

    if (std === 0) return 0;

    const skewness = values.reduce((sum, val) =>
      sum + Math.pow((val - mean) / std, 3), 0
    ) / n;

    return skewness;
  }

  private kurtosis(values: number[]): number {
    const n = values.length;
    const mean = this.mean(values);
    const std = this.std(values);

    if (std === 0) return 0;

    const kurtosis = values.reduce((sum, val) =>
      sum + Math.pow((val - mean) / std, 4), 0
    ) / n - 3; // Excess kurtosis

    return kurtosis;
  }

  private min(values: number[]): number {
    return Math.min(...values);
  }

  private max(values: number[]): number {
    return Math.max(...values);
  }

  private range(values: number[]): number {
    return this.max(values) - this.min(values);
  }

  private trendSlope(values: number[], timestamps: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = timestamps.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = timestamps.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = timestamps.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private volatility(values: number[]): number {
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }

    return this.std(returns);
  }

  private coefficientOfVariation(values: number[]): number {
    const mean = this.mean(values);
    const std = this.std(values);
    return mean === 0 ? 0 : std / Math.abs(mean);
  }

  /**
   * Get current status
   */
  getStatus(): string {
    return this.isInitialized ?
      `Active (${this.signalClusters.size} clusters, ${this.convergencePatterns.length} patterns)` :
      'Not Initialized';
  }
}
