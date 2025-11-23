#!/usr/bin/env node
/**
 * Script to inspect DeFiLlama test mocks and automatically fix the implementation
 * Run in Codespace: node inspect-and-fix-defillama.js
 */

const fs = require('fs');
const path = require('path');

const TEST_FILE = path.join(__dirname, 'src/tests/defillama.test.ts');
const IMPL_FILE = path.join(__dirname, 'src/providers/defillama-rest.ts');

console.log('🔍 Inspecting DeFiLlama test file...\n');

if (!fs.existsSync(TEST_FILE)) {
  console.error('❌ Test file not found at:', TEST_FILE);
  process.exit(1);
}

const testContent = fs.readFileSync(TEST_FILE, 'utf8');

// Extract axios mock structure
console.log('📋 Axios Mock Structure:');
console.log('---');
const mockMatch = testContent.match(/vi\.mock\([^)]+\)|mockImplementation\([^}]+\)/gs);
if (mockMatch) {
  console.log(mockMatch[0].substring(0, 500));
} else {
  console.log('Could not find axios mock. Looking for mock patterns...');
  const mockPatterns = testContent.match(/mock[^;]+/gi);
  if (mockPatterns) {
    console.log(mockPatterns.slice(0, 3).join('\n'));
  }
}

console.log('\n📋 /yields endpoint mock:');
console.log('---');
const yieldsMatch = testContent.match(/\/yields[^}]+}/s) || testContent.match(/getPools[^}]+}/s);
if (yieldsMatch) {
  console.log(yieldsMatch[0].substring(0, 300));
} else {
  // Look for mock data structure
  const yieldsData = testContent.match(/yields.*?\[.*?\]/s) || testContent.match(/symbol.*?USDC.*?apy.*?3\.5/s);
  if (yieldsData) {
    console.log(yieldsData[0].substring(0, 200));
  }
}

console.log('\n📋 /stablecoins endpoint mock:');
console.log('---');
const stablecoinsMatch = testContent.match(/\/stablecoins[^}]+}/s) || testContent.match(/getStablecoins[^}]+}/s);
if (stablecoinsMatch) {
  console.log(stablecoinsMatch[0].substring(0, 300));
} else {
  const stablecoinsData = testContent.match(/stablecoins.*?\[.*?\]/s) || testContent.match(/symbol.*?USDT.*?peggedUSD/s);
  if (stablecoinsData) {
    console.log(stablecoinsData[0].substring(0, 200));
  }
}

// Try to extract the actual mock response structure
console.log('\n📋 Extracted Mock Response Structures:');
console.log('---');

// Look for mockResolvedValue patterns
const resolvedValues = testContent.match(/mockResolvedValue\([^)]+\)/g);
if (resolvedValues) {
  resolvedValues.forEach((val, i) => {
    console.log(`Mock ${i + 1}:`, val.substring(0, 150));
  });
}

// Look for the actual data structures in the test
const testDataPattern = /(?:expect|const result).*?\[.*?symbol.*?USDC.*?apy.*?3\.5/s;
const testData = testContent.match(testDataPattern);
if (testData) {
  console.log('\nFound test expectation:', testData[0].substring(0, 200));
}

console.log('\n💡 Analysis complete!');
console.log('Check the output above to see how mocks are structured.');
console.log('Then update getPools() and getStablecoins() in:', IMPL_FILE);

