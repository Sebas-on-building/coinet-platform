/**
 * L4.3 — Temporal Graph State
 *
 * Makes graph time honest. Every edge declares temporal status explicitly.
 * Staleness is first-class, expiry means historical not deleted, decay is
 * part of meaning, and the graph is reconstructable at any time T.
 *
 * Eight sections:
 *   1. Type declarations
 *   2. State store and indexes
 *   3. State creation
 *   4. Transition engine
 *   5. Decay and threshold engine
 *   6. Historical preservation
 *   7. Reconstruction APIs
 *   8. Audit and temporal narrowing
 */

import type { EdgeType, TemporalMode } from './relation-ontology';
import { getEdgeContract } from './relation-ontology';
import type { RecencyBand, EdgeRight } from './edge-confidence-model';

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 1 — TYPE DECLARATIONS                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export type TemporalEdgeStatus =
  | 'ACTIVE'
  | 'PROVISIONAL'
  | 'STALE'
  | 'EXPIRED'
  | 'HISTORICAL'
  | 'CONTESTED';

export const ALL_TEMPORAL_STATUSES: readonly TemporalEdgeStatus[] = [
  'ACTIVE', 'PROVISIONAL', 'STALE', 'EXPIRED', 'HISTORICAL', 'CONTESTED',
];

export type DecayKind = 'NONE' | 'LINEAR' | 'STEP' | 'EVENT_DRIVEN';

export type RelevanceClass = 'PERSISTENT' | 'WINDOWED' | 'EVENT_ONLY' | 'DECAYING';

export interface DecayPolicy {
  kind: DecayKind;
  halfLifeMs?: number;
}

export interface TimeBoundedRelevance {
  startAt?: string;
  endAt?: string;
  relevanceClass: RelevanceClass;
}

export interface ActiveRightsSnapshot {
  propagation: EdgeRight;
  judgmentSupport: EdgeRight;
  contextEnrichment: EdgeRight;
}

export interface HistoricalVisibility {
  preserveAfterExpiry: boolean;
  preserveForReplay: boolean;
  preserveForForensics: boolean;
}

export interface ContestedWindow {
  startedAt: string;
  reasonCodes: string[];
  conflictingEvidenceRefs: string[];
}

export interface TemporalEdgeState {
  temporalStateId: string;
  edgeId: string;
  edgeType: EdgeType;
  status: TemporalEdgeStatus;
  validFrom: string;
  validTo?: string;
  staleAt?: string;
  expireAt?: string;
  decayPolicy: DecayPolicy;
  decayFactor: number;
  timeBoundedRelevance?: TimeBoundedRelevance;
  lastConfirmedAt?: string;
  recencyBand: RecencyBand;
  activeRightsSnapshot: ActiveRightsSnapshot;
  historicalVisibility: HistoricalVisibility;
  contestedWindow?: ContestedWindow;
  replayGenerationRef?: string;
  contractVersion: string;
  priorTemporalStateRef?: string;
  temporalReasonCodes: string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
}

export interface TemporalTransitionRecord {
  transitionId: string;
  edgeId: string;
  fromStatus: TemporalEdgeStatus;
  toStatus: TemporalEdgeStatus;
  reasonCodes: string[];
  triggeredAt: string;
  triggerRefs: string[];
  replayGenerationRef?: string;
  contractVersion: string;
  schemaVersion: string;
}

export interface TemporalEdgeHistoryRecord {
  historyId: string;
  edgeId: string;
  temporalStateId: string;
  status: TemporalEdgeStatus;
  validFrom: string;
  validTo?: string;
  staleAt?: string;
  expireAt?: string;
  decayFactor?: number;
  recordedAt: string;
  replayGenerationRef?: string;
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 2 — STATE STORE AND INDEXES                                         ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const _latestByEdge = new Map<string, TemporalEdgeState>();
const _historyByEdge = new Map<string, TemporalEdgeHistoryRecord[]>();
const _transitionsByEdge = new Map<string, TemporalTransitionRecord[]>();
const _byStatus = new Map<TemporalEdgeStatus, Set<string>>();

function addToStatusIndex(edgeId: string, status: TemporalEdgeStatus): void {
  const s = _byStatus.get(status) ?? new Set();
  s.add(edgeId);
  _byStatus.set(status, s);
}

function removeFromStatusIndex(edgeId: string, status: TemporalEdgeStatus): void {
  _byStatus.get(status)?.delete(edgeId);
}

function pushHistory(state: TemporalEdgeState): void {
  const rec: TemporalEdgeHistoryRecord = {
    historyId: `hist_${state.temporalStateId}`,
    edgeId: state.edgeId,
    temporalStateId: state.temporalStateId,
    status: state.status,
    validFrom: state.validFrom,
    validTo: state.validTo,
    staleAt: state.staleAt,
    expireAt: state.expireAt,
    decayFactor: state.decayFactor,
    recordedAt: state.updatedAt,
    replayGenerationRef: state.replayGenerationRef,
  };
  const list = _historyByEdge.get(state.edgeId) ?? [];
  list.push(rec);
  _historyByEdge.set(state.edgeId, list);
}

function patchHistoryValidTo(edgeId: string, temporalStateId: string, validTo: string): void {
  const list = _historyByEdge.get(edgeId);
  if (!list) return;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].temporalStateId === temporalStateId) {
      list[i].validTo = validTo;
      break;
    }
  }
}

function pushTransition(tr: TemporalTransitionRecord): void {
  const list = _transitionsByEdge.get(tr.edgeId) ?? [];
  list.push(tr);
  _transitionsByEdge.set(tr.edgeId, list);
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 3 — STATE CREATION                                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export interface CreateTemporalStateInput {
  edgeId: string;
  edgeType: EdgeType;
  status: TemporalEdgeStatus;
  validFrom: string;
  lastConfirmedAt?: string;
  recencyBand?: RecencyBand;
  eventWindow?: { startAt?: string; endAt?: string };
  contestedWindow?: ContestedWindow;
  replayGenerationRef?: string;
}

export interface CreateTemporalStateResult {
  success: boolean;
  state?: TemporalEdgeState;
  error?: string;
}

let _stateCounter = 0;

export function createTemporalState(input: CreateTemporalStateInput): CreateTemporalStateResult {
  if (input.status === 'HISTORICAL') {
    return { success: false, error: 'HISTORICAL_NOT_VALID_INITIAL_STATE' };
  }

  const contract = getEdgeContract(input.edgeType);
  const contractVersion = contract?.contractVersion ?? 'unknown';
  const temporalMode = contract?.temporalMode ?? 'PERSISTENT';

  const now = input.validFrom;
  const staleAt = contract?.staleAfterMs
    ? new Date(new Date(input.lastConfirmedAt ?? now).getTime() + contract.staleAfterMs).toISOString()
    : undefined;
  const expireAt = contract?.expireAfterMs
    ? new Date(new Date(input.lastConfirmedAt ?? now).getTime() + contract.expireAfterMs).toISOString()
    : undefined;

  const decayPolicy = resolveDecayPolicy(temporalMode, contract?.defaultDecayPolicy);
  const relevance = resolveRelevanceClass(temporalMode, input.eventWindow);
  const rightsSnapshot = computeRightsSnapshot(input.status);

  _stateCounter++;
  const stateId = `ts_${_stateCounter}_${Date.now()}`;

  const state: TemporalEdgeState = {
    temporalStateId: stateId,
    edgeId: input.edgeId,
    edgeType: input.edgeType,
    status: input.status,
    validFrom: now,
    validTo: undefined,
    staleAt,
    expireAt,
    decayPolicy,
    decayFactor: 1.0,
    timeBoundedRelevance: relevance,
    lastConfirmedAt: input.lastConfirmedAt,
    recencyBand: input.recencyBand ?? 'FRESH',
    activeRightsSnapshot: rightsSnapshot,
    historicalVisibility: { preserveAfterExpiry: true, preserveForReplay: true, preserveForForensics: true },
    contestedWindow: input.contestedWindow,
    replayGenerationRef: input.replayGenerationRef,
    contractVersion,
    priorTemporalStateRef: undefined,
    temporalReasonCodes: [`INITIAL_${input.status}`],
    createdAt: now,
    updatedAt: now,
    schemaVersion: 'v1',
  };

  _latestByEdge.set(input.edgeId, state);
  addToStatusIndex(input.edgeId, state.status);
  pushHistory(state);

  return { success: true, state };
}

function resolveDecayPolicy(mode: TemporalMode, defaultPolicy?: string): DecayPolicy {
  if (mode === 'DECAYING') {
    if (defaultPolicy?.includes('linear')) return { kind: 'LINEAR', halfLifeMs: 7 * 24 * 60 * 60 * 1000 };
    if (defaultPolicy?.includes('step')) return { kind: 'STEP' };
    return { kind: 'LINEAR', halfLifeMs: 7 * 24 * 60 * 60 * 1000 };
  }
  if (mode === 'EVENT_BOUNDED') return { kind: 'EVENT_DRIVEN' };
  if (mode === 'ROLLING') return { kind: 'STEP' };
  return { kind: 'NONE' };
}

function resolveRelevanceClass(mode: TemporalMode, eventWindow?: { startAt?: string; endAt?: string }): TimeBoundedRelevance {
  switch (mode) {
    case 'PERSISTENT': return { relevanceClass: 'PERSISTENT' };
    case 'ROLLING': return { relevanceClass: 'WINDOWED' };
    case 'EVENT_BOUNDED': return {
      startAt: eventWindow?.startAt, endAt: eventWindow?.endAt, relevanceClass: 'EVENT_ONLY',
    };
    case 'DECAYING': return { relevanceClass: 'DECAYING' };
    case 'EPISODIC': return { relevanceClass: 'WINDOWED' };
    default: return { relevanceClass: 'PERSISTENT' };
  }
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 4 — TRANSITION ENGINE                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const LEGAL_TRANSITIONS: Record<TemporalEdgeStatus, TemporalEdgeStatus[]> = {
  PROVISIONAL: ['ACTIVE', 'STALE', 'CONTESTED'],
  ACTIVE: ['STALE', 'CONTESTED', 'EXPIRED'],
  STALE: ['ACTIVE', 'EXPIRED', 'CONTESTED'],
  EXPIRED: ['HISTORICAL'],
  CONTESTED: ['ACTIVE', 'STALE', 'EXPIRED'],
  HISTORICAL: [],
};

export interface TransitionInput {
  edgeId: string;
  toStatus: TemporalEdgeStatus;
  reasonCodes: string[];
  triggeredAt: string;
  triggerRefs?: string[];
  contestedWindow?: ContestedWindow;
  recencyBand?: RecencyBand;
}

export interface TransitionResult {
  success: boolean;
  state?: TemporalEdgeState;
  transition?: TemporalTransitionRecord;
  error?: string;
}

export function applyTemporalTransition(input: TransitionInput): TransitionResult {
  const current = _latestByEdge.get(input.edgeId);
  if (!current) return { success: false, error: 'EDGE_NOT_FOUND' };

  const allowed = LEGAL_TRANSITIONS[current.status];
  if (!allowed.includes(input.toStatus)) {
    return { success: false, error: `ILLEGAL_TRANSITION:${current.status}->${input.toStatus}` };
  }

  removeFromStatusIndex(input.edgeId, current.status);
  current.validTo = input.triggeredAt;
  patchHistoryValidTo(current.edgeId, current.temporalStateId, input.triggeredAt);

  _stateCounter++;
  const newStateId = `ts_${_stateCounter}_${Date.now()}`;

  const newState: TemporalEdgeState = {
    ...current,
    temporalStateId: newStateId,
    status: input.toStatus,
    validFrom: input.triggeredAt,
    validTo: undefined,
    recencyBand: input.recencyBand ?? current.recencyBand,
    activeRightsSnapshot: computeRightsSnapshot(input.toStatus),
    contestedWindow: input.toStatus === 'CONTESTED' ? input.contestedWindow : undefined,
    priorTemporalStateRef: current.temporalStateId,
    temporalReasonCodes: input.reasonCodes,
    updatedAt: input.triggeredAt,
  };

  const tr: TemporalTransitionRecord = {
    transitionId: `tr_${_stateCounter}_${Date.now()}`,
    edgeId: input.edgeId,
    fromStatus: current.status,
    toStatus: input.toStatus,
    reasonCodes: input.reasonCodes,
    triggeredAt: input.triggeredAt,
    triggerRefs: input.triggerRefs ?? [],
    replayGenerationRef: current.replayGenerationRef,
    contractVersion: current.contractVersion,
    schemaVersion: 'v1',
  };

  _latestByEdge.set(input.edgeId, newState);
  addToStatusIndex(input.edgeId, newState.status);
  pushHistory(newState);
  pushTransition(tr);

  return { success: true, state: newState, transition: tr };
}

export function isLegalTransition(from: TemporalEdgeStatus, to: TemporalEdgeStatus): boolean {
  return (LEGAL_TRANSITIONS[from] ?? []).includes(to);
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 5 — DECAY AND THRESHOLD ENGINE                                      ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function computeDecayFactor(state: TemporalEdgeState, currentTime: string): number {
  if (state.decayPolicy.kind === 'NONE') return 1.0;

  const now = new Date(currentTime).getTime();
  const confirmedAt = new Date(state.lastConfirmedAt ?? state.validFrom).getTime();
  const ageMs = now - confirmedAt;

  if (state.decayPolicy.kind === 'LINEAR') {
    const halfLife = state.decayPolicy.halfLifeMs ?? 7 * 24 * 60 * 60 * 1000;
    return Math.pow(0.5, ageMs / halfLife);
  }

  if (state.decayPolicy.kind === 'STEP') {
    const staleMs = state.staleAt ? new Date(state.staleAt).getTime() - confirmedAt : Infinity;
    if (ageMs < staleMs) return 1.0;
    return 0.3;
  }

  if (state.decayPolicy.kind === 'EVENT_DRIVEN') {
    const endAt = state.timeBoundedRelevance?.endAt;
    if (!endAt) return 1.0;
    const endTime = new Date(endAt).getTime();
    if (now <= endTime) return 1.0;
    const overMs = now - endTime;
    return Math.max(0, 1.0 - (overMs / (14 * 24 * 60 * 60 * 1000)));
  }

  return 1.0;
}

export function computeStaleAt(edgeType: EdgeType, lastConfirmedAt: string): string | undefined {
  const contract = getEdgeContract(edgeType);
  if (!contract?.staleAfterMs) return undefined;
  return new Date(new Date(lastConfirmedAt).getTime() + contract.staleAfterMs).toISOString();
}

export function computeExpireAt(edgeType: EdgeType, lastConfirmedAt: string): string | undefined {
  const contract = getEdgeContract(edgeType);
  if (!contract?.expireAfterMs) return undefined;
  return new Date(new Date(lastConfirmedAt).getTime() + contract.expireAfterMs).toISOString();
}

export interface TemporalEvaluationInput {
  edgeId: string;
  recencyBand: RecencyBand;
  lastConfirmedAt: string;
  currentTime: string;
  eventWindow?: { startAt?: string; endAt?: string };
  conflictSignal?: boolean;
  conflictRefs?: string[];
}

export function evaluateTemporalTransition(input: TemporalEvaluationInput): TransitionInput | null {
  const current = _latestByEdge.get(input.edgeId);
  if (!current) return null;

  const now = new Date(input.currentTime).getTime();

  if (input.conflictSignal && current.status !== 'CONTESTED' && current.status !== 'EXPIRED' && current.status !== 'HISTORICAL') {
    return {
      edgeId: input.edgeId, toStatus: 'CONTESTED',
      reasonCodes: ['CONFLICT_DETECTED'], triggeredAt: input.currentTime,
      contestedWindow: {
        startedAt: input.currentTime, reasonCodes: ['CONFLICT_DETECTED'],
        conflictingEvidenceRefs: input.conflictRefs ?? [],
      },
    };
  }

  if (current.expireAt && now >= new Date(current.expireAt).getTime()) {
    if (current.status === 'ACTIVE' || current.status === 'STALE' || current.status === 'PROVISIONAL' || current.status === 'CONTESTED') {
      const targetStatus = current.status === 'PROVISIONAL' ? 'STALE' : 'EXPIRED';
      return {
        edgeId: input.edgeId, toStatus: targetStatus as TemporalEdgeStatus,
        reasonCodes: ['EXPIRY_THRESHOLD_CROSSED'], triggeredAt: input.currentTime,
      };
    }
  }

  if (current.staleAt && now >= new Date(current.staleAt).getTime()) {
    if (current.status === 'ACTIVE' || current.status === 'PROVISIONAL') {
      return {
        edgeId: input.edgeId, toStatus: 'STALE',
        reasonCodes: ['STALE_THRESHOLD_CROSSED'], triggeredAt: input.currentTime,
        recencyBand: 'STALE',
      };
    }
  }

  if (current.status === 'EXPIRED') {
    return {
      edgeId: input.edgeId, toStatus: 'HISTORICAL',
      reasonCodes: ['EXPIRED_TO_HISTORICAL'], triggeredAt: input.currentTime,
    };
  }

  if (input.recencyBand === 'FRESH' && current.status === 'STALE') {
    return {
      edgeId: input.edgeId, toStatus: 'ACTIVE',
      reasonCodes: ['FRESHNESS_RESTORED'], triggeredAt: input.currentTime,
      recencyBand: 'FRESH',
    };
  }

  if (input.recencyBand === 'FRESH' && current.status === 'PROVISIONAL') {
    return {
      edgeId: input.edgeId, toStatus: 'ACTIVE',
      reasonCodes: ['PROVISIONAL_MATURED'], triggeredAt: input.currentTime,
      recencyBand: 'FRESH',
    };
  }

  return null;
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 6 — HISTORICAL PRESERVATION                                         ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function getTemporalHistoryForEdge(edgeId: string): readonly TemporalEdgeHistoryRecord[] {
  return _historyByEdge.get(edgeId) ?? [];
}

export function getTransitionsForEdge(edgeId: string): readonly TemporalTransitionRecord[] {
  return _transitionsByEdge.get(edgeId) ?? [];
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 7 — RECONSTRUCTION APIs                                             ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function getTemporalStateForEdge(edgeId: string): TemporalEdgeState | undefined {
  return _latestByEdge.get(edgeId);
}

export function getTemporalStateForEdgeAtTime(
  edgeId: string, timestamp: string,
): TemporalEdgeHistoryRecord | undefined {
  const history = _historyByEdge.get(edgeId) ?? [];
  const t = new Date(timestamp).getTime();
  for (let i = history.length - 1; i >= 0; i--) {
    const rec = history[i];
    const from = new Date(rec.validFrom).getTime();
    const to = rec.validTo ? new Date(rec.validTo).getTime() : Infinity;
    if (t >= from && t < to) return rec;
  }
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (!last.validTo && new Date(last.validFrom).getTime() <= t) return last;
  }
  return undefined;
}

export function getActiveEdgesAtTime(timestamp: string): readonly TemporalEdgeHistoryRecord[] {
  return getEdgesByTemporalStatusAtTime('ACTIVE', timestamp);
}

export function getEdgesByTemporalStatusAtTime(
  status: TemporalEdgeStatus, timestamp: string,
): readonly TemporalEdgeHistoryRecord[] {
  const results: TemporalEdgeHistoryRecord[] = [];
  const t = new Date(timestamp).getTime();

  for (const [, history] of _historyByEdge) {
    for (const rec of history) {
      if (rec.status !== status) continue;
      const from = new Date(rec.validFrom).getTime();
      const to = rec.validTo ? new Date(rec.validTo).getTime() : Infinity;
      if (t >= from && t < to) { results.push(rec); break; }
    }
  }
  return results;
}

export function getEdgeIdsByStatus(status: TemporalEdgeStatus): readonly string[] {
  return [...(_byStatus.get(status) ?? [])];
}

export function reconstructGraphStateAtTime(
  timestamp: string,
  _replayGeneration?: string,
): {
  active: TemporalEdgeHistoryRecord[];
  stale: TemporalEdgeHistoryRecord[];
  contested: TemporalEdgeHistoryRecord[];
  provisional: TemporalEdgeHistoryRecord[];
  expired: TemporalEdgeHistoryRecord[];
  historical: TemporalEdgeHistoryRecord[];
} {
  return {
    active: [...getEdgesByTemporalStatusAtTime('ACTIVE', timestamp)],
    stale: [...getEdgesByTemporalStatusAtTime('STALE', timestamp)],
    contested: [...getEdgesByTemporalStatusAtTime('CONTESTED', timestamp)],
    provisional: [...getEdgesByTemporalStatusAtTime('PROVISIONAL', timestamp)],
    expired: [...getEdgesByTemporalStatusAtTime('EXPIRED', timestamp)],
    historical: [...getEdgesByTemporalStatusAtTime('HISTORICAL', timestamp)],
  };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 8 — AUDIT AND TEMPORAL NARROWING                                    ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function computeRightsSnapshot(status: TemporalEdgeStatus): ActiveRightsSnapshot {
  switch (status) {
    case 'ACTIVE':
      return { propagation: 'ALLOW', judgmentSupport: 'ALLOW', contextEnrichment: 'ALLOW' };
    case 'PROVISIONAL':
      return { propagation: 'CONDITIONAL', judgmentSupport: 'CONDITIONAL', contextEnrichment: 'ALLOW' };
    case 'STALE':
      return { propagation: 'DENY', judgmentSupport: 'CONDITIONAL', contextEnrichment: 'ALLOW_WITH_SCAR' };
    case 'EXPIRED':
      return { propagation: 'DENY', judgmentSupport: 'DENY', contextEnrichment: 'CONDITIONAL' };
    case 'HISTORICAL':
      return { propagation: 'DENY', judgmentSupport: 'DENY', contextEnrichment: 'DENY' };
    case 'CONTESTED':
      return { propagation: 'DENY', judgmentSupport: 'CONDITIONAL', contextEnrichment: 'ALLOW_WITH_SCAR' };
  }
}

export function getTemporalRightsNarrowing(status: TemporalEdgeStatus): ActiveRightsSnapshot {
  return computeRightsSnapshot(status);
}

export interface TemporalTransitionEvent {
  eventType: 'TEMPORAL_TRANSITION';
  edgeId: string;
  fromStatus: TemporalEdgeStatus;
  toStatus: TemporalEdgeStatus;
  reasonCodes: string[];
  timestamp: string;
}

export function emitTemporalTransitionEvent(tr: TemporalTransitionRecord): TemporalTransitionEvent {
  return {
    eventType: 'TEMPORAL_TRANSITION',
    edgeId: tr.edgeId,
    fromStatus: tr.fromStatus,
    toStatus: tr.toStatus,
    reasonCodes: tr.reasonCodes,
    timestamp: tr.triggeredAt,
  };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  RESET                                                                       ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function resetTemporalGraphState(): void {
  _latestByEdge.clear(); _historyByEdge.clear();
  _transitionsByEdge.clear(); _byStatus.clear();
  _stateCounter = 0;
}
