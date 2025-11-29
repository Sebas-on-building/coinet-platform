/**
 * =========================================
 * ANALYTICS VALIDATION DEMO RUNNER
 * =========================================
 * Execute the comprehensive analytics validation
 */

import AnalyticsValidationDemo from '../validation/analytics_validation_demo';

async function main() {
  console.log('🚀 Starting Advanced Analytics Backend Validation Demo...\n');

  const demo = new AnalyticsValidationDemo();

  try {
    await demo.runCompleteValidation();
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

export default main;
