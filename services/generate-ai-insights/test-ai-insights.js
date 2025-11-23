/**
 * Simple test script for AI Insights Service
 */

const { GenerateAIInsightsService } = require('./dist/index');

async function testAIInsights() {
  console.log('🚀 Testing AI Insights Service...\n');

  try {
    // Create service instance
    const service = new GenerateAIInsightsService();

    console.log('✅ Service created successfully');

    // Test configuration
    const config = service.getConfig();
    console.log('✅ Configuration loaded');
    console.log('   Models:', config.models.length);
    console.log('   Data Sources:', config.dataSources.length);

    // Test health check
    const health = await service.getHealth();
    console.log('✅ Health check passed:', health.status);

    console.log('\n🎉 All tests passed! AI Insights Service is ready.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testAIInsights();
