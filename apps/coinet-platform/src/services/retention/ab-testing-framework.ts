/**
 * 🧪 COINET A/B TESTING FRAMEWORK
 * 
 * Systematic experimentation for retention optimization
 * 
 * 8 Pre-defined A/B Tests:
 * 1. Trigger Timing Optimization
 * 2. Watchlist Size Constraint
 * 3. Notification Copy Style
 * 4. Reward Frequency (Hunt)
 * 5. Investment Prompt Timing
 * 6. Self Reward Framing
 * 7. Regime Shift Explainer Length
 * 8. Watchlist Default View
 * 
 * Statistical rigor:
 * - Minimum sample sizes
 * - Statistical significance testing
 * - Confidence intervals
 * - Segment-aware analysis
 * 
 * @module retention/ab-testing-framework
 * @version 1.0.0
 */

import { logger } from '../../utils/logger';
import {
  ABTestType,
  ABTestConfig,
  ABTestVariant,
  ABTestResult,
  LifecycleSegment,
} from './types';
import { createHash } from 'crypto';
import { prismaRetention as prismaAB } from './prisma-retention';

// =============================================================================
// PRE-DEFINED TEST CONFIGURATIONS
// =============================================================================

const PREDEFINED_TESTS: Record<ABTestType, Omit<ABTestConfig, 'id' | 'status' | 'startedAt' | 'endedAt'>> = {
  trigger_timing: {
    name: 'Trigger Timing Optimization',
    type: 'trigger_timing',
    hypothesis: 'Morning digest delivered 30min before user\'s historical first session time outperforms fixed 8am delivery',
    variants: [
      { id: 'A', description: 'Fixed 8am local time', config: { timing: 'fixed', time: '08:00' } },
      { id: 'B', description: 'Learned optimal time (30min before median first session)', config: { timing: 'learned', offset: -30 } },
    ],
    trafficSplit: { A: 0.5, B: 0.5 },
    targetSegments: ['habit_forming', 'power_user'],
    minSampleSize: 1000,
    primaryMetric: 'digest_open_rate',
    secondaryMetrics: ['session_conversion', 'time_to_action'],
    expectedRisk: 'Low - learned timing may occasionally miss window, fallback to fixed if insufficient data',
  },
  
  watchlist_size: {
    name: 'Watchlist Size Constraint',
    type: 'watchlist_size',
    hypothesis: 'Limiting watchlist to 10 coins (vs unlimited) increases per-coin engagement',
    variants: [
      { id: 'A', description: 'No limit', config: { maxSize: null } },
      { id: 'B', description: '10-coin max with archive option', config: { maxSize: 10, archiveEnabled: true } },
    ],
    trafficSplit: { A: 0.5, B: 0.5 },
    targetSegments: ['early', 'habit_forming', 'power_user'],
    minSampleSize: 500,
    primaryMetric: 'avg_daily_watchlist_checks_per_coin',
    secondaryMetrics: ['watchlist_size', 'coin_drill_down_rate'],
    expectedRisk: 'Medium - limit may frustrate power users; archive feature mitigates; monitor unsubscribes',
  },
  
  notification_copy: {
    name: 'Notification Copy Style',
    type: 'notification_copy',
    hypothesis: 'Data-first notifications outperform question-style notifications',
    variants: [
      { id: 'A', description: 'Data-first (neutral)', config: { style: 'data_first', example: 'BTC +6%, now $92K' } },
      { id: 'B', description: 'Question-style (engaging)', config: { style: 'question', example: 'Should you buy this dip?' } },
    ],
    trafficSplit: { A: 0.5, B: 0.5 },
    targetSegments: ['early', 'habit_forming'],
    minSampleSize: 2000,
    primaryMetric: 'notification_ctr',
    secondaryMetrics: ['session_conversion', 'unsubscribe_rate'],
    expectedRisk: 'Low-Medium - question style may violate guardrails; strict copy review required',
  },
  
  reward_frequency: {
    name: 'Reward Frequency (Hunt)',
    type: 'reward_frequency',
    hypothesis: '1 Hunt reward per week (high-quality) retains better than 3/week',
    variants: [
      { id: 'A', description: '3 Hunt rewards/week', config: { maxPerWeek: 3, signalThreshold: 0.5 } },
      { id: 'B', description: '1 Hunt reward/week (highest signal only)', config: { maxPerWeek: 1, signalThreshold: 0.8 } },
    ],
    trafficSplit: { A: 0.5, B: 0.5 },
    targetSegments: ['habit_forming', 'power_user'],
    minSampleSize: 500,
    primaryMetric: 'hunt_reward_ctr',
    secondaryMetrics: ['perceived_value_survey', 'weekly_sessions'],
    expectedRisk: 'Low - both variants within reasonable range; B may reduce engagement but increase quality',
  },
  
  investment_prompt_timing: {
    name: 'Investment Prompt Timing',
    type: 'investment_prompt_timing',
    hypothesis: 'Immediate in-app prompt converts better than 24h delayed email',
    variants: [
      { id: 'A', description: 'Immediate in-app prompt', config: { timing: 'immediate', channel: 'in_app' } },
      { id: 'B', description: '24h follow-up email if coin not added', config: { timing: 'delayed_24h', channel: 'email' } },
    ],
    trafficSplit: { A: 0.5, B: 0.5 },
    targetSegments: ['new_user', 'early'],
    minSampleSize: 1000,
    primaryMetric: 'watchlist_add_conversion',
    secondaryMetrics: ['analysis_flow_interruption', 'next_session_return'],
    expectedRisk: 'Low - A may interrupt flow but respects anti-annoyance rules; B adds email overhead',
  },
  
  self_reward_framing: {
    name: 'Self Reward Framing',
    type: 'self_reward_framing',
    hypothesis: 'Humble framing ("Data was right") outperforms celebratory ("You nailed it!")',
    variants: [
      { id: 'A', description: 'Data-aligned framing', config: { style: 'humble', template: 'Your analysis aligned with OmniScore—{outcome}' } },
      { id: 'B', description: 'Celebratory framing', config: { style: 'celebratory', template: 'Nice call on {symbol}—{outcome}' } },
    ],
    trafficSplit: { A: 0.5, B: 0.5 },
    targetSegments: ['habit_forming', 'power_user'],
    minSampleSize: 500,
    primaryMetric: 'self_reward_engagement',
    secondaryMetrics: ['sentiment_survey', 'repeat_analysis_rate'],
    expectedRisk: 'Low - both framings are positive; B may feel gamified but tests user preference',
  },
  
  regime_explainer_length: {
    name: 'Regime Shift Explainer Length',
    type: 'regime_explainer_length',
    hypothesis: '1-sentence explainer + CTA outperforms 3-paragraph deep-dive',
    variants: [
      { id: 'A', description: 'Short: 1-sentence + CTA', config: { length: 'short', maxChars: 100 } },
      { id: 'B', description: 'Long: 3-paragraph with context', config: { length: 'long', maxChars: 500 } },
    ],
    trafficSplit: { A: 0.5, B: 0.5 },
    targetSegments: ['early', 'habit_forming', 'power_user'],
    minSampleSize: 1000,
    primaryMetric: 'session_duration_after_regime_notification',
    secondaryMetrics: ['regime_cta_clicks', 'educational_follow_up_queries'],
    expectedRisk: 'Low - both approaches valid; A may leave users wanting more, B may overwhelm',
  },
  
  watchlist_default_view: {
    name: 'Watchlist Default View',
    type: 'watchlist_default_view',
    hypothesis: 'Sorting by biggest movers increases engagement vs alphabetical',
    variants: [
      { id: 'A', description: 'Alphabetical by coin name', config: { sort: 'alphabetical', direction: 'asc' } },
      { id: 'B', description: 'Sorted by abs(% change 24h) descending', config: { sort: 'abs_change_24h', direction: 'desc' } },
    ],
    trafficSplit: { A: 0.5, B: 0.5 },
    targetSegments: ['early', 'habit_forming', 'power_user'],
    minSampleSize: 1000,
    primaryMetric: 'time_on_watchlist_tab',
    secondaryMetrics: ['drill_down_rate', 'watchlist_session_depth'],
    expectedRisk: 'Low - UI-only change; users may prefer familiarity (A) or action (B)',
  },
};

// =============================================================================
// VARIANT ASSIGNMENT
// =============================================================================

/**
 * Get or assign variant for a user in a test
 * Uses deterministic hashing for consistent assignment
 */
export async function getVariantForUser(userId: string, testId: string): Promise<string | null> {
  try {
    // Check for existing assignment
    const existing = await prismaAB.userABTestAssignment?.findUnique({
      where: { userId_testId: { userId, testId } },
    });
    
    if (existing) {
      return existing.variant;
    }
    
    // Get test config
    const test = await prismaAB.retentionABTest?.findUnique({
      where: { id: testId },
    });
    
    if (!test || test.status !== 'running') {
      return null;
    }
    
    // Check if user is in target segment
    const lifecycle = await prismaAB.userLifecycleState?.findUnique({
      where: { userId },
    });
    
    if (lifecycle && test.targetSegments.length > 0) {
      if (!test.targetSegments.includes(lifecycle.segment)) {
        return null;
      }
    }
    
    // Deterministic assignment using hash
    const variant = assignVariantDeterministic(userId, testId, test.trafficSplit as Record<string, number>);
    
    // Store assignment
    await prismaAB.userABTestAssignment?.create({
      data: {
        userId,
        testId,
        variant,
        assignedAt: new Date(),
      },
    });
    
    logger.debug('🧪 A/B test variant assigned', {
      userId,
      testId,
      variant,
    });
    
    return variant;
  } catch (error) {
    logger.warn('🧪 Variant assignment error', { userId, testId, error });
    return null;
  }
}

/**
 * Deterministic variant assignment using consistent hashing
 */
function assignVariantDeterministic(
  userId: string,
  testId: string,
  trafficSplit: Record<string, number>
): string {
  // Create deterministic hash
  const hash = createHash('sha256')
    .update(`${userId}:${testId}`)
    .digest('hex');
  
  // Convert first 8 chars to number between 0 and 1
  const hashNum = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  
  // Assign based on traffic split
  let cumulative = 0;
  for (const [variant, split] of Object.entries(trafficSplit)) {
    cumulative += split;
    if (hashNum < cumulative) {
      return variant;
    }
  }
  
  // Fallback to first variant
  return Object.keys(trafficSplit)[0];
}

// =============================================================================
// METRIC RECORDING
// =============================================================================

/**
 * Record a conversion or metric for a user in a test
 */
export async function recordMetric(
  userId: string,
  testId: string,
  metricName: string,
  value: number
): Promise<void> {
  try {
    const assignment = await prismaAB.userABTestAssignment.findUnique({
      where: { userId_testId: { userId, testId } },
    });
    
    if (!assignment) {
      return; // User not in test
    }
    
    const test = await prismaAB.retentionABTest.findUnique({
      where: { id: testId },
    });
    
    if (!test) return;
    
    // Update assignment with metric
    const updates: Record<string, unknown> = {
      measuredAt: new Date(),
    };
    
    if (metricName === test.primaryMetric) {
      updates.primaryMetricValue = value;
    } else {
      // Store in secondary metrics JSON
      const secondaryMetrics = (assignment.secondaryMetrics as Record<string, number>) ?? {};
      secondaryMetrics[metricName] = value;
      updates.secondaryMetrics = secondaryMetrics;
    }
    
    // Check for conversion
    if (metricName === test.primaryMetric && value > 0) {
      updates.converted = true;
      updates.conversionType = metricName;
      updates.convertedAt = new Date();
    }
    
    await prismaAB.userABTestAssignment.update({
      where: { userId_testId: { userId, testId } },
      data: updates,
    });
    
    logger.debug('🧪 A/B test metric recorded', {
      userId,
      testId,
      metricName,
      value,
    });
  } catch (error) {
    logger.warn('🧪 Metric recording error', { userId, testId, metricName, error });
  }
}

// =============================================================================
// TEST MANAGEMENT
// =============================================================================

/**
 * Create a new A/B test from predefined config
 */
export async function createTest(type: ABTestType): Promise<string> {
  const config = PREDEFINED_TESTS[type];
  
  const test = await prismaAB.retentionABTest.create({
    data: {
      testName: config.name,
      hypothesis: config.hypothesis,
      testType: config.type,
      variants: config.variants,
      trafficSplit: config.trafficSplit,
      targetSegments: config.targetSegments,
      minSampleSize: config.minSampleSize,
      primaryMetric: config.primaryMetric,
      secondaryMetrics: config.secondaryMetrics,
      status: 'draft',
    },
  });
  
  logger.info('🧪 A/B test created', {
    testId: test.id,
    type,
    name: config.name,
  });
  
  return test.id;
}

/**
 * Start a test
 */
export async function startTest(testId: string): Promise<void> {
  await prismaAB.retentionABTest.update({
    where: { id: testId },
    data: {
      status: 'running',
      startedAt: new Date(),
    },
  });
  
  logger.info('🧪 A/B test started', { testId });
}

/**
 * End a test and analyze results
 */
export async function endTest(testId: string): Promise<ABTestResult> {
  // Update status
  await prismaAB.retentionABTest.update({
    where: { id: testId },
    data: {
      status: 'completed',
      endedAt: new Date(),
    },
  });
  
  // Analyze results
  return analyzeTest(testId);
}

// =============================================================================
// STATISTICAL ANALYSIS
// =============================================================================

/**
 * Analyze test results with statistical significance
 */
export async function analyzeTest(testId: string): Promise<ABTestResult> {
  const test = await prismaAB.retentionABTest.findUnique({
    where: { id: testId },
  });
  
  if (!test) {
    throw new Error('Test not found');
  }
  
  // Get all assignments
  const assignments = await prismaAB.userABTestAssignment.findMany({
    where: { testId },
  });
  
  // Group by variant
  const variantData: Record<string, {
    samples: number;
    primaryMetricSum: number;
    conversions: number;
    secondaryMetrics: Record<string, number[]>;
  }> = {};
  
  const variants = (test.variants as ABTestVariant[]).map(v => v.id);
  
  for (const variant of variants) {
    variantData[variant] = {
      samples: 0,
      primaryMetricSum: 0,
      conversions: 0,
      secondaryMetrics: {},
    };
    
    for (const metric of test.secondaryMetrics) {
      variantData[variant].secondaryMetrics[metric] = [];
    }
  }
  
  // Aggregate data
  for (const assignment of assignments) {
    const data = variantData[assignment.variant];
    if (!data) continue;
    
    data.samples++;
    
    if (assignment.primaryMetricValue !== null) {
      data.primaryMetricSum += assignment.primaryMetricValue;
    }
    
    if (assignment.converted) {
      data.conversions++;
    }
    
    if (assignment.secondaryMetrics) {
      const secondary = assignment.secondaryMetrics as Record<string, number>;
      for (const [metric, value] of Object.entries(secondary)) {
        if (data.secondaryMetrics[metric]) {
          data.secondaryMetrics[metric].push(value);
        }
      }
    }
  }
  
  // Calculate statistics
  const primaryMetricResults: Record<string, number> = {};
  const variantSamples: Record<string, number> = {};
  
  for (const variant of variants) {
    const data = variantData[variant];
    variantSamples[variant] = data.samples;
    
    // For rate metrics, use conversion rate; otherwise use average
    if (test.primaryMetric.includes('rate') || test.primaryMetric.includes('ctr')) {
      primaryMetricResults[variant] = data.samples > 0 ? data.conversions / data.samples : 0;
    } else {
      primaryMetricResults[variant] = data.samples > 0 ? data.primaryMetricSum / data.samples : 0;
    }
  }
  
  // Determine winner
  let winningVariant: string | undefined;
  let maxValue = -Infinity;
  
  for (const [variant, value] of Object.entries(primaryMetricResults)) {
    if (value > maxValue) {
      maxValue = value;
      winningVariant = variant;
    }
  }
  
  // Calculate statistical significance (simplified two-proportion z-test)
  const significance = calculateSignificance(variantData, test.primaryMetric);
  
  // Calculate confidence interval
  const confidenceInterval = calculateConfidenceInterval(variantData, winningVariant);
  
  // Build secondary metric results
  const secondaryMetricResults: Record<string, Record<string, number>> = {};
  for (const metric of test.secondaryMetrics) {
    secondaryMetricResults[metric] = {};
    for (const variant of variants) {
      const values = variantData[variant].secondaryMetrics[metric];
      secondaryMetricResults[metric][variant] = values.length > 0 ?
        values.reduce((a, b) => a + b, 0) / values.length : 0;
    }
  }
  
  // Generate recommendation
  const recommendedAction = generateRecommendation(
    winningVariant,
    significance,
    variantSamples,
    test.minSampleSize
  );
  
  const result: ABTestResult = {
    testId,
    totalSamples: assignments.length,
    variantSamples,
    primaryMetricResults,
    winningVariant: significance >= 0.95 ? winningVariant : undefined,
    statisticalSignificance: significance,
    confidenceInterval,
    secondaryMetricResults,
    recommendedAction,
    analysisNotes: generateAnalysisNotes(
      test,
      variantData,
      significance,
      assignments.length
    ),
    analyzedAt: new Date(),
  };
  
  // Store results
  await prismaAB.retentionABTest.update({
    where: { id: testId },
    data: {
      results: result,
      winningVariant: result.winningVariant,
      statisticalSignificance: result.statisticalSignificance,
    },
  });
  
  logger.info('🧪 A/B test analyzed', {
    testId,
    winningVariant: result.winningVariant,
    significance: result.statisticalSignificance,
    samples: result.totalSamples,
  });
  
  return result;
}

/**
 * Calculate statistical significance using z-test
 */
function calculateSignificance(
  variantData: Record<string, { samples: number; conversions: number }>,
  metric: string
): number {
  const variants = Object.keys(variantData);
  if (variants.length !== 2) return 0;
  
  const [a, b] = variants;
  const dataA = variantData[a];
  const dataB = variantData[b];
  
  if (dataA.samples < 30 || dataB.samples < 30) return 0;
  
  // For rate metrics, use two-proportion z-test
  const p1 = dataA.conversions / dataA.samples;
  const p2 = dataB.conversions / dataB.samples;
  const n1 = dataA.samples;
  const n2 = dataB.samples;
  
  // Pooled proportion
  const p = (dataA.conversions + dataB.conversions) / (n1 + n2);
  
  // Standard error
  const se = Math.sqrt(p * (1 - p) * (1/n1 + 1/n2));
  
  if (se === 0) return 0;
  
  // Z-score
  const z = Math.abs(p1 - p2) / se;
  
  // Convert to p-value (two-tailed)
  // Using approximation for standard normal CDF
  const pValue = 2 * (1 - normalCDF(z));
  
  // Return significance level (1 - p-value)
  return 1 - pValue;
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(z: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate 95% confidence interval for the winning variant
 */
function calculateConfidenceInterval(
  variantData: Record<string, { samples: number; conversions: number }>,
  winningVariant?: string
): [number, number] {
  if (!winningVariant) return [0, 0];
  
  const data = variantData[winningVariant];
  if (!data || data.samples === 0) return [0, 0];
  
  const p = data.conversions / data.samples;
  const n = data.samples;
  
  // Wilson score interval (more accurate for proportions)
  const z = 1.96; // 95% confidence
  const denominator = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / denominator;
  
  return [
    Math.max(0, center - margin),
    Math.min(1, center + margin),
  ];
}

/**
 * Generate recommendation based on results
 */
function generateRecommendation(
  winningVariant: string | undefined,
  significance: number,
  variantSamples: Record<string, number>,
  minSampleSize: number
): string {
  const totalSamples = Object.values(variantSamples).reduce((a, b) => a + b, 0);
  
  if (totalSamples < minSampleSize) {
    return `Continue test. Need ${minSampleSize - totalSamples} more samples for minimum confidence.`;
  }
  
  if (significance < 0.95) {
    return `No clear winner yet (${(significance * 100).toFixed(1)}% confidence). Consider extending test or accepting null hypothesis.`;
  }
  
  if (winningVariant) {
    return `Implement Variant ${winningVariant} with ${(significance * 100).toFixed(1)}% confidence.`;
  }
  
  return 'Results inconclusive. Review secondary metrics or consider new hypothesis.';
}

/**
 * Generate analysis notes
 */
function generateAnalysisNotes(
  test: { testName: string; hypothesis: string; minSampleSize: number },
  variantData: Record<string, { samples: number; conversions: number }>,
  significance: number,
  totalSamples: number
): string {
  const notes: string[] = [];
  
  notes.push(`Test: ${test.testName}`);
  notes.push(`Hypothesis: ${test.hypothesis}`);
  notes.push(`Total samples: ${totalSamples} / ${test.minSampleSize} required`);
  notes.push(`Statistical significance: ${(significance * 100).toFixed(1)}%`);
  
  // Variant breakdown
  for (const [variant, data] of Object.entries(variantData)) {
    const rate = data.samples > 0 ? ((data.conversions / data.samples) * 100).toFixed(2) : '0';
    notes.push(`Variant ${variant}: ${data.samples} samples, ${rate}% conversion`);
  }
  
  // Sample size warning
  if (totalSamples < test.minSampleSize) {
    notes.push(`⚠️ Below minimum sample size. Results may not be reliable.`);
  }
  
  return notes.join('\n');
}

// =============================================================================
// HELPER: GET TEST CONFIG FOR VARIANT
// =============================================================================

/**
 * Get the configuration for a user's assigned variant
 */
export async function getVariantConfig(
  userId: string,
  testType: ABTestType
): Promise<Record<string, unknown> | null> {
  try {
    // Find running test of this type
    const test = await prismaAB.retentionABTest.findFirst({
      where: {
        testType,
        status: 'running',
      },
    });
    
    if (!test) return null;
    
    const variant = await getVariantForUser(userId, test.id);
    if (!variant) return null;
    
    const variants = test.variants as ABTestVariant[];
    const variantConfig = variants.find(v => v.id === variant);
    
    return variantConfig?.config ?? null;
  } catch {
    return null;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const abTestingFramework = {
  getVariant: getVariantForUser,
  getVariantConfig,
  recordMetric,
  createTest,
  startTest,
  endTest,
  analyze: analyzeTest,
  predefinedTests: PREDEFINED_TESTS,
};

export default abTestingFramework;
