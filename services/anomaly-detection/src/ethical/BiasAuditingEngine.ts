/**
 * Bias Auditing Engine
 * REVOLUTIONARY: Comprehensive dataset bias detection and mitigation
 * Uses statistical parity, distribution analysis, and fairness metrics
 */

import { DataPoint, DataSource } from '../core/types';
import { EventEmitter } from 'events';

export interface BiasMetrics {
  statisticalParity: number; // 0-1, 1 = perfect parity
  disparateImpact: number; // 0-1, >0.8 generally acceptable
  equalOpportunity: number; // 0-1
  demographicParity: number; // 0-1
  calibration: number; // 0-1
}

export interface DatasetBiasReport {
  id: string;
  timestamp: Date;
  dataSource: DataSource;
  sampleSize: number;
  metrics: BiasMetrics;
  distributions: {
    overall: DistributionAnalysis;
    byGroup: Map<string, DistributionAnalysis>;
  };
  biasDetected: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  visualizationData: VisualizationData;
}

export interface DistributionAnalysis {
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  outliers: number;
  normalityTest: {
    isNormal: boolean;
    pValue: number;
  };
}

export interface VisualizationData {
  histogram: { bin: number; count: number }[];
  boxplot: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: number[];
  };
  densityPlot: { x: number; y: number }[];
  comparisonCharts: Map<string, unknown>;
}

export interface FairnessConstraints {
  minStatisticalParity: number; // Minimum acceptable parity
  maxDisparateImpact: number; // Maximum acceptable impact ratio
  sensitiveAttributes: string[]; // Attributes to protect (e.g., 'region', 'user_type')
  protectedGroups: string[];
  requireDemographicParity: boolean;
}

export class BiasAuditingEngine extends EventEmitter {
  private auditHistory: DatasetBiasReport[] = [];
  private constraints: FairnessConstraints;
  private readonly alphaLevel = 0.05; // Significance level for tests

  constructor(constraints: FairnessConstraints) {
    super();
    this.constraints = constraints;
  }

  /**
   * Audit dataset for bias
   */
  async auditDataset(
    data: DataPoint[],
    source: DataSource,
    sensitiveAttribute?: string
  ): Promise<DatasetBiasReport> {
    // console.log(`🔍 Auditing ${source} dataset for bias (n=${data.length})...`);

    // Analyze overall distribution
    const overallDistribution = this.analyzeDistribution(data.map(d => d.value));

    // Analyze by groups if sensitive attribute provided
    const byGroup = new Map<string, DistributionAnalysis>();
    
    if (sensitiveAttribute) {
      const groups = this.groupByAttribute(data, sensitiveAttribute);
      for (const [group, points] of groups) {
        byGroup.set(group, this.analyzeDistribution(points.map(d => d.value)));
      }
    }

    // Calculate bias metrics
    const metrics = await this.calculateBiasMetrics(overallDistribution, byGroup);

    // Detect bias
    const biasDetected = this.detectBias(metrics);
    const severity = this.categorizeSeverity(metrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, severity);

    // Create visualization data
    const visualizationData = this.createVisualizationData(
      data.map(d => d.value),
      byGroup
    );

    const report: DatasetBiasReport = {
      id: `audit_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      dataSource: source,
      sampleSize: data.length,
      metrics,
      distributions: {
        overall: overallDistribution,
        byGroup
      },
      biasDetected,
      severity,
      recommendations,
      visualizationData
    };

    this.auditHistory.push(report);
    this.emit('bias_audit_complete', report);

    // if (biasDetected) {
    //   this.emit('bias_detected', report);
    //   console.log(`⚠️  Bias detected: ${severity} severity`);
    // } else {
    //   console.log(`✅ No significant bias detected`);
    // }

    return report;
  }

  /**
   * Analyze distribution of values
   */
  private analyzeDistribution(values: number[]): DistributionAnalysis {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;

    // Basic statistics
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const median = sorted[Math.floor(n / 2)];
    
    // Standard deviation
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Skewness (measure of asymmetry)
    const skewness = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / n;

    // Kurtosis (measure of tail heaviness)
    const kurtosis = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / n - 3;

    // Percentiles
    const percentiles = {
      p10: sorted[Math.floor(n * 0.1)],
      p25: sorted[Math.floor(n * 0.25)],
      p50: median,
      p75: sorted[Math.floor(n * 0.75)],
      p90: sorted[Math.floor(n * 0.9)]
    };

    // Detect outliers using IQR method
    const iqr = percentiles.p75 - percentiles.p25;
    const lowerBound = percentiles.p25 - 1.5 * iqr;
    const upperBound = percentiles.p75 + 1.5 * iqr;
    const outliers = values.filter(v => v < lowerBound || v > upperBound).length;

    // Normality test (Shapiro-Wilk approximation)
    const normalityTest = this.testNormality(values);

    return {
      mean,
      median,
      stdDev,
      skewness,
      kurtosis,
      percentiles,
      outliers,
      normalityTest
    };
  }

  /**
   * Calculate bias metrics
   */
  private async calculateBiasMetrics(
    overall: DistributionAnalysis,
    byGroup: Map<string, DistributionAnalysis>
  ): Promise<BiasMetrics> {
    if (byGroup.size === 0) {
      // No groups to compare, assume perfect parity
      return {
        statisticalParity: 1.0,
        disparateImpact: 1.0,
        equalOpportunity: 1.0,
        demographicParity: 1.0,
        calibration: 1.0
      };
    }

    // Statistical Parity: P(decision=1 | group=A) ≈ P(decision=1 | group=B)
    const statisticalParity = this.calculateStatisticalParity(byGroup);

    // Disparate Impact: ratio of positive outcomes between groups
    const disparateImpact = this.calculateDisparateImpact(byGroup);

    // Equal Opportunity: equal true positive rates
    const equalOpportunity = this.calculateEqualOpportunity(byGroup);

    // Demographic Parity: proportional representation
    const demographicParity = this.calculateDemographicParity(byGroup);

    // Calibration: prediction accuracy across groups
    const calibration = this.calculateCalibration(byGroup);

    return {
      statisticalParity,
      disparateImpact,
      equalOpportunity,
      demographicParity,
      calibration
    };
  }

  /**
   * Calculate statistical parity
   */
  private calculateStatisticalParity(
    byGroup: Map<string, DistributionAnalysis>
  ): number {
    if (byGroup.size < 2) return 1.0;

    const means = Array.from(byGroup.values()).map(d => d.mean);
    const overallMean = means.reduce((a, b) => a + b, 0) / means.length;
    
    // Calculate variance between group means
    const variance = means.reduce((sum, m) => sum + Math.pow(m - overallMean, 2), 0) / means.length;
    const coefficientOfVariation = Math.sqrt(variance) / overallMean;

    // Convert to 0-1 score (lower variance = higher parity)
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * Calculate disparate impact ratio
   */
  private calculateDisparateImpact(
    byGroup: Map<string, DistributionAnalysis>
  ): number {
    if (byGroup.size < 2) return 1.0;

    const groups = Array.from(byGroup.values());
    const maxMean = Math.max(...groups.map(g => g.mean));
    const minMean = Math.min(...groups.map(g => g.mean));

    // Disparate impact ratio
    return maxMean > 0 ? minMean / maxMean : 1.0;
  }

  /**
   * Calculate equal opportunity metric
   */
  private calculateEqualOpportunity(
    byGroup: Map<string, DistributionAnalysis>
  ): number {
    if (byGroup.size < 2) return 1.0;

    // Compare true positive rates (approximated by median/mean ratio)
    const ratios = Array.from(byGroup.values()).map(d => d.median / d.mean);
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const variance = ratios.reduce((sum, r) => sum + Math.pow(r - avgRatio, 2), 0) / ratios.length;

    return Math.max(0, 1 - Math.sqrt(variance));
  }

  /**
   * Calculate demographic parity
   */
  private calculateDemographicParity(
    byGroup: Map<string, DistributionAnalysis>
  ): number {
    if (byGroup.size < 2) return 1.0;

    // Groups should have similar size (for fair representation)
    // This is simplified - in production, compare to population distribution
    const sizes = Array.from(byGroup.values()).map(d => 
      d.percentiles.p50 // Use median as proxy for group size
    );
    
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const variance = sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length;
    const cv = Math.sqrt(variance) / avgSize;

    return Math.max(0, 1 - cv);
  }

  /**
   * Calculate calibration (prediction accuracy across groups)
   */
  private calculateCalibration(
    byGroup: Map<string, DistributionAnalysis>
  ): number {
    if (byGroup.size < 2) return 1.0;

    // Compare standard deviations (proxy for prediction consistency)
    const stdDevs = Array.from(byGroup.values()).map(d => d.stdDev);
    const avgStdDev = stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length;
    const variance = stdDevs.reduce((sum, s) => sum + Math.pow(s - avgStdDev, 2), 0) / stdDevs.length;

    const cv = avgStdDev > 0 ? Math.sqrt(variance) / avgStdDev : 0;
    return Math.max(0, 1 - cv);
  }

  /**
   * Test for normality (Shapiro-Wilk approximation)
   */
  private testNormality(values: number[]): { isNormal: boolean; pValue: number } {
    // Simplified normality test using skewness and kurtosis
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const skewness = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / n;
    const kurtosis = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / n - 3;

    // For normal distribution: skewness ≈ 0, kurtosis ≈ 0
    const skewTest = Math.abs(skewness) < 0.5;
    const kurtosisTest = Math.abs(kurtosis) < 1;
    const isNormal = skewTest && kurtosisTest;

    // Approximate p-value based on deviation from normality
    const deviation = Math.abs(skewness) + Math.abs(kurtosis);
    const pValue = Math.max(0, 1 - deviation / 2);

    return { isNormal, pValue };
  }

  /**
   * Group data by sensitive attribute
   */
  private groupByAttribute(
    data: DataPoint[],
    attribute: string
  ): Map<string, DataPoint[]> {
    const groups = new Map<string, DataPoint[]>();

    data.forEach(point => {
      const groupKey = point.metadata?.[attribute]?.toString() || 'unknown';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(point);
    });

    return groups;
  }

  /**
   * Detect if bias exists
   */
  private detectBias(metrics: BiasMetrics): boolean {
    return (
      metrics.statisticalParity < this.constraints.minStatisticalParity ||
      metrics.disparateImpact < 0.8 || // 80% rule (EEOC guideline)
      metrics.equalOpportunity < 0.8 ||
      metrics.demographicParity < 0.7 ||
      metrics.calibration < 0.75
    );
  }

  /**
   * Categorize bias severity
   */
  private categorizeSeverity(metrics: BiasMetrics): DatasetBiasReport['severity'] {
    const worstMetric = Math.min(
      metrics.statisticalParity,
      metrics.disparateImpact,
      metrics.equalOpportunity,
      metrics.demographicParity,
      metrics.calibration
    );

    if (worstMetric >= 0.9) return 'none';
    if (worstMetric >= 0.8) return 'low';
    if (worstMetric >= 0.6) return 'medium';
    if (worstMetric >= 0.4) return 'high';
    return 'critical';
  }

  /**
   * Generate bias mitigation recommendations
   */
  private generateRecommendations(
    metrics: BiasMetrics,
    severity: DatasetBiasReport['severity']
  ): string[] {
    const recommendations: string[] = [];

    if (severity === 'none') {
      recommendations.push('✅ Dataset shows minimal bias. Continue monitoring.');
      return recommendations;
    }

    if (metrics.statisticalParity < 0.8) {
      recommendations.push(
        '📊 Statistical Parity Issue: Apply re-weighting to balance group outcomes'
      );
      recommendations.push(
        '🔄 Consider oversampling underrepresented groups'
      );
    }

    if (metrics.disparateImpact < 0.8) {
      recommendations.push(
        '⚠️  Disparate Impact Detected: Use adversarial debiasing during training'
      );
      recommendations.push(
        '🎯 Apply fairness constraints to model optimization'
      );
    }

    if (metrics.equalOpportunity < 0.8) {
      recommendations.push(
        '⚖️  Equal Opportunity Gap: Calibrate predictions post-processing'
      );
      recommendations.push(
        '🔧 Apply equalized odds post-processing'
      );
    }

    if (metrics.demographicParity < 0.7) {
      recommendations.push(
        '👥 Demographic Imbalance: Collect more diverse data'
      );
      recommendations.push(
        '📈 Use synthetic data generation for underrepresented groups'
      );
    }

    if (metrics.calibration < 0.75) {
      recommendations.push(
        '🎯 Calibration Issue: Apply isotonic regression for probability calibration'
      );
      recommendations.push(
        '📊 Recalibrate model outputs per group'
      );
    }

    // Severity-based recommendations
    if (severity === 'critical' || severity === 'high') {
      recommendations.push(
        '🚨 CRITICAL: Pause model deployment until bias is mitigated'
      );
      recommendations.push(
        '🔬 Conduct comprehensive fairness audit before production use'
      );
      recommendations.push(
        '👥 Engage diverse stakeholders in bias review'
      );
    }

    return recommendations;
  }

  /**
   * Create visualization data for bias analysis
   */
  private createVisualizationData(
    values: number[],
    byGroup: Map<string, DistributionAnalysis>
  ): VisualizationData {
    // Histogram
    const histogram = this.createHistogram(values, 20);

    // Box plot data
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const median = sorted[Math.floor(n * 0.5)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = values.filter(v => v < lowerBound || v > upperBound);

    const boxplot = {
      min: sorted[0],
      q1,
      median,
      q3,
      max: sorted[n - 1],
      outliers
    };

    // Density plot (kernel density estimation)
    const densityPlot = this.estimateDensity(values);

    // Comparison charts by group
    const comparisonCharts = new Map<string, unknown>();
    for (const [group, dist] of byGroup) {
      comparisonCharts.set(group, {
        mean: dist.mean,
        median: dist.median,
        stdDev: dist.stdDev,
        percentiles: dist.percentiles
      });
    }

    return {
      histogram,
      boxplot,
      densityPlot,
      comparisonCharts
    };
  }

  /**
   * Create histogram
   */
  private createHistogram(
    values: number[],
    bins: number
  ): { bin: number; count: number }[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;

    const histogram: { bin: number; count: number }[] = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = values.filter(v => v >= binStart && v < binEnd).length;
      
      histogram.push({
        bin: binStart + binWidth / 2,
        count
      });
    }

    return histogram;
  }

  /**
   * Estimate probability density (Gaussian kernel)
   */
  private estimateDensity(values: number[]): { x: number; y: number }[] {
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const n = values.length;
    
    // Bandwidth using Silverman's rule of thumb
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => {
        const mean = values.reduce((a, b) => a + b, 0) / n;
        return sum + Math.pow(v - mean, 2);
      }, 0) / n
    );
    const bandwidth = 1.06 * stdDev * Math.pow(n, -0.2);

    const density: { x: number; y: number }[] = [];
    const points = 100;
    
    for (let i = 0; i <= points; i++) {
      const x = min + (max - min) * i / points;
      let y = 0;
      
      // Gaussian kernel density estimation
      for (const value of values) {
        const u = (x - value) / bandwidth;
        y += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
      }
      
      y = y / (n * bandwidth);
      density.push({ x, y });
    }

    return density;
  }

  /**
   * Perform chi-square test for independence
   */
  chiSquareTest(
    observed: number[][],
    expected: number[][]
  ): { statistic: number; pValue: number; independent: boolean } {
    let chiSquare = 0;
    
    for (let i = 0; i < observed.length; i++) {
      for (let j = 0; j < observed[i].length; j++) {
        const o = observed[i][j];
        const e = expected[i][j];
        
        if (e > 0) {
          chiSquare += Math.pow(o - e, 2) / e;
        }
      }
    }

    // Degrees of freedom
    const df = (observed.length - 1) * (observed[0].length - 1);
    
    // Approximate p-value using chi-square distribution
    const pValue = this.chiSquarePValue(chiSquare, df);
    const independent = pValue > this.alphaLevel;

    return { statistic: chiSquare, pValue, independent };
  }

  /**
   * Approximate chi-square p-value
   */
  private chiSquarePValue(statistic: number, df: number): number {
    // Wilson-Hilferty approximation
    const z = Math.pow(statistic / df, 1/3) - (1 - 2/(9*df));
    const normalizedZ = z / Math.sqrt(2/(9*df));
    
    // Approximate standard normal CDF
    return 1 - this.standardNormalCDF(normalizedZ);
  }

  /**
   * Standard normal cumulative distribution function
   */
  private standardNormalCDF(z: number): number {
    // Approximation using error function
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    
    return z > 0 ? 1 - probability : probability;
  }

  /**
   * Generate bias report visualization
   */
  generateVisualizationHTML(report: DatasetBiasReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Bias Audit Report - ${report.dataSource}</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .metric { display: inline-block; margin: 10px; padding: 15px; border-radius: 8px; }
    .good { background-color: #d4edda; }
    .warning { background-color: #fff3cd; }
    .danger { background-color: #f8d7da; }
    h1 { color: #333; }
    .chart { margin: 20px 0; }
  </style>
</head>
<body>
  <h1>📊 Bias Audit Report: ${report.dataSource}</h1>
  <p><strong>Sample Size:</strong> ${report.sampleSize}</p>
  <p><strong>Timestamp:</strong> ${report.timestamp.toISOString()}</p>
  <p><strong>Severity:</strong> ${report.severity.toUpperCase()}</p>
  
  <h2>Fairness Metrics</h2>
  <div class="metric ${this.getMetricClass(report.metrics.statisticalParity)}">
    <strong>Statistical Parity:</strong> ${(report.metrics.statisticalParity * 100).toFixed(1)}%
  </div>
  <div class="metric ${this.getMetricClass(report.metrics.disparateImpact)}">
    <strong>Disparate Impact:</strong> ${(report.metrics.disparateImpact * 100).toFixed(1)}%
  </div>
  <div class="metric ${this.getMetricClass(report.metrics.equalOpportunity)}">
    <strong>Equal Opportunity:</strong> ${(report.metrics.equalOpportunity * 100).toFixed(1)}%
  </div>
  
  <h2>Recommendations</h2>
  <ul>
    ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
  </ul>
  
  <div id="histogram" class="chart"></div>
  <div id="boxplot" class="chart"></div>
  
  <script>
    // Histogram
    Plotly.newPlot('histogram', [{
      x: ${JSON.stringify(report.visualizationData.histogram.map(h => h.bin))},
      y: ${JSON.stringify(report.visualizationData.histogram.map(h => h.count))},
      type: 'bar'
    }], {
      title: 'Distribution Histogram',
      xaxis: { title: 'Value' },
      yaxis: { title: 'Count' }
    });
    
    // Box plot
    Plotly.newPlot('boxplot', [{
      y: ${JSON.stringify([
        report.visualizationData.boxplot.min,
        report.visualizationData.boxplot.q1,
        report.visualizationData.boxplot.median,
        report.visualizationData.boxplot.q3,
        report.visualizationData.boxplot.max
      ])},
      type: 'box'
    }], {
      title: 'Box Plot'
    });
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Get CSS class for metric visualization
   */
  private getMetricClass(value: number): string {
    if (value >= 0.9) return 'good';
    if (value >= 0.7) return 'warning';
    return 'danger';
  }

  /**
   * Get audit history
   */
  getAuditHistory(): DatasetBiasReport[] {
    return [...this.auditHistory];
  }

  /**
   * Update fairness constraints
   */
  updateConstraints(constraints: Partial<FairnessConstraints>): void {
    this.constraints = { ...this.constraints, ...constraints };
    this.emit('constraints_updated', this.constraints);
  }
}

