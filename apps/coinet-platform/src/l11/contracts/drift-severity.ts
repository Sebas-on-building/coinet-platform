/**
 * L11.7 — Drift Severity (§11.7.6)
 *
 * Severity ladder used by drift reports. Each severity has an
 * integer rank used to compare reports and to enforce
 * severity/action consistency.
 */

export enum L11DriftSeverity {
  INFO = 'INFO',
  WATCH = 'WATCH',
  MATERIAL = 'MATERIAL',
  SEVERE = 'SEVERE',
  CRITICAL = 'CRITICAL',
}

export const ALL_L11_DRIFT_SEVERITIES: readonly L11DriftSeverity[] =
  Object.values(L11DriftSeverity);

export const L11_DRIFT_SEVERITY_RANK:
  Readonly<Record<L11DriftSeverity, number>> = {
  [L11DriftSeverity.INFO]: 0,
  [L11DriftSeverity.WATCH]: 1,
  [L11DriftSeverity.MATERIAL]: 2,
  [L11DriftSeverity.SEVERE]: 3,
  [L11DriftSeverity.CRITICAL]: 4,
};

export function getL11DriftSeverityRank(s: L11DriftSeverity): number {
  return L11_DRIFT_SEVERITY_RANK[s];
}

export function isL11DriftSeverityAtLeast(
  observed: L11DriftSeverity,
  threshold: L11DriftSeverity,
): boolean {
  return L11_DRIFT_SEVERITY_RANK[observed] >=
    L11_DRIFT_SEVERITY_RANK[threshold];
}

export function maxL11DriftSeverity(
  ...severities: L11DriftSeverity[]
): L11DriftSeverity {
  if (severities.length === 0) return L11DriftSeverity.INFO;
  return severities.reduce((a, b) =>
    L11_DRIFT_SEVERITY_RANK[a] >= L11_DRIFT_SEVERITY_RANK[b] ? a : b);
}
