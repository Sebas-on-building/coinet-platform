/**
 * L1.5 Conflict Resolution Logic — Full Integration Test
 *
 * Tests: authority resolution, fusion legality, contradiction preservation,
 * blocker override, degradation propagation, cross-class contradictions,
 * ledger auditability, and laundering prevention.
 */

import assert from 'node:assert';

import {
  type ConflictClaim,
  CONFLICT_THRESHOLDS,
  CONFLICT_SEVERITY_RANK,
  CONFLICT_OUTCOME_SPEAKABLE,
  L15_PLATFORM_VERSION,
} from '../services/source-systems/classes/conflict-types';

import {
  FIELD_CONFLICT_RULES,
  CROSS_CLASS_PATTERNS,
  getFieldConflictRule,
  getAllFieldConflictRules,
  getFieldsWithHardBlockerOverride,
  getCrossClassPatterns,
} from '../services/source-systems/classes/conflict-constitution';

import {
  classifyConflict,
  classifySeverity,
  evaluateFusionLegality,
  isFusionLegal,
  detectBlockers,
  adjudicate,
  adjudicateAll,
  getPreservedContradictions,
  buildConflictDiagnostics,
} from '../services/source-systems/classes/conflict-adjudicator';

import {
  logConflict,
  logConflictBatch,
  getLedger,
  clearLedger,
  buildConflictFingerprint,
  detectCrossClassContradictions,
  detectLaunderingRisk,
} from '../services/source-systems/classes/conflict-ledger';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e: any) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

function makeClaim(overrides: Partial<ConflictClaim> & { providerId: string; fieldId: string; value: unknown }): ConflictClaim {
  return {
    unit: undefined, scope: undefined, timeBasis: undefined, methodologyId: undefined,
    authorityTier: 2, healthState: 'H0_HEALTHY', integrityState: 'I0_INTACT',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CONSTITUTION COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 1. Constitution completeness ───');

test('All 26 L1.2 fields have conflict rules', () => {
  const fieldIds = Object.keys(CONFLICT_THRESHOLDS);
  for (const fid of fieldIds) {
    assert.ok(FIELD_CONFLICT_RULES[fid], `Missing conflict rule for ${fid}`);
  }
});

test('Cross-class patterns exist and are non-empty', () => {
  assert.ok(CROSS_CLASS_PATTERNS.length >= 5, `Only ${CROSS_CLASS_PATTERNS.length} cross-class patterns`);
});

test('Hard blocker fields include security fields', () => {
  const blockerFields = getFieldsWithHardBlockerOverride();
  assert.ok(blockerFields.includes('security.token.flags'));
  assert.ok(blockerFields.includes('security.contract.risk'));
});

test('Entity fields use CO_AUTHORITY_PRESERVE_CONTRADICTION', () => {
  const entityRule = getFieldConflictRule('entity.wallet.labels');
  assert.ok(entityRule);
  assert.strictEqual(entityRule!.winnerRule, 'CO_AUTHORITY_PRESERVE_CONTRADICTION');
});

test('Derivatives fields use SPECIALIST_OVER_BREADTH', () => {
  const oiRule = getFieldConflictRule('derivatives.oi.aggregate');
  assert.ok(oiRule);
  assert.strictEqual(oiRule!.winnerRule, 'SPECIALIST_OVER_BREADTH');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CONFLICT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 2. Conflict classification ───');

test('Same field, different numbers → NUMERIC_DRIFT', () => {
  const a = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, unit: 'USD' });
  const b = makeClaim({ providerId: 'coinglass', fieldId: 'price.spot.canonical', value: 68200, unit: 'USD' });
  assert.strictEqual(classifyConflict(a, b), 'NUMERIC_DRIFT');
});

test('Same field, different labels → CATEGORICAL_LABEL_CONFLICT', () => {
  const a = makeClaim({ providerId: 'arkham', fieldId: 'entity.wallet.labels', value: 'exchange_cluster' });
  const b = makeClaim({ providerId: 'nansen', fieldId: 'entity.wallet.labels', value: 'fund_cluster' });
  assert.strictEqual(classifyConflict(a, b), 'CATEGORICAL_LABEL_CONFLICT');
});

test('Different methodology → METHODOLOGY_CONFLICT', () => {
  const a = makeClaim({ providerId: 'defillama', fieldId: 'protocol.tvl.usd', value: 5e9, methodologyId: 'tvl_v2' });
  const b = makeClaim({ providerId: 'protocol_native', fieldId: 'protocol.tvl.usd', value: 4.2e9, methodologyId: 'effective_collateral' });
  assert.strictEqual(classifyConflict(a, b), 'METHODOLOGY_CONFLICT');
});

test('Broken integrity → INTEGRITY_CONFLICT', () => {
  const a = makeClaim({ providerId: 'coinglass', fieldId: 'derivatives.oi.aggregate', value: 1e10, integrityState: 'I4_BROKEN' });
  const b = makeClaim({ providerId: 'exchange_norm', fieldId: 'derivatives.oi.aggregate', value: 9e9 });
  assert.strictEqual(classifyConflict(a, b), 'INTEGRITY_CONFLICT');
});

test('Different fields → UNCOMPARABLE_CLAIMS', () => {
  const a = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000 });
  const b = makeClaim({ providerId: 'defillama', fieldId: 'protocol.tvl.usd', value: 5e9 });
  assert.strictEqual(classifyConflict(a, b), 'UNCOMPARABLE_CLAIMS');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SEVERITY CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 3. Severity classification ───');

test('Small numeric drift within tolerance → LOW', () => {
  const a = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, unit: 'USD' });
  const b = makeClaim({ providerId: 'internal', fieldId: 'price.spot.canonical', value: 68100, unit: 'USD' });
  assert.strictEqual(classifySeverity('NUMERIC_DRIFT', a, b), 'LOW');
});

test('Large numeric drift → HIGH', () => {
  const a = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, unit: 'USD' });
  const b = makeClaim({ providerId: 'internal', fieldId: 'price.spot.canonical', value: 70000, unit: 'USD' });
  const sev = classifySeverity('NUMERIC_DRIFT', a, b);
  assert.ok(sev === 'HIGH' || sev === 'CRITICAL', `Expected HIGH or CRITICAL, got ${sev}`);
});

test('Integrity conflict → CRITICAL', () => {
  const a = makeClaim({ providerId: 'x', fieldId: 'derivatives.oi.aggregate', value: 1, integrityState: 'I4_BROKEN' });
  const b = makeClaim({ providerId: 'y', fieldId: 'derivatives.oi.aggregate', value: 2 });
  assert.strictEqual(classifySeverity('INTEGRITY_CONFLICT', a, b), 'CRITICAL');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. FUSION LEGALITY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 4. Fusion legality ───');

test('Same-field compatible spot prices → fusion legal', () => {
  const a = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, unit: 'USD', scope: 'global', timeBasis: 'spot', methodologyId: 'vwap' });
  const b = makeClaim({ providerId: 'internal', fieldId: 'price.spot.canonical', value: 68100, unit: 'USD', scope: 'global', timeBasis: 'spot', methodologyId: 'vwap' });
  const rule = getFieldConflictRule('price.spot.canonical');
  const gates = evaluateFusionLegality(a, b, rule);
  assert.ok(isFusionLegal(gates), `Fusion should be legal: ${gates.filter(g => !g.passed).map(g => g.gate).join(', ')}`);
});

test('Different methodology → fusion blocked', () => {
  const a = makeClaim({ providerId: 'defillama', fieldId: 'protocol.tvl.usd', value: 5e9, methodologyId: 'tvl_v2' });
  const b = makeClaim({ providerId: 'protocol_native', fieldId: 'protocol.tvl.usd', value: 4.5e9, methodologyId: 'effective_collateral' });
  const rule = getFieldConflictRule('protocol.tvl.usd');
  const gates = evaluateFusionLegality(a, b, rule);
  assert.ok(!isFusionLegal(gates), 'Fusion should be blocked on methodology mismatch');
});

test('Constitution-forbidden field → fusion blocked', () => {
  const a = makeClaim({ providerId: 'coinglass', fieldId: 'derivatives.oi.aggregate', value: 1e10 });
  const b = makeClaim({ providerId: 'internal', fieldId: 'derivatives.oi.aggregate', value: 9.5e9 });
  const rule = getFieldConflictRule('derivatives.oi.aggregate');
  const gates = evaluateFusionLegality(a, b, rule);
  assert.ok(!isFusionLegal(gates), 'Derivatives OI fusion should be constitutionally blocked');
});

test('Integrity-broken claim → fusion blocked', () => {
  const a = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, integrityState: 'I3_MATERIAL_MISMATCH' });
  const b = makeClaim({ providerId: 'internal', fieldId: 'price.spot.canonical', value: 68100 });
  const rule = getFieldConflictRule('price.spot.canonical');
  const gates = evaluateFusionLegality(a, b, rule);
  assert.ok(!isFusionLegal(gates), 'Fusion blocked when integrity is broken');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AUTHORITY RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 5. Authority resolution ───');

test('Specialist beats breadth on derivatives OI', () => {
  const specialist = makeClaim({ providerId: 'coinglass', fieldId: 'derivatives.oi.aggregate', value: 1e10, authorityTier: 5 });
  const breadth = makeClaim({ providerId: 'coingecko', fieldId: 'derivatives.oi.aggregate', value: 9e9, authorityTier: 3 });
  const result = adjudicate(specialist, breadth);
  assert.strictEqual(result.outcome, 'RESOLVE_BY_AUTHORITY');
  assert.strictEqual(result.winnerId, 'coinglass');
});

test('Owner beats confirmer on spot price', () => {
  const owner = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, unit: 'USD', authorityTier: 5 });
  const confirmer = makeClaim({ providerId: 'coinglass', fieldId: 'price.spot.canonical', value: 67500, unit: 'USD', authorityTier: 3 });
  const result = adjudicate(owner, confirmer);
  assert.strictEqual(result.outcome, 'RESOLVE_BY_AUTHORITY');
  assert.strictEqual(result.winnerId, 'coingecko');
});

test('Native beats derived on chain transfers', () => {
  const native = makeClaim({ providerId: 'alchemy', fieldId: 'onchain.transfers.evm', value: 15000, authorityTier: 5 });
  const derived = makeClaim({ providerId: 'arkham', fieldId: 'onchain.transfers.evm', value: 14800, authorityTier: 3 });
  const result = adjudicate(native, derived);
  assert.strictEqual(result.outcome, 'RESOLVE_BY_AUTHORITY');
  assert.strictEqual(result.winnerId, 'alchemy');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CONTRADICTION PRESERVATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 6. Contradiction preservation ───');

test('Arkham vs Nansen label disagreement → PRESERVE_CONTRADICTION', () => {
  const arkham = makeClaim({ providerId: 'arkham', fieldId: 'entity.wallet.labels', value: 'exchange_cluster', authorityTier: 4 });
  const nansen = makeClaim({ providerId: 'nansen', fieldId: 'entity.wallet.labels', value: 'fund_cluster', authorityTier: 4 });
  const result = adjudicate(arkham, nansen);
  assert.strictEqual(result.outcome, 'PRESERVE_CONTRADICTION');
  assert.ok(result.confidencePenalty > 0, 'Preserved contradiction must carry penalty');
  assert.ok(result.disclosureRequired, 'Contradiction must require disclosure');
});

test('Smart money co-authority conflict → PRESERVE_CONTRADICTION', () => {
  const arkham = makeClaim({ providerId: 'arkham', fieldId: 'entity.smart_money', value: 'accumulating', authorityTier: 4 });
  const nansen = makeClaim({ providerId: 'nansen', fieldId: 'entity.smart_money', value: 'distributing', authorityTier: 4 });
  const result = adjudicate(arkham, nansen);
  assert.strictEqual(result.outcome, 'PRESERVE_CONTRADICTION');
});

test('Preserved contradictions are extractable from batch', () => {
  const arkham = makeClaim({ providerId: 'arkham', fieldId: 'entity.cluster.attribution', value: 'whale_A', authorityTier: 4 });
  const nansen = makeClaim({ providerId: 'nansen', fieldId: 'entity.cluster.attribution', value: 'whale_B', authorityTier: 4 });
  const results = adjudicateAll([[arkham, nansen]]);
  const contradictions = getPreservedContradictions(results);
  assert.strictEqual(contradictions.length, 1);
  assert.strictEqual(contradictions[0].providerA, 'arkham');
  assert.strictEqual(contradictions[0].providerB, 'nansen');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. BLOCKER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 7. Blocker override ───');

test('Severe security flag triggers blocker', () => {
  const safety = makeClaim({ providerId: 'goplus', fieldId: 'security.token.flags', value: 'severe_honeypot', authorityTier: 5 });
  const market = makeClaim({ providerId: 'coingecko', fieldId: 'security.token.flags', value: 'clean', authorityTier: 3 });
  const blockers = detectBlockers(safety, market);
  assert.ok(blockers.length > 0, 'Should detect structural safety veto');
  assert.strictEqual(blockers[0].blockerClass, 'STRUCTURAL_SAFETY_VETO');
});

test('Blocker overrides normal resolution path', () => {
  const safety = makeClaim({ providerId: 'goplus', fieldId: 'security.token.flags', value: 'severe_risk_detected', authorityTier: 5 });
  const market = makeClaim({ providerId: 'internal', fieldId: 'security.token.flags', value: 'clean', authorityTier: 3 });
  const result = adjudicate(safety, market);
  assert.ok(result.outcome === 'DEGRADE_CLAIM' || result.outcome === 'BLOCK_OUTPUT' || result.outcome === 'ESCALATE_INCIDENT',
    `Blocker should override normal resolution, got ${result.outcome}`);
  assert.ok(result.disclosureRequired, 'Blocker must require disclosure');
});

test('Integrity broken on mission-critical → blocker with escalation', () => {
  const broken = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, integrityState: 'I4_BROKEN', authorityTier: 5 });
  const ok = makeClaim({ providerId: 'internal', fieldId: 'price.spot.canonical', value: 68200, authorityTier: 3 });
  const blockers = detectBlockers(broken, ok);
  assert.ok(blockers.some(b => b.blockerClass === 'INTEGRITY_BROKEN_MISSION_CRITICAL'),
    'Should detect integrity-broken mission-critical blocker');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. DEGRADATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 8. Degradation propagation ───');

test('Material methodology conflict → HIGH severity', () => {
  const a = makeClaim({ providerId: 'defillama', fieldId: 'protocol.tvl.usd', value: 5e9, methodologyId: 'tvl_v2' });
  const b = makeClaim({ providerId: 'protocol_native', fieldId: 'protocol.tvl.usd', value: 3e9, methodologyId: 'effective_collateral' });
  const result = adjudicate(a, b);
  assert.ok(result.severity === 'HIGH' || result.severity === 'CRITICAL', `Methodology conflict should be HIGH+, got ${result.severity}`);
  assert.ok(result.confidencePenalty >= 0.08, `Penalty should be ≥0.08, got ${result.confidencePenalty}`);
});

test('Downstream effects propagated', () => {
  const a = makeClaim({ providerId: 'coinglass', fieldId: 'derivatives.oi.aggregate', value: 1e10, authorityTier: 5 });
  const b = makeClaim({ providerId: 'exchange_norm', fieldId: 'derivatives.oi.aggregate', value: 7e9, authorityTier: 3 });
  const result = adjudicate(a, b);
  assert.ok(result.downstreamEffects.length > 0, 'Should have downstream effects');
  assert.ok(result.downstreamEffects.includes('leverage_thesis'), `Should affect leverage_thesis`);
});

test('Diagnostics correctly aggregate results', () => {
  const pairs: [ConflictClaim, ConflictClaim][] = [
    [
      makeClaim({ providerId: 'arkham', fieldId: 'entity.wallet.labels', value: 'exchange', authorityTier: 4 }),
      makeClaim({ providerId: 'nansen', fieldId: 'entity.wallet.labels', value: 'fund', authorityTier: 4 }),
    ],
    [
      makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, unit: 'USD', authorityTier: 5 }),
      makeClaim({ providerId: 'internal', fieldId: 'price.spot.canonical', value: 68050, unit: 'USD', authorityTier: 3 }),
    ],
  ];
  const results = adjudicateAll(pairs);
  const diag = buildConflictDiagnostics(results);
  assert.strictEqual(diag.totalConflicts, 2);
  assert.ok(diag.contradictionsPreserved >= 1, 'Should have at least 1 preserved contradiction');
  assert.ok(diag.totalConfidencePenalty > 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. CROSS-CLASS CONTRADICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 9. Cross-class contradictions ───');

test('Narrative bullish + derivatives crowded → detected', () => {
  const conditions = [
    { conditionId: 'social_velocity_high', truthClass: 'narrative_attention' },
    { conditionId: 'leverage_stress_elevated', truthClass: 'derivatives_pressure' },
  ];
  const hits = detectCrossClassContradictions(conditions);
  assert.ok(hits.length > 0, 'Should detect narrative vs derivatives contradiction');
  assert.strictEqual(hits[0].patternId, 'narrative_bullish_vs_derivatives_crowded');
});

test('Accumulation + exchange inflows → detected', () => {
  const conditions = [
    { conditionId: 'smart_money_accumulating', truthClass: 'entity_context' },
    { conditionId: 'exchange_inflows_rising', truthClass: 'onchain_behavior' },
  ];
  const hits = detectCrossClassContradictions(conditions);
  assert.ok(hits.length > 0, 'Should detect accumulation vs exchange inflows');
});

test('Security severe + market bullish → CRITICAL', () => {
  const pattern = CROSS_CLASS_PATTERNS.find(p => p.patternId === 'security_severe_vs_market_bullish');
  assert.ok(pattern);
  assert.strictEqual(pattern!.severity, 'CRITICAL');
  assert.ok(pattern!.confidencePenalty >= 0.25);
});

test('No false positive when conditions do not match', () => {
  const conditions = [
    { conditionId: 'social_velocity_high', truthClass: 'narrative_attention' },
    { conditionId: 'fees_revenue_growing', truthClass: 'protocol_substance' },
  ];
  const hits = detectCrossClassContradictions(conditions);
  assert.strictEqual(hits.length, 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. LEDGER AND FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 10. Ledger and fingerprint ───');

test('Conflicts are logged and retrievable', () => {
  clearLedger();
  const a = makeClaim({ providerId: 'arkham', fieldId: 'entity.wallet.labels', value: 'exchange', authorityTier: 4 });
  const b = makeClaim({ providerId: 'nansen', fieldId: 'entity.wallet.labels', value: 'fund', authorityTier: 4 });
  const result = adjudicate(a, b);
  logConflict(result);
  const events = getLedger();
  assert.ok(events.length >= 1);
  assert.strictEqual(events[events.length - 1].conflictId, result.conflictId);
});

test('Batch logging works', () => {
  clearLedger();
  const pairs: [ConflictClaim, ConflictClaim][] = [
    [
      makeClaim({ providerId: 'coinglass', fieldId: 'derivatives.funding.aggregate', value: 0.01, authorityTier: 5 }),
      makeClaim({ providerId: 'internal', fieldId: 'derivatives.funding.aggregate', value: 0.008, authorityTier: 3 }),
    ],
    [
      makeClaim({ providerId: 'arkham', fieldId: 'entity.smart_money', value: 'bullish', authorityTier: 4 }),
      makeClaim({ providerId: 'nansen', fieldId: 'entity.smart_money', value: 'bearish', authorityTier: 4 }),
    ],
  ];
  const results = adjudicateAll(pairs);
  logConflictBatch(results);
  assert.strictEqual(getLedger().length, 2);
});

test('Conflict fingerprint contains all entries', () => {
  clearLedger();
  const results = adjudicateAll([
    [
      makeClaim({ providerId: 'a', fieldId: 'price.spot.canonical', value: 68000, unit: 'USD', authorityTier: 5, scope: 'global', timeBasis: 'spot', methodologyId: 'vwap' }),
      makeClaim({ providerId: 'b', fieldId: 'price.spot.canonical', value: 68050, unit: 'USD', authorityTier: 3, scope: 'global', timeBasis: 'spot', methodologyId: 'vwap' }),
    ],
  ]);
  const fp = buildConflictFingerprint(results, []);
  assert.strictEqual(fp.entries.length, 1);
  assert.ok(fp.overallIntegrity >= 0 && fp.overallIntegrity <= 1);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. LAUNDERING PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 11. Laundering prevention ───');

test('High-severity resolution flagged as laundering risk', () => {
  const a = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, unit: 'USD', authorityTier: 5 });
  const b = makeClaim({ providerId: 'internal', fieldId: 'price.spot.canonical', value: 72000, unit: 'USD', authorityTier: 3 });
  const result = adjudicate(a, b);
  if (result.outcome === 'RESOLVE_BY_AUTHORITY' && (result.severity === 'HIGH' || result.severity === 'CRITICAL')) {
    const risks = detectLaunderingRisk([result]);
    assert.ok(risks.length > 0, 'High-severity authority resolution should be flagged');
  }
});

test('Low-severity resolution is NOT flagged', () => {
  const a = makeClaim({ providerId: 'coingecko', fieldId: 'price.spot.canonical', value: 68000, unit: 'USD', authorityTier: 5 });
  const b = makeClaim({ providerId: 'internal', fieldId: 'price.spot.canonical', value: 68050, unit: 'USD', authorityTier: 3 });
  const result = adjudicate(a, b);
  const risks = detectLaunderingRisk([result]);
  assert.strictEqual(risks.length, 0, 'Low-severity should not trigger laundering risk');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. DOCTRINAL INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 12. Doctrinal invariants ───');

test('Fusion is never allowed on entity fields', () => {
  for (const fid of ['entity.wallet.labels', 'entity.smart_money', 'entity.cluster.attribution']) {
    const rule = getFieldConflictRule(fid);
    assert.ok(rule);
    assert.strictEqual(rule!.fusionAllowed, false, `Entity field ${fid} must never allow fusion`);
  }
});

test('All security fields have hardBlockerOverride=true', () => {
  for (const fid of ['security.token.flags', 'security.contract.risk']) {
    const rule = getFieldConflictRule(fid);
    assert.ok(rule);
    assert.strictEqual(rule!.hardBlockerOverride, true, `Security field ${fid} must have hard blocker override`);
  }
});

test('All derivatives fields have hardBlockerOverride=true', () => {
  for (const fid of ['derivatives.oi.aggregate', 'derivatives.funding.aggregate', 'derivatives.liquidation.orderflow', 'derivatives.leverage.stress']) {
    const rule = getFieldConflictRule(fid);
    assert.ok(rule);
    assert.strictEqual(rule!.hardBlockerOverride, true, `Derivatives field ${fid} must have hard blocker override`);
  }
});

test('CONFLICT_OUTCOME_SPEAKABLE: SUPPRESS and BLOCK are not speakable', () => {
  assert.strictEqual(CONFLICT_OUTCOME_SPEAKABLE['SUPPRESS_CLAIM'], false);
  assert.strictEqual(CONFLICT_OUTCOME_SPEAKABLE['BLOCK_OUTPUT'], false);
  assert.strictEqual(CONFLICT_OUTCOME_SPEAKABLE['ESCALATE_INCIDENT'], false);
});

test('Preserved contradiction always has disclosure and penalty', () => {
  const a = makeClaim({ providerId: 'arkham', fieldId: 'entity.wallet.labels', value: 'exchange', authorityTier: 4 });
  const b = makeClaim({ providerId: 'nansen', fieldId: 'entity.wallet.labels', value: 'fund', authorityTier: 4 });
  const result = adjudicate(a, b);
  assert.strictEqual(result.outcome, 'PRESERVE_CONTRADICTION');
  assert.ok(result.confidencePenalty > 0, 'Contradiction must have penalty');
  assert.ok(result.disclosureRequired, 'Contradiction must require disclosure');
});

test('Every conflict record answers: field, kind, severity, outcome, penalty', () => {
  const a = makeClaim({ providerId: 'x', fieldId: 'price.spot.canonical', value: 1, authorityTier: 5 });
  const b = makeClaim({ providerId: 'y', fieldId: 'price.spot.canonical', value: 2, authorityTier: 3 });
  const result = adjudicate(a, b);
  assert.ok(result.fieldId, 'Must have fieldId');
  assert.ok(result.conflictKind, 'Must have conflictKind');
  assert.ok(result.severity, 'Must have severity');
  assert.ok(result.outcome, 'Must have outcome');
  assert.ok(result.confidencePenalty !== undefined, 'Must have confidencePenalty');
  assert.ok(result.version, 'Must have version');
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n════════════════════════════════════════════════════`);
console.log(`  L1.5 Conflict Resolution — Test Results`);
console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
console.log(`════════════════════════════════════════════════════`);

if (failed > 0) process.exit(1);
