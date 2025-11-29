#!/usr/bin/env ts-node
/**
 * Cache Clear Script
 * 
 * Clears the Redis cache for the market prices service.
 * 
 * Usage:
 *   npm run cache:clear
 *   npm run cache:clear -- --pattern="prices:*"
 */

import Redis from 'ioredis';
import { logger } from '../src/utils/logger';

async function main() {
  const args = process.argv.slice(2);
  const patternArg = args.find(a => a.startsWith('--pattern='));
  const pattern = patternArg?.split('=')[1] || '*';
  const dryRun = args.includes('--dry-run');

  console.log('\n🗑️  Cache Clear Script');
  console.log('='.repeat(50));

  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;

  console.log(`\n📡 Connecting to Redis: ${redisHost}:${redisPort}`);

  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    console.log('✅ Connected to Redis');

    // Find keys matching pattern
    console.log(`\n🔍 Finding keys matching: ${pattern}`);
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      console.log('   No keys found matching pattern');
      await redis.quit();
      process.exit(0);
    }

    console.log(`   Found ${keys.length} keys`);

    if (keys.length <= 10) {
      console.log('\n   Keys:');
      keys.forEach(k => console.log(`     - ${k}`));
    } else {
      console.log('\n   Sample keys:');
      keys.slice(0, 5).forEach(k => console.log(`     - ${k}`));
      console.log(`     ... and ${keys.length - 5} more`);
    }

    if (dryRun) {
      console.log('\n⚠️  Dry run mode - no keys deleted');
    } else {
      console.log('\n🗑️  Deleting keys...');
      
      // Delete in batches
      const batchSize = 1000;
      let deleted = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await redis.del(...batch);
        deleted += batch.length;
        
        if (keys.length > batchSize) {
          console.log(`   Progress: ${deleted}/${keys.length}`);
        }
      }

      console.log(`\n✅ Deleted ${deleted} keys`);
    }

    // Show memory stats
    const info = await redis.info('memory');
    const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1] || 'unknown';
    console.log(`\n📊 Redis memory usage: ${usedMemory}`);

    await redis.quit();
    console.log('\n✅ Cache clear complete');
    process.exit(0);

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Could not connect to Redis');
      console.log('   Make sure Redis is running or set REDIS_HOST');
    } else {
      logger.error('Cache clear failed', { error });
    }
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Cache clear failed', { error });
  process.exit(1);
});

