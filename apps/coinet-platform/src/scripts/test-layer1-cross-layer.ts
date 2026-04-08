/**
 * Layer 1 Cross-Layer + Stress Suite
 *
 * Validates registry alignment across L1.1–L1.6, end-to-end epistemic chains,
 * monotonicity under worsening inputs, and randomized stress permutations.
 */

import assert from 'node:assert';

import { TRUTH_CLASSES, type TruthClass } from '../services/source-systems/registry';
import { getFullDoctrine } from '../services/source-systems/classes/doctrine';
import { FIELD_AUTHORITY_MAP, getFieldAuthority } from '../services/source-systems/classes/authority-constitution';
import { getSubstitutionRule, getAllSubstitutionRules } from '../services/source-systems/classes/substitution-constitution';
import { CONFLICT_THRESHOLDS } from '../services/source-systems/classes/conflict-types';
import { FIELD_CONFLICT_RULES, getFieldConflictRule } from '../services/source-systems/classes/conflict-constitution';
import { FIELD_CRITICALITY_MAP, getFieldCriticality } from '../services/source-systems/classes/field-criticality-map';
import { FIELD_TUPLES } from '../services/source-systems/classes/epistemic-integrity-engine';
import { compilePermission } from '../services/source-systems/classes/claim-permission-compiler';
import type { ConflictClaim } from '../services/source-systems/classes/conflict-types';
import { adjudicate } from '../services/source-systems/classes/conflict-adjudicator';
import type { DegradationInput, FieldDegradationInput } from '../services/source-systems/classes/degradation-types';
import {
  evaluateDegradation,
  buildDegradationFingerprint, buildPropagationMap,
} from '../services/source-systems/classes/degradation-evaluator';
import {
  DEGRADATION_RANK, DOWNSTREAM_BLOCKS, type DegradationLevel,
  CLAIM_RESTRICTIONS,
} from '../services/source-systems/classes/degradation-types';
import type { HealthState, ClaimPermission } from '../services/source-systems/classes/health-types';
import { CLASS_DEGRADATION_PROFILES } from '../services/source-systems/classes/degradation-constitution';
import { recordSuccess, resetAllHealth } from '../services/source-systems/health-monitor';
import { resetAllRecoveryStates } from '../services/source-systems/classes/recovery-governor';
import { resetState as resetDegradationState } from '../services/source-systems/classes/degradation-ledger';

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

const AUTHORITY_FIELD_IDS = Object.keys(FIELD_AUTHORITY_MAP).sort();

function makeField(overrides: Partial<FieldDegradationInput> & { fieldId: string }): FieldDegradationInput {
  return {
    healthState: 'H0_HEALTHY',
    integrityState: 'I0_INTACT',
    permissionState: 'ALLOW_PRIMARY',
    recoveryState: 'STABLE',
    criticality: 'CONTEXTUAL',
    isMissionCritical: false,
    isThesisCritical: false,
    ...overrides,
  };
}

function degInput(classId: TruthClass, fields: FieldDegradationInput[], o?: Partial<DegradationInput>): DegradationInput {
  return {
    classId,
    fieldStates: fields,
    substitutionBlindCount: 0,
    substitutionDegradedCount: 0,
    noFallbackTriggered: false,
    conflictContradictionsPreserved: 0,
    conflictBlockersActive: 0,
    conflictUnresolved: 0,
    ...o,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. Registry alignment (26 canonical fields)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── A. Registry alignment ───');

test('Authority map has exactly 26 fields', () => {
  assert.strictEqual(AUTHORITY_FIELD_IDS.length, 26);
});

test('Substitution constitution keys match authority field IDs', () => {
  const subIds = getAllSubstitutionRules().map(r => r.fieldId).sort();
  assert.deepStrictEqual(subIds, AUTHORITY_FIELD_IDS);
});

test('Conflict thresholds cover all authority fields', () => {
  for (const id of AUTHORITY_FIELD_IDS) {
    assert.ok(CONFLICT_THRESHOLDS[id], `CONFLICT_THRESHOLDS missing ${id}`);
  }
});

test('Conflict constitution covers all authority fields', () => {
  for (const id of AUTHORITY_FIELD_IDS) {
    assert.ok(FIELD_CONFLICT_RULES[id], `FIELD_CONFLICT_RULES missing ${id}`);
  }
});

test('getFieldConflictRule matches FIELD_CONFLICT_RULES', () => {
  for (const id of AUTHORITY_FIELD_IDS) {
    assert.strictEqual(getFieldConflictRule(id)?.fieldId, id);
  }
});

test('Field criticality map covers all authority fields', () => {
  for (const id of AUTHORITY_FIELD_IDS) {
    assert.ok(FIELD_CRITICALITY_MAP[id], `FIELD_CRITICALITY_MAP missing ${id}`);
    assert.strictEqual(getFieldCriticality(id)?.fieldId, id);
  }
});

test('Representative field tuples cover all authority fields', () => {
  for (const id of AUTHORITY_FIELD_IDS) {
    assert.ok(FIELD_TUPLES[id], `FIELD_TUPLES missing ${id}`);
  }
});

test('Substitution truthClass matches authority truthClass for every field', () => {
  for (const id of AUTHORITY_FIELD_IDS) {
    const auth = getFieldAuthority(id)!;
    const rule = getSubstitutionRule(id)!;
    assert.strictEqual(rule.truthClass, auth.truthClass, `truthClass mismatch on ${id}`);
    assert.strictEqual(rule.fieldId, id);
  }
});

test('Conflict rule fieldId matches registry key', () => {
  for (const id of AUTHORITY_FIELD_IDS) {
    assert.strictEqual(FIELD_CONFLICT_RULES[id].fieldId, id);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. L1.1 doctrine completeness
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── B. L1.1 doctrine ───');

test('All 9 truth classes have full doctrine', () => {
  for (const tc of Object.values(TRUTH_CLASSES)) {
    const d = getFullDoctrine(tc);
    assert.ok(d, `Missing doctrine for ${tc}`);
    assert.ok(d!.allowedClaims?.length, `${tc} allowedClaims`);
    assert.ok(d!.forbiddenClaims?.length, `${tc} forbiddenClaims`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. L1.6 degradation profiles for every truth class
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── C. L1.6 class profiles ───');

test('CLASS_DEGRADATION_PROFILES has all 9 truth classes', () => {
  for (const tc of Object.values(TRUTH_CLASSES)) {
    assert.ok(CLASS_DEGRADATION_PROFILES[tc], `Missing degradation profile for ${tc}`);
    const p = CLASS_DEGRADATION_PROFILES[tc];
    assert.strictEqual(p.classId, tc);
    for (const lvl of ['d1', 'd2', 'd3', 'd4'] as const) {
      assert.ok(p[lvl].confidencePenaltyRange[1] >= p[lvl].confidencePenaltyRange[0], tc + lvl);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. Downstream block monotonicity (anti-fake)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── D. Monotonic downstream blocks ───');

const LEVELS: DegradationLevel[] = [
  'D0_NORMAL', 'D1_REDUCED_CONFIDENCE', 'D2_PARTIAL_BLINDNESS', 'D3_DOMAIN_DEGRADATION', 'D4_EPISTEMIC_LOCK',
];

test('Each degradation level blocks superset of previous (set inclusion)', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    const prev = new Set(DOWNSTREAM_BLOCKS[LEVELS[i - 1]]);
    const cur = new Set(DOWNSTREAM_BLOCKS[LEVELS[i]]);
    for (const c of prev) {
      assert.ok(cur.has(c), `${LEVELS[i]} must still block ${c} from ${LEVELS[i - 1]}`);
    }
  }
});

test('CLAIM_RESTRICTIONS tighten monotonically on thesis/scenario', () => {
  let lastThesis = true;
  let lastScenario = true;
  for (const lvl of LEVELS) {
    const r = CLAIM_RESTRICTIONS[lvl];
    if (!lastThesis && r.thesisUseAllowed) {
      assert.fail(`${lvl} cannot re-enable thesis after prior level disabled`);
    }
    if (!lastScenario && r.scenarioConfirmationAllowed) {
      assert.fail(`${lvl} cannot re-enable scenario after prior level disabled`);
    }
    if (!r.thesisUseAllowed) lastThesis = false;
    if (!r.scenarioConfirmationAllowed) lastScenario = false;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. End-to-end chain: permission → conflict → degradation
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── E. L1.4 → L1.5 → L1.6 chain ───');

test('Healthy spot field: speakable permission + D0 degradation path', () => {
  resetAllHealth();
  resetAllRecoveryStates();
  for (let i = 0; i < 12; i++) recordSuccess('coingecko', 40);
  const tuple = FIELD_TUPLES['price.spot.canonical'];
  const perm = compilePermission('price.spot.canonical', {
    fieldId: 'price.spot.canonical',
    providerId: 'coingecko',
    unit: tuple.unit,
    quoteBasis: tuple.quoteBasis,
    venueScope: tuple.venueScope,
    timeBasis: tuple.timeBasis,
    methodologyId: tuple.methodologyId,
  });
  assert.ok(perm.speakable, 'baseline healthy + tuple-aligned observation should be speakable');
  const deg = evaluateDegradation(degInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({ fieldId: 'price.spot.canonical', permissionState: perm.permissionState }),
    makeField({ fieldId: 'price.ohlcv', permissionState: 'ALLOW_PRIMARY' }),
  ]));
  assert.strictEqual(deg.level, 'D0_NORMAL');
});

test('Mission-critical BLOCK_OUTPUT forces D4 regardless of other fields', () => {
  const deg = evaluateDegradation(degInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({
      fieldId: 'price.spot.canonical',
      permissionState: 'BLOCK_OUTPUT',
      isMissionCritical: true,
      healthState: 'H5_SUPPRESSED',
    }),
    makeField({ fieldId: 'price.ohlcv', permissionState: 'ALLOW_PRIMARY' }),
  ]));
  assert.strictEqual(deg.level, 'D4_EPISTEMIC_LOCK');
  assert.strictEqual(deg.truthState, 'PROHIBITED_TRUTH');
});

test('Co-authority conflict preserves contradiction; degradation stays speakable-aware', () => {
  const a: ConflictClaim = {
    providerId: 'arkham', fieldId: 'entity.wallet.labels', value: 'exchange',
    authorityTier: 4, healthState: 'H0_HEALTHY', integrityState: 'I0_INTACT',
  };
  const b: ConflictClaim = {
    providerId: 'nansen', fieldId: 'entity.wallet.labels', value: 'fund',
    authorityTier: 4, healthState: 'H0_HEALTHY', integrityState: 'I0_INTACT',
  };
  const c = adjudicate(a, b);
  assert.strictEqual(c.outcome, 'PRESERVE_CONTRADICTION');
  const deg = evaluateDegradation(degInput(TRUTH_CLASSES.ENTITY_CONTEXT, [
    makeField({ fieldId: 'entity.wallet.labels', permissionState: 'ALLOW_PRIMARY' }),
    makeField({ fieldId: 'entity.smart_money', permissionState: 'ALLOW_PRIMARY' }),
  ], { conflictContradictionsPreserved: 1 }));
  assert.ok(DEGRADATION_RANK[deg.level] >= 1, 'Preserved contradiction should at least D1');
  assert.ok(deg.level === 'D1_REDUCED_CONFIDENCE' || deg.level === 'D2_PARTIAL_BLINDNESS');
});

test('Fingerprint aggregates worst global level', () => {
  const assessments = [
    evaluateDegradation(degInput(TRUTH_CLASSES.MARKET_SURFACE, [makeField({ fieldId: 'price.spot.canonical' })])),
    evaluateDegradation(degInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
      makeField({ fieldId: 'derivatives.oi.aggregate', permissionState: 'BLOCK_OUTPUT', isMissionCritical: true, healthState: 'H5_SUPPRESSED' }),
    ])),
  ];
  const fp = buildDegradationFingerprint(assessments);
  assert.strictEqual(fp.globalLevel, 'D4_EPISTEMIC_LOCK');
  assert.strictEqual(fp.systemSpeakable, false);
  const map = buildPropagationMap(assessments);
  assert.ok(map.some(m => m.classId === TRUTH_CLASSES.DERIVATIVES_PRESSURE));
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. Monotonicity under worsening inputs (deterministic stress)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── F. Worsening-input monotonicity ───');

function levelRank(l: DegradationLevel): number {
  return DEGRADATION_RANK[l];
}

test('Adding H1 stress does not improve degradation vs baseline', () => {
  const base = evaluateDegradation(degInput(TRUTH_CLASSES.PROTOCOL_SUBSTANCE, [
    makeField({ fieldId: 'protocol.tvl.usd' }),
    makeField({ fieldId: 'protocol.fees.daily' }),
  ]));
  const stressed = evaluateDegradation(degInput(TRUTH_CLASSES.PROTOCOL_SUBSTANCE, [
    makeField({ fieldId: 'protocol.tvl.usd', healthState: 'H1_STRESSED' }),
    makeField({ fieldId: 'protocol.fees.daily' }),
  ]));
  assert.ok(levelRank(stressed.level) >= levelRank(base.level));
});

test('Adding noFallback does not stay below D3 when 2+ unsafe', () => {
  const d = evaluateDegradation(degInput(TRUTH_CLASSES.ONCHAIN_BEHAVIOR, [
    makeField({ fieldId: 'onchain.transfers.evm', healthState: 'H4_UNSAFE' }),
    makeField({ fieldId: 'onchain.whale.flows', healthState: 'H4_UNSAFE' }),
  ], { noFallbackTriggered: true }));
  assert.ok(levelRank(d.level) >= DEGRADATION_RANK['D3_DOMAIN_DEGRADATION']);
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. Randomized stress (seeded PRNG)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── G. Randomized stress (500 draws) ───');

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEALTH_STATES: HealthState[] = ['H0_HEALTHY', 'H1_STRESSED', 'H2_DEGRADED', 'H3_PARTIAL_BLINDNESS', 'H4_UNSAFE', 'H5_SUPPRESSED'];
const PERMS: ClaimPermission[] = [
  'ALLOW_PRIMARY', 'ALLOW_PRIMARY_WITH_DISCLOSURE', 'SUPPRESS_CLAIM', 'BLOCK_OUTPUT',
];

test('500 random field pairs never produce invalid level or NaN penalty', () => {
  const rand = mulberry32(0x4c314531);
  for (let i = 0; i < 500; i++) {
    const h1 = HEALTH_STATES[Math.floor(rand() * HEALTH_STATES.length)];
    const h2 = HEALTH_STATES[Math.floor(rand() * HEALTH_STATES.length)];
    const p1 = PERMS[Math.floor(rand() * PERMS.length)];
    const mc = rand() > 0.85;
    const deg = evaluateDegradation(degInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
      makeField({
        fieldId: 'derivatives.oi.aggregate',
        healthState: h1,
        permissionState: p1,
        isMissionCritical: mc,
      }),
      makeField({ fieldId: 'derivatives.funding.aggregate', healthState: h2 }),
    ], {
      substitutionBlindCount: rand() > 0.92 ? 1 : 0,
      noFallbackTriggered: rand() > 0.96,
      conflictContradictionsPreserved: rand() > 0.9 ? 2 : 0,
    }));
    assert.ok(LEVELS.includes(deg.level), `invalid level ${deg.level}`);
    assert.ok(!Number.isNaN(deg.confidencePenalty));
    assert.ok(deg.confidencePenalty >= 0 && deg.confidencePenalty <= 1.001);
    if (deg.level === 'D4_EPISTEMIC_LOCK') {
      assert.strictEqual(deg.directionalClaimsAllowed, false);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// H. Substitution rule structural invariants
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── H. L1.3 structural invariants ───');

test('Every substitution rule has primaryOwner and disclosure', () => {
  for (const id of AUTHORITY_FIELD_IDS) {
    const r = getSubstitutionRule(id)!;
    assert.ok(r.primaryOwner.length > 0, id);
    assert.ok(r.disclosureTemplate.length > 0, id);
    assert.ok(r.noFallbackCondition.length > 0, id);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// I. Clean teardown
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── I. Reset hooks ───');

test('resetAllHealth + reset degradation state does not throw', () => {
  resetAllHealth();
  resetAllRecoveryStates();
  resetDegradationState();
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n════════════════════════════════════════════════════`);
console.log(`  Layer 1 Cross-Layer + Stress — Results`);
console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
console.log(`════════════════════════════════════════════════════`);

if (failed > 0) process.exit(1);
