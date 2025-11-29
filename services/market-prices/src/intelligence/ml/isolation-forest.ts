/**
 * Isolation Forest for Anomaly Detection
 * 
 * Detects outliers and discrepancies in multi-source unlock data.
 * Uses the isolation forest algorithm which isolates anomalies by
 * building random trees that partition the data space.
 * 
 * Key features:
 * - Unsupervised anomaly detection
 * - Handles high-dimensional data efficiently
 * - Provides anomaly scores and explanations
 * - Adaptive thresholds based on data distribution
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

// Tree node structure
interface IsolationTreeNode {
  isLeaf: boolean;
  splitFeature?: number;
  splitValue?: number;
  left?: IsolationTreeNode;
  right?: IsolationTreeNode;
  size?: number;
}

// Data point with features
export interface DataPoint {
  id: string;
  features: number[];
  metadata?: any;
}

// Anomaly detection result
export interface AnomalyResult {
  id: string;
  score: number;          // 0-1, higher = more anomalous
  isAnomaly: boolean;
  confidence: number;     // Confidence in the classification
  pathLength: number;     // Average path length in trees
  explanation: {
    mostAnomalousFeatures: { index: number; contribution: number }[];
    comparisonToNormal: number; // How different from normal
  };
}

// Forest configuration
export interface IsolationForestConfig {
  numTrees: number;
  sampleSize: number;
  maxDepth: number;
  contamination: number;  // Expected proportion of anomalies
  randomSeed?: number;
}

// Forest statistics
export interface ForestStats {
  numTrees: number;
  sampleSize: number;
  trainingSize: number;
  avgTreeDepth: number;
  threshold: number;
  detectedAnomalies: number;
}

const DEFAULT_CONFIG: IsolationForestConfig = {
  numTrees: 100,
  sampleSize: 256,
  maxDepth: 8,
  contamination: 0.1,
};

export class IsolationForest extends EventEmitter {
  private config: IsolationForestConfig;
  private trees: IsolationTreeNode[] = [];
  private trainingData: DataPoint[] = [];
  private threshold: number = 0.5;
  private featureMeans: number[] = [];
  private featureStds: number[] = [];
  private isTraind: boolean = false;
  private random: () => number;

  constructor(config: Partial<IsolationForestConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Seeded random for reproducibility
    this.random = this.config.randomSeed !== undefined
      ? this.seededRandom(this.config.randomSeed)
      : Math.random;
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  /**
   * Train the isolation forest
   */
  train(data: DataPoint[]): void {
    if (data.length === 0) {
      throw new Error('Cannot train on empty data');
    }

    this.trainingData = data;
    this.trees = [];

    // Calculate feature statistics for later explanation
    this.calculateFeatureStats(data);

    // Build trees
    const actualSampleSize = Math.min(this.config.sampleSize, data.length);

    for (let i = 0; i < this.config.numTrees; i++) {
      const sample = this.sampleData(data, actualSampleSize);
      const tree = this.buildTree(sample, 0);
      this.trees.push(tree);
    }

    // Calculate threshold based on contamination
    this.threshold = this.calculateThreshold(data);
    this.isTraind = true;

    logger.info('Isolation Forest trained', {
      numTrees: this.config.numTrees,
      sampleSize: actualSampleSize,
      dataSize: data.length,
      threshold: this.threshold.toFixed(4),
    });

    this.emit('trained', this.getStats());
  }

  /**
   * Calculate feature statistics
   */
  private calculateFeatureStats(data: DataPoint[]): void {
    const numFeatures = data[0].features.length;
    this.featureMeans = new Array(numFeatures).fill(0);
    this.featureStds = new Array(numFeatures).fill(0);

    // Calculate means
    data.forEach(point => {
      point.features.forEach((f, i) => this.featureMeans[i] += f);
    });
    this.featureMeans.forEach((_, i) => this.featureMeans[i] /= data.length);

    // Calculate standard deviations
    data.forEach(point => {
      point.features.forEach((f, i) => {
        this.featureStds[i] += (f - this.featureMeans[i]) ** 2;
      });
    });
    this.featureStds.forEach((_, i) => {
      this.featureStds[i] = Math.sqrt(this.featureStds[i] / data.length) || 1;
    });
  }

  /**
   * Sample data randomly
   */
  private sampleData(data: DataPoint[], size: number): DataPoint[] {
    const shuffled = [...data].sort(() => this.random() - 0.5);
    return shuffled.slice(0, size);
  }

  /**
   * Build a single isolation tree
   */
  private buildTree(data: DataPoint[], depth: number): IsolationTreeNode {
    // Base cases
    if (data.length <= 1 || depth >= this.config.maxDepth) {
      return { isLeaf: true, size: data.length };
    }

    const numFeatures = data[0].features.length;
    
    // Random feature selection
    const featureIndex = Math.floor(this.random() * numFeatures);
    
    // Get min/max for this feature
    let min = Infinity;
    let max = -Infinity;
    data.forEach(point => {
      min = Math.min(min, point.features[featureIndex]);
      max = Math.max(max, point.features[featureIndex]);
    });

    // If all values are the same, make leaf
    if (min === max) {
      return { isLeaf: true, size: data.length };
    }

    // Random split value between min and max
    const splitValue = min + this.random() * (max - min);

    // Partition data
    const left: DataPoint[] = [];
    const right: DataPoint[] = [];
    
    data.forEach(point => {
      if (point.features[featureIndex] < splitValue) {
        left.push(point);
      } else {
        right.push(point);
      }
    });

    // Avoid empty partitions
    if (left.length === 0 || right.length === 0) {
      return { isLeaf: true, size: data.length };
    }

    return {
      isLeaf: false,
      splitFeature: featureIndex,
      splitValue,
      left: this.buildTree(left, depth + 1),
      right: this.buildTree(right, depth + 1),
    };
  }

  /**
   * Calculate threshold based on contamination rate
   */
  private calculateThreshold(data: DataPoint[]): number {
    const scores = data.map(point => this.calculateAnomalyScore(point));
    scores.sort((a, b) => b - a);
    
    const index = Math.floor(data.length * this.config.contamination);
    return scores[Math.max(0, index - 1)] || 0.5;
  }

  /**
   * Calculate anomaly score for a point
   */
  private calculateAnomalyScore(point: DataPoint): number {
    if (this.trees.length === 0) {
      return 0.5;
    }

    // Average path length across all trees
    const avgPathLength = this.trees.reduce((sum, tree) => {
      return sum + this.pathLength(point, tree, 0);
    }, 0) / this.trees.length;

    // Normalize using expected path length
    const c = this.expectedPathLength(this.trainingData.length);
    const score = Math.pow(2, -avgPathLength / c);

    return score;
  }

  /**
   * Calculate path length in a tree
   */
  private pathLength(
    point: DataPoint,
    node: IsolationTreeNode,
    depth: number
  ): number {
    if (node.isLeaf) {
      // Add expected path length for remaining samples
      return depth + this.expectedPathLength(node.size || 1);
    }

    const featureValue = point.features[node.splitFeature!];
    
    if (featureValue < node.splitValue!) {
      return this.pathLength(point, node.left!, depth + 1);
    } else {
      return this.pathLength(point, node.right!, depth + 1);
    }
  }

  /**
   * Expected path length for a given sample size (c(n))
   */
  private expectedPathLength(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    
    // Harmonic number approximation
    const euler = 0.5772156649;
    return 2 * (Math.log(n - 1) + euler) - (2 * (n - 1) / n);
  }

  /**
   * Detect anomalies in new data
   */
  detect(point: DataPoint): AnomalyResult {
    if (!this.isTraind) {
      throw new Error('Model not trained');
    }

    const score = this.calculateAnomalyScore(point);
    const pathLengths = this.trees.map(tree => this.pathLength(point, tree, 0));
    const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;

    // Calculate feature contributions to anomaly
    const featureContributions = this.calculateFeatureContributions(point);

    // Calculate confidence based on score distribution
    const confidence = this.calculateConfidence(score);

    return {
      id: point.id,
      score,
      isAnomaly: score >= this.threshold,
      confidence,
      pathLength: avgPathLength,
      explanation: {
        mostAnomalousFeatures: featureContributions
          .map((contribution, index) => ({ index, contribution }))
          .sort((a, b) => b.contribution - a.contribution)
          .slice(0, 5),
        comparisonToNormal: score / this.threshold,
      },
    };
  }

  /**
   * Detect anomalies in batch
   */
  detectBatch(points: DataPoint[]): AnomalyResult[] {
    return points.map(point => this.detect(point));
  }

  /**
   * Calculate feature contributions to anomaly score
   */
  private calculateFeatureContributions(point: DataPoint): number[] {
    return point.features.map((value, i) => {
      // Z-score contribution
      const zScore = Math.abs((value - this.featureMeans[i]) / this.featureStds[i]);
      return zScore;
    });
  }

  /**
   * Calculate confidence in the classification
   */
  private calculateConfidence(score: number): number {
    // How far from the threshold (in both directions)
    const distance = Math.abs(score - this.threshold);
    const normalizedDistance = distance / Math.max(this.threshold, 1 - this.threshold);
    
    // Sigmoid for smooth confidence
    return 1 / (1 + Math.exp(-5 * normalizedDistance));
  }

  /**
   * Update threshold based on feedback
   */
  updateThreshold(newContamination: number): void {
    if (newContamination <= 0 || newContamination >= 1) {
      throw new Error('Contamination must be between 0 and 1');
    }

    this.config.contamination = newContamination;
    this.threshold = this.calculateThreshold(this.trainingData);

    logger.info('Threshold updated', {
      contamination: newContamination,
      newThreshold: this.threshold.toFixed(4),
    });
  }

  /**
   * Incremental learning: add new normal examples
   */
  addNormalExamples(points: DataPoint[]): void {
    this.trainingData.push(...points);
    
    // Retrain if significant new data
    if (points.length >= this.config.sampleSize * 0.1) {
      this.train(this.trainingData);
    }
  }

  /**
   * Get forest statistics
   */
  getStats(): ForestStats {
    const avgDepth = this.trees.reduce((sum, tree) => {
      return sum + this.treeDepth(tree);
    }, 0) / Math.max(this.trees.length, 1);

    const anomalyCount = this.trainingData.reduce((count, point) => {
      return count + (this.calculateAnomalyScore(point) >= this.threshold ? 1 : 0);
    }, 0);

    return {
      numTrees: this.trees.length,
      sampleSize: this.config.sampleSize,
      trainingSize: this.trainingData.length,
      avgTreeDepth: avgDepth,
      threshold: this.threshold,
      detectedAnomalies: anomalyCount,
    };
  }

  /**
   * Calculate tree depth
   */
  private treeDepth(node: IsolationTreeNode): number {
    if (node.isLeaf) return 1;
    return 1 + Math.max(
      this.treeDepth(node.left!),
      this.treeDepth(node.right!)
    );
  }

  /**
   * Check if trained
   */
  isTrained(): boolean {
    return this.isTraind;
  }

  /**
   * Get threshold
   */
  getThreshold(): number {
    return this.threshold;
  }
}

// Factory function
export function createIsolationForest(
  config?: Partial<IsolationForestConfig>
): IsolationForest {
  return new IsolationForest(config);
}

export default IsolationForest;

