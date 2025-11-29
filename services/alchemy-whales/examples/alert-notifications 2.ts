/**
 * 🚨 Alert Notification System - Example Usage
 * 
 * Demonstrates the world-class multi-channel alert system
 */

import { AlertNotificationService, AlertNotificationConfig, TokenAlert } from '../src/notifications/AlertNotificationService';
import { UltimateFraudPrediction } from '../src/ai/UltimateFraudDetector';

async function main() {
  console.log('============================================================');
  console.log('🚨 Alert Notification System - Examples');
  console.log('   World-Class Multi-Channel Alerts');
  console.log('============================================================\n');

  // Initialize notification service
  const config: AlertNotificationConfig = {
    telegramEnabled: process.env.TELEGRAM_ENABLED === 'true',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    
    emailEnabled: process.env.EMAIL_ENABLED === 'true',
    emailHost: process.env.EMAIL_HOST,
    emailPort: parseInt(process.env.EMAIL_PORT || '587'),
    emailUser: process.env.EMAIL_USER,
    emailPassword: process.env.EMAIL_PASSWORD,
    emailFrom: process.env.EMAIL_FROM,
    emailTo: process.env.EMAIL_TO?.split(','),
    
    discordEnabled: process.env.DISCORD_ENABLED === 'true',
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    
    slackEnabled: process.env.SLACK_ENABLED === 'true',
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    
    minAlertIntervalSeconds: parseInt(process.env.MIN_ALERT_INTERVAL_SECONDS || '30'),
    maxAlertsPerHour: parseInt(process.env.MAX_ALERTS_PER_HOUR || '50'),
    
    fraudRiskThreshold: parseInt(process.env.FRAUD_RISK_THRESHOLD || '60'),
    highPotentialThreshold: parseInt(process.env.HIGH_POTENTIAL_THRESHOLD || '80'),
    
    alertOnNewToken: process.env.ALERT_ON_NEW_TOKEN !== 'false',
    alertOnHighRisk: process.env.ALERT_ON_HIGH_RISK !== 'false',
    alertOnHighPotential: process.env.ALERT_ON_HIGH_POTENTIAL !== 'false',
    alertOnCritical: process.env.ALERT_ON_CRITICAL !== 'false',
  };

  const alertService = new AlertNotificationService(config);

  try {
    console.log('Example 1: Initialize Alert Service\n');
    await alertService.initialize();
    console.log('✅ Alert service initialized\n');

    // Example 2: Critical Fraud Alert
    console.log('Example 2: Critical Fraud Alert (>90%)\n');
    const criticalFraudAlert: TokenAlert = {
      tokenAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      tokenSymbol: 'SCAM',
      tokenName: 'Definite Scam Token',
      chain: 'Solana',
      timestamp: new Date(),
      fraudAnalysis: createMockPrediction(95, 10, 'CRITICAL_RISK'),
      priority: 'CRITICAL',
      alertType: 'FRAUD_RISK',
      metadata: {
        liquidity: 5000,
        age: 120,
      },
    };

    await alertService.sendTokenAlert(criticalFraudAlert);
    console.log('✅ Critical fraud alert sent\n');

    // Wait 2 seconds between alerts
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Example 3: High Potential Alert
    console.log('Example 3: High Potential Token Alert\n');
    const highPotentialAlert: TokenAlert = {
      tokenAddress: '9vKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgGEM',
      tokenSymbol: 'MOON',
      tokenName: 'MoonShot Token',
      chain: 'Solana',
      timestamp: new Date(),
      fraudAnalysis: createMockPrediction(25, 92, 'LOW_RISK'),
      priority: 'HIGH',
      alertType: 'HIGH_POTENTIAL',
      metadata: {
        liquidity: 150000,
        holders: 250,
        age: 300,
        volume24h: 50000,
      },
    };

    await alertService.sendTokenAlert(highPotentialAlert);
    console.log('✅ High potential alert sent\n');

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Example 4: New Token Alert
    console.log('Example 4: New Token Detection Alert\n');
    const newTokenAlert: TokenAlert = {
      tokenAddress: '5mKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgNEW',
      tokenSymbol: 'NEW',
      tokenName: 'Fresh Launch',
      chain: 'Solana',
      timestamp: new Date(),
      fraudAnalysis: createMockPrediction(45, 65, 'MEDIUM_RISK'),
      priority: 'MEDIUM',
      alertType: 'NEW_TOKEN',
      metadata: {
        liquidity: 25000,
        age: 30,
      },
    };

    await alertService.sendTokenAlert(newTokenAlert);
    console.log('✅ New token alert sent\n');

    // Example 5: Stats
    console.log('Example 5: Alert Statistics\n');
    const stats = alertService.getStats();
    console.log('📊 Alert Statistics:');
    console.log(`   Total Sent: ${stats.totalSent}`);
    console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`   Alerts This Hour: ${stats.alertsThisHour}`);
    console.log(`   Deduplicated: ${stats.deduplicated}\n`);

    // Example 6: Deduplication Test
    console.log('Example 6: Deduplication Test\n');
    console.log('Sending same alert twice (should be deduplicated)...');
    
    await alertService.sendTokenAlert(newTokenAlert);
    console.log('First send: ✅');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await alertService.sendTokenAlert(newTokenAlert);
    console.log('Second send: (deduplicated)\n');

    const updatedStats = alertService.getStats();
    console.log(`Deduplicated count: ${updatedStats.deduplicated}\n`);

    console.log('============================================================');
    console.log('✅ All examples completed!');
    console.log('============================================================\n');

    // Shutdown
    await alertService.shutdown();

  } catch (error: any) {
    console.error('❌ Example failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Create mock fraud prediction for examples
 */
function createMockPrediction(
  fraudScore: number,
  potentialScore: number,
  riskLevel: string
): any {
  return {
    fraudRiskScore: fraudScore,
    fraudRiskLevel: riskLevel,
    potentialScore: potentialScore,
    potentialLevel: potentialScore > 80 ? 'HIGH_POTENTIAL' : 
                    potentialScore > 60 ? 'GOOD_POTENTIAL' : 'AVERAGE_POTENTIAL',
    confidence: 95,
    confidenceBreakdown: {
      overall: 95,
      dataQuality: 90,
      modelAgreement: 98,
      historicalValidation: 93,
      crossValidation: 97,
    },
    reasoning: `Analysis complete. Fraud risk: ${fraudScore}%, Potential: ${potentialScore}%`,
    recommendation: fraudScore > 60 ? 'AVOID' : fraudScore > 40 ? 'CAUTIOUS' : 'INVEST',
    features: {
      redFlags: fraudScore > 60 ? ['High ownership concentration', 'No liquidity lock'] : [],
      greenFlags: potentialScore > 70 ? ['Strong community', 'Verified team'] : [],
      mostImportant: [
        { feature: 'liquidity', impact: 0.8 },
        { feature: 'ownership', impact: 0.6 },
      ],
    },
  };
}

// Run examples
main().catch(console.error);

