/**
 * L9.5 — Temporal Semantics Lawbook — Certification Test Suite
 *
 * §9.5.12.2 — 5 certification bands:
 *   A — Time surfaces and windows (§9.5.3 / §9.5.4)
 *   B — Lead-lag law           (§9.5.5)
 *   C — Phase + change-point   (§9.5.6 / §9.5.7)
 *   D — Decay + post-event     (§9.5.8 / §9.5.9)
 *   E — Interaction, audit, invariants (§9.5.10 / §9.5.12)
 *
 * Pass criterion: every assertion true, all 7 L9.5 invariants green, and
 * every crafted offender fails on precisely its targeted code.
 */

// ── Contracts (policy) ──
import {
  L9TemporalSurface,
  L9TemporalSurfaceKind,
  L9TemporalComparisonPurpose,
  L9_LEGAL_SURFACES_PER_PURPOSE,
  L9_TEMPORAL_SURFACE_KIND,
  ALL_L9_TEMPORAL_SURFACES,
  isLegalL9SurfaceForPurpose,
  scanL9TimeCollapses,
  l9LeadLagSpacingMs,
} from '../l9/contracts/l9-temporal-surfaces';
import {
  L9TemporalMode,
  L9TemporalSemanticTier,
  L9SemanticAmbiguityPosture,
  ALL_L9_TEMPORAL_MODES,
  ALL_L9_TEMPORAL_SEMANTIC_TIERS,
} from '../l9/contracts/l9-temporal-semantics-types';
import {
  L9WindowClass,
  L9WindowDoctrine,
  L9_DEFAULT_WINDOW_POLICIES,
  getL9WindowPolicy,
  isL9WindowClassLegalForFamily,
} from '../l9/contracts/l9-window-policy';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
  L9_LEAD_LAG_ADMISSIBILITY,
  classifyL9SemanticLag,
  deriveL9LeadLagQuality,
  getL9LeadLagAdmissibility,
  isL9LagAdmissible,
  l9LagSupportsEarlyStructure,
  l9LagSupportsOnlyLateness,
} from '../l9/contracts/l9-lead-lag-policy';
import {
  L9PhaseTransitionLegality,
  L9_PHASE_TRANSITIONS,
  L9_ADJACENT_PHASE_PAIRS,
  areL9PhasesAdjacent,
  getL9PhaseTransitionLegality,
  isL9DirectLegalPhaseTransition,
  l9PhaseTransitionRequiresChangePoint,
  l9PhaseTransitionRequiresShockAnchor,
  l9PhaseTransitionRequiresRecoveryPosture,
} from '../l9/contracts/l9-phase-progression-policy';
import {
  L9ChangePointMateriality,
  L9ChangePointTriggerFamily,
  L9_CP_CLASSES_REQUIRING_EVENT_ANCHOR,
  L9_CP_CLASSES_REQUIRING_PHASE_BOUNDS,
  L9_CP_MATERIALITY_MINIMUM_SEVERITY,
  L9_LEGAL_TRIGGER_FAMILIES_PER_CP,
  classifyL9ChangePointMateriality,
  isL9ChangePointMaterial,
  isL9LegalChangePointTrigger,
  l9ChangePointRequiresEventAnchor,
  l9ChangePointRequiresPhaseBounds,
  materialityToSeverity,
} from '../l9/contracts/l9-change-point-policy';
import {
  L9DecayDominance,
  L9DecayFactor,
  L9_DECAY_FACTOR_WEIGHTS,
  classifyL9DecayDominance,
  composeL9DecayScore,
  evaluateL9Refresh,
  l9DecayClassToDominance,
  l9IsDecayDominant,
  scanL9IllegalDecayPostures,
} from '../l9/contracts/l9-decay-policy';
import {
  L9PostEventAnchorClass,
  L9PostEventLifecycle,
  L9_LEGAL_POST_EVENT_ANCHOR,
  L9_POST_EVENT_LIFECYCLE_TRANSITIONS,
  getL9RequiredPostEventAnchor,
  isL9LegalPostEventLifecycleTransition,
  l9PostEventStateToLifecycle,
  scanL9IllegalPostEventPostures,
} from '../l9/contracts/l9-post-event-window-policy';

// ── L9.3 contract types used as inputs ──
import { L9SequenceFamily } from '../l9/contracts/sequence-family';
import {
  L9LagContradictionPosture,
  L9LagSupportStrength,
  L9LeadLagRelation,
} from '../l9/contracts/lead-lag-relation';
import { L9PhaseClass } from '../l9/contracts/phase-state';
import {
  L9ChangePoint,
  L9ChangePointClass,
  L9ChangePointSeverity,
} from '../l9/contracts/change-point';
import {
  L9DecayClass,
  L9DecayProfile,
} from '../l9/contracts/decay-profile';
import {
  L9PostEventWindow,
  L9PostEventWindowClass,
  L9PostEventWindowState,
} from '../l9/contracts/post-event-window';

// ── Registries ──
import {
  getDefaultL9LeadLagRegistry,
  L9LeadLagRegistry,
} from '../l9/registry/l9-lead-lag.registry';
import {
  getDefaultL9PhaseProgressionRegistry,
  L9PhaseProgressionRegistry,
} from '../l9/registry/l9-phase-progression.registry';
import {
  getDefaultL9ChangePointRegistry,
  L9ChangePointRegistry,
} from '../l9/registry/l9-change-point.registry';
import {
  getDefaultL9DecayRegistry,
  L9DecayRegistry,
} from '../l9/registry/l9-decay.registry';
import {
  getDefaultL9PostEventWindowRegistry,
  L9PostEventWindowRegistry,
} from '../l9/registry/l9-post-event-window.registry';

// ── Validators ──
import { validateL9TemporalSurfaces } from '../l9/validation/l9-temporal-surface.validator';
import { validateL9Window } from '../l9/validation/l9-window-policy.validator';
import { validateL9LeadLag } from '../l9/validation/l9-lead-lag.validator';
import { validateL9PhaseTransition } from '../l9/validation/l9-phase-progression.validator';
import { validateL9ChangePoint } from '../l9/validation/l9-change-point.validator';
import { validateL9Decay } from '../l9/validation/l9-decay.validator';
import { validateL9PostEventWindow } from '../l9/validation/l9-post-event-window.validator';
import { validateL9TemporalInteraction } from '../l9/validation/l9-temporal-interaction.validator';

// ── Violation codes + audit ──
import {
  ALL_L9_TEMPORAL_SEMANTIC_VIOLATION_CODES,
  L9TemporalSemanticError,
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
} from '../l9/validation/l9-temporal-semantic-violation-codes';
import {
  L9TemporalSemanticSeverity,
  buildL9TemporalSemanticsAudit,
  classifyL9TemporalSemanticSeverity,
  hasL9TemporalSemanticBlockingViolations,
} from '../l9/constitution/l9-temporal-semantics-audit';

// ── Invariants ──
import {
  checkINV_95_A, checkINV_95_B, checkINV_95_C, checkINV_95_D,
  checkINV_95_E, checkINV_95_F, checkINV_95_G,
  runAllL9_5Invariants,
} from '../l9/invariants/l9_5-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function hasCode(
  vs: readonly { code: L9TemporalSemanticViolationCode }[],
  code: L9TemporalSemanticViolationCode,
): boolean {
  return vs.some(v => v.code === code);
}

// Common ISO anchors for deterministic temporal readings.
const T = {
  observed: '2026-04-10T12:00:00.000Z',
  ingested: '2026-04-10T12:00:30.000Z',
  as_of:    '2026-04-10T12:01:00.000Z',
  effective:'2026-04-10T12:01:00.000Z',
  lead:     '2026-04-10T12:00:00.000Z',
  lag:      '2026-04-10T12:02:00.000Z',
  cp:       '2026-04-10T12:01:30.000Z',
  winStart: '2026-04-10T12:00:00.000Z',
  winEnd:   '2026-04-10T12:10:00.000Z',
  peStart:  '2026-04-10T12:01:00.000Z',
  peEnd:    '2026-04-10T14:00:00.000Z',
} as const;

// ═══════════════════════════════════════════════════════════════
// BAND A — Time Surfaces and Windows (§9.5.3 / §9.5.4)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Time Surfaces and Windows ═══');

// A.1 — 11 canonical surfaces present and distinct
assert(ALL_L9_TEMPORAL_SURFACES.length === 11,
  'A.1 exactly 11 time surfaces');
assert(new Set(ALL_L9_TEMPORAL_SURFACES).size === 11,
  'A.2 all surfaces distinct');

// A.3 — every surface has a declared kind
for (const s of ALL_L9_TEMPORAL_SURFACES) {
  assert(L9_TEMPORAL_SURFACE_KIND[s] !== undefined,
    `A.kind.${s} surface kind declared`);
}

// A.4 — surface kinds are balanced (at least one per kind)
const kinds = new Set(
  ALL_L9_TEMPORAL_SURFACES.map(s => L9_TEMPORAL_SURFACE_KIND[s]),
);
assert(kinds.has(L9TemporalSurfaceKind.MARKET_TIME) &&
       kinds.has(L9TemporalSurfaceKind.SYSTEM_TIME) &&
       kinds.has(L9TemporalSurfaceKind.ENGINE_TIME) &&
       kinds.has(L9TemporalSurfaceKind.WINDOW_BOUND),
  'A.3 all four surface kinds populated');

// A.5 — legal-purpose table covers every purpose
for (const p of Object.values(L9TemporalComparisonPurpose)) {
  assert(L9_LEGAL_SURFACES_PER_PURPOSE[p].length > 0,
    `A.purpose.${p} has legal surfaces`);
}

// A.6 — legal-surface detector
assert(isLegalL9SurfaceForPurpose(
  L9TemporalComparisonPurpose.LEAD_LAG_SPACING,
  L9TemporalSurface.OBSERVED_AT) === true,
  'A.6 lead-lag uses OBSERVED_AT legally');
assert(isLegalL9SurfaceForPurpose(
  L9TemporalComparisonPurpose.LEAD_LAG_SPACING,
  L9TemporalSurface.INGESTED_AT) === false,
  'A.7 lead-lag rejects INGESTED_AT');

// A.8 — green reading passes surface validator
const greenSurfaces = validateL9TemporalSurfaces({
  reading: {
    observed_at: T.observed, ingested_at: T.ingested,
    as_of: T.as_of, effective_at: T.effective,
    sequence_window_start: T.winStart, sequence_window_end: T.winEnd,
    lead_signal_at: T.lead, lag_signal_at: T.lag,
    change_point_at: T.cp,
    post_event_window_start: T.peStart, post_event_window_end: T.peEnd,
  },
  declared_purposes: [
    L9TemporalComparisonPurpose.LEAD_LAG_SPACING,
    L9TemporalComparisonPurpose.DECAY_ELAPSED,
  ],
  surface_usage: {
    [L9TemporalComparisonPurpose.LEAD_LAG_SPACING]:
      L9TemporalSurface.OBSERVED_AT,
    [L9TemporalComparisonPurpose.DECAY_ELAPSED]:
      L9TemporalSurface.OBSERVED_AT,
  },
});
assert(greenSurfaces.ok === true, 'A.8 green reading passes surfaces');

// A.9 — missing as_of is rejected
const missingAsOf = validateL9TemporalSurfaces({
  reading: {
    observed_at: T.observed, ingested_at: T.ingested,
    as_of: '' as unknown as string, effective_at: null,
    sequence_window_start: null, sequence_window_end: null,
    lead_signal_at: null, lag_signal_at: null, change_point_at: null,
    post_event_window_start: null, post_event_window_end: null,
  },
  declared_purposes: [],
});
assert(!missingAsOf.ok && hasCode(missingAsOf.violations,
  L9TemporalSemanticViolationCode.TS_AS_OF_MISSING),
  'A.9 missing as_of → TS_AS_OF_MISSING');

// A.10 — observed==ingested without anchor
const collapseObsIng = validateL9TemporalSurfaces({
  reading: {
    observed_at: T.observed, ingested_at: T.observed,
    as_of: T.as_of, effective_at: null,
    sequence_window_start: null, sequence_window_end: null,
    lead_signal_at: null, lag_signal_at: null, change_point_at: null,
    post_event_window_start: null, post_event_window_end: null,
  },
  declared_purposes: [],
});
assert(hasCode(collapseObsIng.violations,
  L9TemporalSemanticViolationCode
    .TS_OBSERVED_EQUALS_INGESTED_WITHOUT_ANCHOR),
  'A.10 observed==ingested w/o anchor → TS_OBSERVED_EQUALS_INGESTED_WITHOUT_ANCHOR');

// A.11 — as_of collapsed to observed
const asOfCollapsed = validateL9TemporalSurfaces({
  reading: {
    observed_at: T.as_of, ingested_at: T.ingested,
    as_of: T.as_of, effective_at: null,
    sequence_window_start: null, sequence_window_end: null,
    lead_signal_at: null, lag_signal_at: null, change_point_at: null,
    post_event_window_start: null, post_event_window_end: null,
  },
  declared_purposes: [],
});
assert(hasCode(asOfCollapsed.violations,
  L9TemporalSemanticViolationCode.TS_AS_OF_COLLAPSED_TO_OBSERVED),
  'A.11 as_of==observed w/o effective → TS_AS_OF_COLLAPSED_TO_OBSERVED');

// A.12 — half-bounded post-event window
const halfPE = validateL9TemporalSurfaces({
  reading: {
    observed_at: T.observed, ingested_at: T.ingested,
    as_of: T.as_of, effective_at: T.effective,
    sequence_window_start: null, sequence_window_end: null,
    lead_signal_at: null, lag_signal_at: null, change_point_at: null,
    post_event_window_start: T.peStart, post_event_window_end: null,
  },
  declared_purposes: [],
});
assert(hasCode(halfPE.violations,
  L9TemporalSemanticViolationCode.TS_POST_EVENT_HALF_BOUNDED),
  'A.12 half-bounded PE → TS_POST_EVENT_HALF_BOUNDED');

// A.13 — illegal surface for purpose (INGESTED for LEAD_LAG)
const illegalForLL = validateL9TemporalSurfaces({
  reading: {
    observed_at: T.observed, ingested_at: T.ingested,
    as_of: T.as_of, effective_at: T.effective,
    sequence_window_start: null, sequence_window_end: null,
    lead_signal_at: null, lag_signal_at: null, change_point_at: null,
    post_event_window_start: null, post_event_window_end: null,
  },
  declared_purposes: [L9TemporalComparisonPurpose.LEAD_LAG_SPACING],
  surface_usage: {
    [L9TemporalComparisonPurpose.LEAD_LAG_SPACING]:
      L9TemporalSurface.INGESTED_AT,
  },
});
assert(hasCode(illegalForLL.violations,
  L9TemporalSemanticViolationCode.TS_SURFACE_ILLEGAL_FOR_PURPOSE) &&
  hasCode(illegalForLL.violations,
    L9TemporalSemanticViolationCode.TS_MARKET_VS_SYSTEM_TIME_CONFUSION),
  'A.13 INGESTED for LEAD_LAG → illegal-for-purpose + market-vs-system');

// A.14 — time-collapse scan returns structured reasons
const scan = scanL9TimeCollapses({
  observed_at: T.observed, ingested_at: T.observed,
  as_of: T.as_of, effective_at: null,
  sequence_window_start: null, sequence_window_end: null,
  lead_signal_at: null, lag_signal_at: null, change_point_at: null,
  post_event_window_start: null, post_event_window_end: null,
});
assert(scan.includes('TS_OBSERVED_EQUALS_INGESTED_WITHOUT_ANCHOR'),
  'A.14 scanL9TimeCollapses detects collapse');

// A.15 — lead-lag spacing helper
assert(l9LeadLagSpacingMs({
  observed_at: T.observed, ingested_at: null, as_of: T.as_of,
  effective_at: null, sequence_window_start: null, sequence_window_end: null,
  lead_signal_at: T.lead, lag_signal_at: T.lag, change_point_at: null,
  post_event_window_start: null, post_event_window_end: null,
}) === 120_000, 'A.15 lead-lag spacing = 120000ms');
assert(l9LeadLagSpacingMs({
  observed_at: null, ingested_at: null, as_of: T.as_of,
  effective_at: null, sequence_window_start: null, sequence_window_end: null,
  lead_signal_at: null, lag_signal_at: T.lag, change_point_at: null,
  post_event_window_start: null, post_event_window_end: null,
}) === null, 'A.16 lead-lag spacing=null when lead missing');

// A.17 — temporal modes exhaustive
assert(ALL_L9_TEMPORAL_MODES.length >= 5 &&
  ALL_L9_TEMPORAL_MODES.includes(L9TemporalMode.LIVE_CURRENT) &&
  ALL_L9_TEMPORAL_MODES.includes(L9TemporalMode.REPLAY_HISTORICAL) &&
  ALL_L9_TEMPORAL_MODES.includes(L9TemporalMode.REPAIR_REBUILD),
  'A.17 all canonical temporal modes present');

// A.18 — semantic-tier coverage
assert(ALL_L9_TEMPORAL_SEMANTIC_TIERS.length === 8,
  'A.18 8 semantic tiers');

// Windows ─────────────────────────────────────────────────────
// A.19 — default window policy table is populated
assert(L9_DEFAULT_WINDOW_POLICIES.length > 0,
  'A.19 L9_DEFAULT_WINDOW_POLICIES non-empty');

// A.20 — every (family, class) where the family uses a class has a policy
for (const fam of Object.values(L9SequenceFamily)) {
  for (const cls of [L9WindowClass.SEQUENCE_WINDOW,
    L9WindowClass.LEAD_LAG_WINDOW, L9WindowClass.DECAY_WINDOW]) {
    assert(getL9WindowPolicy(fam, cls) !== undefined,
      `A.policy.${fam}.${cls} present`);
  }
}

// A.21 — green window passes validator
function mkGreenLLWindow(family: L9SequenceFamily): L9WindowDoctrine {
  const p = getL9WindowPolicy(family, L9WindowClass.LEAD_LAG_WINDOW)!;
  const start = Date.parse('2026-04-10T00:00:00.000Z');
  return {
    window_class: L9WindowClass.LEAD_LAG_WINDOW,
    start: new Date(start).toISOString(),
    end: new Date(start + p.default_span_ms).toISOString(),
    anchor_ref: 'ANCHOR-1',
    allowable_drift_ms: p.default_drift_ms,
    historically_legal: p.historically_legal,
    freshness_ceiling_ms: p.default_freshness_ceiling_ms,
    late_data_may_reinterpret: p.late_data_may_reinterpret,
  };
}
const greenWin = validateL9Window({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  window: mkGreenLLWindow(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
});
assert(greenWin.ok === true, 'A.21 green LEAD_LAG_WINDOW passes');

// A.22 — illegal class for family
const illegalWinClass = validateL9Window({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  window: {
    ...mkGreenLLWindow(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
    window_class: L9WindowClass.POST_EVENT_WINDOW, // ACC_TO_EXP doesn't use PE
  },
});
assert(hasCode(illegalWinClass.violations,
  L9TemporalSemanticViolationCode.WIN_CLASS_ILLEGAL_FOR_FAMILY),
  'A.22 POST_EVENT_WINDOW illegal for ACC_TO_EXP');

// A.23 — missing anchor on a class that requires one (SEQUENCE_WINDOW
// per ACC_TO_EXP policy has requires_anchor=true)
const seqPolicy = getL9WindowPolicy(
  L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  L9WindowClass.SEQUENCE_WINDOW)!;
const seqStart = Date.parse('2026-04-01T00:00:00.000Z');
const winNoAnchor = validateL9Window({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  window: {
    window_class: L9WindowClass.SEQUENCE_WINDOW,
    start: new Date(seqStart).toISOString(),
    end: new Date(seqStart + seqPolicy.default_span_ms).toISOString(),
    anchor_ref: null,
    allowable_drift_ms: seqPolicy.default_drift_ms,
    historically_legal: seqPolicy.historically_legal,
    freshness_ceiling_ms: seqPolicy.default_freshness_ceiling_ms,
    late_data_may_reinterpret: seqPolicy.late_data_may_reinterpret,
  },
});
assert(hasCode(winNoAnchor.violations,
  L9TemporalSemanticViolationCode.WIN_ANCHOR_MISSING),
  'A.23 missing anchor → WIN_ANCHOR_MISSING');

// A.24 — end before start
const winReversed = validateL9Window({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  window: {
    ...mkGreenLLWindow(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
    start: '2026-04-11T00:00:00.000Z',
    end: '2026-04-10T00:00:00.000Z',
  },
});
assert(hasCode(winReversed.violations,
  L9TemporalSemanticViolationCode.WIN_END_BEFORE_START),
  'A.24 end<start → WIN_END_BEFORE_START');

// A.25 — negative drift
const winNegDrift = validateL9Window({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  window: {
    ...mkGreenLLWindow(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
    allowable_drift_ms: -1,
  },
});
assert(hasCode(winNegDrift.violations,
  L9TemporalSemanticViolationCode.WIN_DRIFT_NEGATIVE),
  'A.25 drift<0 → WIN_DRIFT_NEGATIVE');

// A.26 — drift exceeds 2x policy
const winBigDrift = validateL9Window({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  window: {
    ...mkGreenLLWindow(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
    allowable_drift_ms: 1_000 * 60 * 60 * 24 * 30,
  },
});
assert(hasCode(winBigDrift.violations,
  L9TemporalSemanticViolationCode.WIN_DRIFT_EXCEEDS_POLICY),
  'A.26 drift > 2x policy → WIN_DRIFT_EXCEEDS_POLICY');

// A.27 — span exceeds 2x policy default
const winBigSpan = validateL9Window({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  window: {
    ...mkGreenLLWindow(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-06-01T00:00:00.000Z',
  },
});
assert(hasCode(winBigSpan.violations,
  L9TemporalSemanticViolationCode.WIN_SPAN_EXCEEDS_POLICY),
  'A.27 huge span → WIN_SPAN_EXCEEDS_POLICY');

// A.28 — late-data flag mismatch
const policyAcc = getL9WindowPolicy(
  L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  L9WindowClass.LEAD_LAG_WINDOW)!;
const winFlipFlag = validateL9Window({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  window: {
    ...mkGreenLLWindow(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
    late_data_may_reinterpret: !policyAcc.late_data_may_reinterpret,
  },
});
assert(hasCode(winFlipFlag.violations,
  L9TemporalSemanticViolationCode.WIN_LATE_DATA_FLAG_MISMATCH),
  'A.28 late-data flag flip → WIN_LATE_DATA_FLAG_MISMATCH');

// A.29 — class-legal-for-family helper
assert(isL9WindowClassLegalForFamily(
  L9SequenceFamily.OVERHANG_AND_DIGESTION,
  L9WindowClass.POST_EVENT_WINDOW) === true,
  'A.29 OVERHANG_AND_DIGESTION uses POST_EVENT_WINDOW');
assert(isL9WindowClassLegalForFamily(
  L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  L9WindowClass.POST_EVENT_WINDOW) === false,
  'A.30 ACC_TO_EXP does NOT use POST_EVENT_WINDOW');

// ═══════════════════════════════════════════════════════════════
// BAND B — Lead-Lag Law (§9.5.5)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Lead-Lag Law ═══');

// B.1 — admissibility exists for every sequence family
for (const f of Object.values(L9SequenceFamily)) {
  assert(getL9LeadLagAdmissibility(f) !== undefined,
    `B.adm.${f} admissibility present`);
}

// B.2 — admissibility ceilings are monotone-increasing
for (const a of L9_LEAD_LAG_ADMISSIBILITY) {
  const mono = a.immediate_ceiling_ms < a.short_ceiling_ms &&
               a.short_ceiling_ms < a.medium_ceiling_ms &&
               a.medium_ceiling_ms < a.long_ceiling_ms &&
               a.long_ceiling_ms < a.late_confirmation_ceiling_ms &&
               a.late_confirmation_ceiling_ms < a.too_late_ceiling_ms &&
               a.too_late_ceiling_ms <= a.max_admissible_ms;
  assert(mono, `B.mono.${a.family} admissibility monotone`);
}

// B.3 — classifyL9SemanticLag banding
const fam = L9SequenceFamily.ACCUMULATION_TO_EXPANSION;
const adm = getL9LeadLagAdmissibility(fam)!;
assert(classifyL9SemanticLag(fam, 0) === L9SemanticLagClass.IMMEDIATE,
  'B.3 0ms=IMMEDIATE');
assert(classifyL9SemanticLag(fam, adm.short_ceiling_ms - 1) ===
  L9SemanticLagClass.SHORT_LAG, 'B.4 below short_ceiling=SHORT_LAG');
assert(classifyL9SemanticLag(fam, adm.medium_ceiling_ms - 1) ===
  L9SemanticLagClass.MEDIUM_LAG, 'B.5 below medium_ceiling=MEDIUM_LAG');
assert(classifyL9SemanticLag(fam, adm.long_ceiling_ms - 1) ===
  L9SemanticLagClass.LONG_LAG, 'B.6 below long_ceiling=LONG_LAG');
assert(classifyL9SemanticLag(fam, adm.late_confirmation_ceiling_ms - 1) ===
  L9SemanticLagClass.LATE_CONFIRMATION, 'B.7 below late_conf=LATE_CONFIRMATION');
assert(classifyL9SemanticLag(fam, adm.too_late_ceiling_ms - 1) ===
  L9SemanticLagClass.TOO_LATE_FOR_EARLY_PROOF,
  'B.8 below too_late=TOO_LATE_FOR_EARLY_PROOF');
assert(classifyL9SemanticLag(fam, adm.max_admissible_ms + 1) ===
  L9SemanticLagClass.UNRESOLVED_LAG,
  'B.9 above max_admissible=UNRESOLVED_LAG');
assert(classifyL9SemanticLag(fam, -1) === L9SemanticLagClass.UNRESOLVED_LAG,
  'B.10 negative lag=UNRESOLVED_LAG');

// B.11 — early-vs-late support helpers
assert(l9LagSupportsEarlyStructure(L9SemanticLagClass.SHORT_LAG) === true,
  'B.11 SHORT_LAG supports early');
assert(l9LagSupportsOnlyLateness(L9SemanticLagClass.TOO_LATE_FOR_EARLY_PROOF)
  === true, 'B.12 TOO_LATE supports only lateness');
assert(l9LagSupportsEarlyStructure(L9SemanticLagClass.LATE_CONFIRMATION)
  === false, 'B.13 LATE_CONFIRMATION ≠ early');

// B.14 — isL9LagAdmissible bounds
assert(isL9LagAdmissible(fam, adm.max_admissible_ms) === true,
  'B.14 at max_admissible → admissible');
assert(isL9LagAdmissible(fam, adm.max_admissible_ms + 1) === false,
  'B.15 above max_admissible → inadmissible');

// B.16 — deriveL9LeadLagQuality green path
const qGreen = deriveL9LeadLagQuality({
  family: fam, lag_ms: 120_000,
  contradiction_posture: L9LagContradictionPosture.NONE,
  decay_adjustment: 0.05,
  scope_aligned: true, lineage_complete: true,
});
assert(qGreen.quality_class === L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
  'B.16 clean green → STRUCTURALLY_MEANINGFUL');

// B.17 — derivative — decisive contradiction voids
const qDecisive = deriveL9LeadLagQuality({
  family: fam, lag_ms: 120_000,
  contradiction_posture: L9LagContradictionPosture.DECISIVE,
  decay_adjustment: 0, scope_aligned: true, lineage_complete: true,
});
assert(qDecisive.quality_class === L9LeadLagQualityClass.SEMANTICALLY_VOID,
  'B.17 decisive contradiction → SEMANTICALLY_VOID');

// B.18 — derivative — scope blocks
const qScope = deriveL9LeadLagQuality({
  family: fam, lag_ms: 120_000,
  contradiction_posture: L9LagContradictionPosture.NONE,
  decay_adjustment: 0, scope_aligned: false, lineage_complete: true,
});
assert(qScope.quality_class === L9LeadLagQualityClass.BLOCKED,
  'B.18 scope mismatch → BLOCKED');

// B.19 — derivative — high decay narrows
const qDecay = deriveL9LeadLagQuality({
  family: fam, lag_ms: 120_000,
  contradiction_posture: L9LagContradictionPosture.NONE,
  decay_adjustment: 0.9, scope_aligned: true, lineage_complete: true,
});
assert(qDecay.quality_class === L9LeadLagQualityClass.NARROWED_BY_DECAY,
  'B.19 high decay → NARROWED_BY_DECAY');

// Full validator suite
function mkRel(overrides: Partial<L9LeadLagRelation> = {}): L9LeadLagRelation {
  return {
    lead_lag_id: 'LL-1',
    sequence_subject_id: 'S-1',
    leading_signal_ref: 'SIG-lead',
    lagging_signal_ref: 'SIG-lag',
    lag_duration_ms: 120_000,
    lag_class: 'NORMAL' as never,
    support_strength: L9LagSupportStrength.MODERATE_SUPPORT,
    contradiction_posture: L9LagContradictionPosture.NONE,
    decay_adjustment: 0.1,
    historical_reliability: 0.7,
    causal_restraint: {
      treated_as_temporal_only: true,
      causal_inference_disclaimer: 'temporal-only; no causal inference',
    },
    lineage_refs: ['TRACE-1'],
    ...overrides,
  };
}

// B.20 — green lead-lag passes
const llGreen = validateL9LeadLag({
  family: fam, relation: mkRel(), scope_aligned: true,
});
assert(llGreen.ok === true, 'B.20 green lead-lag passes');

// B.21 — outside admissible window
const llOut = validateL9LeadLag({
  family: fam,
  relation: mkRel({ lag_duration_ms: 365 * 24 * 60 * 60_000 }),
  scope_aligned: true,
});
assert(hasCode(llOut.violations,
  L9TemporalSemanticViolationCode.LL_LAG_OUTSIDE_ADMISSIBLE_WINDOW),
  'B.21 365d lag → LL_LAG_OUTSIDE_ADMISSIBLE_WINDOW');

// B.22 — negative/NaN lag
const llNeg = validateL9LeadLag({
  family: fam, relation: mkRel({ lag_duration_ms: -1 }),
  scope_aligned: true,
});
assert(hasCode(llNeg.violations,
  L9TemporalSemanticViolationCode.LL_LAG_NEGATIVE_OR_NON_FINITE),
  'B.22 negative lag → LL_LAG_NEGATIVE_OR_NON_FINITE');

// B.23 — scope mismatch
const llScope = validateL9LeadLag({
  family: fam, relation: mkRel(), scope_aligned: false,
});
assert(hasCode(llScope.violations,
  L9TemporalSemanticViolationCode.LL_SCOPE_MISMATCH),
  'B.23 scope_aligned=false → LL_SCOPE_MISMATCH');

// B.24 — missing lineage
const llLin = validateL9LeadLag({
  family: fam, relation: mkRel({ lineage_refs: [] }),
  scope_aligned: true,
});
assert(hasCode(llLin.violations,
  L9TemporalSemanticViolationCode.LL_LINEAGE_INCOMPLETE),
  'B.24 empty lineage → LL_LINEAGE_INCOMPLETE');

// B.25 — decisive contradiction with non-void declared quality
const llDec = validateL9LeadLag({
  family: fam,
  relation: mkRel({
    contradiction_posture: L9LagContradictionPosture.DECISIVE,
  }),
  scope_aligned: true,
  declared_quality_class: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
});
assert(hasCode(llDec.violations,
  L9TemporalSemanticViolationCode.LL_DECISIVE_CONTRADICTION_NOT_VOIDED),
  'B.25 decisive w/ non-void declared → LL_DECISIVE_CONTRADICTION_NOT_VOIDED');

// B.26 — causal-inference laundering (disclaimer launders cause)
const llCausal = validateL9LeadLag({
  family: fam,
  relation: mkRel({
    causal_restraint: {
      treated_as_temporal_only: true,
      causal_inference_disclaimer: 'temporal causal proof of inevitable lead',
    },
  }),
  scope_aligned: true,
});
assert(hasCode(llCausal.violations,
  L9TemporalSemanticViolationCode.LL_CAUSAL_INFERENCE_LAUNDERED),
  'B.26 "proves causality" → LL_CAUSAL_INFERENCE_LAUNDERED');

// B.27 — treated_as_temporal_only=false → causal laundering
const llCausalFlag = validateL9LeadLag({
  family: fam,
  relation: mkRel({
    causal_restraint: {
      treated_as_temporal_only: false as unknown as true,
      causal_inference_disclaimer: 'temporal-only',
    },
  }),
  scope_aligned: true,
});
assert(hasCode(llCausalFlag.violations,
  L9TemporalSemanticViolationCode.LL_CAUSAL_INFERENCE_LAUNDERED),
  'B.27 treated_as_temporal_only=false → LL_CAUSAL_INFERENCE_LAUNDERED');

// B.28 — late lag marked as early confirmation
const llLateEarly = validateL9LeadLag({
  family: fam,
  relation: mkRel({
    lag_duration_ms: 10 * 24 * 60 * 60_000, // 10d = TOO_LATE_FOR_EARLY_PROOF
  }),
  scope_aligned: true,
  declared_early_confirmation: true,
});
assert(hasCode(llLateEarly.violations,
  L9TemporalSemanticViolationCode.LL_LATE_MARKED_AS_EARLY_CONFIRMATION),
  'B.28 10d lag + declared_early → LL_LATE_MARKED_AS_EARLY_CONFIRMATION');

// B.29 — quality-class mismatch
const llQC = validateL9LeadLag({
  family: fam,
  relation: mkRel({
    lag_duration_ms: 10 * 24 * 60 * 60_000, // WEAK_BUT_USABLE
  }),
  scope_aligned: true,
  declared_quality_class: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
});
assert(hasCode(llQC.violations,
  L9TemporalSemanticViolationCode.LL_QUALITY_CLASS_MISMATCH),
  'B.29 late lag declared MEANINGFUL → LL_QUALITY_CLASS_MISMATCH');

// B.30 — lead-lag registry
const llReg = getDefaultL9LeadLagRegistry();
assert(llReg instanceof L9LeadLagRegistry, 'B.30 default lead-lag registry');
assert(llReg.admissibility(fam)?.max_admissible_ms === adm.max_admissible_ms,
  'B.31 registry.admissibility matches policy');
assert(llReg.classifySemanticLag(fam, 0) === L9SemanticLagClass.IMMEDIATE,
  'B.32 registry classify=IMMEDIATE at 0ms');

// ═══════════════════════════════════════════════════════════════
// BAND C — Phase + Change-Point Law (§9.5.6 / §9.5.7)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Phase + Change-Point Law ═══');

// C.1 — phase transition table is non-trivial
assert(L9_PHASE_TRANSITIONS.length >= 20,
  'C.1 phase transitions table populated');

// C.2 — direct progression
assert(isL9DirectLegalPhaseTransition(
  L9PhaseClass.VALIDATED, L9PhaseClass.EXPANSION) === true,
  'C.2 VALIDATED→EXPANSION is direct');

// C.3 — ILLEGAL shortcut rejected
assert(getL9PhaseTransitionLegality(
  L9PhaseClass.DISCOVERY, L9PhaseClass.REFLEXIVE_LATE) ===
  L9PhaseTransitionLegality.ILLEGAL,
  'C.3 DISCOVERY→REFLEXIVE_LATE is ILLEGAL');

// C.4 — LEGAL_WITH_CHANGE_POINT for failed continuation
assert(l9PhaseTransitionRequiresChangePoint(
  L9PhaseClass.EXPANSION, L9PhaseClass.DECAYING) === true,
  'C.4 EXPANSION→DECAYING requires change point');

// C.5 — LEGAL_WITH_SHOCK_ANCHOR
assert(l9PhaseTransitionRequiresShockAnchor(
  L9PhaseClass.EXPANSION, L9PhaseClass.SHOCK_RESPONSE) === true,
  'C.5 EXPANSION→SHOCK_RESPONSE requires shock anchor');

// C.6 — LEGAL_WITH_RECOVERY_POSTURE
assert(l9PhaseTransitionRequiresRecoveryPosture(
  L9PhaseClass.DIGESTION, L9PhaseClass.RECOVERY) === true,
  'C.6 DIGESTION→RECOVERY requires recovery posture');

// C.7 — same-phase is always legal
assert(getL9PhaseTransitionLegality(
  L9PhaseClass.EXPANSION, L9PhaseClass.EXPANSION) ===
  L9PhaseTransitionLegality.LEGAL_DIRECT,
  'C.7 EXPANSION→EXPANSION is LEGAL_DIRECT');

// C.8 — adjacent-phase helper
assert(areL9PhasesAdjacent(L9PhaseClass.VALIDATED, L9PhaseClass.EXPANSION),
  'C.8 VALIDATED & EXPANSION adjacent');
assert(areL9PhasesAdjacent(L9PhaseClass.DISCOVERY, L9PhaseClass.REFLEXIVE_LATE)
  === false, 'C.9 DISCOVERY & REFLEXIVE_LATE not adjacent');

// C.10 — green phase transition passes
const phGreen = validateL9PhaseTransition({
  from_phase: L9PhaseClass.VALIDATED, to_phase: L9PhaseClass.EXPANSION,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
});
assert(phGreen.ok === true, 'C.10 green phase passes');

// C.11 — illegal transition
const phIll = validateL9PhaseTransition({
  from_phase: L9PhaseClass.DISCOVERY, to_phase: L9PhaseClass.REFLEXIVE_LATE,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
});
assert(hasCode(phIll.violations,
  L9TemporalSemanticViolationCode.PHASE_TRANSITION_ILLEGAL),
  'C.11 illegal transition → PHASE_TRANSITION_ILLEGAL');

// C.12 — missing change-point
const phCP = validateL9PhaseTransition({
  from_phase: L9PhaseClass.EXPANSION, to_phase: L9PhaseClass.DECAYING,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
});
assert(hasCode(phCP.violations,
  L9TemporalSemanticViolationCode.PHASE_TRANSITION_MISSING_CHANGE_POINT),
  'C.12 missing CP → PHASE_TRANSITION_MISSING_CHANGE_POINT');

// C.13 — providing CP satisfies it
const phCPok = validateL9PhaseTransition({
  from_phase: L9PhaseClass.EXPANSION, to_phase: L9PhaseClass.DECAYING,
  change_point_ref: 'CP-1', shock_anchor_ref: null, recovery_posture_ref: null,
});
assert(phCPok.ok === true, 'C.13 CP ref satisfies change-point requirement');

// C.14 — missing shock anchor
const phShock = validateL9PhaseTransition({
  from_phase: L9PhaseClass.EXPANSION, to_phase: L9PhaseClass.SHOCK_RESPONSE,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
});
assert(hasCode(phShock.violations,
  L9TemporalSemanticViolationCode.PHASE_TRANSITION_MISSING_SHOCK_ANCHOR),
  'C.14 missing shock anchor → PHASE_TRANSITION_MISSING_SHOCK_ANCHOR');

// C.15 — missing recovery posture
const phRec = validateL9PhaseTransition({
  from_phase: L9PhaseClass.DIGESTION, to_phase: L9PhaseClass.RECOVERY,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
});
assert(hasCode(phRec.violations,
  L9TemporalSemanticViolationCode
    .PHASE_TRANSITION_MISSING_RECOVERY_POSTURE),
  'C.15 missing recovery → PHASE_TRANSITION_MISSING_RECOVERY_POSTURE');

// C.16 — ambiguity collapsed under clean claim
const phHide = validateL9PhaseTransition({
  from_phase: L9PhaseClass.VALIDATED, to_phase: L9PhaseClass.EXPANSION,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  ambiguity_secondary_phase: L9PhaseClass.CROWDING,
  declared_clean_single_phase: true,
});
assert(hasCode(phHide.violations,
  L9TemporalSemanticViolationCode.PHASE_AMBIGUITY_COLLAPSED),
  'C.16 hidden ambiguity → PHASE_AMBIGUITY_COLLAPSED');

// C.17 — non-adjacent secondary phase rejected
const phNA = validateL9PhaseTransition({
  from_phase: L9PhaseClass.VALIDATED, to_phase: L9PhaseClass.EXPANSION,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  ambiguity_secondary_phase: L9PhaseClass.REFLEXIVE_LATE,
});
assert(hasCode(phNA.violations,
  L9TemporalSemanticViolationCode.PHASE_NON_ADJACENT_CLAIM),
  'C.17 non-adjacent secondary → PHASE_NON_ADJACENT_CLAIM');

// C.18 — adjacent-pair table
assert(L9_ADJACENT_PHASE_PAIRS.length > 0,
  'C.18 adjacent pairs non-empty');

// C.19 — phase registry
const phReg = getDefaultL9PhaseProgressionRegistry();
assert(phReg instanceof L9PhaseProgressionRegistry,
  'C.19 default phase registry');
assert(phReg.legality(L9PhaseClass.VALIDATED, L9PhaseClass.EXPANSION)
  === L9PhaseTransitionLegality.LEGAL_DIRECT,
  'C.20 registry legality matches');

// Change points ───────────────────────────────────────────────
// C.21 — materiality banding
assert(classifyL9ChangePointMateriality(0.0) ===
  L9ChangePointMateriality.TRIVIAL, 'C.21 0.00 = TRIVIAL');
assert(classifyL9ChangePointMateriality(0.20) ===
  L9ChangePointMateriality.WEAK, 'C.22 0.20 = WEAK');
assert(classifyL9ChangePointMateriality(0.45) ===
  L9ChangePointMateriality.MODERATE, 'C.23 0.45 = MODERATE');
assert(classifyL9ChangePointMateriality(0.70) ===
  L9ChangePointMateriality.STRONG, 'C.24 0.70 = STRONG');
assert(classifyL9ChangePointMateriality(0.90) ===
  L9ChangePointMateriality.DECISIVE, 'C.25 0.90 = DECISIVE');
assert(classifyL9ChangePointMateriality(-1) ===
  L9ChangePointMateriality.TRIVIAL, 'C.26 negative=TRIVIAL');

// C.27 — materialityToSeverity banding
assert(materialityToSeverity(L9ChangePointMateriality.TRIVIAL) ===
  L9ChangePointSeverity.MINOR, 'C.27 TRIVIAL→MINOR');
assert(materialityToSeverity(L9ChangePointMateriality.DECISIVE) ===
  L9ChangePointSeverity.DECISIVE, 'C.28 DECISIVE→DECISIVE');

// C.29 — legal trigger helpers
assert(isL9LegalChangePointTrigger(
  L9ChangePointClass.UNLOCK_EVENT,
  L9ChangePointTriggerFamily.UNLOCK_EVENT) === true,
  'C.29 UNLOCK_EVENT accepts UNLOCK_EVENT trigger');
assert(isL9LegalChangePointTrigger(
  L9ChangePointClass.UNLOCK_EVENT,
  L9ChangePointTriggerFamily.SECURITY_EVENT) === false,
  'C.30 UNLOCK_EVENT rejects SECURITY_EVENT trigger');

// C.31 — anchor/phase requirements
assert(l9ChangePointRequiresEventAnchor(L9ChangePointClass.UNLOCK_EVENT),
  'C.31 UNLOCK_EVENT requires event anchor');
assert(l9ChangePointRequiresEventAnchor(L9ChangePointClass.DECAY_ONSET)
  === false, 'C.32 DECAY_ONSET does not require event anchor');
assert(l9ChangePointRequiresPhaseBounds(L9ChangePointClass.PHASE_SHIFT),
  'C.33 PHASE_SHIFT requires phase bounds');

// C.34 — isMaterial threshold
assert(isL9ChangePointMaterial(L9ChangePointClass.UNLOCK_EVENT,
  L9_CP_MATERIALITY_MINIMUM_SEVERITY[L9ChangePointClass.UNLOCK_EVENT]),
  'C.34 UNLOCK at minimum=material');
assert(!isL9ChangePointMaterial(L9ChangePointClass.CONTRADICTION_SHOCK, 0.1),
  'C.35 CONTRADICTION_SHOCK at 0.1=not material');

// C.36 — every CP class has at least one legal trigger
for (const cls of Object.values(L9ChangePointClass)) {
  assert(L9_LEGAL_TRIGGER_FAMILIES_PER_CP[cls].length > 0,
    `C.trig.${cls} has legal triggers`);
}

// Change-point validator ─────────────────────────────────────
function mkCP(overrides: Partial<L9ChangePoint> = {}): L9ChangePoint {
  return {
    change_point_id: 'CP-1',
    sequence_subject_id: 'S-1',
    change_point_class: L9ChangePointClass.PHASE_SHIFT,
    change_point_at: T.cp,
    prior_phase_ref: 'P-prior',
    next_phase_ref: 'P-next',
    triggering_refs: ['EVT-1'],
    severity_score: 0.45,
    severity_class: L9ChangePointSeverity.MODERATE,
    lineage_refs: ['TRACE-1'],
    ...overrides,
  };
}

// C.37 — green change-point
const cpGreen = validateL9ChangePoint({
  change_point: mkCP(),
  trigger_family: L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
  event_anchor_ref: null,
});
assert(cpGreen.ok === true, 'C.37 green change-point passes');

// C.38 — illegal trigger family
const cpBadTrig = validateL9ChangePoint({
  change_point: mkCP({ change_point_class: L9ChangePointClass.UNLOCK_EVENT,
    severity_score: 0.5, severity_class: L9ChangePointSeverity.MODERATE }),
  trigger_family: L9ChangePointTriggerFamily.SECURITY_EVENT,
  event_anchor_ref: 'EVT-unlock-1',
});
assert(hasCode(cpBadTrig.violations,
  L9TemporalSemanticViolationCode.CP_ILLEGAL_TRIGGER_FAMILY),
  'C.38 bad trigger → CP_ILLEGAL_TRIGGER_FAMILY');

// C.39 — severity below materiality
const cpWeak = validateL9ChangePoint({
  change_point: mkCP({
    change_point_class: L9ChangePointClass.CONTRADICTION_SHOCK,
    severity_score: 0.1,
    severity_class: L9ChangePointSeverity.MINOR,
  }),
  trigger_family: L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
  event_anchor_ref: 'EVT-1',
});
assert(hasCode(cpWeak.violations,
  L9TemporalSemanticViolationCode.CP_SEVERITY_BELOW_MATERIALITY),
  'C.39 weak severity → CP_SEVERITY_BELOW_MATERIALITY');

// C.40 — missing event anchor
const cpNoAnchor = validateL9ChangePoint({
  change_point: mkCP({
    change_point_class: L9ChangePointClass.UNLOCK_EVENT,
    severity_score: 0.5, severity_class: L9ChangePointSeverity.MODERATE,
  }),
  trigger_family: L9ChangePointTriggerFamily.UNLOCK_EVENT,
  event_anchor_ref: null,
});
assert(hasCode(cpNoAnchor.violations,
  L9TemporalSemanticViolationCode.CP_MISSING_EVENT_ANCHOR),
  'C.40 missing event anchor → CP_MISSING_EVENT_ANCHOR');

// C.41 — missing prior phase ref
const cpNoPrior = validateL9ChangePoint({
  change_point: mkCP({ prior_phase_ref: '' as never }),
  trigger_family: L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
  event_anchor_ref: null,
});
assert(hasCode(cpNoPrior.violations,
  L9TemporalSemanticViolationCode.CP_MISSING_PRIOR_POSTURE),
  'C.41 missing prior → CP_MISSING_PRIOR_POSTURE');

// C.42 — missing next phase ref
const cpNoNext = validateL9ChangePoint({
  change_point: mkCP({ next_phase_ref: '' as never }),
  trigger_family: L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
  event_anchor_ref: null,
});
assert(hasCode(cpNoNext.violations,
  L9TemporalSemanticViolationCode.CP_MISSING_NEXT_POSTURE),
  'C.42 missing next → CP_MISSING_NEXT_POSTURE');

// C.43 — missing triggering refs
const cpNoTrig = validateL9ChangePoint({
  change_point: mkCP({ triggering_refs: [] }),
  trigger_family: L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
  event_anchor_ref: null,
});
assert(hasCode(cpNoTrig.violations,
  L9TemporalSemanticViolationCode.CP_MISSING_TRIGGERING_REFS),
  'C.43 empty triggering_refs → CP_MISSING_TRIGGERING_REFS');

// C.44 — severity class understates score
const cpMis = validateL9ChangePoint({
  change_point: mkCP({
    severity_score: 0.85, severity_class: L9ChangePointSeverity.MINOR,
  }),
  trigger_family: L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
  event_anchor_ref: null,
});
assert(hasCode(cpMis.violations,
  L9TemporalSemanticViolationCode.CP_SEVERITY_CLASS_MISMATCH),
  'C.44 class understates score → CP_SEVERITY_CLASS_MISMATCH');

// C.45 — change-point registry
const cpReg = getDefaultL9ChangePointRegistry();
assert(cpReg instanceof L9ChangePointRegistry, 'C.45 default CP registry');
assert(cpReg.isMaterial(L9ChangePointClass.PHASE_SHIFT, 0.4),
  'C.46 registry.isMaterial PHASE_SHIFT@0.4');

// ═══════════════════════════════════════════════════════════════
// BAND D — Decay + Post-Event Window Law (§9.5.8 / §9.5.9)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Decay + Post-Event Window Law ═══');

// D.1 — decay-factor weights sum to 1
const totalW = Object.values(L9_DECAY_FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
assert(Math.abs(totalW - 1) < 1e-9, 'D.1 decay factor weights sum to 1');

// D.2 — composeL9DecayScore bounded
assert(composeL9DecayScore({}) === 0,
  'D.2 empty contributions → 0');
const allOnes: Partial<Record<L9DecayFactor, number>> =
  Object.fromEntries(Object.values(L9DecayFactor).map(f => [f, 1])) as any;
assert(composeL9DecayScore(allOnes) === 1,
  'D.3 all ones → 1');

// D.4 — dominance banding
assert(classifyL9DecayDominance(0.0) === L9DecayDominance.LOW_DECAY,
  'D.4 0.0 → LOW_DECAY');
assert(classifyL9DecayDominance(0.3) === L9DecayDominance.MODERATE_DECAY,
  'D.5 0.3 → MODERATE_DECAY');
assert(classifyL9DecayDominance(0.6) === L9DecayDominance.HIGH_DECAY,
  'D.6 0.6 → HIGH_DECAY');
assert(classifyL9DecayDominance(0.9) === L9DecayDominance.DOMINANT_DECAY,
  'D.7 0.9 → DOMINANT_DECAY');
assert(classifyL9DecayDominance(-1) === L9DecayDominance.UNRESOLVED_DECAY,
  'D.8 negative → UNRESOLVED_DECAY');

// D.9 — class→dominance
assert(l9DecayClassToDominance(L9DecayClass.FRESH) ===
  L9DecayDominance.LOW_DECAY, 'D.9 FRESH→LOW_DECAY');
assert(l9DecayClassToDominance(L9DecayClass.DEPRECATED) ===
  L9DecayDominance.DOMINANT_DECAY, 'D.10 DEPRECATED→DOMINANT_DECAY');

// D.11 — l9IsDecayDominant requires later-signal
assert(l9IsDecayDominant(0.8, {
  [L9DecayFactor.CONTRADICTION_BURDEN]: 0.9,
}) === true, 'D.11 high score + contradiction → dominant');
assert(l9IsDecayDominant(0.8, {
  [L9DecayFactor.TIME_ELAPSED]: 1.0,
}) === false, 'D.12 high score, only time → not dominant');

// D.13 — refresh evaluation green
const refEval = evaluateL9Refresh({
  ref: 'R-1', governed: true, same_family: true,
  contradiction_nullifies: false, inside_refresh_window: true,
  reason_codes: [],
});
assert(refEval.legal === true, 'D.13 governed refresh → legal');

// D.14 — refresh evaluation with nullification
const refNullify = evaluateL9Refresh({
  ref: 'R-1', governed: true, same_family: true,
  contradiction_nullifies: true, inside_refresh_window: true,
  reason_codes: [],
});
assert(refNullify.legal === false &&
  refNullify.reasons.includes('REFRESH_CONTRADICTION_NULLIFIES'),
  'D.14 nullified refresh → illegal');

// D.15 — scan illegal decay postures
const illegalScan = scanL9IllegalDecayPostures({
  decay_score: 0.1, decay_class: L9DecayClass.FRESH,
  has_dominant_contradiction: true,
  claims_still_early: false,
  contributions: {},
  post_event_shock_still_dominant: false,
  claims_recovery: false,
});
assert(illegalScan.includes('DECAY_ZERO_UNDER_DOMINANT_CONTRADICTION'),
  'D.15 zero decay + dominant contradiction → DECAY_ZERO_UNDER_DOMINANT_CONTRADICTION');

// Decay validator ─────────────────────────────────────────────
function mkDecay(overrides: Partial<L9DecayProfile> = {}): L9DecayProfile {
  return {
    decay_profile_id: 'D-1',
    sequence_subject_id: 'S-1',
    decay_score: 0.1,
    decay_class: L9DecayClass.FRESH,
    decaying_signal_refs: [],
    surviving_signal_refs: ['SIG-1'],
    decay_reason_codes: [],
    time_burden_ms: 60_000,
    lineage_refs: ['TRACE-1'],
    ...overrides,
  };
}

// D.16 — green decay
const dGreen = validateL9Decay({
  profile: mkDecay(),
  contributions: { [L9DecayFactor.TIME_ELAPSED]: 0.1 },
  declared_dominance: L9DecayDominance.LOW_DECAY,
});
assert(dGreen.ok === true, 'D.16 green decay passes');

// D.17 — out-of-range score
const dBad = validateL9Decay({
  profile: mkDecay({ decay_score: 1.5 }),
  contributions: {},
});
assert(hasCode(dBad.violations,
  L9TemporalSemanticViolationCode.DECAY_SCORE_OUT_OF_RANGE),
  'D.17 score>1 → DECAY_SCORE_OUT_OF_RANGE');

// D.18 — zero decay under dominant contradiction
const dZero = validateL9Decay({
  profile: mkDecay({ decay_score: 0.05 }),
  contributions: { [L9DecayFactor.CONTRADICTION_BURDEN]: 0.9 },
  has_dominant_contradiction: true,
});
assert(hasCode(dZero.violations,
  L9TemporalSemanticViolationCode.DECAY_ZERO_UNDER_DOMINANT_CONTRADICTION),
  'D.18 zero-decay under contradiction → DECAY_ZERO_UNDER_DOMINANT_CONTRADICTION');

// D.19 — still-early while decayed
const dEarly = validateL9Decay({
  profile: mkDecay({ decay_score: 0.7, decay_class: L9DecayClass.DECAYING }),
  contributions: {},
  claims_still_early: true,
});
assert(hasCode(dEarly.violations,
  L9TemporalSemanticViolationCode.DECAY_STILL_EARLY_WHILE_MATERIALLY_DECAYED),
  'D.19 still-early + decayed → DECAY_STILL_EARLY_WHILE_MATERIALLY_DECAYED');

// D.20 — FRESH class with high contradiction
const dFresh = validateL9Decay({
  profile: mkDecay({ decay_score: 0.1, decay_class: L9DecayClass.FRESH }),
  contributions: { [L9DecayFactor.CONTRADICTION_BURDEN]: 0.9 },
});
assert(hasCode(dFresh.violations,
  L9TemporalSemanticViolationCode.DECAY_FRESH_CLASS_WITH_HIGH_CONTRADICTION),
  'D.20 FRESH + high contradiction → DECAY_FRESH_CLASS_WITH_HIGH_CONTRADICTION');

// D.21 — recovery while shock-dominant
const dRec = validateL9Decay({
  profile: mkDecay({ decay_score: 0.3, decay_class: L9DecayClass.AGING }),
  contributions: {},
  post_event_shock_still_dominant: true,
  claims_recovery: true,
});
assert(hasCode(dRec.violations,
  L9TemporalSemanticViolationCode.DECAY_RECOVERY_CLAIM_WHILE_SHOCK_DOMINANT),
  'D.21 recovery under shock → DECAY_RECOVERY_CLAIM_WHILE_SHOCK_DOMINANT');

// D.22 — staleness substituted
const dStale = validateL9Decay({
  profile: mkDecay(), contributions: {},
  staleness_substituted_for_decay: true,
});
assert(hasCode(dStale.violations,
  L9TemporalSemanticViolationCode.DECAY_STALENESS_SUBSTITUTED),
  'D.22 staleness substituted → DECAY_STALENESS_SUBSTITUTED');

// D.23 — dominance class mismatch
const dMis = validateL9Decay({
  profile: mkDecay({ decay_score: 0.8, decay_class: L9DecayClass.DEPRECATED }),
  contributions: {},
  declared_dominance: L9DecayDominance.LOW_DECAY,
});
assert(hasCode(dMis.violations,
  L9TemporalSemanticViolationCode.DECAY_DOMINANCE_CLASS_MISMATCH),
  'D.23 dominance mismatch → DECAY_DOMINANCE_CLASS_MISMATCH');

// D.24 — refresh candidate ungoverned
const dRef = validateL9Decay({
  profile: mkDecay(), contributions: {},
  refresh_candidates: [{
    ref: 'R-1', governed: false, same_family: true,
    contradiction_nullifies: false, inside_refresh_window: true,
    reason_codes: [],
  }],
});
assert(hasCode(dRef.violations,
  L9TemporalSemanticViolationCode.DECAY_REFRESH_UNGOVERNED),
  'D.24 ungoverned refresh → DECAY_REFRESH_UNGOVERNED');

// D.25 — decay registry
const dReg = getDefaultL9DecayRegistry();
assert(dReg instanceof L9DecayRegistry, 'D.25 default decay registry');
assert(dReg.classifyDominance(0.85) === L9DecayDominance.DOMINANT_DECAY,
  'D.26 registry.classifyDominance');

// Post-event windows ─────────────────────────────────────────
// D.27 — required anchor class
assert(getL9RequiredPostEventAnchor(L9PostEventWindowClass.UNLOCK_DIGESTION)
  === L9PostEventAnchorClass.UNLOCK, 'D.27 UNLOCK_DIGESTION→UNLOCK');
assert(getL9RequiredPostEventAnchor(L9PostEventWindowClass.SECURITY_POST_SHOCK)
  === L9PostEventAnchorClass.SECURITY_EVENT,
  'D.28 SECURITY_POST_SHOCK→SECURITY_EVENT');

// D.29 — lifecycle transitions — legal
assert(isL9LegalPostEventLifecycleTransition(
  L9PostEventLifecycle.ACTIVE_SHOCK, L9PostEventLifecycle.DIGESTING) === true,
  'D.29 ACTIVE_SHOCK→DIGESTING legal');
assert(isL9LegalPostEventLifecycleTransition(
  L9PostEventLifecycle.STABILIZING, L9PostEventLifecycle.REACCUMULATING)
  === true, 'D.30 STABILIZING→REACCUMULATING legal');

// D.31 — lifecycle transition — illegal
assert(isL9LegalPostEventLifecycleTransition(
  L9PostEventLifecycle.EXHAUSTED, L9PostEventLifecycle.ACTIVE_SHOCK) === false,
  'D.31 EXHAUSTED→ACTIVE_SHOCK illegal');

// D.32 — state→lifecycle mapping
assert(l9PostEventStateToLifecycle(L9PostEventWindowState.ACTIVE) ===
  L9PostEventLifecycle.ACTIVE_SHOCK, 'D.32 ACTIVE→ACTIVE_SHOCK');
assert(l9PostEventStateToLifecycle(L9PostEventWindowState.EXPIRED) ===
  L9PostEventLifecycle.EXHAUSTED, 'D.33 EXPIRED→EXHAUSTED');

// Validator ──────────────────────────────────────────────────
function mkPE(overrides: Partial<L9PostEventWindow> = {}): L9PostEventWindow {
  return {
    post_event_window_id: 'PE-1',
    sequence_subject_id: 'S-1',
    anchor_event_ref: 'EVT-unlock-1',
    window_class: L9PostEventWindowClass.UNLOCK_DIGESTION,
    window_start: T.peStart, window_end: T.peEnd,
    window_state: L9PostEventWindowState.STABILIZING,
    stabilization_refs: ['EVT-stable-1'], failure_refs: [],
    lineage_refs: ['TRACE-1'],
    ...overrides,
  };
}

// D.34 — green post-event window
const peGreen = validateL9PostEventWindow({
  window: mkPE(), declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
  declared_lifecycle: L9PostEventLifecycle.STABILIZING,
  claims_stabilization: true,
});
assert(peGreen.ok === true, 'D.34 green post-event window passes');

// D.35 — anchor missing
const peNoAnchor = validateL9PostEventWindow({
  window: mkPE({ anchor_event_ref: '' }),
  declared_anchor_class: null,
});
assert(hasCode(peNoAnchor.violations,
  L9TemporalSemanticViolationCode.PE_ANCHOR_MISSING),
  'D.35 missing anchor → PE_ANCHOR_MISSING');

// D.36 — anchor class mismatch
const peAnchorMis = validateL9PostEventWindow({
  window: mkPE(), declared_anchor_class: L9PostEventAnchorClass.LIQUIDATION,
});
assert(hasCode(peAnchorMis.violations,
  L9TemporalSemanticViolationCode.PE_ANCHOR_CLASS_MISMATCH),
  'D.36 anchor class mismatch → PE_ANCHOR_CLASS_MISMATCH');

// D.37 — bounds missing
const peNoBounds = validateL9PostEventWindow({
  window: mkPE({ window_start: '' as never, window_end: '' as never }),
  declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
});
assert(hasCode(peNoBounds.violations,
  L9TemporalSemanticViolationCode.PE_WINDOW_BOUNDS_MISSING),
  'D.37 bounds missing → PE_WINDOW_BOUNDS_MISSING');

// D.38 — illegal lifecycle transition
const peBadLC = validateL9PostEventWindow({
  window: mkPE(), declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
  prior_lifecycle: L9PostEventLifecycle.EXHAUSTED,
  declared_lifecycle: L9PostEventLifecycle.ACTIVE_SHOCK,
});
assert(hasCode(peBadLC.violations,
  L9TemporalSemanticViolationCode.PE_LIFECYCLE_TRANSITION_ILLEGAL),
  'D.38 EXHAUSTED→ACTIVE_SHOCK → PE_LIFECYCLE_TRANSITION_ILLEGAL');

// D.39 — reaccum under active shock
const peReacc = validateL9PostEventWindow({
  window: mkPE({ window_state: L9PostEventWindowState.ACTIVE }),
  declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
  declared_lifecycle: L9PostEventLifecycle.ACTIVE_SHOCK,
  claims_reaccumulation: true,
});
assert(hasCode(peReacc.violations,
  L9TemporalSemanticViolationCode.PE_REACCUMULATION_UNDER_ACTIVE_SHOCK),
  'D.39 reaccum under ACTIVE_SHOCK → PE_REACCUMULATION_UNDER_ACTIVE_SHOCK');

// D.40 — stabilization without refs
const peNoRefs = validateL9PostEventWindow({
  window: mkPE({ stabilization_refs: [] }),
  declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
  declared_lifecycle: L9PostEventLifecycle.STABILIZING,
  claims_stabilization: true,
});
assert(hasCode(peNoRefs.violations,
  L9TemporalSemanticViolationCode.PE_STABILIZATION_WITHOUT_REFS),
  'D.40 stabilization w/o refs → PE_STABILIZATION_WITHOUT_REFS');

// D.41 — expired treated as governor
const peExp = validateL9PostEventWindow({
  window: mkPE({ window_state: L9PostEventWindowState.EXPIRED }),
  declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
  declared_lifecycle: L9PostEventLifecycle.EXHAUSTED,
  is_current_governor: true,
});
assert(hasCode(peExp.violations,
  L9TemporalSemanticViolationCode.PE_EXPIRED_WINDOW_AS_GOVERNOR),
  'D.41 expired-as-governor → PE_EXPIRED_WINDOW_AS_GOVERNOR');

// D.42 — post-event registry
const peReg = getDefaultL9PostEventWindowRegistry();
assert(peReg instanceof L9PostEventWindowRegistry,
  'D.42 default post-event registry');
assert(peReg.requiredAnchor(L9PostEventWindowClass.UNLOCK_DIGESTION)
  === L9PostEventAnchorClass.UNLOCK, 'D.43 registry requiredAnchor');
assert(peReg.stateToLifecycle(L9PostEventWindowState.FAILED) ===
  L9PostEventLifecycle.FAILED_CONTINUATION,
  'D.44 registry state→lifecycle');

// ═══════════════════════════════════════════════════════════════
// BAND E — Interaction, Audit, and Invariants (§9.5.10 / §9.5.12)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Interaction, Audit, Invariants ═══');

// E.1 — clean interaction passes
const ixGreen = validateL9TemporalInteraction({
  phase_from: L9PhaseClass.VALIDATED, phase_to: L9PhaseClass.EXPANSION,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  dominant_lag_class: L9SemanticLagClass.SHORT_LAG,
  dominant_lag_quality: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
  decay_dominance: L9DecayDominance.LOW_DECAY,
  post_event_lifecycle: null, post_event_anchor_present: false,
  declared_clean_output: true,
  ambiguity_posture: L9SemanticAmbiguityPosture.NONE,
});
assert(ixGreen.ok === true, 'E.1 clean interaction passes');

// E.2 — phase jump without change point
const ixJump = validateL9TemporalInteraction({
  phase_from: L9PhaseClass.EXPANSION, phase_to: L9PhaseClass.DECAYING,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  dominant_lag_class: null, dominant_lag_quality: null,
  decay_dominance: L9DecayDominance.MODERATE_DECAY,
  post_event_lifecycle: null, post_event_anchor_present: false,
});
assert(hasCode(ixJump.violations,
  L9TemporalSemanticViolationCode.IX_PHASE_JUMP_WITHOUT_CHANGE_POINT),
  'E.2 phase jump w/o CP → IX_PHASE_JUMP_WITHOUT_CHANGE_POINT');

// E.3 — validation with too-late leads
const ixLate = validateL9TemporalInteraction({
  phase_from: L9PhaseClass.CONFIRMING, phase_to: L9PhaseClass.VALIDATED,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  dominant_lag_class: L9SemanticLagClass.TOO_LATE_FOR_EARLY_PROOF,
  dominant_lag_quality: L9LeadLagQualityClass.WEAK_BUT_USABLE,
  decay_dominance: L9DecayDominance.LOW_DECAY,
  post_event_lifecycle: null, post_event_anchor_present: false,
  declared_clean_output: true,
});
assert(hasCode(ixLate.violations,
  L9TemporalSemanticViolationCode.IX_VALIDATION_WITH_TOO_LATE_LEADS),
  'E.3 VALIDATED+TOO_LATE → IX_VALIDATION_WITH_TOO_LATE_LEADS');

// E.4 — still-early under dominant decay
const ixEarly = validateL9TemporalInteraction({
  phase_from: L9PhaseClass.VALIDATED, phase_to: L9PhaseClass.EXPANSION,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  dominant_lag_class: L9SemanticLagClass.SHORT_LAG,
  dominant_lag_quality: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
  decay_dominance: L9DecayDominance.DOMINANT_DECAY,
  post_event_lifecycle: null, post_event_anchor_present: false,
  claims_still_early: true,
});
assert(hasCode(ixEarly.violations,
  L9TemporalSemanticViolationCode.IX_EARLY_CLAIM_UNDER_DOMINANT_DECAY),
  'E.4 still-early+DOMINANT_DECAY → IX_EARLY_CLAIM_UNDER_DOMINANT_DECAY');

// E.5 — reaccum while shock active
const ixReacc = validateL9TemporalInteraction({
  phase_from: L9PhaseClass.DIGESTION, phase_to: L9PhaseClass.RECOVERY,
  change_point_ref: null, shock_anchor_ref: null,
  recovery_posture_ref: 'REC-1',
  dominant_lag_class: null, dominant_lag_quality: null,
  decay_dominance: L9DecayDominance.MODERATE_DECAY,
  post_event_lifecycle: L9PostEventLifecycle.ACTIVE_SHOCK,
  post_event_anchor_present: true,
  claims_reaccumulation: true,
});
assert(hasCode(ixReacc.violations,
  L9TemporalSemanticViolationCode.IX_REACCUMULATION_WHILE_SHOCK_ACTIVE),
  'E.5 reaccum+ACTIVE_SHOCK → IX_REACCUMULATION_WHILE_SHOCK_ACTIVE');

// E.6 — digestion without PE anchor
const ixDig = validateL9TemporalInteraction({
  phase_from: L9PhaseClass.DECAYING, phase_to: L9PhaseClass.DIGESTION,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  dominant_lag_class: null, dominant_lag_quality: null,
  decay_dominance: L9DecayDominance.MODERATE_DECAY,
  post_event_lifecycle: L9PostEventLifecycle.DIGESTING,
  post_event_anchor_present: false,
  claims_digestion: true,
});
assert(hasCode(ixDig.violations,
  L9TemporalSemanticViolationCode.IX_DIGESTION_WITHOUT_POST_EVENT_ANCHOR),
  'E.6 digestion w/o PE anchor → IX_DIGESTION_WITHOUT_POST_EVENT_ANCHOR');

// E.7 — contradiction does not void lag
const ixCon = validateL9TemporalInteraction({
  phase_from: L9PhaseClass.VALIDATED, phase_to: L9PhaseClass.EXPANSION,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  dominant_lag_class: L9SemanticLagClass.SHORT_LAG,
  dominant_lag_quality: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
  lead_lag_decisive_contradiction: true,
  decay_dominance: L9DecayDominance.LOW_DECAY,
  post_event_lifecycle: null, post_event_anchor_present: false,
});
assert(hasCode(ixCon.violations,
  L9TemporalSemanticViolationCode.IX_CONTRADICTION_DOES_NOT_VOID_LAG),
  'E.7 decisive contradiction + MEANINGFUL → IX_CONTRADICTION_DOES_NOT_VOID_LAG');

// E.8 — ambiguity hidden
const ixAmb = validateL9TemporalInteraction({
  phase_from: L9PhaseClass.VALIDATED, phase_to: L9PhaseClass.EXPANSION,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  dominant_lag_class: L9SemanticLagClass.SHORT_LAG,
  dominant_lag_quality: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
  decay_dominance: L9DecayDominance.LOW_DECAY,
  post_event_lifecycle: null, post_event_anchor_present: false,
  declared_clean_output: true,
  ambiguity_posture: L9SemanticAmbiguityPosture.DUAL_PHASE,
});
assert(hasCode(ixAmb.violations,
  L9TemporalSemanticViolationCode.IX_AMBIGUITY_HIDDEN_UNDER_CLEAN_OUTPUT),
  'E.8 hidden DUAL_PHASE → IX_AMBIGUITY_HIDDEN_UNDER_CLEAN_OUTPUT');

// E.9 — shock-anchor transition without anchor
const ixShock = validateL9TemporalInteraction({
  phase_from: L9PhaseClass.EXPANSION, phase_to: L9PhaseClass.SHOCK_RESPONSE,
  change_point_ref: null, shock_anchor_ref: null, recovery_posture_ref: null,
  dominant_lag_class: null, dominant_lag_quality: null,
  decay_dominance: L9DecayDominance.MODERATE_DECAY,
  post_event_lifecycle: null, post_event_anchor_present: false,
});
assert(hasCode(ixShock.violations,
  L9TemporalSemanticViolationCode.IX_PHASE_JUMP_WITHOUT_CHANGE_POINT),
  'E.9 shock-path w/o anchor → IX_PHASE_JUMP_WITHOUT_CHANGE_POINT');

// Audit ─────────────────────────────────────────────────────
// E.10 — every declared code is in the all-codes array
assert(ALL_L9_TEMPORAL_SEMANTIC_VIOLATION_CODES.length ===
  Object.values(L9TemporalSemanticViolationCode).length,
  'E.10 all violation codes enumerated');
for (const c of ALL_L9_TEMPORAL_SEMANTIC_VIOLATION_CODES) {
  assert(c.startsWith('L9T_'), `E.prefix.${c} uses L9T_ prefix`);
}

// E.11 — severity classification
assert(classifyL9TemporalSemanticSeverity(
  L9TemporalSemanticViolationCode.LL_CAUSAL_INFERENCE_LAUNDERED)
  === L9TemporalSemanticSeverity.CRITICAL,
  'E.11 causal-laundering = CRITICAL');
assert(classifyL9TemporalSemanticSeverity(
  L9TemporalSemanticViolationCode.TS_AS_OF_MISSING)
  === L9TemporalSemanticSeverity.CRITICAL, 'E.12 as_of missing = CRITICAL');
assert(classifyL9TemporalSemanticSeverity(
  L9TemporalSemanticViolationCode.DECAY_DOMINANCE_CLASS_MISMATCH)
  === L9TemporalSemanticSeverity.WARNING, 'E.13 dominance mismatch = WARNING');
assert(classifyL9TemporalSemanticSeverity(
  L9TemporalSemanticViolationCode.LL_LAG_OUTSIDE_ADMISSIBLE_WINDOW)
  === L9TemporalSemanticSeverity.ERROR,
  'E.14 outside admissible = ERROR');

// E.15 — audit aggregates
const auditVs: L9TemporalSemanticViolation[] = [
  ...ixJump.violations,
  ...peExp.violations,
  ...dStale.violations,
];
const audit = buildL9TemporalSemanticsAudit(auditVs);
assert(audit.total === auditVs.length, 'E.15 audit total matches');
assert(audit.highest_severity === L9TemporalSemanticSeverity.CRITICAL,
  'E.16 audit highest=CRITICAL');
assert(hasL9TemporalSemanticBlockingViolations(audit) === true,
  'E.17 audit is blocking');

// E.18 — audit by_tier sum equals total
const tierSum = Object.values(audit.by_tier).reduce((a, b) => a + b, 0);
assert(tierSum === audit.total, 'E.18 by_tier sums to total');

// E.19 — empty audit
const emptyAudit = buildL9TemporalSemanticsAudit([]);
assert(emptyAudit.total === 0 &&
  emptyAudit.highest_severity === L9TemporalSemanticSeverity.INFO &&
  hasL9TemporalSemanticBlockingViolations(emptyAudit) === false,
  'E.19 empty audit is INFO and non-blocking');

// E.20 — audit is deterministic (same input → same output)
const audit2 = buildL9TemporalSemanticsAudit(auditVs);
assert(JSON.stringify(audit) === JSON.stringify(audit2),
  'E.20 audit deterministic');

// E.21 — L9TemporalSemanticError type
const err = new L9TemporalSemanticError(
  L9TemporalSemanticViolationCode.TS_AS_OF_MISSING,
  L9TemporalSemanticTier.TIME_SURFACE, 'test',
);
assert(err instanceof Error && err.name === 'L9TemporalSemanticError',
  'E.21 L9TemporalSemanticError is an Error');

// Invariants ─────────────────────────────────────────────────
// E.22 — 7 invariants present and all green
const inv = runAllL9_5Invariants();
assert(inv.length === 7, 'E.22 7 L9.5 invariants');
for (const r of inv) {
  assert(r.holds === true, `E.inv.${r.id} ${r.evidence}`);
}

// E.23..E.29 — per-invariant checks
const a = checkINV_95_A(); assert(a.holds, `E.23 A ${a.evidence}`);
const b = checkINV_95_B(); assert(b.holds, `E.24 B ${b.evidence}`);
const c = checkINV_95_C(); assert(c.holds, `E.25 C ${c.evidence}`);
const d = checkINV_95_D(); assert(d.holds, `E.26 D ${d.evidence}`);
const e = checkINV_95_E(); assert(e.holds, `E.27 E ${e.evidence}`);
const f = checkINV_95_F(); assert(f.holds, `E.28 F ${f.evidence}`);
const g = checkINV_95_G(); assert(g.holds, `E.29 G ${g.evidence}`);

// E.30 — replay determinism of the invariant runner itself
const run1 = runAllL9_5Invariants();
const run2 = runAllL9_5Invariants();
assert(JSON.stringify(run1) === JSON.stringify(run2),
  'E.30 invariant runner deterministic across repeat calls');

// E.31 — registry determinism: repeated calls on the same input produce
// the same output, proving replay-safety of the registries themselves.
const leadLagA = llReg.deriveQuality({
  family: fam, lag_ms: 120_000,
  contradiction_posture: L9LagContradictionPosture.NONE,
  decay_adjustment: 0.1, scope_aligned: true, lineage_complete: true,
});
const leadLagB = llReg.deriveQuality({
  family: fam, lag_ms: 120_000,
  contradiction_posture: L9LagContradictionPosture.NONE,
  decay_adjustment: 0.1, scope_aligned: true, lineage_complete: true,
});
assert(JSON.stringify(leadLagA) === JSON.stringify(leadLagB),
  'E.31 lead-lag registry deterministic');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L9.5 TEMPORAL SEMANTICS — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const lbl of failures) console.log(`  - ${lbl}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 9.5 temporal-semantics lawbook green.');
  process.exit(0);
}
