/**
 * Layer 2 — Connector Incidents
 *
 * Clusters ingress failures by provider, route mode, source class,
 * field family, and request kind. Tracks fallback frequency, semantic-
 * loss severity, recurring blind spots, and chronic ingress fragility.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INCIDENT RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export type IncidentKind =
  | 'PROVIDER_FAILURE'
  | 'ROUTE_DEGRADATION'
  | 'FALLBACK_TRIGGERED'
  | 'SEMANTIC_LOSS'
  | 'FRESHNESS_BREACH'
  | 'LINEAGE_BREAK'
  | 'REPLAY_DRIFT'
  | 'OWNER_PATH_LOST'
  | 'BLIND_SPOT_CLUSTER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ConnectorIncident {
  incidentId: string;
  kind: IncidentKind;
  severity: IncidentSeverity;
  providerId?: string;
  sourceClass?: string;
  fieldFamily?: string;
  routeMode?: string;
  requestKind?: string;
  detail: string;
  occurredAt: string;
  relatedBlindSpotIds: string[];
  relatedEnvelopeIds: string[];
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

const incidents: ConnectorIncident[] = [];
let nextId = 1;

export function reportIncident(
  kind: IncidentKind,
  severity: IncidentSeverity,
  detail: string,
  fields: Partial<Omit<ConnectorIncident, 'incidentId' | 'kind' | 'severity' | 'detail' | 'occurredAt'>>,
): ConnectorIncident {
  const incident: ConnectorIncident = {
    incidentId: `ci-${nextId++}`,
    kind,
    severity,
    detail,
    occurredAt: new Date().toISOString(),
    relatedBlindSpotIds: fields.relatedBlindSpotIds ?? [],
    relatedEnvelopeIds: fields.relatedEnvelopeIds ?? [],
    metadata: fields.metadata ?? {},
    providerId: fields.providerId,
    sourceClass: fields.sourceClass,
    fieldFamily: fields.fieldFamily,
    routeMode: fields.routeMode,
    requestKind: fields.requestKind,
  };
  incidents.push(incident);
  return incident;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getIncidents(): ConnectorIncident[] {
  return [...incidents];
}

export function getIncidentsByKind(kind: IncidentKind): ConnectorIncident[] {
  return incidents.filter(i => i.kind === kind);
}

export function getIncidentsByProvider(pid: string): ConnectorIncident[] {
  return incidents.filter(i => i.providerId === pid);
}

export function getIncidentsByFieldFamily(ff: string): ConnectorIncident[] {
  return incidents.filter(i => i.fieldFamily === ff);
}

export function getIncidentsBySeverity(sev: IncidentSeverity): ConnectorIncident[] {
  return incidents.filter(i => i.severity === sev);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTERING
// ═══════════════════════════════════════════════════════════════════════════════

export interface IncidentCluster {
  key: string;
  count: number;
  severity: IncidentSeverity;
  kinds: IncidentKind[];
  providers: string[];
  fieldFamilies: string[];
  routeModes: string[];
  latest: string;
}

export function clusterIncidents(): IncidentCluster[] {
  const groups = new Map<string, ConnectorIncident[]>();

  for (const inc of incidents) {
    const key = [inc.providerId ?? '*', inc.fieldFamily ?? '*', inc.routeMode ?? '*'].join('::');
    const arr = groups.get(key) ?? [];
    arr.push(inc);
    groups.set(key, arr);
  }

  const clusters: IncidentCluster[] = [];
  for (const [key, incs] of groups) {
    const worstSeverity = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as IncidentSeverity[])
      .find(s => incs.some(i => i.severity === s)) ?? 'LOW';

    clusters.push({
      key,
      count: incs.length,
      severity: worstSeverity,
      kinds: [...new Set(incs.map(i => i.kind))],
      providers: [...new Set(incs.map(i => i.providerId).filter(Boolean) as string[])],
      fieldFamilies: [...new Set(incs.map(i => i.fieldFamily).filter(Boolean) as string[])],
      routeModes: [...new Set(incs.map(i => i.routeMode).filter(Boolean) as string[])],
      latest: incs.reduce((a, b) => a.occurredAt > b.occurredAt ? a : b).occurredAt,
    });
  }

  return clusters.sort((a, b) => b.count - a.count);
}

export interface IncidentSummary {
  total: number;
  bySeverity: Record<string, number>;
  byKind: Record<string, number>;
  topProviders: Array<{ providerId: string; count: number }>;
  topFieldFamilies: Array<{ fieldFamily: string; count: number }>;
  clusterCount: number;
}

export function summarizeIncidents(): IncidentSummary {
  const bySev: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  const provC: Record<string, number> = {};
  const ffC: Record<string, number> = {};

  for (const inc of incidents) {
    bySev[inc.severity] = (bySev[inc.severity] || 0) + 1;
    byKind[inc.kind] = (byKind[inc.kind] || 0) + 1;
    if (inc.providerId) provC[inc.providerId] = (provC[inc.providerId] || 0) + 1;
    if (inc.fieldFamily) ffC[inc.fieldFamily] = (ffC[inc.fieldFamily] || 0) + 1;
  }

  const sortDesc = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]);

  return {
    total: incidents.length,
    bySeverity: bySev,
    byKind,
    topProviders: sortDesc(provC).slice(0, 10).map(([providerId, count]) => ({ providerId, count })),
    topFieldFamilies: sortDesc(ffC).slice(0, 10).map(([fieldFamily, count]) => ({ fieldFamily, count })),
    clusterCount: clusterIncidents().length,
  };
}

export function resetIncidents(): void {
  incidents.length = 0;
  nextId = 1;
}
