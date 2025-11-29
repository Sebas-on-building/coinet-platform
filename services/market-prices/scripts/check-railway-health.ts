/**
 * Railway Health Check Script
 * Monitors deployment status and tests health endpoint
 */

import axios from 'axios';

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://market-prices-production.up.railway.app';
const HEALTH_ENDPOINT = `${RAILWAY_URL}/api/health`;
const MAX_RETRIES = 30;
const RETRY_DELAY = 10000; // 10 seconds

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  uptime?: number;
  [key: string]: any;
}

async function checkHealth(): Promise<HealthResponse | null> {
  try {
    const response = await axios.get<HealthResponse>(HEALTH_ENDPOINT, {
      timeout: 5000,
    });
    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return null; // Service not ready
    }
    throw error;
  }
}

async function monitorDeployment(): Promise<void> {
  console.log('\n🚂 Railway Deployment Monitor');
  console.log('================================\n');
  console.log(`Service URL: ${RAILWAY_URL}`);
  console.log(`Health Endpoint: ${HEALTH_ENDPOINT}\n`);

  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      const health = await checkHealth();

      if (health) {
        console.log('✅ Health Check PASSED!\n');
        console.log('Response:');
        console.log(JSON.stringify(health, null, 2));
        console.log('\n🎉 Deployment is LIVE and HEALTHY!');
        process.exit(0);
      } else {
        retryCount++;
        console.log(`⏳ Service not responding (attempt ${retryCount}/${MAX_RETRIES})...`);
        console.log(`   Retrying in ${RETRY_DELAY / 1000}s...\n`);
        
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    } catch (error: any) {
      retryCount++;
      console.log(`⚠️  Error: ${error.message}`);
      console.log(`   Retrying in ${RETRY_DELAY / 1000}s... (${retryCount}/${MAX_RETRIES})\n`);
      
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  console.log(`\n❌ Health check failed after ${MAX_RETRIES} attempts`);
  console.log('   Check Railway dashboard: https://railway.app');
  console.log('   Or run: railway logs\n');
  process.exit(1);
}

monitorDeployment().catch(console.error);

