#!/usr/bin/env ts-node
/**
 * Quick Health Check Test
 * Tests the health endpoint locally or remotely
 */

import axios from 'axios';

const BASE_URL = process.env.HEALTH_CHECK_URL || 'http://localhost:3000';

async function testHealth() {
  console.log(`\n🏥 Testing Health Endpoint: ${BASE_URL}\n`);
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, {
      timeout: 5000,
    });
    
    console.log('✅ Health Check Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('\n✅ Service is healthy!');
      process.exit(0);
    } else {
      console.log(`\n⚠️  Service returned status: ${response.status}`);
      process.exit(1);
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused - is the service running?');
      console.log('   Start with: npm run dev');
    } else if (error.response) {
      console.log(`❌ Health check failed: ${error.response.status}`);
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

testHealth();

