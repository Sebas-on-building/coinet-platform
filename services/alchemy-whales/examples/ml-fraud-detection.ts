/**
 * Example: ML-Based Fraud Detection
 * 
 * Demonstrates how to use the FraudMLModel for token fraud detection
 */

import { FraudMLModel, TokenFeatures } from '../src/ai/FraudMLModel';

// Enable demo mode
process.env.ALLOW_DEFAULTS = 'true';

async function demonstrateMLFraudDetection() {
  console.log('============================================================');
  console.log('🤖 ML-Based Fraud Detection - Demo');
  console.log('   World-Class Implementation');
  console.log('============================================================\n');

  // Initialize ML model
  const mlModel = new FraudMLModel({
    enabled: true,
    modelVersion: 'v1.0.0',
    confidenceThreshold: 70,
    useEnsemble: true,
    enableOnlineLearning: true,
  });

  console.log('✅ ML model initialized\n');

  // Example 1: Obvious scam token
  console.log('Example 1: Analyzing Obvious Scam Token\n');
  const scamToken: TokenFeatures = {
    contractVerified: false,
    ownershipConcentration: 95,
    liquidityLocked: false,
    mintAuthority: true,
    freezeAuthority: true,
    initialLiquidityUsd: 500,
    initialPriceUsd: 0.0001,
    totalSupply: 1000000000,
    circulatingSupply: 1000000000,
    marketCapUsd: 100000,
    tradingVolumeUsd: 5000,
    uniqueHolders: 3,
    buyCount24h: 50,
    sellCount24h: 2,
    largestBuyUsd: 1000,
    largestSellUsd: 50,
    priceChange5m: 300,
    priceChange1h: 500,
    priceChange24h: 0,
    liquidityUsd: 500,
    liquidityToMarketCapRatio: 0.005,
    liquidityChange1h: 0,
    twitterFollowers: 10,
    twitterAccountAgeHours: 2,
    telegramMembers: 50,
    telegramAccountAgeHours: 1,
    redditMentions: 0,
    websiteExists: false,
    whitepaperExists: false,
    washTradingScore: 85,
    botActivityScore: 90,
    priceManipulationScore: 80,
    honeypotRisk: 95,
    tokenAgeSeconds: 30,
    isPumpFun: true,
    isRaydium: false,
    creatorReputation: 5,
  };

  const scamPrediction = await mlModel.predict(scamToken);
  console.log('🚨 SCAM TOKEN ANALYSIS:');
  console.log(`   Fraud Risk: ${scamPrediction.fraudRiskScore}/100 (${scamPrediction.fraudRiskLevel})`);
  console.log(`   Potential: ${scamPrediction.potentialScore}/100 (${scamPrediction.potentialLevel})`);
  console.log(`   Confidence: ${scamPrediction.confidence}%`);
  console.log(`   Recommendation: ${scamPrediction.recommendation}`);
  console.log(`\n   Red Flags (${scamPrediction.features.redFlags.length}):`);
  scamPrediction.features.redFlags.slice(0, 5).forEach(flag => {
    console.log(`     ❌ ${flag}`);
  });
  console.log(`\n   Reasoning: ${scamPrediction.reasoning}\n\n`);

  // Example 2: Legitimate token
  console.log('Example 2: Analyzing Legitimate Token\n');
  const legitimateToken: TokenFeatures = {
    contractVerified: true,
    ownershipConcentration: 15,
    liquidityLocked: true,
    mintAuthority: false,
    freezeAuthority: false,
    initialLiquidityUsd: 100000,
    initialPriceUsd: 0.01,
    totalSupply: 1000000000,
    circulatingSupply: 500000000,
    marketCapUsd: 5000000,
    tradingVolumeUsd: 500000,
    uniqueHolders: 500,
    buyCount24h: 200,
    sellCount24h: 180,
    largestBuyUsd: 5000,
    largestSellUsd: 4500,
    priceChange5m: 2,
    priceChange1h: 5,
    priceChange24h: 15,
    liquidityUsd: 100000,
    liquidityToMarketCapRatio: 0.02,
    liquidityChange1h: 5,
    twitterFollowers: 5000,
    twitterAccountAgeHours: 720,
    telegramMembers: 2000,
    telegramAccountAgeHours: 480,
    redditMentions: 50,
    websiteExists: true,
    whitepaperExists: true,
    washTradingScore: 10,
    botActivityScore: 15,
    priceManipulationScore: 5,
    honeypotRisk: 5,
    tokenAgeSeconds: 300,
    isPumpFun: false,
    isRaydium: true,
    creatorReputation: 85,
  };

  const legitPrediction = await mlModel.predict(legitimateToken);
  console.log('✅ LEGITIMATE TOKEN ANALYSIS:');
  console.log(`   Fraud Risk: ${legitPrediction.fraudRiskScore}/100 (${legitPrediction.fraudRiskLevel})`);
  console.log(`   Potential: ${legitPrediction.potentialScore}/100 (${legitPrediction.potentialLevel})`);
  console.log(`   Confidence: ${legitPrediction.confidence}%`);
  console.log(`   Recommendation: ${legitPrediction.recommendation}`);
  console.log(`\n   Green Flags (${legitPrediction.features.greenFlags.length}):`);
  legitPrediction.features.greenFlags.slice(0, 5).forEach(flag => {
    console.log(`     ✅ ${flag}`);
  });
  console.log(`\n   Reasoning: ${legitPrediction.reasoning}\n\n`);

  // Example 3: Borderline token
  console.log('Example 3: Analyzing Borderline Token (Mixed Signals)\n');
  const borderlineToken: TokenFeatures = {
    contractVerified: true,
    ownershipConcentration: 55,
    liquidityLocked: false,
    mintAuthority: false,
    freezeAuthority: false,
    initialLiquidityUsd: 20000,
    initialPriceUsd: 0.001,
    totalSupply: 1000000000,
    circulatingSupply: 800000000,
    marketCapUsd: 800000,
    tradingVolumeUsd: 100000,
    uniqueHolders: 150,
    buyCount24h: 100,
    sellCount24h: 95,
    largestBuyUsd: 3000,
    largestSellUsd: 2800,
    priceChange5m: 10,
    priceChange1h: 25,
    priceChange24h: 50,
    liquidityUsd: 20000,
    liquidityToMarketCapRatio: 0.025,
    liquidityChange1h: 0,
    twitterFollowers: 500,
    twitterAccountAgeHours: 48,
    telegramMembers: 300,
    telegramAccountAgeHours: 24,
    redditMentions: 5,
    websiteExists: true,
    whitepaperExists: false,
    washTradingScore: 30,
    botActivityScore: 25,
    priceManipulationScore: 20,
    honeypotRisk: 15,
    tokenAgeSeconds: 120,
    isPumpFun: true,
    isRaydium: false,
    creatorReputation: 50,
  };

  const borderlinePrediction = await mlModel.predict(borderlineToken);
  console.log('⚠️  BORDERLINE TOKEN ANALYSIS:');
  console.log(`   Fraud Risk: ${borderlinePrediction.fraudRiskScore}/100 (${borderlinePrediction.fraudRiskLevel})`);
  console.log(`   Potential: ${borderlinePrediction.potentialScore}/100 (${borderlinePrediction.potentialLevel})`);
  console.log(`   Confidence: ${borderlinePrediction.confidence}%`);
  console.log(`   Recommendation: ${borderlinePrediction.recommendation}`);
  console.log(`\n   Mixed Signals:`);
  console.log(`     Red Flags: ${borderlinePrediction.features.redFlags.length}`);
  console.log(`     Green Flags: ${borderlinePrediction.features.greenFlags.length}`);
  console.log(`\n   Reasoning: ${borderlinePrediction.reasoning}\n\n`);

  // Show model metrics
  const metrics = mlModel.getMetrics();
  console.log('📊 Model Metrics:');
  console.log(`   Training Data Points: ${metrics.trainingDataPoints}`);
  console.log(`   Scam Patterns: ${metrics.scamPatterns}`);
  console.log(`   Legitimate Patterns: ${metrics.legitimatePatterns}`);
  console.log(`   Model Version: ${metrics.modelVersion}\n`);

  console.log('============================================================');
  console.log('✅ ML fraud detection demo completed!');
  console.log('============================================================\n');
}

// Run demo
demonstrateMLFraudDetection().catch(console.error);

