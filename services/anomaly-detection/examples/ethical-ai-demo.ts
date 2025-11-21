/**
 * Ethical AI Framework Demonstration
 * Shows comprehensive bias auditing, fairness, explainability, and GDPR compliance
 */

import {
  EthicalAIFramework,
  BiasAuditingEngine,
  FairnessEngine,
  ExplainabilityEngine,
  GDPRComplianceEngine
} from '../src/ethical';

import { DataSource, DataPoint, Anomaly, AnomalySeverity, AnomalyType } from '../src/core/types';

async function demonstrateEthicalAI() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     🌟 ETHICAL AI FRAMEWORK DEMONSTRATION 🌟');
  console.log('     Built with Divine Perfection & Maximum Ethics');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Initialize Ethical AI Framework
  const ethicalFramework = new EthicalAIFramework({
    biasAuditing: {
      enabled: true,
      frequency: 'continuous',
      constraints: {
        minStatisticalParity: 0.8,
        maxDisparateImpact: 0.8,
        sensitiveAttributes: ['user_region', 'user_type', 'account_age'],
        protectedGroups: ['retail_investors', 'institutional', 'international'],
        requireDemographicParity: true
      },
      autoMitigate: true
    },
    fairness: {
      enabled: true,
      method: 'hybrid',
      sensitiveAttributes: ['user_region', 'user_type'],
      fairnessMetric: 'equalized_odds',
      threshold: 0.8,
      applyDuringTraining: true,
      applyPostProcessing: true
    },
    explainability: {
      enabled: true,
      defaultMethod: 'both', // LIME and SHAP
      generateForAll: true,
      storeExplanations: true
    },
    gdprCompliance: {
      enabled: true,
      dataRetentionDays: 90,
      requireConsent: true,
      enableRightToErasure: true,
      enableDataPortability: true,
      conductPIA: true
    },
    diversityAndInclusion: {
      trackDevelopmentTeam: true,
      requireDiverseReview: true,
      conductRegularAudits: true
    },
    transparency: {
      publicAuditReports: true,
      explainAllDecisions: true,
      provideAppealProcess: true
    }
  });

  // Start the framework
  await ethicalFramework.start();

  // Demonstrate each component
  await demo1_BiasAuditing(ethicalFramework);
  await demo2_FairnessEngine(ethicalFramework);
  await demo3_Explainability(ethicalFramework);
  await demo4_GDPRCompliance(ethicalFramework);
  await demo5_ComprehensiveReport(ethicalFramework);
  await demo6_DeploymentValidation(ethicalFramework);

  await ethicalFramework.stop();

  console.log('\n✅ Ethical AI Framework demonstration complete!');
  console.log('🌟 System ready for ethical, transparent, compliant operation\n');
}

/**
 * Demo 1: Bias Auditing
 */
async function demo1_BiasAuditing(framework: EthicalAIFramework) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  BIAS AUDITING - Dataset Fairness Analysis');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const engines = framework.getEngines();

  // Create sample dataset with potential bias
  const biasedDataset: DataPoint[] = [];
  
  // Group A: Higher values (privileged)
  for (let i = 0; i < 70; i++) {
    biasedDataset.push({
      timestamp: new Date(Date.now() - i * 60000),
      source: DataSource.TRADING_VOLUME,
      value: 120 + Math.random() * 30, // Higher values
      metadata: { user_region: 'north_america', user_type: 'institutional' },
      symbol: 'BTC'
    });
  }

  // Group B: Lower values (disadvantaged)
  for (let i = 0; i < 30; i++) {
    biasedDataset.push({
      timestamp: new Date(Date.now() - i * 60000),
      source: DataSource.TRADING_VOLUME,
      value: 80 + Math.random() * 20, // Lower values
      metadata: { user_region: 'asia', user_type: 'retail' },
      symbol: 'BTC'
    });
  }

  // Conduct bias audit
  const biasReport = await engines.biasAuditor.auditDataset(
    biasedDataset,
    DataSource.TRADING_VOLUME,
    'user_region'
  );

  console.log('📊 Bias Audit Results:');
  console.log(`   Sample Size: ${biasReport.sampleSize}`);
  console.log(`   Bias Detected: ${biasReport.biasDetected ? '❌ YES' : '✅ NO'}`);
  console.log(`   Severity: ${biasReport.severity.toUpperCase()}`);
  console.log('\n   Fairness Metrics:');
  console.log(`   • Statistical Parity: ${(biasReport.metrics.statisticalParity * 100).toFixed(1)}%`);
  console.log(`   • Disparate Impact: ${(biasReport.metrics.disparateImpact * 100).toFixed(1)}%`);
  console.log(`   • Equal Opportunity: ${(biasReport.metrics.equalOpportunity * 100).toFixed(1)}%`);
  console.log(`   • Demographic Parity: ${(biasReport.metrics.demographicParity * 100).toFixed(1)}%`);
  console.log(`   • Calibration: ${(biasReport.metrics.calibration * 100).toFixed(1)}%`);

  if (biasReport.recommendations.length > 0) {
    console.log('\n   📋 Recommendations:');
    biasReport.recommendations.forEach(r => console.log(`      ${r}`));
  }

  await sleep(1500);
}

/**
 * Demo 2: Fairness Engine
 */
async function demo2_FairnessEngine(framework: EthicalAIFramework) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  FAIRNESS ENGINE - Bias Mitigation Techniques');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const engines = framework.getEngines();

  // Create biased dataset
  const dataset: DataPoint[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 60000),
    source: DataSource.SENTIMENT,
    value: i < 70 ? 0.6 + Math.random() * 0.3 : -0.2 + Math.random() * 0.3,
    metadata: { user_region: i < 70 ? 'group_a' : 'group_b' },
    symbol: 'ETH'
  }));

  console.log('⚖️  Testing Fairness Methods:\n');

  // Method 1: Re-weighting
  console.log('1. RE-WEIGHTING:');
  const weights = await engines.fairnessEngine.applyReweighting(dataset, 'user_region');
  const upweighted = weights.filter(w => w.weight > 1).length;
  const downweighted = weights.filter(w => w.weight < 1).length;
  console.log(`   • Upweighted: ${upweighted} points`);
  console.log(`   • Downweighted: ${downweighted} points`);
  console.log(`   • Balanced: ${weights.length - upweighted - downweighted} points`);

  // Method 2: Adversarial Debiasing
  console.log('\n2. ADVERSARIAL DEBIASING:');
  const { debiasedData, fairnessImprovement } = await engines.fairnessEngine.applyAdversarialDebiasing(
    dataset,
    'user_region',
    0.1
  );
  console.log(`   • Fairness improvement: ${(fairnessImprovement * 100).toFixed(1)}%`);
  console.log(`   • Data points adjusted: ${debiasedData.length}`);

  // Method 3: Post-processing
  console.log('\n3. POST-PROCESSING:');
  const predictions = dataset.map(d => ({
    value: d.value,
    group: d.metadata?.user_region || 'unknown'
  }));
  
  const corrected = await engines.fairnessEngine.applyPostProcessing(predictions, 'demographic_parity');
  const adjustedCount = corrected.filter(c => c.adjusted).length;
  console.log(`   • Predictions adjusted: ${adjustedCount}/${predictions.length}`);
  console.log(`   • Fairness constraint: Demographic Parity`);

  console.log('\n✅ All fairness methods demonstrated successfully');

  await sleep(1500);
}

/**
 * Demo 3: Explainability (LIME & SHAP)
 */
async function demo3_Explainability(framework: EthicalAIFramework) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  EXPLAINABILITY - LIME & SHAP Analysis');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const engines = framework.getEngines();

  // Create sample anomaly
  const anomaly: Anomaly = {
    id: 'demo_anomaly_123',
    timestamp: new Date(),
    source: DataSource.TRADING_VOLUME,
    type: AnomalyType.OPPORTUNITY,
    severity: AnomalySeverity.HIGH,
    score: 0.87,
    dataPoint: {
      timestamp: new Date(),
      source: DataSource.TRADING_VOLUME,
      value: 250000,
      metadata: { symbol: 'BTC', exchange: 'Binance' },
      symbol: 'BTC'
    },
    baseline: {
      source: DataSource.TRADING_VOLUME,
      symbol: 'BTC',
      mean: 150000,
      standardDeviation: 25000,
      percentiles: { p5: 100000, p25: 130000, p50: 150000, p75: 170000, p95: 200000, p99: 220000 },
      lastUpdated: new Date(),
      sampleSize: 1000,
      confidenceInterval: { lower: 145000, upper: 155000 }
    },
    deviation: {
      standardDeviations: 4.0,
      percentileRank: 99,
      absoluteDifference: 100000,
      relativeDifference: 66.67
    },
    context: {
      historicalComparison: { similarEvents: 3 },
      marketConditions: { volatility: 0.35, trend: 'bullish', volume: 'high' },
      correlatedEvents: [],
      timeContext: { dayOfWeek: 'Monday', hour: 14, isHoliday: false, isTradingHours: true }
    },
    classification: {
      primaryCategory: 'Trading Volume - Opportunity',
      subCategories: ['volume_spike'],
      confidence: 0.85,
      reasoning: ['Unusual volume with bullish trend'],
      domainKnowledge: ['Smart money accumulation pattern']
    },
    suggestedActions: [],
    relatedAnomalies: [],
    metadata: {}
  };

  // LIME Explanation
  console.log('🔍 LIME (Local Interpretable Model-agnostic Explanations):');
  const limeExplanation = await engines.explainabilityEngine.explainWithLIME(anomaly);
  console.log(`   Confidence: ${(limeExplanation.confidence * 100).toFixed(0)}%`);
  console.log(`   Top 3 Contributing Features:`);
  limeExplanation.featureContributions.slice(0, 3).forEach((contrib, i) => {
    const direction = contrib.contribution > 0 ? '↑' : '↓';
    console.log(`      ${i + 1}. ${contrib.feature}: ${direction} ${(Math.abs(contrib.contribution) * 100).toFixed(1)}%`);
    console.log(`         Current: ${contrib.value.toFixed(2)}, Expected: ${contrib.expectedValue.toFixed(2)}`);
  });

  console.log('\n🎯 SHAP (SHapley Additive exPlanations):');
  const shapExplanation = await engines.explainabilityEngine.explainWithSHAP(anomaly);
  console.log(`   Confidence: ${(shapExplanation.confidence * 100).toFixed(0)}%`);
  console.log(`   Feature Contributions (game-theoretic):`);
  shapExplanation.featureContributions.slice(0, 3).forEach((contrib, i) => {
    console.log(`      ${i + 1}. ${contrib.feature}: ${contrib.contribution > 0 ? '+' : ''}${(contrib.contribution * 100).toFixed(1)}%`);
  });

  console.log('\n📖 Human-Readable Explanation:');
  console.log(limeExplanation.humanReadable.split('\n').map(line => `   ${line}`).join('\n'));

  console.log('\n🔄 Counterfactual Analysis:');
  const counterfactual = await engines.explainabilityEngine.generateCounterfactual(anomaly);
  console.log(`   "${counterfactual.counterfactual.description}"`);
  if (counterfactual.counterfactual.changes.length > 0) {
    console.log('   Required changes:');
    counterfactual.counterfactual.changes.slice(0, 3).forEach((change, i) => {
      console.log(`      ${i + 1}. ${change.change}`);
    });
  }

  await sleep(1500);
}

/**
 * Demo 4: GDPR Compliance
 */
async function demo4_GDPRCompliance(framework: EthicalAIFramework) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('4️⃣  GDPR COMPLIANCE - Data Protection & User Rights');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const engines = framework.getEngines();

  // Simulate user data collection
  console.log('📝 Recording User Data Collection:');
  engines.gdprEngine.logDataCollection({
    userId: 'user_12345',
    dataType: 'trading_preferences',
    data: { riskTolerance: 'moderate', preferredAssets: ['BTC', 'ETH'] },
    purpose: 'Personalized anomaly detection',
    legalBasis: 'consent',
    retentionPeriod: 90,
    consentGiven: true
  });
  console.log('   ✅ Data collection logged');

  // Record consent
  console.log('\n✅ Recording User Consent:');
  engines.gdprEngine.recordConsent({
    userId: 'user_12345',
    purpose: 'AI-driven trading recommendations',
    consentGiven: true,
    timestamp: new Date(),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    withdrawable: true,
    granular: true
  });
  console.log('   ✅ Consent recorded and verifiable');

  // Handle GDPR requests
  console.log('\n📋 GDPR User Rights:');
  
  // Right to Access
  console.log('   1. Right to Access (Article 15):');
  const accessRequest = await engines.gdprEngine.handleAccessRequest('user_12345');
  console.log(`      ✅ Request ${accessRequest.id} completed`);
  console.log(`      📦 Data package prepared with ${Object.keys(accessRequest.data).length} categories`);

  // Right to Data Portability
  console.log('\n   2. Right to Data Portability (Article 20):');
  const portabilityRequest = await framework.handleGDPRRequest('user_12345', 'portability', { format: 'json' });
  console.log(`      ✅ Data exported in machine-readable JSON format`);

  // Privacy Impact Assessment
  console.log('\n🔒 Privacy Impact Assessment:');
  const pia = await engines.gdprEngine.conductPrivacyImpactAssessment(
    'Automated anomaly-based trading decisions',
    true,  // Automated decisions
    true   // Sensitive data (financial)
  );
  console.log(`   Risk Level: ${pia.riskLevel.toUpperCase()}`);
  console.log(`   Risks Identified: ${pia.risks.length}`);
  console.log(`   Mitigation Measures: ${pia.mitigationMeasures.length}`);
  console.log(`   Approved for Production: ${pia.approved ? '✅ YES' : '❌ NO'}`);

  // Data retention enforcement
  console.log('\n🗑️  Data Retention Enforcement:');
  const retention = await engines.gdprEngine.enforceDataRetention();
  console.log(`   • Records checked: ${retention.recordsChecked}`);
  console.log(`   • Records deleted: ${retention.recordsDeleted}`);
  console.log(`   • Users affected: ${retention.userIds.length}`);

  await sleep(1500);
}

/**
 * Demo 5: Comprehensive Ethical Report
 */
async function demo5_ComprehensiveReport(framework: EthicalAIFramework) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('5️⃣  COMPREHENSIVE ETHICAL REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const report = await framework.generateEthicalReport();

  console.log('🌟 ETHICAL AI SCORECARD:');
  console.log(`   Overall Score: ${report.overallScore.toFixed(0)}/100`);
  console.log(generateScoreBar(report.overallScore));

  console.log('\n   📊 Component Scores:');
  console.log(`   • Bias & Fairness: ${report.biasAudit.biasDetected ? '⚠️  Issues Found' : '✅ Clean'}`);
  console.log(`   • Explainability: ${(report.explainability.avgConfidence * 100).toFixed(0)}% avg confidence`);
  console.log(`   • GDPR Compliance: ${report.gdprCompliance.compliant ? '✅ Compliant' : '⚠️  Issues'}`);
  console.log(`   • Transparency: ${report.explainability.explanationsGenerated} explanations generated`);

  if (report.recommendations.length > 0) {
    console.log('\n   💡 Ethical Recommendations:');
    report.recommendations.forEach((rec, i) => console.log(`      ${i + 1}. ${rec}`));
  }

  // Generate transparency report
  console.log('\n📢 PUBLIC TRANSPARENCY REPORT:');
  const transparencyReport = await framework.generateTransparencyReport();
  console.log(transparencyReport.split('\n').slice(0, 15).map(line => `   ${line}`).join('\n'));
  console.log('   ... (full report available)');

  await sleep(1500);
}

/**
 * Demo 6: Deployment Validation
 */
async function demo6_DeploymentValidation(framework: EthicalAIFramework) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('6️⃣  DEPLOYMENT VALIDATION - Ethical Compliance Check');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const validation = await framework.validateForDeployment();

  console.log('🔍 Pre-Deployment Ethical Validation:');
  console.log(`   Status: ${validation.approved ? '✅ APPROVED' : '❌ REJECTED'}`);
  console.log(`   Ethical Score: ${validation.score.toFixed(0)}/100`);

  if (validation.issues.length > 0) {
    console.log('\n   ⚠️  Issues Found:');
    validation.issues.forEach((issue, i) => console.log(`      ${i + 1}. ${issue}`));
    
    console.log('\n   📋 Requirements for Approval:');
    validation.requirements.forEach((req, i) => console.log(`      ${i + 1}. ${req}`));
  } else {
    console.log('\n   ✅ No ethical issues found - CLEARED FOR DEPLOYMENT');
    console.log('   ✅ Bias mitigation: Active');
    console.log('   ✅ Fairness constraints: Met');
    console.log('   ✅ Explainability: Comprehensive');
    console.log('   ✅ GDPR compliance: Full');
    console.log('   ✅ Transparency: Maximum');
  }

  await sleep(1500);
}

/**
 * Generate visual score bar
 */
function generateScoreBar(score: number): string {
  const filled = Math.floor(score / 10);
  const empty = 10 - filled;
  const color = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  return `   ${color} ${'█'.repeat(filled)}${'░'.repeat(empty)} ${score.toFixed(0)}%`;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demonstration
if (require.main === module) {
  demonstrateEthicalAI().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { demonstrateEthicalAI };

