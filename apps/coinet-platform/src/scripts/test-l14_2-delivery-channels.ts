/**
 * L14.2 — Delivery Channels, Consumer Contracts, Entitlement,
 *         Rendering, and Deliverability Certification
 *
 * §14.2.29 — Bands A..F prove every delivery law mechanically.
 */

import { L14ConstitutionalAuditSeverity } from '../l14/contracts/l14-constitutional-types';
import { L14AudienceClass } from '../l14/contracts/audience-class';
import { L14DeliverabilityStatus } from '../l14/contracts/deliverability-status';
import { L14DeliverableSourceArtifactClass } from '../l14/contracts/deliverable-source-artifact';
import {
  ALL_L14_DELIVERY_CHANNELS,
  L14DeliveryChannel,
  L14DeliveryChannelStatus,
} from '../l14/contracts/delivery-channel';
import { L14DeliveryClass } from '../l14/contracts/delivery-class';
import {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from '../l14/contracts/delivery-priority';
import {
  L14EntitlementStatus,
  type L14DeliveryEntitlementProfile,
} from '../l14/contracts/delivery-entitlement-profile';
import {
  L14RenderingProfileClass,
} from '../l14/contracts/rendering-profile';
import type { L14DeliveryPayload } from '../l14/contracts/delivery-payload';
import {
  getL14DeliveryChannelDefinition,
  getL14DeliveryChannelDefinitions,
  getL14DeliveryConsumerContract,
  getL14DeliveryConsumerContracts,
  getL14RenderingProfile,
  getL14RenderingProfiles,
} from '../l14/registry';
import {
  validateL14ChannelSpecificDelivery,
  validateL14DeliveryChannel,
  validateL14DeliveryConsumerContract,
  validateL14DeliveryEntitlement,
  validateL14DeliveryPayload,
  validateL14RenderingProfile,
  validateL14RenderingUsage,
} from '../l14/validation/delivery.validators';
import { L14DeliveryViolationCode } from '../l14/validation/l14-delivery-violation-codes';
import {
  L14DeliveryAuditSubjectClass,
  emitL14DeliveryAuditRecord,
  getL14DeliveryAuditLog,
  getL14DeliveryCriticalViolations,
  isL14DeliveryBlockingCode,
  resetL14DeliveryAuditLog,
  severityForL14DeliveryCode,
} from '../l14/constitution/l14-delivery-audit';
import { runAllL14_2Invariants } from '../l14/invariants/l14_2-invariants';

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

function buildPayload(opts: {
  channel: L14DeliveryChannel;
  delivery_class: L14DeliveryClass;
  audience: L14AudienceClass;
  source_layer: L14DeliveryPayload['source_layer'];
  rendering_profile_class: L14RenderingProfileClass;
  status?: L14DeliverabilityStatus;
}): L14DeliveryPayload {
  const profile = getL14RenderingProfile(opts.rendering_profile_class);
  return {
    delivery_payload_id: `l14.cert.${opts.channel}.${opts.delivery_class}`,
    source_layer: opts.source_layer,
    primary_source_artifact_ref: 'l14.cert.src',
    supporting_source_artifact_refs: [],
    delivery_channel: opts.channel,
    delivery_class: opts.delivery_class,
    audience_class: opts.audience,
    content_payload_ref: 'l14.cert.content',
    rendering_profile_ref: profile?.rendering_profile_id ?? 'l14.cert.render',
    priority_class: L14DeliveryPriorityClass.MATERIAL,
    urgency_class: L14DeliveryUrgencyClass.NEAR_REAL_TIME,
    disclosure_profile_ref: 'l14.cert.disc',
    restriction_profile_ref: 'l14.cert.restr',
    deliverability_status: opts.status ?? L14DeliverabilityStatus.DELIVERABLE_CLEAN,
    lineage_refs: ['l14.delivery.lineage'],
    replay_hash: 'cert.hash',
    policy_version: 'l14.delivery.v1',
  };
}

function buildEntitlement(opts: {
  audience: L14AudienceClass;
  channel: L14DeliveryChannel;
  status: L14EntitlementStatus;
  opt_in_required?: boolean;
  opt_in_present?: boolean;
  watchlist_required?: boolean;
  watchlist_present?: boolean;
  subscription_required?: boolean;
  subscription_present?: boolean;
  internal_role_required?: boolean;
  internal_role_present?: boolean;
}): L14DeliveryEntitlementProfile {
  return {
    entitlement_profile_id: `l14.cert.ent.${opts.channel}`,
    audience_class: opts.audience,
    channel: opts.channel,
    channel_opt_in_required: opts.opt_in_required ?? false,
    channel_opt_in_present: opts.opt_in_present,
    watchlist_membership_required: opts.watchlist_required ?? false,
    watchlist_membership_present: opts.watchlist_present,
    subscription_required: opts.subscription_required ?? false,
    subscription_present: opts.subscription_present,
    internal_role_required: opts.internal_role_required ?? false,
    internal_role_present: opts.internal_role_present,
    entitlement_status: opts.status,
    lineage_refs: ['l14.delivery.lineage'],
    replay_hash: 'cert.ent',
    policy_version: 'l14.delivery.v1',
  };
}

// ── Band A : channel registration and status law ──────────────────

band('BAND A — channel registration and status law');

{
  const defs = getL14DeliveryChannelDefinitions();
  assert(defs.length === 6, `A.1 6 channels registered (got ${defs.length})`);
  for (const c of ALL_L14_DELIVERY_CHANNELS) {
    assert(!!getL14DeliveryChannelDefinition(c), `A.2 ${c} registered`);
  }
  const dashboard = getL14DeliveryChannelDefinition(L14DeliveryChannel.DASHBOARD);
  assert(dashboard?.channel_status === L14DeliveryChannelStatus.PRODUCTION_USER_FACING, 'A.3 dashboard production_user_facing');
  const page = getL14DeliveryChannelDefinition(L14DeliveryChannel.TOKEN_REPORT_PAGE);
  assert(page?.channel_status === L14DeliveryChannelStatus.PRODUCTION_USER_FACING, 'A.4 token report page production');
  const chat = getL14DeliveryChannelDefinition(L14DeliveryChannel.AI_CHAT);
  assert(chat?.channel_status === L14DeliveryChannelStatus.PRODUCTION_USER_FACING, 'A.5 AI chat production');
  const tg = getL14DeliveryChannelDefinition(L14DeliveryChannel.TELEGRAM);
  assert(tg?.channel_status === L14DeliveryChannelStatus.PRODUCTION_USER_FACING && tg?.entitlement_required === true, 'A.6 Telegram production + entitlement required');
  const push = getL14DeliveryChannelDefinition(L14DeliveryChannel.PUSH_ALERT);
  assert(push?.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE && push?.production_emissible === false, 'A.7 Push alert reserved + non-emissible');
  const internal = getL14DeliveryChannelDefinition(L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE);
  assert(internal?.channel_status === L14DeliveryChannelStatus.PRODUCTION_INTERNAL_ONLY, 'A.8 internal console internal-only');
  // Channel validators clean.
  for (const def of defs) {
    assert(validateL14DeliveryChannel(def).clean, `A.9 ${def.channel} validator clean`);
  }
}

// ── Band B : consumer contracts ───────────────────────────────────

band('BAND B — consumer contracts');

{
  const contracts = getL14DeliveryConsumerContracts();
  assert(contracts.length === 6, `B.1 6 consumer contracts (got ${contracts.length})`);
  // AI chat final-artifact requirement.
  const aiChat = getL14DeliveryConsumerContract(L14DeliveryChannel.AI_CHAT);
  assert(aiChat?.requires_final_l13_artifact === true, 'B.2 AI chat contract requires final L13 artifact');
  // Telegram final-artifact + entitlement.
  const tg = getL14DeliveryConsumerContract(L14DeliveryChannel.TELEGRAM);
  assert(tg?.requires_final_l13_artifact === true && tg?.requires_entitlement_profile === true, 'B.3 Telegram contract requires final L13 alert + entitlement');
  // Internal console internal-only.
  const internal = getL14DeliveryConsumerContract(L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE);
  assert(internal?.may_serve_user_facing === false && internal?.may_serve_internal_only === true, 'B.4 internal console contract internal-only');
  // All contracts pinned non-reconstruction / non-mutation.
  for (const c of contracts) {
    assert(c.may_reconstruct_meaning === false && c.may_mutate_source_semantics === false && c.may_auto_upgrade_priority === false, `B.5 ${c.channel} pinned non-mutation`);
  }
  // All contracts validate.
  for (const c of contracts) {
    assert(validateL14DeliveryConsumerContract(c).clean, `B.6 ${c.channel} contract validator clean`);
  }
}

// ── Band C : delivery payload contract ────────────────────────────

band('BAND C — delivery payload contract');

{
  const p = buildPayload({
    channel: L14DeliveryChannel.DASHBOARD,
    delivery_class: L14DeliveryClass.CURRENT_STATE_CARD,
    audience: L14AudienceClass.END_USER,
    source_layer: 'L13',
    rendering_profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
  });
  assert(validateL14DeliveryPayload(p).clean, 'C.1 green payload validates');
  assert(!validateL14DeliveryPayload({ ...p, primary_source_artifact_ref: '' }).clean, 'C.2 missing source ref rejected');
  assert(!validateL14DeliveryPayload({ ...p, content_payload_ref: '' }).clean, 'C.3 missing content ref rejected');
  assert(!validateL14DeliveryPayload({ ...p, disclosure_profile_ref: '' }).clean, 'C.4 missing disclosure ref rejected');
  assert(!validateL14DeliveryPayload({ ...p, restriction_profile_ref: '' }).clean, 'C.5 missing restriction ref rejected');
  assert(!validateL14DeliveryPayload({ ...p, lineage_refs: [] }).clean, 'C.6 missing lineage rejected');
  assert(!validateL14DeliveryPayload({ ...p, replay_hash: '' }).clean, 'C.7 missing replay hash rejected');
  // Channel-specific delivery validates clean.
  const csClean = validateL14ChannelSpecificDelivery({
    payload: p,
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_REPORT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
  });
  assert(csClean.clean, `C.8 channel-specific delivery clean (issues=${csClean.issues.length})`);
}

// ── Band D : entitlement and channel-specific law ─────────────────

band('BAND D — entitlement and channel-specific law');

{
  // Telegram missing opt-in rejected.
  const noOptIn = buildEntitlement({
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
    channel: L14DeliveryChannel.TELEGRAM,
    status: L14EntitlementStatus.NOT_ENTITLED_MISSING_OPT_IN,
    opt_in_required: true, opt_in_present: false,
    subscription_required: true, subscription_present: true,
  });
  assert(!validateL14DeliveryEntitlement(noOptIn).clean, 'D.1 Telegram missing opt-in rejected');
  // Telegram missing subscription rejected.
  const noSub = buildEntitlement({
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
    channel: L14DeliveryChannel.TELEGRAM,
    status: L14EntitlementStatus.NOT_ENTITLED_MISSING_SUBSCRIPTION,
    opt_in_required: true, opt_in_present: true,
    subscription_required: true, subscription_present: false,
  });
  assert(!validateL14DeliveryEntitlement(noSub).clean, 'D.2 Telegram missing subscription rejected');
  // Internal console missing internal role rejected.
  const noRole = buildEntitlement({
    audience: L14AudienceClass.INTERNAL_ANALYST,
    channel: L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE,
    status: L14EntitlementStatus.NOT_ENTITLED_MISSING_INTERNAL_ROLE,
    internal_role_required: true, internal_role_present: false,
  });
  assert(!validateL14DeliveryEntitlement(noRole).clean, 'D.3 internal console missing role rejected');
  // Push alert production emission rejected.
  const pushAttempt = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.PUSH_ALERT,
      delivery_class: L14DeliveryClass.ALERT_NOTIFICATION,
      audience: L14AudienceClass.ALERT_SUBSCRIBER,
      source_layer: 'L13',
      rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
      status: L14DeliverabilityStatus.DELIVERABLE_CLEAN,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
  });
  assert(!pushAttempt.clean && pushAttempt.issues.some(i => i.code === L14DeliveryViolationCode.L14D_RESERVED_CHANNEL_PRODUCTION_EMISSION), 'D.4 push alert production emission rejected');
  // Dashboard end-user legal.
  const dashEnd = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.DASHBOARD,
      delivery_class: L14DeliveryClass.CURRENT_STATE_CARD,
      audience: L14AudienceClass.END_USER,
      source_layer: 'L13',
      rendering_profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_REPORT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
  });
  assert(dashEnd.clean, 'D.5 dashboard end-user legal');
  // AI chat with non-final L13 artifact rejected.
  const chatBad = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.AI_CHAT,
      delivery_class: L14DeliveryClass.AI_CHAT_RESPONSE,
      audience: L14AudienceClass.END_USER,
      source_layer: 'L11',
      rendering_profile_class: L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L11_SCORE_SNAPSHOT,
    rendering_profile_class: L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER,
  });
  assert(!chatBad.clean && chatBad.issues.some(i => i.code === L14DeliveryViolationCode.L14D_AI_CHAT_REQUIRES_FINAL_L13_ARTIFACT), 'D.6 AI chat non-final L13 rejected');
  // Telegram with raw L12 rejected.
  const tgBad = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.TELEGRAM,
      delivery_class: L14DeliveryClass.ALERT_NOTIFICATION,
      audience: L14AudienceClass.ALERT_SUBSCRIBER,
      source_layer: 'L12',
      rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L12_TRIGGER_INVALIDATION_SUMMARY,
    rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    entitlement: buildEntitlement({
      audience: L14AudienceClass.ALERT_SUBSCRIBER,
      channel: L14DeliveryChannel.TELEGRAM,
      status: L14EntitlementStatus.ENTITLED,
      opt_in_required: true, opt_in_present: true,
      subscription_required: true, subscription_present: true,
    }),
  });
  assert(!tgBad.clean && tgBad.issues.some(i => i.code === L14DeliveryViolationCode.L14D_TELEGRAM_REQUIRES_FINAL_L13_ALERT_ARTIFACT), 'D.7 Telegram raw L12 rejected');
}

// ── Band E : rendering and semantic preservation ──────────────────

band('BAND E — rendering and semantic preservation');

{
  const profiles = getL14RenderingProfiles();
  assert(profiles.length === 7, `E.1 7 rendering profiles registered (got ${profiles.length})`);
  for (const p of profiles) {
    assert(validateL14RenderingProfile(p).clean, `E.2 ${p.rendering_profile_class} profile clean`);
    assert(p.must_preserve_disclosures === true && p.must_preserve_restrictions === true && p.must_preserve_trigger_invalidation_state === true && p.must_preserve_source_semantics === true, `E.3 ${p.rendering_profile_class} preserves all required attributes`);
    assert(p.may_regenerate_language === false && p.may_intensify_urgency === false && p.may_convert_condition_to_certainty === false, `E.4 ${p.rendering_profile_class} forbids mutation flags`);
  }
  // Usage: removing disclosure rejected.
  const u1 = validateL14RenderingUsage({
    profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    channel: L14DeliveryChannel.TELEGRAM,
    removed_required_disclosure: true,
  });
  assert(!u1.clean && u1.issues.some(i => i.code === L14DeliveryViolationCode.L14D_RENDERING_REMOVES_REQUIRED_DISCLOSURE), 'E.5 Telegram disclosure removal rejected');
  // Usage: removing restriction rejected.
  const u2 = validateL14RenderingUsage({
    profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
    channel: L14DeliveryChannel.DASHBOARD,
    removed_restriction: true,
  });
  assert(!u2.clean && u2.issues.some(i => i.code === L14DeliveryViolationCode.L14D_RENDERING_REMOVES_RESTRICTION), 'E.6 dashboard restriction removal rejected');
  // Usage: chat regenerating language rejected.
  const u3 = validateL14RenderingUsage({
    profile_class: L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER,
    channel: L14DeliveryChannel.AI_CHAT,
    regenerated_language: true,
  });
  assert(!u3.clean && u3.issues.some(i => i.code === L14DeliveryViolationCode.L14D_RENDERING_REGENERATES_MEANING), 'E.7 chat regeneration rejected');
  // Usage: converting conditional to certainty rejected.
  const u4 = validateL14RenderingUsage({
    profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    channel: L14DeliveryChannel.TELEGRAM,
    converted_condition_to_certainty: true,
  });
  assert(!u4.clean, 'E.8 Telegram conditional→certainty rejected');
  // Usage: intensifying urgency rejected.
  const u5 = validateL14RenderingUsage({
    profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    channel: L14DeliveryChannel.TELEGRAM,
    intensified_urgency: true,
  });
  assert(!u5.clean, 'E.9 Telegram urgency intensification rejected');
}

// ── Band F : audit and invariants ─────────────────────────────────

band('BAND F — audit and invariants');

{
  resetL14DeliveryAuditLog();
  const a = emitL14DeliveryAuditRecord({
    subjectClass: L14DeliveryAuditSubjectClass.DELIVERY_PAYLOAD,
    subjectRef: 'l14.cert.payload',
    violationCodes: [L14DeliveryViolationCode.L14D_TELEGRAM_REQUIRES_FINAL_L13_ALERT_ARTIFACT],
    message: 'cert: telegram raw L12',
  });
  const b = emitL14DeliveryAuditRecord({
    subjectClass: L14DeliveryAuditSubjectClass.DELIVERY_PAYLOAD,
    subjectRef: 'l14.cert.payload',
    violationCodes: [L14DeliveryViolationCode.L14D_TELEGRAM_REQUIRES_FINAL_L13_ALERT_ARTIFACT],
    message: 'cert: telegram raw L12',
  });
  assert(a.replay_hash === b.replay_hash, 'F.1 audit replay hash deterministic');
  assert(a.severity === L14ConstitutionalAuditSeverity.CRITICAL, 'F.2 telegram-final-required is CRITICAL');
  assert(a.blocking, 'F.3 telegram-final-required is blocking');
  assert(severityForL14DeliveryCode(L14DeliveryViolationCode.L14D_CHANNEL_UNREGISTERED) === L14ConstitutionalAuditSeverity.ERROR, 'F.4 channel unregistered classified ERROR');
  assert(!isL14DeliveryBlockingCode(L14DeliveryViolationCode.L14D_CHANNEL_UNREGISTERED), 'F.5 channel unregistered not blocking');
  assert(isL14DeliveryBlockingCode(L14DeliveryViolationCode.L14D_RESERVED_CHANNEL_PRODUCTION_EMISSION), 'F.6 reserved-channel emission is blocking');
  assert(getL14DeliveryAuditLog().length === 2, 'F.7 audit log queryable');
  assert(getL14DeliveryCriticalViolations().length === 2, 'F.8 critical violations queryable');
  // Invariants.
  const invs = runAllL14_2Invariants();
  assert(invs.length === 10, `F.9 ten invariants executed (got ${invs.length})`);
  for (const i of invs) {
    assert(i.holds, `F.10 ${i.id} ${i.name} (${i.evidence})`);
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
