#!/usr/bin/env ts-node
/**
 * Manual Key Rotation Script
 * 
 * Triggers emergency key rotation for all providers or a specific provider.
 * 
 * Usage:
 *   npm run security:rotate-keys
 *   npm run security:rotate-keys -- --provider=coingecko
 */

import { getEnhancedKeyRotation } from '../src/security';
import { logger } from '../src/utils/logger';

async function main() {
  const args = process.argv.slice(2);
  const providerArg = args.find(a => a.startsWith('--provider='));
  const provider = providerArg?.split('=')[1];

  console.log('\n🔐 Key Rotation Script');
  console.log('='.repeat(50));

  const keyManager = getEnhancedKeyRotation();

  // Initialize with environment keys
  const keys = [];
  
  if (process.env.COINGECKO_API_KEY) {
    keys.push({
      provider: 'coingecko',
      key: process.env.COINGECKO_API_KEY,
      tier: 'free' as const,
      environment: 'production' as const,
    });
  }

  if (process.env.COINMARKETCAP_API_KEY) {
    keys.push({
      provider: 'coinmarketcap',
      key: process.env.COINMARKETCAP_API_KEY,
      tier: 'free' as const,
      environment: 'production' as const,
    });
  }

  if (keys.length === 0) {
    console.log('⚠️  No API keys found in environment variables');
    console.log('   Set COINGECKO_API_KEY and/or COINMARKETCAP_API_KEY');
    process.exit(1);
  }

  await keyManager.initialize(keys);

  if (provider) {
    console.log(`\n🔄 Rotating key for: ${provider}`);
    keyManager.rotateKey(provider, 'manual');
  } else {
    console.log('\n🔄 Rotating all keys...');
    for (const key of keys) {
      keyManager.rotateKey(key.provider, 'manual');
    }
  }

  // Show health status
  console.log('\n📊 Key Health Status:');
  const healthStatus = keyManager.getHealthStatus();
  
  for (const [prov, health] of healthStatus) {
    console.log(`\n  ${prov}:`);
    for (const h of health) {
      const status = h.healthy ? '✅' : '❌';
      console.log(`    ${status} Key ${h.keyHash.substring(0, 8)}... - Success: ${h.successRate.toFixed(1)}%`);
    }
  }

  console.log('\n✅ Key rotation complete');
  
  // Cleanup
  keyManager.destroy();
  process.exit(0);
}

main().catch(error => {
  logger.error('Key rotation failed', { error });
  process.exit(1);
});

