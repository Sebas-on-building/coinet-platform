/**
 * 🧪 Birdeye API Key Test Script
 * 
 * Tests if BIRDEYE_API_KEY is working correctly
 * 
 * Usage:
 *   BIRDEYE_API_KEY=your_key npx ts-node --transpile-only scripts/test-birdeye-api.ts
 */

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || '';

if (!BIRDEYE_API_KEY) {
  console.error('❌ BIRDEYE_API_KEY environment variable not set');
  console.log('\nUsage:');
  console.log('  BIRDEYE_API_KEY=your_key npx ts-node --transpile-only scripts/test-birdeye-api.ts');
  process.exit(1);
}

console.log('🧪 Testing Birdeye API Key...\n');
console.log(`Key (first 8 chars): ${BIRDEYE_API_KEY.slice(0, 8)}...`);
console.log(`Key length: ${BIRDEYE_API_KEY.length} characters\n`);

// Test 1: Price endpoint (simplest)
async function testPriceEndpoint() {
  console.log('📊 Test 1: Price Endpoint');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(
      'https://public-api.birdeye.so/defi/price?address=So11111111111111111111111111111111111111112',
      {
        headers: {
          'X-API-KEY': BIRDEYE_API_KEY,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText}`);
      
      if (response.status === 401) {
        console.error('\n💡 API key is invalid or missing');
        console.error('   Check: BIRDEYE_API_KEY in Railway matches your dashboard');
      } else if (response.status === 403) {
        console.error('\n💡 API key doesn\'t have permission');
        console.error('   Check: Whitelist/Blacklist settings in Birdeye dashboard');
      } else if (response.status === 429) {
        console.error('\n💡 Rate limit hit');
        console.error('   Wait 1 minute and try again');
      }
      return false;
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      console.log('✅ SUCCESS!');
      console.log(`   Price: $${data.data.value}`);
      console.log(`   Updated: ${data.data.updateHumanTime}`);
      return true;
    } else {
      console.error('❌ Unexpected response format:', JSON.stringify(data, null, 2));
      return false;
    }

  } catch (error) {
    console.error('❌ Network error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Test 2: Token overview endpoint
async function testTokenOverview() {
  console.log('\n📈 Test 2: Token Overview');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(
      'https://public-api.birdeye.so/defi/token_overview?address=So11111111111111111111111111111111111111112',
      {
        headers: {
          'X-API-KEY': BIRDEYE_API_KEY,
          'x-chain': 'solana',
          'accept': 'application/json',
        },
      }
    );

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText}`);
      return false;
    }

    const data = await response.json();
    
    if (data.data) {
      console.log('✅ SUCCESS!');
      console.log(`   Symbol: ${data.data.symbol || 'N/A'}`);
      console.log(`   Name: ${data.data.name || 'N/A'}`);
      console.log(`   Price: $${data.data.price || 'N/A'}`);
      return true;
    } else {
      console.error('❌ Unexpected response format');
      return false;
    }

  } catch (error) {
    console.error('❌ Network error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Run tests
async function runTests() {
  const test1 = await testPriceEndpoint();
  const test2 = await testTokenOverview();

  console.log('\n' + '═'.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('═'.repeat(50));
  console.log(`Price Endpoint:     ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Token Overview:     ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('═'.repeat(50));

  if (test1 && test2) {
    console.log('\n🎉 All tests passed! Your Birdeye API key is working correctly.');
    console.log('\nNext steps:');
    console.log('  1. Add BIRDEYE_API_KEY to Railway Variables');
    console.log('  2. Redeploy coinet-platform service');
    console.log('  3. Test meme coin analysis endpoint');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
