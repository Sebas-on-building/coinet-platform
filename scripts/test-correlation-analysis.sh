#!/bin/bash
# test-correlation-analysis.sh - Test script for the advanced correlation analysis features

echo "===== Testing Advanced Correlation Analysis Features ====="

# Create output directory
mkdir -p ./outputs/correlation-test

# 1. Track recent news for historical correlation
echo -e "\n1. Tracking recent news for correlation analysis..."
node -e "
const { NewsDigestGenerator } = require('./dist/tools/NewsDigestGenerator');
const digestGenerator = new NewsDigestGenerator('./outputs/correlation-test');
async function run() {
  const count = await digestGenerator.trackNewsForCorrelation(72);
  console.log(\`Tracked \${count} news items for correlation analysis\`);
}
run().catch(console.error);
"

# 2. Generate a daily digest with correlation analysis
echo -e "\n2. Generating daily digest with correlation analysis..."
node -e "
const { NewsDigestGenerator } = require('./dist/tools/NewsDigestGenerator');
const digestGenerator = new NewsDigestGenerator('./outputs/correlation-test');
async function run() {
  const assets = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP'];
  const path = await digestGenerator.createDailyDigestWithCorrelation(assets);
  console.log(\`Daily digest saved to: \${path}\`);
}
run().catch(console.error);
"

# 3. Generate asset-specific impact analysis
echo -e "\n3. Generating asset-specific impact analysis..."
node -e "
const { NewsDigestGenerator } = require('./dist/tools/NewsDigestGenerator');
const digestGenerator = new NewsDigestGenerator('./outputs/correlation-test');
async function run() {
  try {
    const path = await digestGenerator.createAssetImpactAnalysis('BTC', 48);
    console.log(\`BTC impact analysis saved to: \${path}\`);
  } catch (error) {
    console.error('Error generating BTC impact analysis:', error.message);
  }
}
run().catch(console.error);
"

# 4. Test the NewsImpactPredictor directly
echo -e "\n4. Testing NewsImpactPredictor functionality..."
node -e "
const { NewsImpactPredictor } = require('./dist/tools/NewsImpactPredictor');
const { NewsAggregationService } = require('./dist/services/news/NewsAggregationService');
async function run() {
  const predictor = new NewsImpactPredictor();
  const newsService = NewsAggregationService.getInstance();
  
  // Get category correlations
  const correlations = predictor.getCategoryCorrelations();
  console.log(\`Found \${correlations.length} category correlations\`);
  
  // Get recent news and analyze it
  const news = await newsService.searchNews('', { limit: 10 });
  console.log(\`Found \${news.length} news items for analysis\`);
  
  if (news.length > 0) {
    const analyzedGroups = await predictor.analyzeNewsGroup(news);
    console.log(\`Analyzed \${analyzedGroups.length} news groups\`);
    
    // Print first group's prediction
    if (analyzedGroups.length > 0) {
      const firstGroup = analyzedGroups[0];
      const prediction = firstGroup.predictions.overall_prediction;
      console.log(\`Sample prediction: \${prediction.direction} movement of \${prediction.expected_magnitude.toFixed(2)}% (\${(prediction.confidence * 100).toFixed(0)}% confidence)\`);
    }
  }
}
run().catch(console.error);
"

echo -e "\n===== Test Completed ====="
echo "Check the outputs/correlation-test directory for generated files" 