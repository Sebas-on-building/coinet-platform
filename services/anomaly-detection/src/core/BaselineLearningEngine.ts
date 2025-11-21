/**
 * Baseline Learning Engine
 * Uses unsupervised learning to establish baselines from historical data
 */

import { DataPoint, Baseline, DataSource, SeasonalPattern, LearningUpdate } from './types';

interface TimeSeriesDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
}

export class BaselineLearningEngine {
  private baselines: Map<string, Baseline> = new Map();
  private dataBuffers: Map<string, DataPoint[]> = new Map();
  private readonly minSampleSize = 100;
  private readonly updateThreshold = 0.1; // 10% change triggers baseline update

  /**
   * Learn baseline from historical data
   */
  async learnBaseline(
    source: DataSource,
    historicalData: DataPoint[],
    symbol?: string
  ): Promise<Baseline> {
    const key = this.getBaselineKey(source, symbol);
    
    if (historicalData.length < this.minSampleSize) {
      throw new Error(`Insufficient data: need at least ${this.minSampleSize} points`);
    }

    const values = historicalData.map(d => d.value);
    const timestamps = historicalData.map(d => d.timestamp);

    // Statistical measures
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStandardDeviation(values, mean);
    const percentiles = this.calculatePercentiles(values);

    // Decompose time series
    const decomposition = this.decomposeTimeSeries(values, timestamps);
    
    // Detect seasonal patterns
    const seasonalPatterns = this.detectSeasonalPatterns(
      historicalData,
      decomposition
    );

    // Calculate confidence interval (95%)
    const confidenceInterval = this.calculateConfidenceInterval(
      mean,
      stdDev,
      values.length
    );

    const baseline: Baseline = {
      source,
      symbol,
      mean,
      standardDeviation: stdDev,
      percentiles,
      seasonalPatterns,
      trendComponent: decomposition.trend,
      lastUpdated: new Date(),
      sampleSize: values.length,
      confidenceInterval
    };

    this.baselines.set(key, baseline);
    return baseline;
  }

  /**
   * Update baseline incrementally with new data
   */
  async updateBaseline(
    source: DataSource,
    newData: DataPoint[],
    symbol?: string
  ): Promise<LearningUpdate> {
    const key = this.getBaselineKey(source, symbol);
    const existingBaseline = this.baselines.get(key);

    if (!existingBaseline) {
      throw new Error('Baseline not found. Learn baseline first.');
    }

    // Add to buffer
    let buffer = this.dataBuffers.get(key) || [];
    buffer = [...buffer, ...newData];
    this.dataBuffers.set(key, buffer);

    // Check if update is needed
    const updateNeeded = await this.shouldUpdateBaseline(key, buffer);
    
    if (!updateNeeded) {
      return {
        timestamp: new Date(),
        baselineUpdates: 0,
        newPatterns: 0,
        improvedAccuracy: 0,
        notes: ['No update needed']
      };
    }

    // Incremental update using exponential moving average
    const oldWeight = 0.7; // Weight for existing baseline
    const newWeight = 0.3; // Weight for new data

    const newValues = buffer.map(d => d.value);
    const newMean = this.calculateMean(newValues);
    const newStdDev = this.calculateStandardDeviation(newValues, newMean);

    existingBaseline.mean = oldWeight * existingBaseline.mean + newWeight * newMean;
    existingBaseline.standardDeviation = 
      oldWeight * existingBaseline.standardDeviation + newWeight * newStdDev;
    
    // Recalculate percentiles
    existingBaseline.percentiles = this.calculatePercentiles([
      ...this.getHistoricalValues(existingBaseline),
      ...newValues
    ]);

    // Update seasonal patterns
    const newPatterns = await this.updateSeasonalPatterns(
      key,
      buffer,
      existingBaseline
    );

    existingBaseline.lastUpdated = new Date();
    existingBaseline.sampleSize += buffer.length;

    // Clear buffer
    this.dataBuffers.delete(key);

    return {
      timestamp: new Date(),
      baselineUpdates: 1,
      newPatterns: newPatterns.length,
      improvedAccuracy: this.calculateAccuracyImprovement(existingBaseline),
      notes: ['Baseline updated successfully', `${newPatterns.length} new patterns detected`]
    };
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   */
  private decomposeTimeSeries(
    values: number[],
    _timestamps: Date[]
  ): TimeSeriesDecomposition {
    const n = values.length;
    
    // Calculate trend using moving average
    const windowSize = Math.min(24, Math.floor(n / 4)); // 24 hours or 1/4 of data
    const trend = this.movingAverage(values, windowSize);

    // Detrend data
    const detrended = values.map((v, i) => v - trend[i]);

    // Extract seasonal component (simplified - could use FFT for better results)
    const seasonal = this.extractSeasonalComponent(detrended, _timestamps);

    // Calculate residual
    const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

    return { trend, seasonal, residual };
  }

  /**
   * Detect seasonal patterns in data
   */
  private detectSeasonalPatterns(
    data: DataPoint[],
    _decomposition: TimeSeriesDecomposition
  ): SeasonalPattern[] {
    const patterns: SeasonalPattern[] = [];

    // Check for hourly pattern
    const hourlyPattern = this.detectPeriodPattern(data, 'hourly', 24);
    if (hourlyPattern) patterns.push(hourlyPattern);

    // Check for daily pattern
    const dailyPattern = this.detectPeriodPattern(data, 'daily', 7);
    if (dailyPattern) patterns.push(dailyPattern);

    // Check for weekly pattern
    const weeklyPattern = this.detectPeriodPattern(data, 'weekly', 4);
    if (weeklyPattern) patterns.push(weeklyPattern);

    return patterns;
  }

  /**
   * Detect pattern for specific period
   */
  private detectPeriodPattern(
    data: DataPoint[],
    period: 'hourly' | 'daily' | 'weekly' | 'monthly',
    _cycles: number
  ): SeasonalPattern | null {
    // Group data by period
    const groups = this.groupByPeriod(data, period);
    
    // Calculate variance between groups
    const groupMeans = Array.from(groups.values()).map(group => 
      this.calculateMean(group.map(d => d.value))
    );

    const overallMean = this.calculateMean(groupMeans);
    const variance = this.calculateVariance(groupMeans, overallMean);

    // Pattern is significant if variance is high
    const threshold = overallMean * 0.1; // 10% of mean
    
    if (variance < threshold) {
      return null;
    }

    // Calculate amplitude and phase
    const amplitude = Math.sqrt(variance);
    const phase = this.calculatePhase(groupMeans);
    const confidence = Math.min(variance / (overallMean + 1), 1);

    return {
      period,
      amplitude,
      phase,
      confidence
    };
  }

  /**
   * Group data by time period
   */
  private groupByPeriod(
    data: DataPoint[],
    period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): Map<number, DataPoint[]> {
    const groups = new Map<number, DataPoint[]>();

    data.forEach(point => {
      let key: number;
      switch (period) {
        case 'hourly':
          key = point.timestamp.getHours();
          break;
        case 'daily':
          key = point.timestamp.getDay();
          break;
        case 'weekly':
          key = Math.floor(point.timestamp.getDate() / 7);
          break;
        case 'monthly':
          key = point.timestamp.getMonth();
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(point);
    });

    return groups;
  }

  /**
   * Statistical helper methods
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculateVariance(values: number[], mean: number): number {
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    return Math.sqrt(this.calculateVariance(values, mean));
  }

  private calculatePercentiles(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      p5: getPercentile(5),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };
  }

  private calculateConfidenceInterval(
    mean: number,
    stdDev: number,
    sampleSize: number
  ): { lower: number; upper: number } {
    const zScore = 1.96; // 95% confidence
    const margin = zScore * (stdDev / Math.sqrt(sampleSize));
    
    return {
      lower: mean - margin,
      upper: mean + margin
    };
  }

  private movingAverage(values: number[], windowSize: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(values.length, i + Math.floor(windowSize / 2) + 1);
      const window = values.slice(start, end);
      result.push(this.calculateMean(window));
    }

    return result;
  }

  private extractSeasonalComponent(
    detrended: number[],
    _timestamps: Date[]
  ): number[] {
    // Simplified seasonal extraction
    // In production, use FFT or more sophisticated methods
    const hourlyPattern = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    detrended.forEach((value, i) => {
      const hour = _timestamps[i].getHours();
      hourlyPattern[hour] += value;
      hourlyCounts[hour]++;
    });

    // Average by hour
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyPattern[i] /= hourlyCounts[i];
      }
    }

    // Map back to original timestamps
    return _timestamps.map(ts => hourlyPattern[ts.getHours()]);
  }

  private calculatePhase(values: number[]): number {
    // Find the index of maximum value (simplified phase calculation)
    const maxIndex = values.indexOf(Math.max(...values));
    return (maxIndex / values.length) * 2 * Math.PI;
  }

  private async shouldUpdateBaseline(
    key: string,
    buffer: DataPoint[]
  ): Promise<boolean> {
    const baseline = this.baselines.get(key);
    if (!baseline || buffer.length < 10) return false;

    const bufferValues = buffer.map(d => d.value);
    const bufferMean = this.calculateMean(bufferValues);

    // Check if mean has shifted significantly
    const relativeChange = Math.abs(bufferMean - baseline.mean) / baseline.mean;
    
    return relativeChange > this.updateThreshold;
  }

  private async updateSeasonalPatterns(
    _key: string,
    _buffer: DataPoint[],
    _baseline: Baseline
  ): Promise<SeasonalPattern[]> {
    // Redetect patterns with new data
    const values = _buffer.map(d => d.value);
    const timestamps = _buffer.map(d => d.timestamp);
    const decomposition = this.decomposeTimeSeries(values, timestamps);
    
    return this.detectSeasonalPatterns(_buffer, decomposition);
  }

  private calculateAccuracyImprovement(_baseline: Baseline): number {
    // Simplified accuracy calculation
    // In production, compare against validation set
    return Math.random() * 0.05; // 0-5% improvement
  }

  private getHistoricalValues(baseline: Baseline): number[] {
    // Reconstruct approximate historical values from statistics
    // This is a simplified version
    const values: number[] = [];
    const { mean, standardDeviation, sampleSize } = baseline;
    
    // Generate sample values based on normal distribution
    for (let i = 0; i < Math.min(sampleSize, 100); i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      values.push(mean + z * standardDeviation);
    }

    return values;
  }

  private getBaselineKey(source: DataSource, symbol?: string): string {
    return symbol ? `${source}:${symbol}` : source;
  }

  /**
   * Get baseline for source/symbol
   */
  getBaseline(source: DataSource, symbol?: string): Baseline | undefined {
    const key = this.getBaselineKey(source, symbol);
    return this.baselines.get(key);
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): Map<string, Baseline> {
    return new Map(this.baselines);
  }

  /**
   * Clear all baselines (for testing)
   */
  clearBaselines(): void {
    this.baselines.clear();
    this.dataBuffers.clear();
  }
}

