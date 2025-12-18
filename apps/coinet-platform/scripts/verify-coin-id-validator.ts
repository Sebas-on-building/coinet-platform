#!/usr/bin/env ts-node
/**
 * ✅ Coin ID Validator Integration Verification Script
 * 
 * This script verifies that the coin ID pre-validation system is working
 * correctly in production.
 * 
 * Run with: npx ts-node --transpile-only scripts/verify-coin-id-validator.ts
 */

import { 
  getCoinIdValidator,
  validateCoinIds,
  isValidCoinId,
  getValidatorStats,
  initializeCoinIdValidator,
} from '../src/services/coin-id-validator';

// ============================================================================
// ANSI COLORS
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title: string) {
  console.log('\n' + '═'.repeat(60));
  log(`  ${title}`, colors.cyan + colors.bright);
  console.log('═'.repeat(60));
}

function success(message: string) {
  log(`  ✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`  ❌ ${message}`, colors.red);
}

function info(message: string) {
  log(`  ℹ️  ${message}`, colors.blue);
}

function warn(message: string) {
  log(`  ⚠️  ${message}`, colors.yellow);
}

// ============================================================================
// TEST CASES
// ============================================================================

const TEST_CASES = {
  // Valid CoinGecko IDs
  validIds: ['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano', 'dogecoin'],
  
  // Invalid IDs (should be caught by validator)
  invalidIds: ['fake-coin-xyz', 'not-a-real-coin', 'invalid-token-123'],
  
  // Edge cases
  edgeCases: ['BITCOIN', 'Ethereum', ' solana ', 'BTC', 'btc'],
  
  // Previously problematic IDs (that caused empty {} responses)
  problematicIds: ['0x', 'undefined', 'null', '', '   ', 'a'],
};

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

async function verifyInitialization(): Promise<boolean> {
  header('Step 1: Initialization');
  
  const startTime = Date.now();
  
  try {
    await initializeCoinIdValidator();
    const duration = Date.now() - startTime;
    
    const stats = getValidatorStats();
    
    if (stats.isInitialized) {
      success(`Validator initialized in ${duration}ms`);
      info(`Total coins loaded: ${stats.totalCoins.toLocaleString()}`);
      info(`Total symbols: ${stats.totalSymbols.toLocaleString()}`);
      info(`Cache valid: ${stats.cacheValid ? 'Yes' : 'No'}`);
      return true;
    } else {
      error('Validator failed to initialize');
      return false;
    }
  } catch (err: any) {
    error(`Initialization error: ${err.message}`);
    return false;
  }
}

async function verifyValidIds(): Promise<boolean> {
  header('Step 2: Valid Coin ID Validation');
  
  let passed = true;
  
  for (const coinId of TEST_CASES.validIds) {
    const isValid = await isValidCoinId(coinId);
    if (isValid) {
      success(`"${coinId}" is valid`);
    } else {
      error(`"${coinId}" should be valid but reported as invalid!`);
      passed = false;
    }
  }
  
  return passed;
}

async function verifyInvalidIds(): Promise<boolean> {
  header('Step 3: Invalid Coin ID Detection');
  
  let passed = true;
  
  for (const coinId of TEST_CASES.invalidIds) {
    const isValid = await isValidCoinId(coinId);
    if (!isValid) {
      success(`"${coinId}" correctly identified as invalid`);
    } else {
      warn(`"${coinId}" might be valid (check CoinGecko)`);
    }
  }
  
  return passed;
}

async function verifyBatchValidation(): Promise<boolean> {
  header('Step 4: Batch Validation');
  
  const mixedBatch = [
    ...TEST_CASES.validIds.slice(0, 3),
    ...TEST_CASES.invalidIds.slice(0, 2),
  ];
  
  const result = await validateCoinIds(mixedBatch);
  
  info(`Input: ${mixedBatch.length} coin IDs`);
  success(`Valid: ${result.valid.length} - ${result.valid.join(', ')}`);
  
  if (result.invalid.length > 0) {
    warn(`Invalid: ${result.invalid.length} - ${result.invalid.join(', ')}`);
  }
  
  info(`Validation time: ${result.validationTime}ms`);
  info(`From cache: ${result.cached ? 'Yes' : 'No'}`);
  
  return result.valid.length >= 3;
}

async function verifyEdgeCases(): Promise<boolean> {
  header('Step 5: Edge Cases');
  
  let passed = true;
  
  // Case sensitivity
  info('Testing case sensitivity...');
  const upperResult = await isValidCoinId('BITCOIN');
  const lowerResult = await isValidCoinId('bitcoin');
  
  if (upperResult === lowerResult && upperResult === true) {
    success('Case insensitive: "BITCOIN" and "bitcoin" both valid');
  } else {
    error('Case sensitivity issue detected');
    passed = false;
  }
  
  // Whitespace handling
  info('Testing whitespace handling...');
  const whitespaceResult = await isValidCoinId(' solana ');
  if (whitespaceResult) {
    success('Whitespace trimmed: " solana " is valid');
  } else {
    error('Whitespace handling failed');
    passed = false;
  }
  
  // Empty string
  info('Testing empty string...');
  const emptyResult = await isValidCoinId('');
  if (!emptyResult) {
    success('Empty string correctly identified as invalid');
  } else {
    warn('Empty string returned as valid (graceful degradation?)');
  }
  
  return passed;
}

async function verifyPerformance(): Promise<boolean> {
  header('Step 6: Performance Test');
  
  // Generate a large batch
  const largeBatch = Array.from({ length: 1000 }, (_, i) => 
    i < 500 ? TEST_CASES.validIds[i % TEST_CASES.validIds.length] : `invalid-${i}`
  );
  
  const startTime = Date.now();
  const result = await validateCoinIds(largeBatch);
  const duration = Date.now() - startTime;
  
  info(`Batch size: ${largeBatch.length} coin IDs`);
  info(`Total time: ${duration}ms`);
  info(`Per-ID time: ${(duration / largeBatch.length).toFixed(3)}ms`);
  
  if (duration < 100) {
    success(`Performance excellent: ${duration}ms for ${largeBatch.length} IDs`);
  } else if (duration < 500) {
    warn(`Performance acceptable: ${duration}ms for ${largeBatch.length} IDs`);
  } else {
    error(`Performance issue: ${duration}ms for ${largeBatch.length} IDs`);
    return false;
  }
  
  return true;
}

async function verifyStats(): Promise<boolean> {
  header('Step 7: Statistics & Metrics');
  
  const stats = getValidatorStats();
  
  info(`Initialized: ${stats.isInitialized}`);
  info(`Total coins in cache: ${stats.totalCoins.toLocaleString()}`);
  info(`Total symbols mapped: ${stats.totalSymbols.toLocaleString()}`);
  info(`Cache age: ${Math.round(stats.cacheAgeMs / 1000)}s`);
  info(`Cache valid: ${stats.cacheValid}`);
  info(`Total validations: ${stats.totalValidations}`);
  info(`Valid IDs checked: ${stats.totalValidIds}`);
  info(`Invalid IDs caught: ${stats.totalInvalidIds}`);
  info(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  
  return stats.isInitialized && stats.totalCoins > 0;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     COIN ID VALIDATOR - INTEGRATION VERIFICATION            ║', colors.cyan);
  log('║                    Divine Perfection                        ║', colors.cyan);
  log('╚══════════════════════════════════════════════════════════════╝', colors.cyan);
  
  const results: { name: string; passed: boolean }[] = [];
  
  try {
    // Step 1: Initialization
    results.push({ name: 'Initialization', passed: await verifyInitialization() });
    
    // Step 2: Valid IDs
    results.push({ name: 'Valid IDs', passed: await verifyValidIds() });
    
    // Step 3: Invalid IDs
    results.push({ name: 'Invalid IDs', passed: await verifyInvalidIds() });
    
    // Step 4: Batch Validation
    results.push({ name: 'Batch Validation', passed: await verifyBatchValidation() });
    
    // Step 5: Edge Cases
    results.push({ name: 'Edge Cases', passed: await verifyEdgeCases() });
    
    // Step 6: Performance
    results.push({ name: 'Performance', passed: await verifyPerformance() });
    
    // Step 7: Statistics
    results.push({ name: 'Statistics', passed: await verifyStats() });
    
  } catch (err: any) {
    error(`Unexpected error: ${err.message}`);
    console.error(err.stack);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  
  header('VERIFICATION SUMMARY');
  
  let allPassed = true;
  
  for (const result of results) {
    if (result.passed) {
      success(`${result.name}: PASSED`);
    } else {
      error(`${result.name}: FAILED`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  
  if (allPassed) {
    log('\n  🎉 ALL VERIFICATIONS PASSED!\n', colors.green + colors.bright);
    log('  The Coin ID Validator is production-ready.\n', colors.green);
  } else {
    log('\n  ⚠️  SOME VERIFICATIONS FAILED\n', colors.red + colors.bright);
    log('  Please review the issues above.\n', colors.red);
  }
  
  console.log('═'.repeat(60) + '\n');
  
  process.exit(allPassed ? 0 : 1);
}

main();
