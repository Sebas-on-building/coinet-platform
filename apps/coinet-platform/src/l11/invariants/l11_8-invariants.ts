/**
 * L11.8 — Persistence, Read, Replay, Repair, and Downstream
 * Invariants (§11.8.20)
 *
 * Eight machine-enforced invariants that prove the persistence
 * sublayer is production-ready. Each invariant returns
 * `{ ok, violations, evidence }`.
 *
 *   INV-11.8-A — L5-only persistence law
 *   INV-11.8-B — current authority law
 *   INV-11.8-C — historical append-safety law
 *   INV-11.8-D — evidence integrity law
 *   INV-11.8-E — governed read surface law
 *   INV-11.8-F — later-layer no-rebuild law
 *   INV-11.8-G — replay and repair safety law
 *   INV-11.8-H — score object completeness serving law
 */

import {
  L11PersistenceEnvelope,
  L11CurrentScoreRecord,
  L11HistoricalScoreFact,
  L11EvidencePointer,
  L11ReadRequest,
  L11DownstreamConsumptionRequest,
  L11ConsumerClass,
  L11ReadMode,
  L11ReadSurfaceId,
} from '../contracts';
import {
  validateL11PersistenceEnvelope,
} from '../persistence/persistence-envelope.validator';
import {
  validateL11CurrentScoreRecord,
} from '../persistence/current-authority.validator';
import {
  validateL11HistoricalScoreFact,
} from '../persistence/historical-score-fact.validator';
import {
  validateL11EvidencePointer,
} from '../persistence/evidence-pointer.validator';
import {
  validateL11ReadRequest,
} from '../read/l11-read-surface.validator';
import {
  validateL11DownstreamConsumption,
} from '../read/l11-downstream-consumption.validator';
import {
  validateL11ReplayResult,
} from '../replay/replay-result.validator';
import {
  L11ReplayResult,
} from '../replay/l11-replay-adapter';
import {
  L11RepairRequest,
} from '../repair/l11-repair-adapter';
import {
  validateL11RepairRequest,
} from '../repair/repair-request.validator';
import {
  L11PersistenceIssue,
  L11PersistenceViolationCode,
  makeL11PersistenceIssue,
} from '../persistence/l11-persistence-violation-codes';

export interface L11_8InvariantResult {
  readonly ok: boolean;
  readonly violations: readonly L11PersistenceIssue[];
  readonly evidence: string;
}

function ok(evidence: string): L11_8InvariantResult {
  return { ok: true, violations: [], evidence };
}
function fail(
  violations: readonly L11PersistenceIssue[],
  evidence: string,
): L11_8InvariantResult {
  return { ok: false, violations, evidence };
}

// ─────────────────────────────────────────────────────────────────
// INV-11.8-A — L5-only persistence law
// ─────────────────────────────────────────────────────────────────

export function invariantA_l5OnlyPersistence(
  envelopes: readonly L11PersistenceEnvelope<unknown>[],
): L11_8InvariantResult {
  const violations: L11PersistenceIssue[] = [];
  for (const e of envelopes) {
    for (const v of validateL11PersistenceEnvelope(e)) violations.push(v);
  }
  if (violations.length > 0) {
    return fail(violations, `INV-11.8-A failed: ${violations.length} envelope violations`);
  }
  return ok(`INV-11.8-A: ${envelopes.length} envelopes pass L5-only persistence law`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.8-B — current authority law
// ─────────────────────────────────────────────────────────────────

export function invariantB_currentAuthority(
  records: readonly L11CurrentScoreRecord[],
): L11_8InvariantResult {
  const violations: L11PersistenceIssue[] = [];
  for (const r of records) {
    for (const v of validateL11CurrentScoreRecord(r)) violations.push(v);
  }
  if (violations.length > 0) {
    return fail(violations, `INV-11.8-B failed: ${violations.length} current authority violations`);
  }
  return ok(`INV-11.8-B: ${records.length} current records pass authority law`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.8-C — historical append-safety law
// ─────────────────────────────────────────────────────────────────

export function invariantC_historicalAppendSafety(
  facts: readonly L11HistoricalScoreFact[],
): L11_8InvariantResult {
  const violations: L11PersistenceIssue[] = [];
  for (const f of facts) {
    for (const v of validateL11HistoricalScoreFact(f)) violations.push(v);
  }
  if (violations.length > 0) {
    return fail(violations, `INV-11.8-C failed: ${violations.length} historical violations`);
  }
  return ok(`INV-11.8-C: ${facts.length} historical facts pass append-safety law`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.8-D — evidence integrity law
// ─────────────────────────────────────────────────────────────────

export function invariantD_evidenceIntegrity(
  pointers: readonly L11EvidencePointer[],
): L11_8InvariantResult {
  const violations: L11PersistenceIssue[] = [];
  for (const p of pointers) {
    for (const v of validateL11EvidencePointer(p)) violations.push(v);
  }
  if (violations.length > 0) {
    return fail(violations, `INV-11.8-D failed: ${violations.length} evidence violations`);
  }
  return ok(`INV-11.8-D: ${pointers.length} evidence pointers pass integrity law`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.8-E — governed read surface law
// ─────────────────────────────────────────────────────────────────

export function invariantE_governedReadSurfaces(
  requests: readonly L11ReadRequest[],
): L11_8InvariantResult {
  const violations: L11PersistenceIssue[] = [];
  for (const r of requests) {
    for (const v of validateL11ReadRequest(r)) violations.push(v);
  }
  if (violations.length > 0) {
    return fail(violations, `INV-11.8-E failed: ${violations.length} read-surface violations`);
  }
  return ok(`INV-11.8-E: ${requests.length} read requests pass governed-surface law`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.8-F — later-layer no-rebuild law
// ─────────────────────────────────────────────────────────────────

export function invariantF_laterLayerNoRebuild(
  requests: readonly L11DownstreamConsumptionRequest[],
): L11_8InvariantResult {
  const violations: L11PersistenceIssue[] = [];
  const laterLayers: ReadonlySet<L11ConsumerClass> = new Set([
    L11ConsumerClass.L12_SCENARIO_ENGINE,
    L11ConsumerClass.L13_AI_JUDGMENT_LAYER,
    L11ConsumerClass.L14_DELIVERY_LAYER,
  ]);
  for (const r of requests) {
    for (const v of validateL11DownstreamConsumption(r)) violations.push(v);
    if (laterLayers.has(r.consumer_class) && r.attempts_recompute &&
        r.read_mode !== L11ReadMode.REPLAY_HISTORICAL &&
        r.read_mode !== L11ReadMode.REPAIR_VIEW) {
      violations.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_ATTEMPT,
        `later layer ${r.consumer_class} attempted live recompute`,
        { downstream_request_id: r.request_id }));
    }
  }
  if (violations.length > 0) {
    return fail(violations, `INV-11.8-F failed: ${violations.length} downstream violations`);
  }
  return ok(`INV-11.8-F: ${requests.length} downstream requests pass no-rebuild law`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.8-G — replay and repair safety law
// ─────────────────────────────────────────────────────────────────

export function invariantG_replayAndRepairSafety(args: {
  replays: readonly L11ReplayResult[];
  repairs: readonly L11RepairRequest[];
}): L11_8InvariantResult {
  const violations: L11PersistenceIssue[] = [];
  for (const r of args.replays) {
    for (const v of validateL11ReplayResult(r)) violations.push(v);
  }
  for (const r of args.repairs) {
    for (const v of validateL11RepairRequest(r)) violations.push(v);
  }
  if (violations.length > 0) {
    return fail(violations,
      `INV-11.8-G failed: ${violations.length} replay/repair violations`);
  }
  return ok(`INV-11.8-G: ${args.replays.length} replays + ${args.repairs.length} repairs pass safety law`);
}

// ─────────────────────────────────────────────────────────────────
// INV-11.8-H — score object completeness serving law
// ─────────────────────────────────────────────────────────────────

/**
 * Asserts that every record returned (or admitted by) the current
 * read surface carries attribution, components, missing-data, formula
 * version, replay hash, and lineage.
 */
export function invariantH_scoreObjectCompleteness(
  records: readonly L11CurrentScoreRecord[],
): L11_8InvariantResult {
  const violations: L11PersistenceIssue[] = [];
  for (const r of records) {
    const ctx = { current_record_id: r?.current_record_id };
    if (!r.attribution_ref) {
      violations.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_CURRENT_ATTRIBUTION_REF_MISSING,
        'attribution_ref missing on current record served', ctx));
    }
    if (!r.component_breakdown_ref) {
      violations.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_CURRENT_COMPONENT_REF_MISSING,
        'component_breakdown_ref missing on current record served', ctx));
    }
    if (!r.missing_data_profile_ref) {
      violations.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_CURRENT_MISSING_DATA_REF_MISSING,
        'missing_data_profile_ref missing on current record served', ctx));
    }
    if (!r.formula_id || !r.formula_version) {
      violations.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_CURRENT_FORMULA_VERSION_MISSING,
        'formula_id / formula_version missing on current record served', ctx));
    }
    if (!r.replay_hash) {
      violations.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_REPLAY_HASH_MISSING,
        'replay_hash missing on current record served', ctx));
    }
    if (!Array.isArray(r.lineage_refs) || r.lineage_refs.length === 0) {
      violations.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_LINEAGE_REFS_MISSING,
        'lineage_refs missing on current record served', ctx));
    }
  }
  if (violations.length > 0) {
    return fail(violations,
      `INV-11.8-H failed: ${violations.length} score-object completeness violations`);
  }
  return ok(`INV-11.8-H: ${records.length} current records pass completeness serving law`);
}

export function runAllL11_8Invariants(args: {
  envelopes: readonly L11PersistenceEnvelope<unknown>[];
  current_records: readonly L11CurrentScoreRecord[];
  historical_facts: readonly L11HistoricalScoreFact[];
  evidence_pointers: readonly L11EvidencePointer[];
  read_requests: readonly L11ReadRequest[];
  downstream_requests: readonly L11DownstreamConsumptionRequest[];
  replays: readonly L11ReplayResult[];
  repairs: readonly L11RepairRequest[];
}): readonly { id: string; result: L11_8InvariantResult }[] {
  return [
    { id: 'INV-11.8-A', result: invariantA_l5OnlyPersistence(args.envelopes) },
    { id: 'INV-11.8-B', result: invariantB_currentAuthority(args.current_records) },
    { id: 'INV-11.8-C', result: invariantC_historicalAppendSafety(args.historical_facts) },
    { id: 'INV-11.8-D', result: invariantD_evidenceIntegrity(args.evidence_pointers) },
    { id: 'INV-11.8-E', result: invariantE_governedReadSurfaces(args.read_requests) },
    { id: 'INV-11.8-F', result: invariantF_laterLayerNoRebuild(args.downstream_requests) },
    { id: 'INV-11.8-G', result: invariantG_replayAndRepairSafety({
      replays: args.replays, repairs: args.repairs }) },
    { id: 'INV-11.8-H', result: invariantH_scoreObjectCompleteness(args.current_records) },
  ];
}

// Suppress unused sentinel
void L11ReadSurfaceId;
