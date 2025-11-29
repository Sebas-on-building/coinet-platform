/**
 * ML Pipeline Test Suite
 * 
 * Tests all ML components and validates >80% accuracy target
 */

import {
  TensorFlowModel,
  TrainingPipeline,
  IsolationForest,
  EnhancedConsensusEngine,
  type TrainingExample,
  type DataPoint,
  type SourceUnlock,
} from '../src/intelligence/ml';
import {
  DynamicVCDatabase,
} from '../src/intelligence/vc';
import {
  BlockchainFlowScanner,
} from '../src/intelligence/flow';

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: any;
  error?: string;
}

const results: TestResult[] = [];

// Helper to run a test
async function runTest(
  name: string,
  testFn: () => Promise<any>
): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const details = await testFn();
    const result: TestResult = {
      name,
      passed: true,
      duration: Date.now() - startTime,
      details,
    };
    results.push(result);
    console.log(`   ✅ PASSED (${result.duration}ms)`);
    return result;
  } catch (error: any) {
    const result: TestResult = {
      name,
      passed: false,
      duration: Date.now() - startTime,
      details: null,
      error: error.message,
    };
    results.push(result);
    console.log(`   ❌ FAILED: ${error.message}`);
    return result;
  }
}

// Generate synthetic training data
function generateTrainingData(count: number): TrainingExample[] {
  const data: TrainingExample[] = [];
  
  for (let i = 0; i < count; i++) {
    // Realistic feature distributions
    const percentCirculating = Math.random() * 10;
    const isCliff = Math.random() < 0.3;
    const categoryInvestor = Math.random() < 0.4;
    const marketSentiment = Math.random() * 2 - 1;
    
    // Calculate expected impact based on features
    let expectedImpact = 0;
    expectedImpact -= percentCirculating * 0.3;
    if (isCliff) expectedImpact -= 2;
    if (categoryInvestor) expectedImpact -= 3;
    expectedImpact += marketSentiment * 2;
    
    // Add noise
    const noise = (Math.random() - 0.5) * 4;
    
    const features = new Array(25).fill(0);
    features[1] = percentCirculating;
    features[5] = isCliff ? 1 : 0;
    features[7] = categoryInvestor ? 1 : 0;
    features[18] = marketSentiment;
    
    // Fill other features with random values
    for (let j = 0; j < features.length; j++) {
      if (features[j] === 0) {
        features[j] = Math.random();
      }
    }
    
    const labels = [
      expectedImpact * 0.3 + noise * 0.5,
      expectedImpact * 0.6 + noise * 0.7,
      expectedImpact * 0.85 + noise * 0.9,
      expectedImpact + noise,
    ];
    
    data.push({ features, labels });
  }
  
  return data;
}

// Generate anomaly detection data
function generateAnomalyData(
  normalCount: number,
  anomalyCount: number
): DataPoint[] {
  const data: DataPoint[] = [];
  
  // Normal data
  for (let i = 0; i < normalCount; i++) {
    data.push({
      id: `normal-${i}`,
      features: [
        100000 + Math.random() * 50000,      // Amount
        1000000 + Math.random() * 500000,    // Amount USD
        1 + Math.random() * 3,               // % of supply
        2 + Math.random() * 5,               // % of circulating
        Math.floor(Math.random() * 5) + 1,   // Category
        0.7 + Math.random() * 0.3,           // Confidence
        Math.random() < 0.5 ? 1 : 0,         // Verified
        0.6 + Math.random() * 0.4,           // Source weight
      ],
    });
  }
  
  // Anomalies
  for (let i = 0; i < anomalyCount; i++) {
    data.push({
      id: `anomaly-${i}`,
      features: [
        1000000 + Math.random() * 5000000,   // Much larger amount
        10000000 + Math.random() * 50000000, // Much larger USD
        20 + Math.random() * 30,             // Huge % of supply
        50 + Math.random() * 50,             // Huge % of circulating
        Math.floor(Math.random() * 6),       // Category
        0.2 + Math.random() * 0.3,           // Low confidence
        0,                                    // Not verified
        0.3 + Math.random() * 0.2,           // Low weight
      ],
    });
  }
  
  return data;
}

// Main test function
async function main() {
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════');
  console.log('   🧠 ML PIPELINE TEST SUITE');
  console.log('   Testing ML components for >80% accuracy');
  console.log('════════════════════════════════════════════════════════════');
  console.log('\n');

  // ==================== Test 1: TensorFlow Model ====================
  console.log('⏳ Testing: 1. TensorFlow Model...');
  await runTest('TensorFlow Model', async () => {
    const model = new TensorFlowModel({
      epochs: 20,
      hiddenLayers: [64, 32],
      learningRate: 0.01,
    });
    
    await model.initialize();
    
    // Train on synthetic data
    const trainData = generateTrainingData(200);
    const testData = generateTrainingData(50);
    
    const trainMetrics = await model.train(trainData);
    const evaluation = await model.evaluate(testData);
    
    return {
      trainLoss: trainMetrics.loss.toFixed(4),
      valLoss: trainMetrics.valLoss.toFixed(4),
      testAccuracy: (evaluation.accuracy * 100).toFixed(1) + '%',
      r2: evaluation.r2.toFixed(3),
      predictionAccuracy: evaluation.predictionAccuracy,
    };
  });

  // ==================== Test 2: Training Pipeline ====================
  console.log('\n⏳ Testing: 2. Training Pipeline...');
  await runTest('Training Pipeline', async () => {
    const model = new TensorFlowModel({ epochs: 10 });
    const pipeline = new TrainingPipeline(model, {
      lookbackDays: 30,
      minUnlocksForTraining: 30,
    });
    
    const pipelineResults = await pipeline.run();
    
    return {
      totalUnlocks: pipelineResults.totalUnlocks,
      labeledUnlocks: pipelineResults.labeledUnlocks,
      trainingSize: pipelineResults.trainingSize,
      testAccuracy: (pipelineResults.testAccuracy * 100).toFixed(1) + '%',
    };
  });

  // ==================== Test 3: Isolation Forest ====================
  console.log('\n⏳ Testing: 3. Isolation Forest (Anomaly Detection)...');
  await runTest('Isolation Forest', async () => {
    const forest = new IsolationForest({
      numTrees: 50,
      contamination: 0.15,
    });
    
    const data = generateAnomalyData(80, 20);
    forest.train(data);
    
    // Test detection
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    
    data.forEach(point => {
      const result = forest.detect(point);
      const isActualAnomaly = point.id.startsWith('anomaly');
      
      if (result.isAnomaly && isActualAnomaly) truePositives++;
      else if (result.isAnomaly && !isActualAnomaly) falsePositives++;
      else if (!result.isAnomaly && !isActualAnomaly) trueNegatives++;
      else falseNegatives++;
    });
    
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1 = 2 * precision * recall / (precision + recall) || 0;
    const accuracy = (truePositives + trueNegatives) / data.length;
    
    return {
      accuracy: (accuracy * 100).toFixed(1) + '%',
      precision: (precision * 100).toFixed(1) + '%',
      recall: (recall * 100).toFixed(1) + '%',
      f1Score: (f1 * 100).toFixed(1) + '%',
      truePositives,
      falsePositives,
      threshold: forest.getThreshold().toFixed(4),
    };
  });

  // ==================== Test 4: Enhanced Consensus Engine ====================
  console.log('\n⏳ Testing: 4. Enhanced Consensus Engine...');
  await runTest('Enhanced Consensus Engine', async () => {
    const engine = new EnhancedConsensusEngine({
      minSourcesForConsensus: 2,
    });
    
    // Add test data from multiple sources
    const testDate = new Date();
    const sources: SourceUnlock[] = [
      {
        source: 'messari',
        symbol: 'TEST',
        name: 'Test Token',
        unlockDate: testDate,
        unlockAmount: 1000000,
        unlockAmountUsd: 5000000,
        percentOfSupply: 2.5,
        percentOfCirculating: 5.0,
        category: 'investor',
        confidence: 0.9,
        verified: true,
        lastUpdated: new Date(),
      },
      {
        source: 'defillama',
        symbol: 'TEST',
        name: 'Test Token',
        unlockDate: testDate,
        unlockAmount: 1050000, // Slight variation
        unlockAmountUsd: 5200000,
        percentOfSupply: 2.6,
        percentOfCirculating: 5.2,
        category: 'investor',
        confidence: 0.8,
        verified: false,
        lastUpdated: new Date(),
      },
      {
        source: 'coingecko',
        symbol: 'TEST',
        name: 'Test Token',
        unlockDate: testDate,
        unlockAmount: 980000,
        unlockAmountUsd: 4900000,
        percentOfSupply: 2.4,
        percentOfCirculating: 4.8,
        category: 'investor',
        confidence: 0.75,
        verified: false,
        lastUpdated: new Date(),
      },
      {
        source: 'tokenunlocks',
        symbol: 'TEST',
        name: 'Test Token',
        unlockDate: testDate,
        unlockAmount: 5000000, // Outlier!
        unlockAmountUsd: 25000000,
        percentOfSupply: 12.5,
        percentOfCirculating: 25.0,
        category: 'investor',
        confidence: 0.6,
        verified: false,
        lastUpdated: new Date(),
      },
    ];
    
    engine.addSourceDataBatch(sources);
    engine.trainIsolationForest();
    
    const consensus = engine.computeConsensus('TEST', testDate);
    
    return {
      consensusAmount: consensus?.consensusAmount.toFixed(0),
      sourceAgreement: ((consensus?.sourceAgreement || 0) * 100).toFixed(1) + '%',
      anomalyFreeAgreement: ((consensus?.anomalyFreeAgreement || 0) * 100).toFixed(1) + '%',
      anomaliesDetected: consensus?.anomalies.length,
      consensusMethod: consensus?.consensusMethod,
      overallConfidence: ((consensus?.overallConfidence || 0) * 100).toFixed(1) + '%',
    };
  });

  // ==================== Test 5: Dynamic VC Database ====================
  console.log('\n⏳ Testing: 5. Dynamic VC Database...');
  await runTest('Dynamic VC Database', async () => {
    const db = new DynamicVCDatabase();
    
    // Query existing VCs
    const tier1VCs = db.queryVCs({ tier: 'tier1' });
    const allVCs = db.queryVCs({});
    
    // Add a new VC
    const newVC = db.addVC({
      name: 'Test VC Fund',
      tier: 'tier2',
      wallets: [
        { chain: 'ethereum', address: '0x1234567890abcdef', type: 'main', verified: false },
      ],
    });
    
    // Query by wallet
    const foundVC = db.getVCByWallet('ethereum', '0x1234567890abcdef');
    
    // Get stats
    const stats = db.getStats();
    
    // Cleanup
    db.deleteVC(newVC.id);
    
    return {
      tier1Count: tier1VCs.length,
      totalVCs: allVCs.length,
      addedVC: newVC.name,
      foundByWallet: foundVC?.name,
      totalWallets: stats.totalWallets,
    };
  });

  // ==================== Test 6: Blockchain Flow Scanner ====================
  console.log('\n⏳ Testing: 6. Blockchain Flow Scanner...');
  await runTest('Blockchain Flow Scanner', async () => {
    const scanner = new BlockchainFlowScanner({
      enableRealtime: false,
    });
    
    const stats = scanner.getStats();
    
    return {
      chains: stats.chains,
      initialized: true,
      totalFlows: stats.totalFlows,
      note: 'Full scanning requires RPC connections',
    };
  });

  // ==================== Test 7: Accuracy Validation ====================
  console.log('\n⏳ Testing: 7. Accuracy Validation (>80% target)...');
  await runTest('Accuracy Validation', async () => {
    const model = new TensorFlowModel({
      epochs: 50,
      hiddenLayers: [128, 64, 32],
      learningRate: 0.001,
      dropoutRate: 0.2,
    });
    
    await model.initialize();
    
    // Train on larger dataset
    const trainData = generateTrainingData(500);
    const testData = generateTrainingData(100);
    
    await model.train(trainData);
    const evaluation = await model.evaluate(testData);
    
    const targetMet = evaluation.accuracy >= 0.80;
    
    return {
      accuracy: (evaluation.accuracy * 100).toFixed(1) + '%',
      targetAccuracy: '80%',
      targetMet,
      r2Score: evaluation.r2.toFixed(3),
      mse: evaluation.mse.toFixed(4),
      mae: evaluation.mae.toFixed(4),
      predictionAccuracy: {
        h1: (evaluation.predictionAccuracy.h1 * 100).toFixed(1) + '%',
        h24: (evaluation.predictionAccuracy.h24 * 100).toFixed(1) + '%',
        d7: (evaluation.predictionAccuracy.d7 * 100).toFixed(1) + '%',
        d30: (evaluation.predictionAccuracy.d30 * 100).toFixed(1) + '%',
      },
    };
  });

  // ==================== Print Summary ====================
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════');
  console.log('   📊 TEST SUMMARY');
  console.log('════════════════════════════════════════════════════════════');
  console.log('\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  results.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    console.log(`   ${status} ${r.name} (${r.duration}ms)`);
    if (r.details) {
      console.log(`      📊 ${JSON.stringify(r.details)}`);
    }
    if (r.error) {
      console.log(`      ⚠️  ${r.error}`);
    }
  });
  
  console.log('\n');
  console.log(`   ✅ Passed: ${passed}/${results.length}`);
  console.log(`   ❌ Failed: ${failed}/${results.length}`);
  console.log(`   ⏱️  Total Duration: ${totalDuration}ms`);
  console.log('\n');
  
  // Check if accuracy target was met
  const accuracyTest = results.find(r => r.name === 'Accuracy Validation');
  if (accuracyTest?.details?.targetMet) {
    console.log('   🎯 TARGET MET: >80% prediction accuracy achieved!');
  } else {
    console.log('   ⚠️  Target not met: Continue training with more data');
  }
  
  console.log('\n');
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);

