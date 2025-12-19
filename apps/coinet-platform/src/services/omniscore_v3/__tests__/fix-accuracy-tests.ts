/**
 * Script to help fix accuracy tests
 * This file documents the fixes needed
 */

// Fix 1: Replace computeOmniScore with calculateSnapshot
// Pattern:
// OLD: const result = await computeOmniScore(input);
// NEW: 
//   const bundle = createTestBundle(assetId, dataPoints);
//   const result = await calculateSnapshot({ bundle, config: {} });

// Fix 2: Update data point keys to match feature inputs
// Features expect keys like:
// - QS: audit_count, audit_score, has_bug_bounty, incident_count_12m, etc.
// - OS: price_change_24h, price_change_7d, volume_change_24h, etc.
// - Risk: liquidity_depth, top_10_concentration, unlock_schedule_30d, etc.

// Fix 3: For CIS tests, use feature IDs that match CIS mapping
// CIS expects: qs_security_posture_v1, os_momentum_v1, etc.
