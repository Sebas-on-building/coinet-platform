import assert from 'assert';
import { TRUTH_CLASSES } from '../services/source-systems/registry';
import { getAllFullDoctrines, getFullDoctrine } from '../services/source-systems/classes/doctrine';
import { CLAIM_BOUNDARIES, canClassJustifyClaim } from '../services/source-systems/classes/claim-boundaries';
import { validateClaimAgainstDoctrine, getDoctrineSummary, validateClaimBatch } from '../services/source-systems/doctrine-enforcer';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

console.log('\n══════════════════════════════════════════════════');
console.log('  L1.1 SOURCE CLASS DOCTRINE — FULL TEST SUITE');
console.log('══════════════════════════════════════════════════\n');

// ── Test 1: All 9 classes have doctrine ──────────────────────────────────────

console.log('Test 1: All 9 classes defined');

const ALL_CLASSES = [
  TRUTH_CLASSES.MARKET_SURFACE,
  TRUTH_CLASSES.DEX_EMERGENCE,
  TRUTH_CLASSES.DERIVATIVES_PRESSURE,
  TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
  TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
  TRUTH_CLASSES.STRUCTURAL_SAFETY,
  TRUTH_CLASSES.NARRATIVE_ATTENTION,
  TRUTH_CLASSES.ENTITY_CONTEXT,
  TRUTH_CLASSES.REASONING_EXPRESSION,
];

const allDoctrines = getAllFullDoctrines();

test('exactly 9 doctrines exist', () => {
  assert.strictEqual(allDoctrines.length, 9);
});

for (const tc of ALL_CLASSES) {
  test(`doctrine exists for ${tc}`, () => {
    const d = getFullDoctrine(tc);
    assert(d, `Missing doctrine for ${tc}`);
    assert(d.allowedClaims.length > 0, `No allowed claims for ${tc}`);
    assert(d.forbiddenClaims.length > 0, `No forbidden claims for ${tc}`);
  });
}

// ── Test 2: All 9 classes have cadence, failureMode, productionRule ──────────

console.log('\nTest 2: Cadence, failure mode, production rule');

for (const tc of ALL_CLASSES) {
  const d = getFullDoctrine(tc)!;
  test(`${tc} has cadence`, () => {
    assert(d.cadence, `Missing cadence for ${tc}`);
    assert(d.cadence.length > 0);
  });
  test(`${tc} has failureMode`, () => {
    assert(d.failureMode, `Missing failureMode for ${tc}`);
    assert(d.failureMode.length > 10);
  });
  test(`${tc} has productionRule`, () => {
    assert(d.productionRule, `Missing productionRule for ${tc}`);
    assert(d.productionRule.length > 10);
  });
}

// ── Test 3: Specific cadence values ──────────────────────────────────────────

console.log('\nTest 3: Exact cadence values from spec');

test('market_surface cadence = seconds_to_minutes', () => {
  assert.strictEqual(getFullDoctrine(TRUTH_CLASSES.MARKET_SURFACE)!.cadence, 'seconds_to_minutes');
});
test('dex_emergence cadence = near_realtime', () => {
  assert.strictEqual(getFullDoctrine(TRUTH_CLASSES.DEX_EMERGENCE)!.cadence, 'near_realtime');
});
test('derivatives_pressure cadence = seconds', () => {
  assert.strictEqual(getFullDoctrine(TRUTH_CLASSES.DERIVATIVES_PRESSURE)!.cadence, 'seconds');
});
test('protocol_substance cadence = minutes_to_hours', () => {
  assert.strictEqual(getFullDoctrine(TRUTH_CLASSES.PROTOCOL_SUBSTANCE)!.cadence, 'minutes_to_hours');
});
test('onchain_behavior cadence = block_time_to_minutes', () => {
  assert.strictEqual(getFullDoctrine(TRUTH_CLASSES.ONCHAIN_BEHAVIOR)!.cadence, 'block_time_to_minutes');
});
test('structural_safety cadence = event_driven', () => {
  assert.strictEqual(getFullDoctrine(TRUTH_CLASSES.STRUCTURAL_SAFETY)!.cadence, 'event_driven');
});
test('narrative_attention cadence = seconds_to_minutes', () => {
  assert.strictEqual(getFullDoctrine(TRUTH_CLASSES.NARRATIVE_ATTENTION)!.cadence, 'seconds_to_minutes');
});
test('entity_context cadence = slower_than_chain', () => {
  assert.strictEqual(getFullDoctrine(TRUTH_CLASSES.ENTITY_CONTEXT)!.cadence, 'slower_than_chain');
});
test('reasoning_expression cadence = on_demand', () => {
  assert.strictEqual(getFullDoctrine(TRUTH_CLASSES.REASONING_EXPRESSION)!.cadence, 'on_demand');
});

// ── Test 4: Allowed claims enforced ──────────────────────────────────────────

console.log('\nTest 4: Allowed claims');

test('market_surface allows "Price is moving up"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.MARKET_SURFACE, 'Price is moving up');
  assert(r.allowed);
  assert(!r.forbidden);
});
test('derivatives_pressure allows "Leverage is elevated"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.DERIVATIVES_PRESSURE, 'Leverage is elevated or declining');
  assert(r.allowed);
});
test('protocol_substance allows "Protocol has real revenue"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.PROTOCOL_SUBSTANCE, 'Protocol has real revenue and usage');
  assert(r.allowed);
});
test('onchain_behavior allows "Large wallets are moving"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.ONCHAIN_BEHAVIOR, 'Large wallets are moving assets');
  assert(r.allowed);
});
test('structural_safety allows "Contract has dangerous characteristics"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.STRUCTURAL_SAFETY, 'Contract has dangerous characteristics');
  assert(r.allowed);
});
test('narrative_attention allows "Attention is concentrating"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.NARRATIVE_ATTENTION, 'Attention is concentrating on this asset');
  assert(r.allowed);
});
test('entity_context allows "This wallet belongs to known entity"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.ENTITY_CONTEXT, 'This wallet belongs to a known entity');
  assert(r.allowed);
});
test('reasoning_expression allows "Explain what the engine concluded"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.REASONING_EXPRESSION, 'Explain what the engine concluded');
  assert(r.allowed);
});

// ── Test 5: Forbidden claims enforced ────────────────────────────────────────

console.log('\nTest 5: Forbidden claims');

test('market_surface forbids "Demand is structurally real"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.MARKET_SURFACE, 'Demand is structurally real');
  assert(r.forbidden);
  assert(r.forbiddenReason !== null);
});
test('market_surface forbids "Whales are accumulating"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.MARKET_SURFACE, 'Whales are accumulating with conviction');
  assert(r.forbidden);
});
test('dex_emergence forbids "This is a quality long-term opportunity"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.DEX_EMERGENCE, 'This is a quality long-term opportunity');
  assert(r.forbidden);
});
test('derivatives_pressure forbids "Organic spot demand exists"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.DERIVATIVES_PRESSURE, 'Organic spot demand exists');
  assert(r.forbidden);
});
test('protocol_substance forbids "Near-term price continuation"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.PROTOCOL_SUBSTANCE, 'Near-term price continuation is likely');
  assert(r.forbidden);
});
test('onchain_behavior forbids "Protocol economics are sound"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.ONCHAIN_BEHAVIOR, 'Protocol economics are sound');
  assert(r.forbidden);
});
test('structural_safety forbids "This is a good opportunity"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.STRUCTURAL_SAFETY, 'This is a good opportunity');
  assert(r.forbidden);
});
test('narrative_attention forbids "Real accumulation is happening"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.NARRATIVE_ATTENTION, 'Real accumulation is happening');
  assert(r.forbidden);
});
test('entity_context forbids "Timing is favorable"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.ENTITY_CONTEXT, 'Timing is favorable');
  assert(r.forbidden);
});
test('reasoning_expression forbids "Create unsupported evidence"', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.REASONING_EXPRESSION, 'Create unsupported evidence');
  assert(r.forbidden);
});

// ── Test 6: Cross-class forbidden claims ─────────────────────────────────────

console.log('\nTest 6: Cross-class boundaries');

test('narrative cannot claim protocol quality', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.NARRATIVE_ATTENTION, 'Protocol quality is improving');
  assert(r.forbidden);
});
test('derivatives cannot claim asset safety', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.DERIVATIVES_PRESSURE, 'Asset is structurally safe');
  assert(r.forbidden);
});
test('reasoning cannot override contradiction', () => {
  const r = validateClaimAgainstDoctrine(TRUTH_CLASSES.REASONING_EXPRESSION, 'Override contradiction or engine output');
  assert(r.forbidden);
});

// ── Test 7: Claim boundary system ────────────────────────────────────────────

console.log('\nTest 7: Claim boundary system');

test('all 9 classes have claim boundaries', () => {
  for (const tc of ALL_CLASSES) {
    assert(CLAIM_BOUNDARIES[tc], `Missing claim boundary for ${tc}`);
  }
});

test('market_surface can never justify whale conviction', () => {
  const strength = canClassJustifyClaim(TRUTH_CLASSES.MARKET_SURFACE, 'whale conviction');
  assert.strictEqual(strength, 'never');
});

test('structural_safety can never justify opportunity quality', () => {
  const strength = canClassJustifyClaim(TRUTH_CLASSES.STRUCTURAL_SAFETY, 'opportunity quality');
  assert.strictEqual(strength, 'never');
});

// ── Test 8: getDoctrineSummary ───────────────────────────────────────────────

console.log('\nTest 8: Doctrine summary API');

for (const tc of ALL_CLASSES) {
  test(`getDoctrineSummary works for ${tc}`, () => {
    const s = getDoctrineSummary(tc);
    assert(s !== null);
    assert(s!.cadence.length > 0);
    assert(s!.failureMode.length > 0);
    assert(s!.productionRule.length > 0);
    assert(s!.allowedClaims.length > 0);
    assert(s!.forbiddenClaims.length > 0);
  });
}

// ── Test 9: Batch validation ─────────────────────────────────────────────────

console.log('\nTest 9: Batch claim validation');

test('batch validates mixed allowed/forbidden', () => {
  const result = validateClaimBatch(TRUTH_CLASSES.MARKET_SURFACE, [
    'Price is moving up',
    'Whales are accumulating with conviction',
    'Volume is elevated or declining',
  ]);
  assert.strictEqual(result.allowedCount, 2);
  assert.strictEqual(result.forbiddenCount, 1);
});

// ── Test 10: Production rules match spec ─────────────────────────────────────

console.log('\nTest 10: Production rules match spec');

const EXPECTED_RULES: Record<string, string> = {
  [TRUTH_CLASSES.MARKET_SURFACE]: 'Market surface can describe what price did. It cannot explain why without help from other classes.',
  [TRUTH_CLASSES.DEX_EMERGENCE]: 'DEX emergence is early and noisy. It is a detection class, not a truth monopoly.',
  [TRUTH_CLASSES.DERIVATIVES_PRESSURE]: 'Derivatives pressure is the leverage state of the market.',
  [TRUTH_CLASSES.PROTOCOL_SUBSTANCE]: 'Protocol substance measures economic substrate, not price reflexivity.',
  [TRUTH_CLASSES.ONCHAIN_BEHAVIOR]: 'Raw on-chain behavior is the most native event layer, but not the most interpretable.',
  [TRUTH_CLASSES.STRUCTURAL_SAFETY]: 'Structural safety can veto trust, but it cannot alone predict market direction.',
  [TRUTH_CLASSES.NARRATIVE_ATTENTION]: 'Narrative attention is about attention state, not truth state.',
  [TRUTH_CLASSES.ENTITY_CONTEXT]: 'Entity context is enrichment, but elite enrichment.',
  [TRUTH_CLASSES.REASONING_EXPRESSION]: 'Reasoning expression is not a source of external truth. It is a governed interpreter of other source classes.',
};

for (const [tc, expected] of Object.entries(EXPECTED_RULES)) {
  test(`production rule correct for ${tc}`, () => {
    const d = getFullDoctrine(tc)!;
    assert.strictEqual(d.productionRule, expected);
  });
}

// ── Test 11: Failure modes match spec ────────────────────────────────────────

console.log('\nTest 11: Failure modes from spec');

test('market_surface failure = stale prices', () => {
  const d = getFullDoctrine(TRUTH_CLASSES.MARKET_SURFACE)!;
  assert(d.failureMode.includes('Stale prices'));
});
test('dex_emergence failure = thin-pool', () => {
  const d = getFullDoctrine(TRUTH_CLASSES.DEX_EMERGENCE)!;
  assert(d.failureMode.includes('Thin-pool'));
});
test('derivatives failure = sampling gaps', () => {
  const d = getFullDoctrine(TRUTH_CLASSES.DERIVATIVES_PRESSURE)!;
  assert(d.failureMode.includes('sampling gaps'));
});
test('protocol failure = methodology drift', () => {
  const d = getFullDoctrine(TRUTH_CLASSES.PROTOCOL_SUBSTANCE)!;
  assert(d.failureMode.includes('Methodology drift'));
});
test('onchain failure = indexing lag', () => {
  const d = getFullDoctrine(TRUTH_CLASSES.ONCHAIN_BEHAVIOR)!;
  assert(d.failureMode.includes('Indexing lag'));
});
test('safety failure = stale audits', () => {
  const d = getFullDoctrine(TRUTH_CLASSES.STRUCTURAL_SAFETY)!;
  assert(d.failureMode.includes('Stale audits'));
});
test('narrative failure = bot inflation', () => {
  const d = getFullDoctrine(TRUTH_CLASSES.NARRATIVE_ATTENTION)!;
  assert(d.failureMode.includes('Bot inflation'));
});
test('entity failure = label drift', () => {
  const d = getFullDoctrine(TRUTH_CLASSES.ENTITY_CONTEXT)!;
  assert(d.failureMode.includes('Label drift'));
});
test('reasoning failure = fluent hallucination', () => {
  const d = getFullDoctrine(TRUTH_CLASSES.REASONING_EXPRESSION)!;
  assert(d.failureMode.includes('Fluent hallucination'));
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
