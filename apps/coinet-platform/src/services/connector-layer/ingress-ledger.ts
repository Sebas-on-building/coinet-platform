/**
 * Layer 2 — Ingress Ledger
 *
 * Logs every ingress event of consequence so the control plane can
 * surface: top failing field families, highest blind-spot emitters,
 * route planner misses, and most replay-fragile paths.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type IngressEventKind =
  | 'ENVELOPE_ACCEPTED'
  | 'ENVELOPE_REJECTED'
  | 'ENVELOPE_QUARANTINED'
  | 'ROUTE_SELECTED'
  | 'ROUTE_DEGRADED'
  | 'ROUTE_FAILOVER'
  | 'ROUTE_RESTORED'
  | 'FRESHNESS_SLIPPED'
  | 'FRESHNESS_UNUSABLE'
  | 'DEDUP_ABSORBED'
  | 'CORRECTION_APPLIED'
  | 'REPLAY_ISOLATED'
  | 'BLIND_SPOT_EMITTED'
  | 'LINEAGE_INCOMPLETE'
  | 'OWNER_UNAVAILABLE'
  | 'FALLBACK_SEMANTIC_LOSS';

export interface IngressLedgerEntry {
  id: string;
  timestamp: string;
  kind: IngressEventKind;
  requestId?: string;
  traceId?: string;
  envelopeId?: string;
  routeId?: string;
  providerId?: string;
  sourceClass?: string;
  fieldFamily?: string;
  routeMode?: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  detail: string;
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER STORE
// ═══════════════════════════════════════════════════════════════════════════════

const ledger: IngressLedgerEntry[] = [];
let nextId = 1;

export function logIngressEvent(
  kind: IngressEventKind,
  detail: string,
  fields: Omit<IngressLedgerEntry, 'id' | 'timestamp' | 'kind' | 'detail'>,
): IngressLedgerEntry {
  const entry: IngressLedgerEntry = {
    id: `il-${nextId++}`,
    timestamp: new Date().toISOString(),
    kind,
    detail,
    ...fields,
  };
  ledger.push(entry);
  return entry;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getLedger(): IngressLedgerEntry[] {
  return [...ledger];
}

export function getLedgerSize(): number {
  return ledger.length;
}

export function getLedgerByKind(kind: IngressEventKind): IngressLedgerEntry[] {
  return ledger.filter(e => e.kind === kind);
}

export function getLedgerByFieldFamily(ff: string): IngressLedgerEntry[] {
  return ledger.filter(e => e.fieldFamily === ff);
}

export function getLedgerByProvider(pid: string): IngressLedgerEntry[] {
  return ledger.filter(e => e.providerId === pid);
}

export function getLedgerBySeverity(sev: IngressLedgerEntry['severity']): IngressLedgerEntry[] {
  return ledger.filter(e => e.severity === sev);
}

export function getLedgerSince(since: string): IngressLedgerEntry[] {
  return ledger.filter(e => e.timestamp >= since);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface IngressLedgerSummary {
  totalEvents: number;
  byKind: Record<string, number>;
  bySeverity: Record<string, number>;
  topFieldFamilies: Array<{ fieldFamily: string; count: number }>;
  topProviders: Array<{ providerId: string; count: number }>;
  blindSpotCount: number;
  failoverCount: number;
  rejectionCount: number;
}

export function summarizeLedger(): IngressLedgerSummary {
  const byKind: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const ffCounts: Record<string, number> = {};
  const provCounts: Record<string, number> = {};

  for (const e of ledger) {
    byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
    if (e.fieldFamily) ffCounts[e.fieldFamily] = (ffCounts[e.fieldFamily] || 0) + 1;
    if (e.providerId) provCounts[e.providerId] = (provCounts[e.providerId] || 0) + 1;
  }

  const sortDesc = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]);

  return {
    totalEvents: ledger.length,
    byKind,
    bySeverity,
    topFieldFamilies: sortDesc(ffCounts).slice(0, 10).map(([fieldFamily, count]) => ({ fieldFamily, count })),
    topProviders: sortDesc(provCounts).slice(0, 10).map(([providerId, count]) => ({ providerId, count })),
    blindSpotCount: byKind['BLIND_SPOT_EMITTED'] || 0,
    failoverCount: byKind['ROUTE_FAILOVER'] || 0,
    rejectionCount: byKind['ENVELOPE_REJECTED'] || 0,
  };
}

export function resetLedger(): void {
  ledger.length = 0;
  nextId = 1;
}
