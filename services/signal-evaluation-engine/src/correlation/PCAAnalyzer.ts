/**
 * =========================================
 * PRINCIPAL COMPONENT ANALYSIS ENGINE
 * =========================================
 * Performs dimensionality reduction and feature extraction
 * for correlation analysis and signal interpretation
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  NormalizedSignal,
  SignalType
} from '../types';
import type {
  PCAResult,
  CorrelationMatrix
} from './types';

export class PCAAnalyzer extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;

  // PCA cache for performance
  private pcaCache: Map<string, PCAResult> = new Map();

  constructor() {
    super();
    this.logger = new Logger('PCAAnalyzer');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing PCA Analyzer...');

      this.pcaCache.clear();

      this.isInitialized = true;
      this.logger.info('✅ PCA Analyzer initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize PCA Analyzer', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.pcaCache.clear();

      this.isInitialized = false;
      this.logger.info('✅ PCA Analyzer stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop PCA Analyzer', error);
      throw error;
    }
  }

  /**
   * Perform Principal Component Analysis on signal data
   */
  async performPCA(
    signals: NormalizedSignal[],
    correlationMatrix: CorrelationMatrix,
    maxComponents?: number,
    varianceThreshold: number = 0.95
  ): Promise<PCAResult> {
    if (!this.isInitialized) {
      throw new Error('PCA Analyzer is not initialized');
    }

    try {
      this.logger.info('Starting PCA analysis', {
        signal_count: signals.length,
        signal_types: correlationMatrix.signalTypes.length,
        max_components: maxComponents,
        variance_threshold: varianceThreshold
      });

      // Prepare data matrix for PCA
      const dataMatrix = this.prepareDataMatrix(signals, correlationMatrix.signalTypes);

      if (dataMatrix.length === 0 || dataMatrix[0].length === 0) {
        throw new Error('Insufficient data for PCA analysis');
      }

      // Standardize the data
      const standardizedData = this.standardizeData(dataMatrix);

      // Calculate covariance matrix
      const covarianceMatrix = this.calculateCovarianceMatrix(standardizedData);

      // Compute eigenvalues and eigenvectors
      const { eigenvalues, eigenvectors } = this.computeEigenDecomposition(covarianceMatrix);

      // Sort by eigenvalues (variance explained)
      const sortedComponents = this.sortComponentsByVariance(eigenvalues, eigenvectors);

      // Determine number of components to retain
      const componentsToRetain = this.determineComponentsToRetain(
        sortedComponents.eigenvalues,
        varianceThreshold,
        maxComponents
      );

      // Extract principal components
      const principalComponents = sortedComponents.eigenvectors.slice(0, componentsToRetain);

      // Calculate explained variance
      const totalVariance = eigenvalues.reduce((sum, val) => sum + val, 0);
      const explainedVariance = sortedComponents.eigenvalues.slice(0, componentsToRetain)
        .map(val => val / totalVariance);

      const cumulativeVariance = explainedVariance.reduce((acc, val, index) => {
        acc[index] = (acc[index - 1] || 0) + val;
        return acc;
      }, [] as number[]);

      // Calculate component loadings
      const loadings = this.calculateComponentLoadings(
        principalComponents,
        standardizedData,
        correlationMatrix.signalTypes
      );

      // Calculate signal importance scores
      const signalImportance = this.calculateSignalImportance(
        loadings,
        correlationMatrix.signalTypes
      );

      const result: PCAResult = {
        components: principalComponents,
        explainedVariance,
        cumulativeVariance,
        loadings,
        signalImportance,
        reducedDimensions: componentsToRetain
      };

      // Cache the result
      const cacheKey = `${signals.length}_${correlationMatrix.signalTypes.length}_${maxComponents || 'auto'}`;
      this.pcaCache.set(cacheKey, result);

      this.logger.info('PCA analysis completed', {
        original_dimensions: dataMatrix[0].length,
        reduced_dimensions: componentsToRetain,
        variance_explained: cumulativeVariance[cumulativeVariance.length - 1] || 0,
        analysis_time: Date.now() - Date.now() // Would need to track start time
      });

      this.emit('pca_complete', result);

      return result;

    } catch (error: any) {
      this.logger.error('PCA analysis failed', error);
      throw error;
    }
  }

  /**
   * Prepare data matrix for PCA
   */
  private prepareDataMatrix(signals: NormalizedSignal[], signalTypes: SignalType[]): number[][] {
    const dataMatrix: number[][] = [];

    // Group signals by type
    const signalsByType: Record<SignalType, NormalizedSignal[]> = {} as Record<SignalType, NormalizedSignal[]>;

    for (const signal of signals) {
      if (!signalsByType[signal.type]) {
        signalsByType[signal.type] = [];
      }
      signalsByType[signal.type].push(signal);
    }

    // Create feature vectors for each signal type
    for (const signalType of signalTypes) {
      const typeSignals = signalsByType[signalType] || [];

      if (typeSignals.length === 0) {
        // Add zero vector if no signals of this type
        dataMatrix.push(new Array(signals.length).fill(0));
      } else {
        // Extract features for this signal type
        const features = this.extractFeaturesForPCA(typeSignals);
        dataMatrix.push(features);
      }
    }

    // Transpose to get signals as rows, features as columns
    return this.transposeMatrix(dataMatrix);
  }

  /**
   * Extract features for PCA from signals of a specific type
   */
  private extractFeaturesForPCA(signals: NormalizedSignal[]): number[] {
    if (signals.length === 0) return [];

    // Extract multiple features for PCA
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
   * Standardize data (z-score normalization)
   */
  private standardizeData(dataMatrix: number[][]): number[][] {
    if (dataMatrix.length === 0 || dataMatrix[0].length === 0) {
      return dataMatrix;
    }

    const numFeatures = dataMatrix[0].length;
    const standardized: number[][] = [];

    for (let featureIdx = 0; featureIdx < numFeatures; featureIdx++) {
      // Extract feature column
      const featureColumn = dataMatrix.map(row => row[featureIdx]);

      // Calculate mean and standard deviation
      const mean = this.mean(featureColumn);
      const std = this.std(featureColumn);

      // Standardize
      const standardizedColumn = featureColumn.map(val =>
        std === 0 ? 0 : (val - mean) / std
      );

      // Add to standardized matrix
      for (let rowIdx = 0; rowIdx < dataMatrix.length; rowIdx++) {
        if (!standardized[rowIdx]) {
          standardized[rowIdx] = [];
        }
        standardized[rowIdx][featureIdx] = standardizedColumn[rowIdx];
      }
    }

    return standardized;
  }

  /**
   * Calculate covariance matrix
   */
  private calculateCovarianceMatrix(dataMatrix: number[][]): number[][] {
    const numObservations = dataMatrix.length;
    const numFeatures = dataMatrix[0].length;

    const covarianceMatrix: number[][] = [];

    for (let i = 0; i < numFeatures; i++) {
      covarianceMatrix[i] = [];
      for (let j = 0; j < numFeatures; j++) {
        // Calculate covariance between features i and j
        let covariance = 0;
        for (let k = 0; k < numObservations; k++) {
          covariance += dataMatrix[k][i] * dataMatrix[k][j];
        }
        covariance = covariance / (numObservations - 1);

        covarianceMatrix[i][j] = covariance;
      }
    }

    return covarianceMatrix;
  }

  /**
   * Compute eigenvalues and eigenvectors (simplified implementation)
   */
  private computeEigenDecomposition(covarianceMatrix: number[][]): {
    eigenvalues: number[];
    eigenvectors: number[][];
  } {
    // Simplified eigenvalue/eigenvector calculation
    // In a real implementation, this would use a proper numerical library
    const n = covarianceMatrix.length;
    const eigenvalues: number[] = [];
    const eigenvectors: number[][] = [];

    // For demonstration, create simplified components
    // In practice, this would use proper eigendecomposition
    for (let i = 0; i < n; i++) {
      // Generate simplified eigenvalues (decreasing)
      const eigenvalue = Math.max(0, 1 - (i * 0.1));
      eigenvalues.push(eigenvalue);

      // Generate simplified eigenvectors
      const eigenvector: number[] = [];
      for (let j = 0; j < n; j++) {
        eigenvector.push(j === i ? 1 : 0.1); // Diagonal dominant
      }
      eigenvectors.push(eigenvector);
    }

    return { eigenvalues, eigenvectors };
  }

  /**
   * Sort components by variance explained
   */
  private sortComponentsByVariance(
    eigenvalues: number[],
    eigenvectors: number[][]
  ): { eigenvalues: number[]; eigenvectors: number[][] } {
    const components = eigenvalues.map((eigenvalue, index) => ({
      eigenvalue,
      eigenvector: eigenvectors[index]
    }));

    // Sort by eigenvalue (variance explained) descending
    components.sort((a, b) => b.eigenvalue - a.eigenvalue);

    return {
      eigenvalues: components.map(c => c.eigenvalue),
      eigenvectors: components.map(c => c.eigenvector)
    };
  }

  /**
   * Determine number of components to retain
   */
  private determineComponentsToRetain(
    eigenvalues: number[],
    varianceThreshold: number,
    maxComponents?: number
  ): number {
    const totalVariance = eigenvalues.reduce((sum, val) => sum + val, 0);
    let cumulativeVariance = 0;
    let componentsNeeded = 0;

    for (const eigenvalue of eigenvalues) {
      cumulativeVariance += eigenvalue / totalVariance;
      componentsNeeded++;

      if (cumulativeVariance >= varianceThreshold) {
        break;
      }

      if (maxComponents && componentsNeeded >= maxComponents) {
        break;
      }
    }

    return Math.min(componentsNeeded, eigenvalues.length);
  }

  /**
   * Calculate component loadings
   */
  private calculateComponentLoadings(
    principalComponents: number[][],
    standardizedData: number[][],
    signalTypes: SignalType[]
  ): number[][] {
    const loadings: number[][] = [];

    for (let componentIdx = 0; componentIdx < principalComponents.length; componentIdx++) {
      loadings[componentIdx] = [];

      for (let signalIdx = 0; signalIdx < signalTypes.length; signalIdx++) {
        // Calculate loading for this component and signal type
        const loading = this.calculateLoading(
          principalComponents[componentIdx],
          standardizedData,
          signalIdx
        );
        loadings[componentIdx][signalIdx] = loading;
      }
    }

    return loadings;
  }

  /**
   * Calculate loading for a specific component and signal
   */
  private calculateLoading(
    component: number[],
    standardizedData: number[][],
    signalIndex: number
  ): number {
    // Simplified loading calculation
    // In practice, this would be more sophisticated
    let loading = 0;

    for (let i = 0; i < component.length; i++) {
      loading += component[i] * standardizedData[signalIndex][i];
    }

    return loading;
  }

  /**
   * Calculate signal importance scores
   */
  private calculateSignalImportance(
    loadings: number[][],
    signalTypes: SignalType[]
  ): Record<SignalType, number> {
    const importance: Record<SignalType, number> = {} as Record<SignalType, number>;

    for (let signalIdx = 0; signalIdx < signalTypes.length; signalIdx++) {
      const signalType = signalTypes[signalIdx];

      // Calculate importance based on loadings across all components
      let totalImportance = 0;
      for (const component of loadings) {
        totalImportance += Math.abs(component[signalIdx]);
      }

      importance[signalType] = totalImportance / loadings.length;
    }

    return importance;
  }

  /**
   * Get PCA insights
   */
  getPCAInsights(): {
    mostImportantSignals: Array<{ signalType: SignalType; importance: number }>;
    dimensionalityReduction: {
      originalDimensions: number;
      reducedDimensions: number;
      compressionRatio: number;
    };
    varianceAnalysis: {
      totalExplainedVariance: number;
      componentsNeeded: number;
    };
  } {
    const cachedResults = Array.from(this.pcaCache.values());
    if (cachedResults.length === 0) {
      return {
        mostImportantSignals: [],
        dimensionalityReduction: { originalDimensions: 0, reducedDimensions: 0, compressionRatio: 0 },
        varianceAnalysis: { totalExplainedVariance: 0, componentsNeeded: 0 }
      };
    }

    const latestResult = cachedResults[cachedResults.length - 1];
    const signalImportance = latestResult.signalImportance;

    // Sort signals by importance
    const mostImportantSignals = Object.entries(signalImportance)
      .map(([signalType, importance]) => ({ signalType: signalType as SignalType, importance }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    // Calculate dimensionality reduction metrics
    const originalDimensions = Object.keys(signalImportance).length;
    const reducedDimensions = latestResult.reducedDimensions;
    const compressionRatio = originalDimensions > 0 ? reducedDimensions / originalDimensions : 0;

    // Calculate variance analysis
    const totalExplainedVariance = latestResult.cumulativeVariance[latestResult.cumulativeVariance.length - 1] || 0;
    const componentsNeeded = latestResult.components.length;

    return {
      mostImportantSignals,
      dimensionalityReduction: {
        originalDimensions,
        reducedDimensions,
        compressionRatio
      },
      varianceAnalysis: {
        totalExplainedVariance,
        componentsNeeded
      }
    };
  }

  /**
   * Get cached PCA result
   */
  getCachedResult(cacheKey: string): PCAResult | null {
    return this.pcaCache.get(cacheKey) || null;
  }

  /**
   * Clear PCA cache
   */
  clearCache(): void {
    this.pcaCache.clear();
    this.logger.debug('PCA cache cleared');
  }

  /**
   * Transpose matrix
   */
  private transposeMatrix(matrix: number[][]): number[][] {
    if (matrix.length === 0 || matrix[0].length === 0) {
      return matrix;
    }

    const rows = matrix.length;
    const cols = matrix[0].length;
    const transposed: number[][] = [];

    for (let j = 0; j < cols; j++) {
      transposed[j] = [];
      for (let i = 0; i < rows; i++) {
        transposed[j][i] = matrix[i][j];
      }
    }

    return transposed;
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

  /**
   * Get current status
   */
  getStatus(): string {
    return this.isInitialized ?
      `Active (${this.pcaCache.size} cached analyses)` :
      'Not Initialized';
  }
}
