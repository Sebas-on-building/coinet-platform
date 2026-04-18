/**
 * L6.6 — Legal Inputs, Dependency Surfaces, and First Production Families
 * Certification Test Suite
 *
 * 6 Bands:
 *   A — Legal inputs (registry, illegal bypass, unregistered blocked)
 *   B — Dependency classes (classed, misuse blocked, evidence-only guard)
 *   C — Feature family registry (8 families, scopes, inputs, rollout)
 *   D — Event family registry (8 families, triggers, confirmation, evidence)
 *   E — Dedupe and suppression (key determinism, spec completeness)
 *   F — Invariants and audit
 */

import {
  L6LegalInputSurfaceClass,
  L6LegalInputSurfaceSpec,
  L6IllegalInputReason,
  ALL_LEGAL_INPUT_SURFACE_CLASSES,
  ALL_ILLEGAL_INPUT_REASONS,
  L6DependencyClass,
  FAMILY_LEVEL_DEPENDENCY_CLASSES,
  DEPENDENCY_MISUSE_RULES,
  isDependencyMisuse,
  L6FeatureFamilyId,
  ALL_FEATURE_FAMILY_IDS,
  L6EventFamilyId,
  ALL_EVENT_FAMILY_IDS,
  L6EventSuppressionMode,
  ALL_SUPPRESSION_MODES,
  L6EventSeverityModelClass,
  L6EventResolutionClass,
  L6FamilyRolloutPriority,
  ALL_ROLLOUT_PRIORITIES,
  ROLLOUT_ORDINAL,
  isEarlierRollout,
  canonicalDedupeKey,
  REQUIRED_DEDUPE_KEY_FIELDS,
  L6ScopeType,
  L6PrimitiveClass,
} from '../l6/contracts';

import {
  LegalInputSurfaceRegistry,
  FeatureFamilyRegistry,
  EventFamilyRegistry,
  PrimitiveDependencyRegistry,
} from '../l6/registry';

import {
  IllegalInputBypassValidator,
  L6FamilyViolationCode,
  DependencyBindingValidator,
  FeatureFamilyDefinitionValidator,
  EventFamilyDefinitionValidator,
  EventDedupeValidator,
  EventSuppressionPolicyValidator,
} from '../l6/validation';

import {
  MARKET_FAMILY, MARKET_FIRST_FEATURES,
  DEX_FAMILY, DEX_FIRST_FEATURES,
  DERIVATIVES_FAMILY, DERIVATIVES_FIRST_FEATURES,
  PROTOCOL_FAMILY, PROTOCOL_FIRST_FEATURES,
  ONCHAIN_FAMILY, ONCHAIN_FIRST_FEATURES,
  SECURITY_FAMILY, SECURITY_FIRST_FEATURES,
  NARRATIVE_FAMILY, NARRATIVE_FIRST_FEATURES,
  ENTITY_FAMILY, ENTITY_FIRST_FEATURES,
} from '../l6/families';

import { ALL_PRODUCTION_EVENT_FAMILIES } from '../l6/events';

import {
  emitFamilyAudit,
  getFamilyAuditLog,
  findFamilyAuditsByCode,
  findFamilyAuditsByFamily,
  clearFamilyAuditLog,
  L6FamilyAuditSeverity,
} from '../l6/constitution';

import {
  checkAllL6_6Invariants,
  checkINV_66_A, checkINV_66_B, checkINV_66_C,
  checkINV_66_D, checkINV_66_E, checkINV_66_F, checkINV_66_G,
} from '../l6/invariants';

let passed = 0;
let failed = 0;
const t0 = Date.now();

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

// --- shared helpers ---

const ALL_FAMILIES = [MARKET_FAMILY, DEX_FAMILY, DERIVATIVES_FAMILY, PROTOCOL_FAMILY, ONCHAIN_FAMILY, SECURITY_FAMILY, NARRATIVE_FAMILY, ENTITY_FAMILY];

function buildFullInputRegistry(): LegalInputSurfaceRegistry {
  const reg = new LegalInputSurfaceRegistry();
  const seen = new Set<string>();
  for (const f of ALL_FAMILIES) {
    for (const b of f.dependency_template.bindings) {
      if (seen.has(b.surface_id)) continue;
      seen.add(b.surface_id);
      reg.register({
        surface_id: b.surface_id,
        source_layer: b.surface_id.startsWith('l4.') ? 'L4' : 'L5',
        surface_class: b.surface_id.startsWith('l4.')
          ? L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT
          : L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
        description: `governed surface ${b.surface_id}`,
        scope_types_allowed: [L6ScopeType.ASSET, L6ScopeType.PAIR, L6ScopeType.PROJECT, L6ScopeType.CONTRACT, L6ScopeType.MARKET, L6ScopeType.NARRATIVE],
        primitive_classes_allowed: [L6PrimitiveClass.FEATURE, L6PrimitiveClass.EVENT],
        historical_allowed: true,
        current_allowed: true,
        baseline_allowed: true,
        replay_allowed: true,
        evidence_only_allowed: true,
        contract_requirements: [],
        freshness_constraint: null,
        confidence_caveats: [],
      });
    }
  }
  return reg;
}

function buildFullFeatureRegistry(): FeatureFamilyRegistry {
  const reg = new FeatureFamilyRegistry();
  for (const f of ALL_FAMILIES) reg.register(f);
  return reg;
}

function buildFullEventRegistry(): EventFamilyRegistry {
  const reg = new EventFamilyRegistry();
  for (const fid of ALL_FEATURE_FAMILY_IDS) reg.registerKnownFeatureFamily(fid);
  for (const ef of ALL_PRODUCTION_EVENT_FAMILIES) reg.register(ef);
  return reg;
}

// ═══════════════════════════════════════════════════════════════════════
// BAND A — Legal Inputs
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Legal Inputs ═══');

{
  assert(ALL_LEGAL_INPUT_SURFACE_CLASSES.length === 6, 'A.1 — 6 legal input surface classes');
  assert(ALL_ILLEGAL_INPUT_REASONS.length === 8, 'A.2 — 8 illegal input reasons');
}

{
  const reg = buildFullInputRegistry();
  assert(reg.count() > 0, 'A.3 — input registry has entries');
  assert(reg.isRegistered('l5.price_series'), 'A.4 — l5.price_series registered');
  assert(reg.isRegistered('l5.ohlcv'), 'A.5 — l5.ohlcv registered');
  assert(!reg.isRegistered('raw.binance'), 'A.6 — raw.binance not registered');
}

{
  const reg = buildFullInputRegistry();
  const v = new IllegalInputBypassValidator(reg);

  const legal = v.validate(['l5.price_series', 'l5.ohlcv']);
  assert(legal.ok, 'A.7 — legal surfaces accepted');

  const raw = v.validate(['raw.binance_ws']);
  assert(!raw.ok, 'A.8 — raw provider bypass rejected');
  assert(raw.violations.some(x => x.illegal_reason === L6IllegalInputReason.RAW_PROVIDER_PAYLOAD),
    'A.9 — RAW_PROVIDER_PAYLOAD reason emitted');

  const cache = v.validate(['cache.stale_price']);
  assert(!cache.ok, 'A.10 — stale cache as truth rejected');
  assert(cache.violations.some(x => x.illegal_reason === L6IllegalInputReason.STALE_CACHE_AS_TRUTH),
    'A.11 — STALE_CACHE_AS_TRUTH reason emitted');

  const ui = v.validate(['ui.dashboard_agg']);
  assert(!ui.ok, 'A.12 — UI aggregate rejected');

  const unreg = v.validate(['l5.totally_unknown']);
  assert(!unreg.ok, 'A.13 — unregistered surface rejected');
  assert(unreg.violations.some(x => x.code === L6FamilyViolationCode.UNREGISTERED_INPUT_SURFACE),
    'A.14 — UNREGISTERED_INPUT_SURFACE code emitted');
}

{
  const reg = new LegalInputSurfaceRegistry();
  const dup1 = reg.register({
    surface_id: 'l5.test', source_layer: 'L5',
    surface_class: L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    description: 'test', scope_types_allowed: [L6ScopeType.ASSET],
    primitive_classes_allowed: [L6PrimitiveClass.FEATURE],
    historical_allowed: true, current_allowed: true, baseline_allowed: false,
    replay_allowed: true, evidence_only_allowed: false,
    contract_requirements: [], freshness_constraint: null, confidence_caveats: [],
  });
  assert(dup1.ok, 'A.15 — first registration ok');
  const dup2 = reg.register({
    surface_id: 'l5.test', source_layer: 'L5',
    surface_class: L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    description: 'dup', scope_types_allowed: [L6ScopeType.ASSET],
    primitive_classes_allowed: [L6PrimitiveClass.FEATURE],
    historical_allowed: true, current_allowed: true, baseline_allowed: false,
    replay_allowed: true, evidence_only_allowed: false,
    contract_requirements: [], freshness_constraint: null, confidence_caveats: [],
  });
  assert(!dup2.ok, 'A.16 — duplicate surface_id rejected');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND B — Dependency Classes
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Dependency Classes ═══');

{
  assert(FAMILY_LEVEL_DEPENDENCY_CLASSES.length === 5, 'B.1 — 5 family-level dependency classes');
  assert(DEPENDENCY_MISUSE_RULES.length === 5, 'B.2 — 5 misuse rules defined');
}

{
  const m1 = isDependencyMisuse(L6DependencyClass.OPTIONAL_CONTEXT, L6DependencyClass.HARD_TRUTH);
  assert(m1 !== null, 'B.3 — optional-as-truth detected');

  const m2 = isDependencyMisuse(L6DependencyClass.OPTIONAL_CONTEXT, L6DependencyClass.HARD_CONTEXT);
  assert(m2 !== null, 'B.4 — optional-as-required-context detected');

  const m3 = isDependencyMisuse(L6DependencyClass.EVIDENCE_ONLY, L6DependencyClass.HARD_TRUTH);
  assert(m3 !== null, 'B.5 — evidence-only-as-truth detected');

  const m4 = isDependencyMisuse(L6DependencyClass.EVIDENCE_ONLY, L6DependencyClass.BASELINE);
  assert(m4 !== null, 'B.6 — evidence-only-as-baseline detected');

  const m5 = isDependencyMisuse(L6DependencyClass.HARD_TRUTH, L6DependencyClass.HARD_TRUTH);
  assert(m5 === null, 'B.7 — hard-truth-as-hard-truth is not misuse');

  const m6 = isDependencyMisuse(L6DependencyClass.BASELINE, L6DependencyClass.BASELINE);
  assert(m6 === null, 'B.8 — baseline-as-baseline is not misuse');
}

{
  // All family templates have classed bindings
  for (const f of ALL_FAMILIES) {
    for (const b of f.dependency_template.bindings) {
      assert(!!b.dependency_class, `B — ${f.family_id} binding ${b.surface_id} has class`);
      assert(!!b.surface_id, `B — ${f.family_id} binding has surface_id`);
      assert(b.scope_compatible.length > 0, `B — ${f.family_id} binding ${b.surface_id} has scope`);
    }
  }
}

{
  const reg = buildFullInputRegistry();
  const dv = new DependencyBindingValidator(reg);
  const mkt = dv.validate(MARKET_FAMILY.dependency_template.bindings as any, L6ScopeType.ASSET);
  assert(mkt.ok, 'B.9 — market dependency bindings valid for ASSET scope');

  const misuse = dv.checkMisuse('l4.market_context', L6DependencyClass.OPTIONAL_CONTEXT, L6DependencyClass.HARD_TRUTH);
  assert(misuse !== null && misuse.code === L6FamilyViolationCode.DEPENDENCY_MISUSE,
    'B.10 — runtime misuse detection works');

  const noMisuse = dv.checkMisuse('l5.price_series', L6DependencyClass.HARD_TRUTH, L6DependencyClass.HARD_TRUTH);
  assert(noMisuse === null, 'B.11 — no misuse for legitimate usage');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND C — Feature Family Registry
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Feature Family Registry ═══');

{
  assert(ALL_FEATURE_FAMILY_IDS.length === 8, 'C.1 — 8 feature family ids');
  const reg = buildFullFeatureRegistry();
  assert(reg.count() === 8, 'C.2 — 8 families registered');
}

{
  const reg = buildFullFeatureRegistry();
  const sorted = reg.allSortedByRollout();
  assert(sorted[0].family_id === L6FeatureFamilyId.MARKET, 'C.3 — MARKET is rollout P1');
  assert(sorted[1].family_id === L6FeatureFamilyId.DERIVATIVES, 'C.4 — DERIVATIVES is rollout P2');
  assert(sorted[7].family_id === L6FeatureFamilyId.ENTITY, 'C.5 — ENTITY is rollout P8');
}

{
  for (const f of ALL_FAMILIES) {
    assert(f.allowed_scopes.length > 0, `C — ${f.family_id} has scopes`);
    assert(f.legal_input_surface_classes.length > 0, `C — ${f.family_id} has input classes`);
    assert(f.baseline_classes_allowed.length > 0, `C — ${f.family_id} has baseline classes`);
    assert(f.output_kinds_allowed.length > 0, `C — ${f.family_id} has output kinds`);
    assert(f.forbidden_semantic_shortcuts.length > 0, `C — ${f.family_id} has forbidden shortcuts`);
    assert(f.family_invariants.length > 0, `C — ${f.family_id} has invariants`);
    assert(f.dependency_template.bindings.length > 0, `C — ${f.family_id} has dependency bindings`);
    assert(f.default_warmup_multiplier >= 1, `C — ${f.family_id} warmup >= 1`);
    assert(f.default_null_policy_range.length > 0, `C — ${f.family_id} has null policies`);
  }
}

{
  // Verify specific family laws
  assert(MARKET_FAMILY.forbidden_semantic_shortcuts.includes('TRADE_SIGNAL'), 'C.6 — MARKET forbids TRADE_SIGNAL');
  assert(DEX_FAMILY.forbidden_semantic_shortcuts.includes('RUG_LABEL'), 'C.7 — DEX forbids RUG_LABEL');
  assert(DERIVATIVES_FAMILY.forbidden_semantic_shortcuts.includes('SQUEEZE_JUDGMENT'), 'C.8 — DERIVATIVES forbids SQUEEZE_JUDGMENT');
  assert(PROTOCOL_FAMILY.forbidden_semantic_shortcuts.includes('FLATTEN_BUSINESS_AND_TOKEN'), 'C.9 — PROTOCOL forbids business/token flattening');
  assert(ONCHAIN_FAMILY.forbidden_semantic_shortcuts.includes('CLEAN_WALLET_TRUTH_FROM_WEAK_LABEL'), 'C.10 — ONCHAIN forbids weak wallet as truth');
  assert(SECURITY_FAMILY.forbidden_semantic_shortcuts.includes('FALSE_CLEANLINESS'), 'C.11 — SECURITY forbids false cleanliness');
  assert(NARRATIVE_FAMILY.forbidden_semantic_shortcuts.includes('MARKET_TRUTH_FROM_NARRATIVE'), 'C.12 — NARRATIVE forbids market truth from narrative');
  assert(ENTITY_FAMILY.forbidden_semantic_shortcuts.includes('WEAK_ATTRIBUTION_AS_FACT'), 'C.13 — ENTITY forbids weak attribution');
}

{
  // First features catalog count
  const total = MARKET_FIRST_FEATURES.length + DEX_FIRST_FEATURES.length +
    DERIVATIVES_FIRST_FEATURES.length + PROTOCOL_FIRST_FEATURES.length +
    ONCHAIN_FIRST_FEATURES.length + SECURITY_FIRST_FEATURES.length +
    NARRATIVE_FIRST_FEATURES.length + ENTITY_FIRST_FEATURES.length;
  assert(total >= 50, `C.14 — at least 50 first production features (got ${total})`);
}

{
  // Duplicate family registration blocked
  const reg = new FeatureFamilyRegistry();
  const r1 = reg.register(MARKET_FAMILY);
  assert(r1.ok, 'C.15 — first MARKET registration ok');
  const r2 = reg.register(MARKET_FAMILY);
  assert(!r2.ok, 'C.16 — duplicate MARKET registration rejected');
}

{
  // Feature family definition validator with inputs
  const inputReg = buildFullInputRegistry();
  const fv = new FeatureFamilyDefinitionValidator(inputReg);
  for (const f of ALL_FAMILIES) {
    const r = fv.validate(f);
    assert(r.ok, `C — ${f.family_id} passes FeatureFamilyDefinitionValidator`);
  }
}

{
  assert(isEarlierRollout(L6FamilyRolloutPriority.P1_MARKET, L6FamilyRolloutPriority.P8_ENTITY),
    'C.17 — P1 earlier than P8');
  assert(!isEarlierRollout(L6FamilyRolloutPriority.P8_ENTITY, L6FamilyRolloutPriority.P1_MARKET),
    'C.18 — P8 not earlier than P1');
  assert(ALL_ROLLOUT_PRIORITIES.length === 8, 'C.19 — 8 rollout priorities');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND D — Event Family Registry
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Event Family Registry ═══');

{
  assert(ALL_EVENT_FAMILY_IDS.length === 8, 'D.1 — 8 event family ids');
  assert(ALL_PRODUCTION_EVENT_FAMILIES.length === 8, 'D.2 — 8 production event families');
}

{
  const reg = buildFullEventRegistry();
  assert(reg.count() === 8, 'D.3 — 8 event families registered');
  const sorted = reg.allSortedByRollout();
  assert(sorted.length === 8, 'D.4 — sorted list has 8 entries');
}

{
  for (const ef of ALL_PRODUCTION_EVENT_FAMILIES) {
    assert(ef.allowed_scopes.length > 0, `D — ${ef.family_id} has scopes`);
    assert(ef.triggering_feature_families.length > 0, `D — ${ef.family_id} has trigger families`);
    assert(ef.confirmation_window_durations_ms.length > 0, `D — ${ef.family_id} has confirmation windows`);
    assert(!!ef.suppression_family_id, `D — ${ef.family_id} has suppression family`);
    assert(ef.resolution_classes.length > 0, `D — ${ef.family_id} has resolution classes`);
    assert(ef.evidence_requirements.length > 0, `D — ${ef.family_id} has evidence requirements`);
    assert(ef.family_invariants.length > 0, `D — ${ef.family_id} has invariants`);
  }
}

{
  // Event family definition validator
  const fReg = buildFullFeatureRegistry();
  const ev = new EventFamilyDefinitionValidator(fReg);
  for (const ef of ALL_PRODUCTION_EVENT_FAMILIES) {
    const r = ev.validate(ef);
    assert(r.ok, `D — ${ef.family_id} passes EventFamilyDefinitionValidator`);
  }
}

{
  // Missing trigger should fail
  const fReg = new FeatureFamilyRegistry();
  const ev = new EventFamilyDefinitionValidator(fReg);
  const bad = { ...ALL_PRODUCTION_EVENT_FAMILIES[0], triggering_feature_families: [L6FeatureFamilyId.MARKET] };
  const r = ev.validate(bad);
  assert(!r.ok, 'D.5 — event with unregistered trigger family rejected');
  assert(r.violations.some(x => x.code === L6FamilyViolationCode.EVENT_TRIGGER_MISSING),
    'D.6 — EVENT_TRIGGER_MISSING code emitted');
}

{
  // Duplicate event family blocked
  const reg = new EventFamilyRegistry();
  for (const fid of ALL_FEATURE_FAMILY_IDS) reg.registerKnownFeatureFamily(fid);
  const r1 = reg.register(ALL_PRODUCTION_EVENT_FAMILIES[0]);
  assert(r1.ok, 'D.7 — first event family registration ok');
  const r2 = reg.register(ALL_PRODUCTION_EVENT_FAMILIES[0]);
  assert(!r2.ok, 'D.8 — duplicate event family registration rejected');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND E — Dedupe and Suppression
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Dedupe and Suppression ═══');

{
  const dv = new EventDedupeValidator();
  const spec = {
    family_id: L6EventFamilyId.FUNDING_SPIKE,
    scope_type: L6ScopeType.ASSET,
    scope_id: 'BTC',
    trigger_window_id: 'win_1h_abc',
    version: 'v1',
    lifecycle_group: 'active',
    suppression_namespace: null,
  };
  const r = dv.validate(spec);
  assert(r.ok, 'E.1 — legal dedupe spec passes');
  assert(r.canonical_key !== null, 'E.2 — canonical key computed');

  // Determinism
  const r2 = dv.validate(spec);
  assert(r2.canonical_key === r.canonical_key, 'E.3 — canonical key deterministic');

  // Different scope_id → different key
  const r3 = dv.validate({ ...spec, scope_id: 'ETH' });
  assert(r3.canonical_key !== r.canonical_key, 'E.4 — different scope_id → different key');

  // Duplicate detection
  assert(dv.isDuplicate(spec, spec), 'E.5 — same spec is duplicate');
  assert(!dv.isDuplicate(spec, { ...spec, scope_id: 'ETH' }), 'E.6 — different scope_id is not duplicate');
}

{
  const dv = new EventDedupeValidator();
  const incomplete = {
    family_id: L6EventFamilyId.FUNDING_SPIKE,
    scope_type: L6ScopeType.ASSET,
    scope_id: '',
    trigger_window_id: '',
    version: 'v1',
    lifecycle_group: 'active',
    suppression_namespace: null,
  };
  const r = dv.validate(incomplete);
  assert(!r.ok, 'E.7 — incomplete dedupe spec rejected');
  assert(r.violations.some(x => x.code === L6FamilyViolationCode.DEDUPE_SPEC_INCOMPLETE),
    'E.8 — DEDUPE_SPEC_INCOMPLETE code emitted');
}

{
  const sv = new EventSuppressionPolicyValidator();
  const legal = {
    suppression_family_id: 'supp_funding',
    event_family_id: L6EventFamilyId.FUNDING_SPIKE,
    mode: L6EventSuppressionMode.HARD_COOLDOWN,
    cooldown_duration_ms: 3600_000,
    retrigger_threshold: null,
    escalation_threshold: null,
    suppression_group: 'derivatives',
    quarantine_after_instability_count: null,
    policy_version: 'v1',
  };
  const r = sv.validate(legal);
  assert(r.ok, 'E.9 — legal suppression spec passes');
}

{
  const sv = new EventSuppressionPolicyValidator();
  const noCD = {
    suppression_family_id: 'supp_x',
    event_family_id: L6EventFamilyId.FUNDING_SPIKE,
    mode: L6EventSuppressionMode.HARD_COOLDOWN,
    cooldown_duration_ms: 0,
    retrigger_threshold: null,
    escalation_threshold: null,
    suppression_group: 'x',
    quarantine_after_instability_count: null,
    policy_version: 'v1',
  };
  const r = sv.validate(noCD);
  assert(!r.ok, 'E.10 — zero cooldown rejected');
}

{
  const sv = new EventSuppressionPolicyValidator();
  const retrigger = {
    suppression_family_id: 'supp_y',
    event_family_id: L6EventFamilyId.FUNDING_SPIKE,
    mode: L6EventSuppressionMode.RETRIGGER_AFTER_MATERIAL_DELTA,
    cooldown_duration_ms: 3600_000,
    retrigger_threshold: null,
    escalation_threshold: null,
    suppression_group: 'y',
    quarantine_after_instability_count: null,
    policy_version: 'v1',
  };
  const r = sv.validate(retrigger);
  assert(!r.ok, 'E.11 — RETRIGGER without threshold rejected');
}

{
  const sv = new EventSuppressionPolicyValidator();
  const escalation = {
    suppression_family_id: 'supp_z',
    event_family_id: L6EventFamilyId.FUNDING_SPIKE,
    mode: L6EventSuppressionMode.SEVERITY_ESCALATION_ONLY,
    cooldown_duration_ms: 3600_000,
    retrigger_threshold: null,
    escalation_threshold: null,
    suppression_group: 'z',
    quarantine_after_instability_count: null,
    policy_version: 'v1',
  };
  const r = sv.validate(escalation);
  assert(!r.ok, 'E.12 — SEVERITY_ESCALATION without threshold rejected');
}

{
  const sv = new EventSuppressionPolicyValidator();
  const quarantine = {
    suppression_family_id: 'supp_q',
    event_family_id: L6EventFamilyId.FUNDING_SPIKE,
    mode: L6EventSuppressionMode.QUARANTINE_ON_INSTABILITY,
    cooldown_duration_ms: 3600_000,
    retrigger_threshold: null,
    escalation_threshold: null,
    suppression_group: 'q',
    quarantine_after_instability_count: null,
    policy_version: 'v1',
  };
  const r = sv.validate(quarantine);
  assert(!r.ok, 'E.13 — QUARANTINE without count rejected');
}

{
  assert(ALL_SUPPRESSION_MODES.length === 5, 'E.14 — 5 suppression modes');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND F — Invariants and Audit
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Invariants and Audit ═══');

{
  clearFamilyAuditLog();
  emitFamilyAudit(
    { code: L6FamilyViolationCode.ILLEGAL_INPUT_SURFACE, field: 'surface', detail: 'raw bypass' },
    { family_id: 'MARKET', trace_id: 'tr-1' },
  );
  emitFamilyAudit(
    { code: L6FamilyViolationCode.DEPENDENCY_MISUSE, field: 'binding', detail: 'optional as truth' },
    { family_id: 'MARKET', trace_id: 'tr-1' },
  );
  emitFamilyAudit(
    { code: L6FamilyViolationCode.EVENT_TRIGGER_MISSING, field: 'trigger', detail: 'missing' },
    { family_id: 'DEX', trace_id: 'tr-2' },
  );

  const log = getFamilyAuditLog();
  assert(log.length === 3, 'F.1 — 3 audit records emitted');
  assert(findFamilyAuditsByFamily('MARKET').length === 2, 'F.2 — 2 records for MARKET');
  assert(findFamilyAuditsByCode(L6FamilyViolationCode.ILLEGAL_INPUT_SURFACE).length === 1,
    'F.3 — 1 record for ILLEGAL_INPUT_SURFACE');
  assert(findFamilyAuditsByCode(L6FamilyViolationCode.ILLEGAL_INPUT_SURFACE)[0].severity === L6FamilyAuditSeverity.FATAL,
    'F.4 — ILLEGAL_INPUT_SURFACE is FATAL');
  assert(findFamilyAuditsByCode(L6FamilyViolationCode.DEPENDENCY_MISUSE)[0].severity === L6FamilyAuditSeverity.FATAL,
    'F.5 — DEPENDENCY_MISUSE is FATAL');

  clearFamilyAuditLog();
  assert(getFamilyAuditLog().length === 0, 'F.6 — audit log cleared');
}

{
  const results = checkAllL6_6Invariants();
  assert(results.length === 7, 'F.7 — 7 L6.6 invariants registered');
  for (const r of results) {
    assert(r.holds, `F — ${r.id} ${r.name} [${r.evidence}]`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
console.log('\n════════════════════════════════════════');
const elapsed = Date.now() - t0;
if (failed === 0) {
  console.log(`✓ L6.6 CERTIFIED — ${passed} assertions passed in ${elapsed}ms`);
  console.log('  Legal inputs, dependency surfaces, 8 feature families, 8 event families,');
  console.log('  dedupe/suppression law, and family invariants all locked.');
  process.exit(0);
} else {
  console.error(`✗ L6.6 FAILED — ${failed} of ${passed + failed} assertions failed (${elapsed}ms)`);
  process.exit(1);
}
