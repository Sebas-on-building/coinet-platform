/**
 * L14.4 — Interaction Certification (Bands A..G)
 *
 * §14.4.47 — Proves behavioral-truth, admissibility, attribution,
 * deduplication, ignored alert, dismissed/ignored separation,
 * feedback bridge, deeper-investigation conversion, expectation
 * resolution, privacy/lineage/replay.
 */

import { L14ConstitutionalAuditSeverity } from '../l14/contracts/l14-constitutional-types';
import { L14DeliveryChannel } from '../l14/contracts/delivery-channel';
import { L14ExpectedInteractionType } from '../l14/contracts/delivery-execution';
import {
  ALL_L14_INTERACTION_TYPES,
  L14InteractionActorClass,
  L14InteractionAttributionQuality,
  L14_INTERACTION_FAMILY_OF,
  L14InteractionFamily,
  L14InteractionType,
} from '../l14/contracts/interaction-event';
import {
  L14InteractionOrigin,
  L14InteractionSurface,
  type L14InteractionContext,
} from '../l14/contracts/interaction-context';
import {
  L14BehavioralInterpretation,
  L14ForbiddenBehavioralConclusion,
} from '../l14/contracts/interaction-interpretation';
import {
  L14DeeperInvestigationConversionType,
  L14IgnoredAlertClassificationStatus,
  L14InteractionExpectationResolutionStatus,
} from '../l14/contracts/interaction-derivation';
import {
  bridgeL14Feedback,
  buildL14InteractionDeduplicationKey,
  buildL14InteractionInterpretationPolicy,
  deriveL14AttributionQuality,
  deriveL14IgnoredAlert,
  normalizeL14InteractionEvent,
  recordL14DeeperInvestigationConversion,
  resolveL14InteractionExpectation,
} from '../l14/interactions/interaction-engines';
import {
  validateL14DeeperInvestigationConversion,
  validateL14DismissedIgnoredSeparation,
  validateL14FeedbackInteractionBridge,
  validateL14IgnoredAlertDerivation,
  validateL14InteractionDeduplicationKey,
  validateL14InteractionExpectationResolution,
  validateL14InteractionInterpretationPolicy,
  validateL14UserInteractionEvent,
} from '../l14/validation/interaction.validators';
import { L14InteractionViolationCode } from '../l14/validation/l14-interaction-violation-codes';
import {
  L14InteractionAuditSubjectClass,
  emitL14InteractionAuditRecord,
  getL14InteractionAuditLog,
  getL14InteractionCriticalViolations,
  isL14InteractionBlockingCode,
  resetL14InteractionAuditLog,
  severityForL14InteractionCode,
} from '../l14/constitution/l14-interaction-audit';
import { runAllL14_4Invariants } from '../l14/invariants/l14_4-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function band(title: string): void {
  console.log(`\n── ${title} ──`);
}

const POLICY_V = 'l14.interaction.v1';

function ctx(opts: Partial<L14InteractionContext> = {}): L14InteractionContext {
  return {
    interaction_context_id: 'l14.cert.ctx',
    product_surface: opts.product_surface ?? L14InteractionSurface.DASHBOARD,
    originating_channel: opts.originating_channel,
    interaction_origin: opts.interaction_origin ?? L14InteractionOrigin.DIRECT_DELIVERY_ACTION,
    related_asset_scope_ref: opts.related_asset_scope_ref,
    related_report_ref: opts.related_report_ref,
    related_chat_thread_ref: opts.related_chat_thread_ref,
    qualification_flags: opts.qualification_flags ?? [],
    occurred_within_expected_window: opts.occurred_within_expected_window ?? true,
    policy_version: POLICY_V,
  };
}

// ── Band A : taxonomy + event object ──────────────────────────

band('BAND A — interaction taxonomy and event object');

{
  assert(ALL_L14_INTERACTION_TYPES.length >= 16, `A.1 ≥16 interaction types (got ${ALL_L14_INTERACTION_TYPES.length})`);
  // Family map covers every type.
  for (const t of ALL_L14_INTERACTION_TYPES) {
    assert(L14_INTERACTION_FAMILY_OF[t] !== undefined, `A.2 ${t} mapped to a family`);
  }
  // Actor classes legal.
  assert(Object.values(L14InteractionActorClass).length === 4, 'A.3 4 actor classes');
  // Event object complete on green normalize.
  const e = normalizeL14InteractionEvent({
    interaction_type: L14InteractionType.ALERT_OPENED,
    user_id_hash: 'h.user.1',
    source_execution_ref: 'l14.exec.A',
    occurred_at: '2026-05-15T00:00:00Z',
    attribution_quality: L14InteractionAttributionQuality.STRONG,
    context: ctx({ product_surface: L14InteractionSurface.ALERT_CENTER, originating_channel: L14DeliveryChannel.TELEGRAM }),
  });
  assert(!!e.interaction_event_id && !!e.replay_hash && e.lineage_refs.length > 0, 'A.4 normalized event carries id, replay hash, lineage');
  assert(e.actor_class === L14InteractionActorClass.USER, 'A.5 user-actor inferred for ALERT_OPENED');
  // System-actor for ALERT_DELIVERED.
  const delivered = normalizeL14InteractionEvent({
    interaction_type: L14InteractionType.ALERT_DELIVERED,
    source_execution_ref: 'l14.exec.B',
    occurred_at: '2026-05-15T00:00:00Z',
    context: ctx({ originating_channel: L14DeliveryChannel.TELEGRAM }),
  });
  assert(delivered.actor_class === L14InteractionActorClass.SYSTEM_DELIVERY, 'A.6 system-actor for ALERT_DELIVERED');
}

// ── Band B : source refs and admissibility ────────────────────

band('BAND B — source refs and admissibility');

{
  // Alert OPEN requires execution ref.
  const noExec = normalizeL14InteractionEvent({
    interaction_type: L14InteractionType.ALERT_OPENED,
    user_id_hash: 'h.user.1',
    occurred_at: '2026-05-15T00:00:00Z',
    context: ctx({ originating_channel: L14DeliveryChannel.TELEGRAM }),
  });
  assert(!validateL14UserInteractionEvent(noExec).clean, 'B.1 ALERT_OPENED without execution ref rejected');
  // Report SAVE requires report ref.
  const noReport = normalizeL14InteractionEvent({
    interaction_type: L14InteractionType.TOKEN_REPORT_SAVED,
    user_id_hash: 'h.user.1',
    occurred_at: '2026-05-15T00:00:00Z',
    context: ctx({ product_surface: L14InteractionSurface.TOKEN_REPORT_PAGE }),
  });
  assert(!validateL14UserInteractionEvent(noReport).clean, 'B.2 TOKEN_REPORT_SAVED without report ref rejected');
  // Chat follow-up requires prior output + chat thread refs.
  const noFollow = normalizeL14InteractionEvent({
    interaction_type: L14InteractionType.CHAT_FOLLOW_UP_ASKED,
    user_id_hash: 'h.user.1',
    occurred_at: '2026-05-15T00:00:00Z',
    context: ctx({ product_surface: L14InteractionSurface.AI_CHAT }),
  });
  assert(!validateL14UserInteractionEvent(noFollow).clean, 'B.3 CHAT_FOLLOW_UP_ASKED without thread/output refs rejected');
  // Watchlist requires scope ref.
  const noScope = normalizeL14InteractionEvent({
    interaction_type: L14InteractionType.WATCHLIST_ADD,
    user_id_hash: 'h.user.1',
    occurred_at: '2026-05-15T00:00:00Z',
    context: ctx({ product_surface: L14InteractionSurface.WATCHLIST }),
  });
  assert(!validateL14UserInteractionEvent(noScope).clean, 'B.4 WATCHLIST_ADD without scope ref rejected');
}

// ── Band C : attribution and deduplication ────────────────────

band('BAND C — attribution and deduplication');

{
  const direct = deriveL14AttributionQuality({ interaction_type: L14InteractionType.ALERT_CLICKED, has_direct_source_ref: true, within_expected_window: true, clicked_deep_link: true, organic_navigation: false });
  assert(direct === L14InteractionAttributionQuality.DIRECT, 'C.1 deep-link click with source ref → DIRECT');
  const weak = deriveL14AttributionQuality({ interaction_type: L14InteractionType.TOKEN_REPORT_OPENED, has_direct_source_ref: true, within_expected_window: false, clicked_deep_link: false, organic_navigation: true });
  assert(weak === L14InteractionAttributionQuality.WEAK, 'C.2 organic later open → WEAK');
  // Fabricated DIRECT (no source ref) rejected.
  const fakeDirect = normalizeL14InteractionEvent({
    interaction_type: L14InteractionType.ALERT_OPENED,
    user_id_hash: 'h.user.1',
    occurred_at: '2026-05-15T00:00:00Z',
    attribution_quality: L14InteractionAttributionQuality.DIRECT,
    context: ctx({ originating_channel: L14DeliveryChannel.TELEGRAM }),
  });
  assert(!validateL14UserInteractionEvent(fakeDirect).clean, 'C.3 fabricated DIRECT rejected');
  // Deduplication: identical-bucket events collapse.
  const k1 = buildL14InteractionDeduplicationKey({ interaction_type: L14InteractionType.ALERT_OPENED, user_id_hash: 'h.u', source_execution_ref: 'l14.exec.1', occurred_at: '2026-05-15T00:00:01Z', client_event_ref: 'c.1' });
  const k2 = buildL14InteractionDeduplicationKey({ interaction_type: L14InteractionType.ALERT_OPENED, user_id_hash: 'h.u', source_execution_ref: 'l14.exec.1', occurred_at: '2026-05-15T00:00:02Z', client_event_ref: 'c.1' });
  assert(k1.deduplication_key_id === k2.deduplication_key_id, 'C.4 same 5s bucket → identical dedup key');
  // Different bucket → distinct.
  const k3 = buildL14InteractionDeduplicationKey({ interaction_type: L14InteractionType.ALERT_OPENED, user_id_hash: 'h.u', source_execution_ref: 'l14.exec.1', occurred_at: '2026-05-15T00:00:30Z', client_event_ref: 'c.2' });
  assert(k1.deduplication_key_id !== k3.deduplication_key_id, 'C.5 different bucket → distinct dedup key');
  assert(validateL14InteractionDeduplicationKey(k1).clean, 'C.6 dedup key validator clean');
  // Watchlist add/remove/re-add must NOT collapse despite same execution ref.
  const add = buildL14InteractionDeduplicationKey({ interaction_type: L14InteractionType.WATCHLIST_ADD, user_id_hash: 'h.u', occurred_at: '2026-05-15T00:00:00Z', client_event_ref: 'add.1' });
  const rem = buildL14InteractionDeduplicationKey({ interaction_type: L14InteractionType.WATCHLIST_REMOVE, user_id_hash: 'h.u', occurred_at: '2026-05-15T00:00:00Z', client_event_ref: 'rem.1' });
  assert(add.deduplication_key_id !== rem.deduplication_key_id, 'C.7 distinct interaction types not collapsed');
}

// ── Band D : ignored alert derivation ─────────────────────────

band('BAND D — ignored alert derivation');

{
  const premature = deriveL14IgnoredAlert({ source_execution_ref: 'x', source_feedback_expectation_ref: 'e', observation_window_start: 's', observation_window_end: 'e', delivered_successfully: true, observation_window_elapsed: false });
  assert(premature.ignored_classification_status === L14IgnoredAlertClassificationStatus.NOT_YET_CLASSIFIABLE_WINDOW_OPEN, 'D.1 ignored not derived before window closes');
  const failed = deriveL14IgnoredAlert({ source_execution_ref: 'x', source_feedback_expectation_ref: 'e', observation_window_start: 's', observation_window_end: 'e', delivered_successfully: false, observation_window_elapsed: true });
  assert(failed.ignored_classification_status === L14IgnoredAlertClassificationStatus.NOT_CLASSIFIABLE_DELIVERY_FAILED, 'D.2 ignored not derived after failed delivery');
  const opened = deriveL14IgnoredAlert({ source_execution_ref: 'x', source_feedback_expectation_ref: 'e', observation_window_start: 's', observation_window_end: 'e', delivered_successfully: true, observation_window_elapsed: true, alert_opened: true });
  assert(opened.ignored_classification_status === L14IgnoredAlertClassificationStatus.NOT_IGNORED_QUALIFYING_INTERACTION_OCCURRED, 'D.3 ignored not derived if opened');
  const followed = deriveL14IgnoredAlert({ source_execution_ref: 'x', source_feedback_expectation_ref: 'e', observation_window_start: 's', observation_window_end: 'e', delivered_successfully: true, observation_window_elapsed: true, chat_followup_from_alert: true });
  assert(followed.ignored_classification_status === L14IgnoredAlertClassificationStatus.NOT_IGNORED_QUALIFYING_INTERACTION_OCCURRED, 'D.4 ignored not derived if user followed up');
  const dismissed = deriveL14IgnoredAlert({ source_execution_ref: 'y', source_feedback_expectation_ref: 'e', observation_window_start: 's', observation_window_end: 'e', delivered_successfully: true, observation_window_elapsed: true, user_dismissed: true });
  assert(dismissed.ignored_classification_status === L14IgnoredAlertClassificationStatus.NOT_CLASSIFIABLE_USER_DISMISSED, 'D.5 dismissed ≠ ignored');
  const classified = deriveL14IgnoredAlert({ source_execution_ref: 'z', source_feedback_expectation_ref: 'e', observation_window_start: 's', observation_window_end: 'e', delivered_successfully: true, observation_window_elapsed: true });
  assert(classified.ignored_classification_status === L14IgnoredAlertClassificationStatus.CLASSIFIED_IGNORED, 'D.6 correct ignored derivation produces CLASSIFIED_IGNORED');
  assert(validateL14IgnoredAlertDerivation(classified).clean, 'D.7 ignored derivation validator clean');
}

// ── Band E : interpretation + feedback bridge ────────────────

band('BAND E — behavioral interpretation and feedback bridge');

{
  // Opened → attention, not correctness.
  const opened = buildL14InteractionInterpretationPolicy(L14InteractionType.ALERT_OPENED);
  assert(opened.can_indicate.includes(L14BehavioralInterpretation.ATTENTION), 'E.1 ALERT_OPENED indicates ATTENTION');
  assert(opened.cannot_prove.includes(L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS), 'E.2 ALERT_OPENED forbids FACTUAL_CORRECTNESS');
  // Clicked → relevance, not outcome usefulness.
  const clicked = buildL14InteractionInterpretationPolicy(L14InteractionType.ALERT_CLICKED);
  assert(clicked.can_indicate.includes(L14BehavioralInterpretation.PERCEIVED_RELEVANCE), 'E.3 ALERT_CLICKED indicates PERCEIVED_RELEVANCE');
  assert(clicked.cannot_prove.includes(L14ForbiddenBehavioralConclusion.OUTPUT_USEFULNESS_PROVEN), 'E.4 ALERT_CLICKED forbids OUTPUT_USEFULNESS_PROVEN');
  // Saved → utility, not truth.
  const saved = buildL14InteractionInterpretationPolicy(L14InteractionType.TOKEN_REPORT_SAVED);
  assert(saved.can_indicate.includes(L14BehavioralInterpretation.PERCEIVED_UTILITY), 'E.5 TOKEN_REPORT_SAVED indicates PERCEIVED_UTILITY');
  assert(saved.cannot_prove.includes(L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS), 'E.6 TOKEN_REPORT_SAVED forbids FACTUAL_CORRECTNESS');
  // Ignored → low relevance, not wrong alert.
  const ignored = buildL14InteractionInterpretationPolicy(L14InteractionType.ALERT_IGNORED);
  assert(ignored.can_indicate.includes(L14BehavioralInterpretation.LOW_IMMEDIATE_RELEVANCE), 'E.7 ALERT_IGNORED indicates LOW_IMMEDIATE_RELEVANCE');
  assert(ignored.cannot_prove.includes(L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR), 'E.8 ALERT_IGNORED forbids AUTOMATIC_ERROR');
  // Positive feedback → perceived value, not factual correctness.
  const pos = buildL14InteractionInterpretationPolicy(L14InteractionType.FEEDBACK_POSITIVE);
  assert(pos.cannot_prove.includes(L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS), 'E.9 FEEDBACK_POSITIVE forbids FACTUAL_CORRECTNESS');
  // Negative feedback → quality candidate, not automatic error.
  const neg = buildL14InteractionInterpretationPolicy(L14InteractionType.FEEDBACK_NEGATIVE);
  assert(neg.cannot_prove.includes(L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR), 'E.10 FEEDBACK_NEGATIVE forbids AUTOMATIC_ERROR');
  // Every policy validates and forbids direct truth-calibration.
  for (const t of ALL_L14_INTERACTION_TYPES) {
    const p = buildL14InteractionInterpretationPolicy(t);
    assert(p.may_feed_truth_calibration_directly === false, `E.11 ${t} cannot feed truth calibration directly`);
    assert(validateL14InteractionInterpretationPolicy(p).clean, `E.12 ${t} policy validator clean`);
  }
  // L13.10 feedback bridge preserves separation.
  const bridgePos = bridgeL14Feedback({ l13_feedback_record_ref: 'l13.fb.1', output_ref: 'l13.out.1', positive: true });
  assert(bridgePos.behavioral_interpretation === L14BehavioralInterpretation.PERCEIVED_UTILITY, 'E.13 positive feedback bridge → PERCEIVED_UTILITY');
  const bridgeNeg = bridgeL14Feedback({ l13_feedback_record_ref: 'l13.fb.2', output_ref: 'l13.out.2', positive: false });
  assert(bridgeNeg.behavioral_interpretation === L14BehavioralInterpretation.QUALITY_ISSUE_CANDIDATE, 'E.14 negative feedback bridge → QUALITY_ISSUE_CANDIDATE');
  assert(validateL14FeedbackInteractionBridge(bridgePos).clean, 'E.15 feedback bridge validator clean');
}

// ── Band F : deeper investigation + expectation resolution ───

band('BAND F — deeper investigation and expectation resolution');

{
  const alert2report = recordL14DeeperInvestigationConversion({
    source_interaction_event_ref: 'l14.evt.1',
    originating_delivery_ref: 'l14.delivery.1',
    conversion_type: L14DeeperInvestigationConversionType.ALERT_TO_REPORT_OPEN,
    target_ref: 'l13.report.1',
    occurred_at: '2026-05-15T00:00:00Z',
    attribution_quality: L14InteractionAttributionQuality.DIRECT,
  });
  assert(validateL14DeeperInvestigationConversion(alert2report).clean, 'F.1 ALERT_TO_REPORT_OPEN conversion legal');
  const alert2watch = recordL14DeeperInvestigationConversion({
    source_interaction_event_ref: 'l14.evt.2',
    originating_delivery_ref: 'l14.delivery.2',
    conversion_type: L14DeeperInvestigationConversionType.ALERT_TO_WATCHLIST_ADD,
    target_ref: 'asset.btc',
    occurred_at: '2026-05-15T00:00:00Z',
    attribution_quality: L14InteractionAttributionQuality.DIRECT,
  });
  assert(validateL14DeeperInvestigationConversion(alert2watch).clean, 'F.2 ALERT_TO_WATCHLIST_ADD conversion legal');
  const alert2chat = recordL14DeeperInvestigationConversion({
    source_interaction_event_ref: 'l14.evt.3',
    originating_delivery_ref: 'l14.delivery.3',
    conversion_type: L14DeeperInvestigationConversionType.ALERT_TO_CHAT_FOLLOW_UP,
    target_ref: 'l13.chat.1',
    occurred_at: '2026-05-15T00:00:00Z',
    attribution_quality: L14InteractionAttributionQuality.DIRECT,
  });
  assert(validateL14DeeperInvestigationConversion(alert2chat).clean, 'F.3 ALERT_TO_CHAT_FOLLOW_UP conversion legal');
  // Missing target_ref rejected.
  const noTarget = recordL14DeeperInvestigationConversion({
    source_interaction_event_ref: 'l14.evt.x',
    conversion_type: L14DeeperInvestigationConversionType.REPORT_TO_SAVE,
    target_ref: '',
    occurred_at: '2026-05-15T00:00:00Z',
    attribution_quality: L14InteractionAttributionQuality.WEAK,
  });
  assert(!validateL14DeeperInvestigationConversion(noTarget).clean, 'F.4 conversion missing target_ref rejected');
  // Expectation resolution: satisfied / partial / expired / open.
  const satisfied = resolveL14InteractionExpectation({
    feedback_expectation_ref: 'l14.exp.s',
    eligible_expected_interactions: [L14ExpectedInteractionType.ALERT_OPEN],
    qualifying_interaction_refs: ['l14.evt.s'],
    observed_interaction_types: [L14ExpectedInteractionType.ALERT_OPEN],
    observation_window_elapsed: true,
  });
  assert(satisfied.expectation_status === L14InteractionExpectationResolutionStatus.EXPECTATION_SATISFIED, 'F.5 satisfied expectation resolves');
  const open = resolveL14InteractionExpectation({
    feedback_expectation_ref: 'l14.exp.o',
    eligible_expected_interactions: [L14ExpectedInteractionType.ALERT_OPEN],
    qualifying_interaction_refs: [],
    observed_interaction_types: [],
    observation_window_elapsed: false,
  });
  assert(open.expectation_status === L14InteractionExpectationResolutionStatus.EXPECTATION_UNSATISFIED_WINDOW_OPEN, 'F.6 unsatisfied window open remains unresolved');
  const expired = resolveL14InteractionExpectation({
    feedback_expectation_ref: 'l14.exp.e',
    eligible_expected_interactions: [L14ExpectedInteractionType.ALERT_OPEN],
    qualifying_interaction_refs: [],
    observed_interaction_types: [],
    observation_window_elapsed: true,
    ignored_alert_derivation_ref: 'l14.ignored.1',
  });
  assert(expired.expectation_status === L14InteractionExpectationResolutionStatus.EXPECTATION_EXPIRED_CLASSIFIED_IGNORED, 'F.7 expired expectation resolves to ignored');
  assert(validateL14InteractionExpectationResolution(satisfied).clean, 'F.8 expectation resolution validator clean');
}

// ── Band G : audit + invariants ───────────────────────────────

band('BAND G — audit and invariants');

{
  resetL14InteractionAuditLog();
  const a = emitL14InteractionAuditRecord({
    subjectClass: L14InteractionAuditSubjectClass.IGNORED_ALERT_DERIVATION,
    subjectRef: 'l14.cert.ignored',
    violationCodes: [L14InteractionViolationCode.L14I_IGNORED_DERIVED_BEFORE_WINDOW_ELAPSED],
    message: 'cert: ignored derived too early',
  });
  const b = emitL14InteractionAuditRecord({
    subjectClass: L14InteractionAuditSubjectClass.IGNORED_ALERT_DERIVATION,
    subjectRef: 'l14.cert.ignored',
    violationCodes: [L14InteractionViolationCode.L14I_IGNORED_DERIVED_BEFORE_WINDOW_ELAPSED],
    message: 'cert: ignored derived too early',
  });
  assert(a.replay_hash === b.replay_hash, 'G.1 audit replay hash deterministic');
  assert(a.severity === L14ConstitutionalAuditSeverity.CRITICAL && a.blocking, 'G.2 ignored-too-early is CRITICAL + blocking');
  assert(severityForL14InteractionCode(L14InteractionViolationCode.L14I_DUPLICATE_EVENT_DOUBLE_COUNTED) === L14ConstitutionalAuditSeverity.ERROR, 'G.3 duplicate-double-counted classified ERROR');
  assert(!isL14InteractionBlockingCode(L14InteractionViolationCode.L14I_DUPLICATE_EVENT_DOUBLE_COUNTED), 'G.4 duplicate-double-counted not blocking');
  assert(isL14InteractionBlockingCode(L14InteractionViolationCode.L14I_RAW_USER_IDENTIFIER_PRESENT), 'G.5 raw-user-identifier is blocking');
  assert(getL14InteractionAuditLog().length === 2, 'G.6 audit log queryable');
  assert(getL14InteractionCriticalViolations().length === 2, 'G.7 critical violations queryable');
  // Dismissed/ignored conflation rejected.
  const dismissed = normalizeL14InteractionEvent({
    interaction_type: L14InteractionType.ALERT_DISMISSED,
    user_id_hash: 'h.u', source_execution_ref: 'l14.exec.D', occurred_at: '2026-05-15T00:00:00Z',
    context: ctx({ originating_channel: L14DeliveryChannel.TELEGRAM }),
  });
  const ignoredConflated = deriveL14IgnoredAlert({
    source_execution_ref: 'l14.exec.D',
    source_feedback_expectation_ref: 'l14.exp.D',
    observation_window_start: 's', observation_window_end: 'e',
    delivered_successfully: true, observation_window_elapsed: true,
  });
  assert(!validateL14DismissedIgnoredSeparation(dismissed, ignoredConflated).clean, 'G.8 same-ref dismissed+ignored conflation rejected');
  // Invariants.
  const invs = runAllL14_4Invariants();
  assert(invs.length === 10, `G.9 ten invariants executed (got ${invs.length})`);
  for (const i of invs) {
    assert(i.holds, `G.10 ${i.id} ${i.name} (${i.evidence})`);
  }
}

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

// Suppress unused-import warnings.
void L14InteractionFamily.ALERT_ATTENTION;
