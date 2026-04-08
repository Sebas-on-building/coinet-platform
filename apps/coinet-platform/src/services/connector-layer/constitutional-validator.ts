/**
 * L2.1 Constitutional Validator
 *
 * Hard-fail vs soft-degraded policy.
 * Timing invariant enforcement.
 * Lineage completeness checks.
 * Ambiguity/canonical consistency.
 * Fallback/blind-spot honesty.
 * Replay field integrity.
 */

import type {
  ConstitutionalEnvelope, EnvelopeKind, EntityType, EntityScope,
  RouteMode, FreshnessClass, FreshnessState, FallbackUsageStatus,
  AuthorityRole, SubstitutionRight, SpeakabilityPrecheck,
  IngressTrustClass, PayloadFormat, PayloadCompression,
  TimingCompleteness, CanonicalResolutionState, BlindSpotFlag,
  ObservationKind, SamplingBasis, ClockConfidence,
  PermittedUse, ProhibitedUse, IngressDisposition, CorrectionType,
  FieldValidationResult,
} from './constitutional-envelope';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLED VOCABULARY SETS
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_KINDS: ReadonlySet<EnvelopeKind> = new Set(['observation', 'correction', 'snapshot', 'event', 'backfill_record']);
const VALID_ENTITY_TYPES: ReadonlySet<EntityType> = new Set(['asset', 'pool', 'protocol', 'wallet', 'contract', 'exchange', 'cluster', 'sector', 'macro_event', 'pair', 'chain', 'narrative', 'market_event']);
const VALID_ENTITY_SCOPES: ReadonlySet<EntityScope> = new Set(['exact_asset', 'exact_pool', 'exact_wallet', 'exact_contract', 'protocol_aggregate', 'venue_aggregate', 'chain_aggregate', 'sector_aggregate', 'global_aggregate', 'unknown']);
const VALID_ROUTE_MODES: ReadonlySet<RouteMode> = new Set(['realtime', 'scheduled', 'on_demand', 'backfill']);
const VALID_FRESHNESS_CLASSES: ReadonlySet<FreshnessClass> = new Set(['live', 'fresh', 'acceptable', 'stale', 'expired']);
const VALID_FRESHNESS_STATES: ReadonlySet<FreshnessState> = new Set(['within_sla', 'approaching_sla', 'beyond_sla', 'unknown']);
const VALID_FALLBACK_STATUSES: ReadonlySet<FallbackUsageStatus> = new Set(['none', 'candidate', 'used', 'forced', 'illegal']);
const VALID_AUTH_ROLES: ReadonlySet<AuthorityRole> = new Set(['owner', 'confirmer', 'enricher', 'discovery_only', 'prohibited_non_owner', 'unknown']);
const VALID_SUB_RIGHTS: ReadonlySet<SubstitutionRight> = new Set(['full', 'degraded', 'partial', 'none', 'unknown']);
const VALID_SPEAK: ReadonlySet<SpeakabilityPrecheck> = new Set(['pass', 'caution', 'fail', 'unknown']);
const VALID_TRUST: ReadonlySet<IngressTrustClass> = new Set(['verified', 'audited', 'official', 'third_party', 'heuristic', 'modeled', 'unknown']);
const VALID_FORMATS: ReadonlySet<PayloadFormat> = new Set(['json', 'csv', 'xml', 'text', 'binary', 'websocket_event']);
const VALID_COMPRESSION: ReadonlySet<PayloadCompression> = new Set(['none', 'gzip', 'zstd']);
const VALID_TIMING_COMPLETENESS: ReadonlySet<TimingCompleteness> = new Set(['full', 'partial', 'minimal']);
const VALID_CANON_STATES: ReadonlySet<CanonicalResolutionState> = new Set(['resolved', 'ambiguous', 'unresolved']);

const VALID_OBS_KINDS: ReadonlySet<ObservationKind> = new Set(['RAW_EVENT', 'POINT_IN_TIME_SNAPSHOT', 'ROLLING_AGGREGATE', 'WINDOWED_METRIC', 'DERIVED_ESTIMATE', 'CORRECTION', 'BACKFILL_RECONSTRUCTION']);
const VALID_SAMPLING: ReadonlySet<SamplingBasis> = new Set(['EVENT_DRIVEN', 'FIXED_INTERVAL', 'PROVIDER_DEFINED', 'UNKNOWN']);
const VALID_CLOCK_CONF: ReadonlySet<ClockConfidence> = new Set(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']);
const VALID_FIELD_VAL: ReadonlySet<FieldValidationResult> = new Set(['PASS', 'WARN', 'FAIL']);
const VALID_PERMITTED: ReadonlySet<PermittedUse> = new Set(['CANONICALIZATION', 'DISPLAY', 'LIVE_SCORING', 'SCENARIO_INPUT', 'AUDIT_ONLY', 'REPLAY_ONLY', 'ENRICHMENT_ONLY']);
const VALID_PROHIBITED: ReadonlySet<ProhibitedUse> = new Set(['LIVE_SCORING', 'DIRECTIONAL_CLAIMS', 'IDENTITY_ASSERTION', 'SAFETY_VERDICT']);
const VALID_DISPOSITIONS: ReadonlySet<IngressDisposition> = new Set(['ACCEPTED', 'ACCEPTED_WITH_WARNINGS', 'QUARANTINED', 'REJECTED', 'REPLAY_ONLY', 'DEFERRED']);
const VALID_CORR_TYPES: ReadonlySet<CorrectionType> = new Set(['VALUE_CORRECTION', 'SCOPE_CORRECTION', 'TIMING_CORRECTION', 'IDENTITY_CORRECTION']);

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export type ViolationSeverity = 'hard_fail' | 'soft_degraded' | 'warning';

export interface ConstitutionalViolation {
  code: string;
  block: string;
  field?: string;
  message: string;
  severity: ViolationSeverity;
}

export interface ConstitutionalValidationResult {
  valid: boolean;
  admissible: boolean;
  violations: ConstitutionalViolation[];
  hardFails: number;
  softDegraded: number;
  warnings: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function validateConstitutionalEnvelope(env: ConstitutionalEnvelope): ConstitutionalValidationResult {
  const v: ConstitutionalViolation[] = [];

  // ── Protocol version ───────────────────────────────────────────────────
  if (!env.protocolVersion) hard(v, 'PROTO-1', 'root', 'protocolVersion', 'protocolVersion missing');
  if (!env.envelopeKind || !VALID_KINDS.has(env.envelopeKind)) hard(v, 'PROTO-2', 'root', 'envelopeKind', `Invalid envelopeKind: ${env.envelopeKind}`);

  // ── Identity block ─────────────────────────────────────────────────────
  const id = env.identity;
  if (!id) { hard(v, 'ID-0', 'identity', undefined, 'identity block missing'); }
  else {
    reqStr(v, 'identity', 'envelopeId', id.envelopeId);
    reqStr(v, 'identity', 'traceId', id.traceId);
    reqStr(v, 'identity', 'routeId', id.routeId);
    reqStr(v, 'identity', 'connectorInstanceId', id.connectorInstanceId);
    reqStr(v, 'identity', 'source', id.source);
    reqStr(v, 'identity', 'providerId', id.providerId);
    reqStr(v, 'identity', 'sourceClass', id.sourceClass);
  }

  // ── Source context ─────────────────────────────────────────────────────
  const sc = env.sourceContext;
  if (!sc) { hard(v, 'SRC-0', 'sourceContext', undefined, 'sourceContext block missing'); }
  else {
    if (!VALID_ENTITY_TYPES.has(sc.entityType)) hard(v, 'SRC-1', 'sourceContext', 'entityType', `Invalid entityType: ${sc.entityType}`);
    if (!VALID_ENTITY_SCOPES.has(sc.entityScope)) hard(v, 'SRC-2', 'sourceContext', 'entityScope', `Invalid entityScope: ${sc.entityScope}`);
  }

  // ── Canonical context ──────────────────────────────────────────────────
  const cc = env.canonicalContext;
  if (!cc) { hard(v, 'CAN-0', 'canonicalContext', undefined, 'canonicalContext block missing'); }
  else {
    if (!Array.isArray(cc.canonicalCandidateIds)) hard(v, 'CAN-1', 'canonicalContext', 'canonicalCandidateIds', 'Must be array');
    if (!VALID_CANON_STATES.has(cc.canonicalResolutionState)) hard(v, 'CAN-2', 'canonicalContext', 'canonicalResolutionState', `Invalid: ${cc.canonicalResolutionState}`);
    if (typeof cc.canonicalResolutionConfidence !== 'number' || cc.canonicalResolutionConfidence < 0 || cc.canonicalResolutionConfidence > 1) {
      hard(v, 'CAN-3', 'canonicalContext', 'canonicalResolutionConfidence', 'Must be number in [0,1]');
    }
    if (cc.canonicalResolutionState === 'resolved' && cc.canonicalCandidateIds?.length === 0) {
      hard(v, 'CAN-4', 'canonicalContext', 'canonicalCandidateIds', 'State is resolved but no candidate ids');
    }
    if (cc.canonicalResolutionState === 'resolved' && cc.canonicalCandidateIds?.length > 1) {
      soft(v, 'CAN-5', 'canonicalContext', 'canonicalCandidateIds', 'Resolved with multiple candidates — requires explicit policy');
    }
  }

  // ── Timing block ───────────────────────────────────────────────────────
  const t = env.timing;
  if (!t) { hard(v, 'TIME-0', 'timing', undefined, 'timing block missing'); }
  else {
    reqStr(v, 'timing', 'receivedTimestamp', t.receivedTimestamp);
    reqStr(v, 'timing', 'ingestedTimestamp', t.ingestedTimestamp);
    if (!VALID_TIMING_COMPLETENESS.has(t.timingCompleteness)) hard(v, 'TIME-3', 'timing', 'timingCompleteness', `Invalid: ${t.timingCompleteness}`);

    if (t.receivedTimestamp && t.ingestedTimestamp && t.receivedTimestamp > t.ingestedTimestamp) {
      hard(v, 'TIME-INV-1', 'timing', undefined, 'receivedTimestamp > ingestedTimestamp');
    }
    if (t.observedTimestamp && t.publishedTimestamp && t.observedTimestamp > t.publishedTimestamp) {
      hard(v, 'TIME-INV-2', 'timing', undefined, 'observedTimestamp > publishedTimestamp');
    }
    if (t.observedTimestamp && t.ingestedTimestamp && t.observedTimestamp > t.ingestedTimestamp && env.envelopeKind !== 'backfill_record') {
      hard(v, 'TIME-INV-3', 'timing', undefined, 'observedTimestamp > ingestedTimestamp (non-backfill)');
    }
  }

  // ── Route context ──────────────────────────────────────────────────────
  const rc = env.routeContext;
  if (!rc) { hard(v, 'ROUTE-0', 'routeContext', undefined, 'routeContext block missing'); }
  else {
    if (!VALID_FRESHNESS_CLASSES.has(rc.freshnessClass)) hard(v, 'ROUTE-1', 'routeContext', 'freshnessClass', `Invalid: ${rc.freshnessClass}`);
    if (!VALID_FRESHNESS_STATES.has(rc.freshnessState)) hard(v, 'ROUTE-2', 'routeContext', 'freshnessState', `Invalid: ${rc.freshnessState}`);
    if (!VALID_ROUTE_MODES.has(rc.routeMode)) hard(v, 'ROUTE-3', 'routeContext', 'routeMode', `Invalid: ${rc.routeMode}`);
    if (!VALID_FALLBACK_STATUSES.has(rc.fallbackStatus)) hard(v, 'ROUTE-4', 'routeContext', 'fallbackStatus', `Invalid: ${rc.fallbackStatus}`);

    if (rc.fallbackStatus === 'used' && !rc.fallbackReason) hard(v, 'ROUTE-5', 'routeContext', 'fallbackReason', 'Fallback used but no reason given');
    if (rc.fallbackStatus === 'none' && rc.fallbackReason) warn(v, 'ROUTE-6', 'routeContext', 'fallbackReason', 'Fallback is none but reason is present');
    if (!Array.isArray(rc.blindSpotFlags)) hard(v, 'ROUTE-7', 'routeContext', 'blindSpotFlags', 'Must be array');
  }

  // ── Authority context ──────────────────────────────────────────────────
  const ac = env.authorityContext;
  if (!ac) { hard(v, 'AUTH-0', 'authorityContext', undefined, 'authorityContext block missing'); }
  else {
    if (!VALID_TRUST.has(ac.trustClass)) hard(v, 'AUTH-1', 'authorityContext', 'trustClass', `Invalid: ${ac.trustClass}`);
    if (!VALID_AUTH_ROLES.has(ac.authorityRole)) hard(v, 'AUTH-2', 'authorityContext', 'authorityRole', `Invalid: ${ac.authorityRole}`);
    if (!VALID_SUB_RIGHTS.has(ac.substitutionRight)) hard(v, 'AUTH-3', 'authorityContext', 'substitutionRight', `Invalid: ${ac.substitutionRight}`);
    if (!VALID_SPEAK.has(ac.speakabilityPrecheck)) hard(v, 'AUTH-4', 'authorityContext', 'speakabilityPrecheck', `Invalid: ${ac.speakabilityPrecheck}`);
  }

  // ── Payload context ────────────────────────────────────────────────────
  const pc = env.payloadContext;
  if (!pc) { hard(v, 'PAY-0', 'payloadContext', undefined, 'payloadContext block missing'); }
  else {
    reqStr(v, 'payloadContext', 'rawPayloadRef', pc.rawPayloadRef);
    reqStr(v, 'payloadContext', 'rawPayloadHash', pc.rawPayloadHash);
    reqStr(v, 'payloadContext', 'normalizationVersion', pc.normalizationVersion);
    if (!VALID_FORMATS.has(pc.payloadFormat)) hard(v, 'PAY-4', 'payloadContext', 'payloadFormat', `Invalid: ${pc.payloadFormat}`);
    if (!VALID_COMPRESSION.has(pc.rawPayloadCompression)) hard(v, 'PAY-5', 'payloadContext', 'rawPayloadCompression', `Invalid: ${pc.rawPayloadCompression}`);
  }

  // ── Replay context ─────────────────────────────────────────────────────
  const rp = env.replayContext;
  if (!rp) { hard(v, 'REPLAY-0', 'replayContext', undefined, 'replayContext block missing'); }
  else {
    reqStr(v, 'replayContext', 'idempotencyKey', rp.idempotencyKey);
    reqStr(v, 'replayContext', 'dedupFingerprint', rp.dedupFingerprint);
    if (typeof rp.replayGeneration !== 'number' || rp.replayGeneration < 0) hard(v, 'REPLAY-3', 'replayContext', 'replayGeneration', 'Must be non-negative');
    if (rp.correctionOfEnvelopeId && rp.correctionOfEnvelopeId === env.identity?.envelopeId) {
      hard(v, 'REPLAY-4', 'replayContext', 'correctionOfEnvelopeId', 'Correction self-reference');
    }
  }

  // ── Validation context ─────────────────────────────────────────────────
  const vc = env.validationContext;
  if (!vc) { hard(v, 'VAL-0', 'validationContext', undefined, 'validationContext block missing'); }
  else {
    if (typeof vc.schemaValid !== 'boolean') hard(v, 'VAL-1', 'validationContext', 'schemaValid', 'Must be boolean');
    if (typeof vc.timingValid !== 'boolean') hard(v, 'VAL-2', 'validationContext', 'timingValid', 'Must be boolean');
    if (typeof vc.payloadValid !== 'boolean') hard(v, 'VAL-3', 'validationContext', 'payloadValid', 'Must be boolean');
    if (typeof vc.lineageComplete !== 'boolean') hard(v, 'VAL-4', 'validationContext', 'lineageComplete', 'Must be boolean');
    if (typeof vc.envelopeValid !== 'boolean') hard(v, 'VAL-5', 'validationContext', 'envelopeValid', 'Must be boolean');
  }

  // ── Lineage context ────────────────────────────────────────────────────
  const lc = env.lineageContext;
  if (!lc) { hard(v, 'LIN-0', 'lineageContext', undefined, 'lineageContext block missing'); }
  else {
    reqStr(v, 'lineageContext', 'upstreamConnectorName', lc.upstreamConnectorName);
    reqStr(v, 'lineageContext', 'upstreamConnectorVersion', lc.upstreamConnectorVersion);
    reqStr(v, 'lineageContext', 'normalizationPipelineName', lc.normalizationPipelineName);
    reqStr(v, 'lineageContext', 'normalizationPipelineVersion', lc.normalizationPipelineVersion);
    if (!Array.isArray(lc.lineagePath)) hard(v, 'LIN-5', 'lineageContext', 'lineagePath', 'Must be array');
  }

  // ── L2.1.1 Observation semantics ─────────────────────────────────────
  const os = env.observationSemantics;
  if (!os) { hard(v, 'OBS-0', 'observationSemantics', undefined, 'observationSemantics block missing'); }
  else {
    if (!VALID_OBS_KINDS.has(os.observationKind)) hard(v, 'OBS-1', 'observationSemantics', 'observationKind', `Invalid: ${os.observationKind}`);
    if (!VALID_SAMPLING.has(os.samplingBasis)) hard(v, 'OBS-2', 'observationSemantics', 'samplingBasis', `Invalid: ${os.samplingBasis}`);
    if (os.observationKind === 'ROLLING_AGGREGATE' && !os.aggregationWindowMs) {
      soft(v, 'OBS-3', 'observationSemantics', 'aggregationWindowMs', 'Rolling aggregate without window');
    }
    if (os.observationKind === 'WINDOWED_METRIC' && !os.aggregationWindowMs) {
      soft(v, 'OBS-4', 'observationSemantics', 'aggregationWindowMs', 'Windowed metric without window');
    }
  }

  // ── L2.1.1 Normalization outcome ───────────────────────────────────────
  const no = env.normalizationOutcome;
  if (!no) { hard(v, 'NORM-0', 'normalizationOutcome', undefined, 'normalizationOutcome block missing'); }
  else {
    if (typeof no.fieldCompletenessRatio !== 'number' || no.fieldCompletenessRatio < 0 || no.fieldCompletenessRatio > 1) {
      hard(v, 'NORM-1', 'normalizationOutcome', 'fieldCompletenessRatio', 'Must be [0,1]');
    }
    if (!Array.isArray(no.normalizedFieldIds)) hard(v, 'NORM-2', 'normalizationOutcome', 'normalizedFieldIds', 'Must be array');
    if (!Array.isArray(no.suppressedFieldIds)) hard(v, 'NORM-3', 'normalizationOutcome', 'suppressedFieldIds', 'Must be array');
    if (!Array.isArray(no.failedFieldIds)) hard(v, 'NORM-4', 'normalizationOutcome', 'failedFieldIds', 'Must be array');
  }

  // ── L2.1.1 Field lineage ───────────────────────────────────────────────
  const fl = env.fieldLineage;
  if (!fl) { hard(v, 'FLIN-0', 'fieldLineage', undefined, 'fieldLineage block missing'); }
  else {
    if (!Array.isArray(fl.normalizedFieldLineage)) hard(v, 'FLIN-1', 'fieldLineage', 'normalizedFieldLineage', 'Must be array');
    for (const entry of fl.normalizedFieldLineage ?? []) {
      if (!entry.fragmentId) hard(v, 'FLIN-2', 'fieldLineage', 'fragmentId', 'Entry missing fragmentId');
      if (!entry.fieldId) hard(v, 'FLIN-3', 'fieldLineage', 'fieldId', 'Entry missing fieldId');
      if (!VALID_FIELD_VAL.has(entry.validationResult)) hard(v, 'FLIN-4', 'fieldLineage', 'validationResult', `Invalid: ${entry.validationResult}`);
    }
  }

  // ── L2.1.2 Temporal uncertainty ────────────────────────────────────────
  const tu = env.temporalUncertainty;
  if (!tu) { hard(v, 'TEMP-0', 'temporalUncertainty', undefined, 'temporalUncertainty block missing'); }
  else {
    if (!VALID_CLOCK_CONF.has(tu.sourceClockConfidence)) hard(v, 'TEMP-1', 'temporalUncertainty', 'sourceClockConfidence', `Invalid: ${tu.sourceClockConfidence}`);
  }

  // ── L2.1.2 Attestation ────────────────────────────────────────────────
  const at = env.attestation;
  if (!at) { hard(v, 'ATT-0', 'attestation', undefined, 'attestation block missing'); }
  else {
    reqStr(v, 'attestation', 'canonicalEnvelopeHash', at.canonicalEnvelopeHash);
    reqStr(v, 'attestation', 'rawPayloadContentAddress', at.rawPayloadContentAddress);
    reqStr(v, 'attestation', 'builderVersion', at.builderVersion);
    reqStr(v, 'attestation', 'connectorBinaryVersion', at.connectorBinaryVersion);
  }

  // ── L2.1.2 Policy pins ────────────────────────────────────────────────
  const pp = env.policyPins;
  if (!pp) { hard(v, 'POL-0', 'policyPins', undefined, 'policyPins block missing'); }
  else {
    reqStr(v, 'policyPins', 'authorityConstitutionVersion', pp.authorityConstitutionVersion);
    reqStr(v, 'policyPins', 'envelopeSchemaVersion', pp.envelopeSchemaVersion);
  }

  // ── L2.1.3 Usage rights ───────────────────────────────────────────────
  const ur = env.usageRights;
  if (!ur) { hard(v, 'USAGE-0', 'usageRights', undefined, 'usageRights block missing'); }
  else {
    if (!Array.isArray(ur.permittedUses)) hard(v, 'USAGE-1', 'usageRights', 'permittedUses', 'Must be array');
    for (const u of ur.permittedUses ?? []) {
      if (!VALID_PERMITTED.has(u)) hard(v, 'USAGE-2', 'usageRights', 'permittedUses', `Invalid use: ${u}`);
    }
    for (const u of ur.prohibitedUses ?? []) {
      if (!VALID_PROHIBITED.has(u)) hard(v, 'USAGE-3', 'usageRights', 'prohibitedUses', `Invalid: ${u}`);
    }
    const conflict = ur.permittedUses?.filter(p => (ur.prohibitedUses ?? []).includes(p as any));
    if (conflict && conflict.length > 0) {
      hard(v, 'USAGE-4', 'usageRights', undefined, `Contradictory rights: ${conflict.join(', ')} is both permitted and prohibited`);
    }
  }

  // ── L2.1.3 Disposition ────────────────────────────────────────────────
  const dp = env.disposition;
  if (!dp) { hard(v, 'DISP-0', 'disposition', undefined, 'disposition block missing'); }
  else {
    if (!VALID_DISPOSITIONS.has(dp.disposition)) hard(v, 'DISP-1', 'disposition', 'disposition', `Invalid: ${dp.disposition}`);
    if (dp.disposition === 'QUARANTINED' && !dp.quarantineBucketId) {
      soft(v, 'DISP-2', 'disposition', 'quarantineBucketId', 'Quarantined without bucket id');
    }
  }

  // ── L2.1.3 Supersession ──────────────────────────────────────────────
  const ss = env.supersession;
  if (!ss) { hard(v, 'SUPER-0', 'supersession', undefined, 'supersession block missing'); }
  else {
    if (typeof ss.revisionNumber !== 'number' || ss.revisionNumber < 0) hard(v, 'SUPER-1', 'supersession', 'revisionNumber', 'Must be non-negative');
    if (ss.correctionType && !VALID_CORR_TYPES.has(ss.correctionType)) hard(v, 'SUPER-2', 'supersession', 'correctionType', `Invalid: ${ss.correctionType}`);
    if (ss.supersedesEnvelopeId && ss.supersedesEnvelopeId === env.identity?.envelopeId) {
      hard(v, 'SUPER-3', 'supersession', 'supersedesEnvelopeId', 'Self-supersession');
    }
  }

  // ── L2.1.3 Ordering ──────────────────────────────────────────────────
  const ord = env.ordering;
  if (!ord) { hard(v, 'ORD-0', 'ordering', undefined, 'ordering block missing'); }
  else {
    reqStr(v, 'ordering', 'orderingDomain', ord.orderingDomain);
    if (!Array.isArray(ord.causalParentEnvelopeIds)) hard(v, 'ORD-2', 'ordering', 'causalParentEnvelopeIds', 'Must be array');
    if (!Array.isArray(ord.siblingEnvelopeIds)) hard(v, 'ORD-3', 'ordering', 'siblingEnvelopeIds', 'Must be array');
  }

  // ── Anti-fake: normalized fragment without lineage ─────────────────────
  if (pc?.normalizedPayloadFragment !== undefined && pc?.normalizedPayloadFragment !== null) {
    if (!pc.rawPayloadRef || !pc.rawPayloadHash) {
      hard(v, 'ANTIFAKE-1', 'payloadContext', undefined, 'Normalized fragment exists but raw lineage incomplete');
    }
    if (!pc.normalizationVersion) {
      hard(v, 'ANTIFAKE-2', 'payloadContext', 'normalizationVersion', 'Normalized fragment without normalization version');
    }
    if (!t?.receivedTimestamp || !t?.ingestedTimestamp) {
      hard(v, 'ANTIFAKE-3', 'timing', undefined, 'Normalized fragment without timing context');
    }
  }

  const hardFails = v.filter(x => x.severity === 'hard_fail').length;
  const softDegraded = v.filter(x => x.severity === 'soft_degraded').length;
  const warnings = v.filter(x => x.severity === 'warning').length;

  return {
    valid: hardFails === 0,
    admissible: hardFails === 0,
    violations: v,
    hardFails,
    softDegraded,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function hard(v: ConstitutionalViolation[], code: string, block: string, field: string | undefined, msg: string) {
  v.push({ code, block, field, message: msg, severity: 'hard_fail' });
}
function soft(v: ConstitutionalViolation[], code: string, block: string, field: string | undefined, msg: string) {
  v.push({ code, block, field, message: msg, severity: 'soft_degraded' });
}
function warn(v: ConstitutionalViolation[], code: string, block: string, field: string | undefined, msg: string) {
  v.push({ code, block, field, message: msg, severity: 'warning' });
}
function reqStr(v: ConstitutionalViolation[], block: string, field: string, val: unknown) {
  if (!val || typeof val !== 'string' || val.length === 0) {
    hard(v, `${block.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4)}-REQ`, block, field, `Required field ${field} missing or empty`);
  }
}
