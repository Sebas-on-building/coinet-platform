/**
 * L6.2 — Transformation Class Contract
 *
 * §6.2.6.1 — No hidden interpretation law. Every primitive must declare its
 * exact transformation class. Free-form "compute logic" is not permitted.
 */

export enum L6TransformationClass {
  IDENTITY_PROJECTION = 'IDENTITY_PROJECTION',
  WINDOWED_AGGREGATION = 'WINDOWED_AGGREGATION',
  Z_SCORE_NORMALIZATION = 'Z_SCORE_NORMALIZATION',
  PERCENTILE_NORMALIZATION = 'PERCENTILE_NORMALIZATION',
  RATIO_OR_SPREAD = 'RATIO_OR_SPREAD',
  DETERMINISTIC_COMPOSITE = 'DETERMINISTIC_COMPOSITE',
  DIVERGENCE = 'DIVERGENCE',
  THRESHOLD_CROSS_DETECTION = 'THRESHOLD_CROSS_DETECTION',
  CHANGE_POINT_DETECTION = 'CHANGE_POINT_DETECTION',
  CLUSTER_DETECTION = 'CLUSTER_DETECTION',
  SCHEDULED_ANCHOR = 'SCHEDULED_ANCHOR',
  LIFECYCLE_TRANSITION = 'LIFECYCLE_TRANSITION',
  RISK_DELTA_DETECTION = 'RISK_DELTA_DETECTION',
  CROSS_SOURCE_ANOMALY = 'CROSS_SOURCE_ANOMALY',
  STATE_FLAG_EVALUATION = 'STATE_FLAG_EVALUATION',
}

export const ALL_TRANSFORMATION_CLASSES: readonly L6TransformationClass[] = Object.values(L6TransformationClass);

export const FEATURE_ONLY_TRANSFORMATIONS: readonly L6TransformationClass[] = [
  L6TransformationClass.IDENTITY_PROJECTION,
  L6TransformationClass.WINDOWED_AGGREGATION,
  L6TransformationClass.Z_SCORE_NORMALIZATION,
  L6TransformationClass.PERCENTILE_NORMALIZATION,
  L6TransformationClass.RATIO_OR_SPREAD,
  L6TransformationClass.DETERMINISTIC_COMPOSITE,
  L6TransformationClass.DIVERGENCE,
  L6TransformationClass.STATE_FLAG_EVALUATION,
];

export const EVENT_ONLY_TRANSFORMATIONS: readonly L6TransformationClass[] = [
  L6TransformationClass.THRESHOLD_CROSS_DETECTION,
  L6TransformationClass.CHANGE_POINT_DETECTION,
  L6TransformationClass.CLUSTER_DETECTION,
  L6TransformationClass.SCHEDULED_ANCHOR,
  L6TransformationClass.LIFECYCLE_TRANSITION,
  L6TransformationClass.RISK_DELTA_DETECTION,
  L6TransformationClass.CROSS_SOURCE_ANOMALY,
];

export function isFeatureTransformation(cls: L6TransformationClass): boolean {
  return FEATURE_ONLY_TRANSFORMATIONS.includes(cls);
}

export function isEventTransformation(cls: L6TransformationClass): boolean {
  return EVENT_ONLY_TRANSFORMATIONS.includes(cls);
}
