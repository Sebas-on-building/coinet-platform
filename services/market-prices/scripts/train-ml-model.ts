/**
 * ML Model Training Script
 * 
 * Trains the TensorFlow.js model on historical unlock data
 * and validates against the >80% accuracy target.
 */

import { TensorFlowModel, TrainingPipeline, type TrainingMetrics } from '../src/intelligence/ml';
import { logger } from '../src/utils/logger';

// Training configuration
const CONFIG = {
  epochs: 100,
  hiddenLayers: [128, 64, 32, 16],
  learningRate: 0.001,
  dropoutRate: 0.3,
  batchSize: 32,
  validationSplit: 0.15,
  testSplit: 0.15,
  targetAccuracy: 0.80,
  minTrainingData: 100,
};

async function main() {
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════');
  console.log('   🧠 ML MODEL TRAINING');
  console.log('   Training TensorFlow.js Neural Network');
  console.log('════════════════════════════════════════════════════════════');
  console.log('\n');

  console.log('📋 Configuration:');
  console.log(`   Epochs: ${CONFIG.epochs}`);
  console.log(`   Hidden Layers: [${CONFIG.hiddenLayers.join(', ')}]`);
  console.log(`   Learning Rate: ${CONFIG.learningRate}`);
  console.log(`   Dropout Rate: ${CONFIG.dropoutRate}`);
  console.log(`   Target Accuracy: ${CONFIG.targetAccuracy * 100}%`);
  console.log('\n');

  // Initialize model
  console.log('🔧 Initializing TensorFlow.js model...');
  const model = new TensorFlowModel({
    epochs: CONFIG.epochs,
    hiddenLayers: CONFIG.hiddenLayers,
    learningRate: CONFIG.learningRate,
    dropoutRate: CONFIG.dropoutRate,
    batchSize: CONFIG.batchSize,
    validationSplit: CONFIG.validationSplit,
    earlyStoppingPatience: 15,
  });

  await model.initialize();
  console.log('   ✅ Model initialized\n');

  // Initialize training pipeline
  console.log('📊 Initializing training pipeline...');
  const pipeline = new TrainingPipeline(model, {
    lookbackDays: 365,
    minUnlocksForTraining: CONFIG.minTrainingData,
    validationSplit: CONFIG.validationSplit,
    testSplit: CONFIG.testSplit,
    dataAugmentation: true,
    normalizeFeatures: true,
  });

  // Track training progress
  let lastMetrics: TrainingMetrics | null = null;
  
  pipeline.on('step', ({ step, name }) => {
    console.log(`\n📍 Step ${step}: ${name}`);
  });

  pipeline.on('progress', ({ step, progress }) => {
    const percent = (progress * 100).toFixed(0);
    process.stdout.write(`\r   Progress: ${percent}%`);
  });

  pipeline.on('trainingProgress', ({ epoch, metrics }) => {
    lastMetrics = metrics;
    if (epoch % 10 === 0 || epoch === 1) {
      console.log(`\n   Epoch ${epoch}: loss=${metrics.loss.toFixed(4)}, val_loss=${metrics.valLoss.toFixed(4)}, accuracy=${(metrics.accuracy * 100).toFixed(1)}%`);
    }
  });

  // Run training
  console.log('\n🚀 Starting training pipeline...\n');
  const startTime = Date.now();
  
  try {
    const results = await pipeline.run();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n');
    console.log('════════════════════════════════════════════════════════════');
    console.log('   📊 TRAINING RESULTS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('\n');

    console.log('📈 Dataset Statistics:');
    console.log(`   Total Unlocks: ${results.totalUnlocks}`);
    console.log(`   Labeled Unlocks: ${results.labeledUnlocks}`);
    console.log(`   Training Size: ${results.trainingSize}`);
    console.log(`   Validation Size: ${results.validationSize}`);
    console.log(`   Test Size: ${results.testSize}`);
    console.log('\n');

    console.log('🎯 Training Metrics:');
    console.log(`   Final Loss: ${results.trainMetrics.loss.toFixed(4)}`);
    console.log(`   Validation Loss: ${results.trainMetrics.valLoss.toFixed(4)}`);
    console.log(`   MAE: ${results.trainMetrics.mae.toFixed(4)}`);
    console.log(`   Accuracy: ${(results.trainMetrics.accuracy * 100).toFixed(1)}%`);
    console.log('\n');

    console.log('✅ Test Results:');
    console.log(`   Test Accuracy: ${(results.testAccuracy * 100).toFixed(1)}%`);
    console.log(`   Target Accuracy: ${CONFIG.targetAccuracy * 100}%`);
    console.log('\n');

    // Check if target was met
    const targetMet = results.testAccuracy >= CONFIG.targetAccuracy;
    
    if (targetMet) {
      console.log('🎉 SUCCESS! Target accuracy achieved!');
      console.log(`   Achieved: ${(results.testAccuracy * 100).toFixed(1)}%`);
      console.log(`   Target: ${CONFIG.targetAccuracy * 100}%`);
      console.log(`   Exceeded by: ${((results.testAccuracy - CONFIG.targetAccuracy) * 100).toFixed(1)}%`);
    } else {
      console.log('⚠️  Target accuracy not yet achieved');
      console.log(`   Achieved: ${(results.testAccuracy * 100).toFixed(1)}%`);
      console.log(`   Target: ${CONFIG.targetAccuracy * 100}%`);
      console.log(`   Gap: ${((CONFIG.targetAccuracy - results.testAccuracy) * 100).toFixed(1)}%`);
      console.log('\n   Recommendations:');
      console.log('   - Increase training data');
      console.log('   - Tune hyperparameters');
      console.log('   - Add more feature engineering');
    }

    console.log('\n');
    console.log(`⏱️  Total Training Time: ${duration}s`);
    console.log(`📦 Model Version: ${results.modelVersion}`);
    console.log('\n');

    // Save model state
    const modelState = await model.saveState();
    console.log('💾 Model state saved');
    console.log(`   Version: ${modelState.version}`);
    console.log(`   Trained at: ${modelState.trainedAt.toISOString()}`);
    console.log('\n');

    // Get training history
    const history = model.getTrainingHistory();
    console.log('📈 Training History:');
    console.log(`   Total Epochs: ${history.length}`);
    console.log(`   Best Val Loss: ${Math.min(...history.map(h => h.valLoss)).toFixed(4)}`);
    console.log(`   Final Accuracy: ${(history[history.length - 1]?.accuracy * 100 || 0).toFixed(1)}%`);
    console.log('\n');

    process.exit(targetMet ? 0 : 1);

  } catch (error: any) {
    console.error('\n❌ Training failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);

