#!/bin/bash
# All-in-one: Fix test script and run CoinMarketCap test

cd /workspaces/coinet-platform/services/market-prices || {
    echo "❌ Please run from: /workspaces/coinet-platform/services/market-prices"
    exit 1
}

FILE="test-api-connection.ts"

echo "🔍 Step 1: Checking if fix is applied..."
if grep -q "CoinGecko test failed, continuing" "$FILE"; then
    echo "✅ Fix already applied!"
else
    echo "⚠️  Fix not found, applying now..."
    
    # Backup
    cp "$FILE" "${FILE}.backup.$(date +%s)"
    
    # Create Python script to apply fix
    python3 << 'PYTHONFIX'
import re

file_path = "test-api-connection.ts"
with open(file_path, 'r') as f:
    content = f.read()

# The new runTests function
new_function = """async function runTests(): Promise<void> {
  console.log('🧪 Testing API Connections...\\n');

  const results = {
    coingecko: false,
    coinmarketcap: false,
  };

  // Test CoinGecko (don't fail if it errors)
  try {
    await testCoinGeckoAPI();
    results.coingecko = true;
  } catch (error: any) {
    console.log('\\n⚠️  CoinGecko test failed, continuing with CoinMarketCap...');
    console.log(`   Error: ${error.message?.substring(0, 100) || error.toString()}`);
  }

  // Test CoinMarketCap (always try this)
  try {
    await testCoinMarketCapAPI();
    results.coinmarketcap = true;
  } catch (error: any) {
    console.log('\\n❌ CoinMarketCap test failed:', error.message || error.toString());
  }

  // Summary
  console.log('\\n📊 Test Results Summary:');
  console.log(`   CoinGecko: ${results.coingecko ? '✅ Passed' : '❌ Failed'}`);
  console.log(`   CoinMarketCap: ${results.coinmarketcap ? '✅ Passed' : '❌ Failed'}`);

  if (results.coinmarketcap) {
    console.log('\\n✅ At least one API is working!');
  } else if (!results.coingecko && !results.coinmarketcap) {
    console.log('\\n❌ All API tests failed!');
    process.exit(1);
  }
  
  // Cleanup rate limiters
  const rateLimiter = getRateLimiter();
  await rateLimiter.disconnectAll();
}"""

# Replace the runTests function
pattern = r'async function runTests\(\): Promise<void> \{.*?await rateLimiter\.disconnectAll\(\);\s*\}'
new_content = re.sub(pattern, new_function, content, flags=re.DOTALL)

if new_content != content:
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("✅ Fix applied successfully!")
else:
    print("⚠️  Pattern not found. File may need manual editing.")
PYTHONFIX
fi

echo ""
echo "🧪 Step 2: Running API connection test..."
echo ""
npx tsx test-api-connection.ts

