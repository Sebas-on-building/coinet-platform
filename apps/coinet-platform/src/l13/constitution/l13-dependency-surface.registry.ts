/**
 * L13.1 — Dependency Surface Registry (Runtime)
 *
 * §13.1.7 — Runtime registry that validates every L13 dependency
 * access. A code path that uses an unregistered surface, references
 * a late-layer (L14+) surface, attempts a raw lower-layer rebuild
 * bypass, consumes a contradiction-aware surface without contradiction
 * posture, consumes an L11 score without the full attribution /
 * missing-data / drift / restriction context bundle, or consumes an
 * L12 scenario without the triggers / invalidations / path
 * confidence / restrictions bundle is rejected at validator time.
 */

import {
  L13_DEPENDENCY_SURFACES,
  L13_L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS,
  L13_L12_SCENARIO_BUNDLE_SURFACE_IDS,
  isL13RegisteredDependency,
  type L13DependencySurfaceDescriptor,
} from '../contracts/l13-dependency-surfaces';
import {
  L13AllowedCapability,
  L13DependencyLayer,
} from '../contracts/l13-constitutional-types';
import {
  L13ConstitutionalError,
  L13ConstitutionalViolationCode,
} from '../contracts/l13-violation-codes';

export interface L13DependencyAccessRequest {
  readonly surfaceId: string;
  readonly capability: L13AllowedCapability;
  readonly requestor: string;
  readonly timestamp: string;

  /** §13.1.3.5 — Honour L7 contradiction posture for contradiction-aware surfaces. */
  readonly contradictionPostureProvided?: boolean;
  /** §13.1.3.6 — Honour L8 regime posture. */
  readonly regimePostureProvided?: boolean;
  /** §13.1.3.7 — Honour L9 sequence posture. */
  readonly sequencePostureProvided?: boolean;
  /** §13.1.3.8 — Honour L10 hypothesis posture. */
  readonly hypothesisPostureProvided?: boolean;

  /** §13.1.3.9 — Full L11 score-context bundle declaration. */
  readonly consumesFullScoreContextBundle?: boolean;
  readonly l11ConsumedBundle?: readonly string[];

  /** §13.1.3.10 — Full L12 scenario bundle declaration. */
  readonly consumesFullScenarioBundle?: boolean;
  readonly l12ConsumedBundle?: readonly string[];

  /** Honoured restriction profiles for restriction-required surfaces. */
  readonly restrictionsHonoured?: boolean;
}

export interface L13DependencyAccessResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly surface: L13DependencySurfaceDescriptor | null;
  readonly violationCode: L13ConstitutionalViolationCode | null;
}

/**
 * §13.1.7 — Reject any non-L13 dependency layer string. Anything
 * starting with "l1[3-9]:" or "l[2-9][0-9]:" is a late-layer
 * dependency. Anything matching "raw_*" is a raw lower-layer bypass.
 */
function classifyUnregistered(
  surfaceId: string,
): L13ConstitutionalViolationCode {
  const lower = surfaceId.toLowerCase();
  if (/^l1[3-9]:/.test(lower) || /^l[2-9][0-9]:/.test(lower)) {
    return L13ConstitutionalViolationCode.L13C_LATE_LAYER_DEPENDENCY;
  }
  if (
    lower.startsWith('raw_') ||
    lower.startsWith('raw:') ||
    lower.includes(':raw_') ||
    lower.includes('_raw_') ||
    lower.includes('rebuild_')
  ) {
    return L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS;
  }
  return L13ConstitutionalViolationCode.L13C_DEPENDENCY_SURFACE_UNREGISTERED;
}

export function requestL13DependencyAccess(
  req: L13DependencyAccessRequest,
): L13DependencyAccessResult {
  if (!isL13RegisteredDependency(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Surface "${req.surfaceId}" is not registered in L13 dependency registry`,
      surface: null,
      violationCode: classifyUnregistered(req.surfaceId),
    };
  }

  const surface = L13_DEPENDENCY_SURFACES.find(
    s => s.surfaceId === req.surfaceId,
  )!;

  if (!surface.allowedL13Uses.includes(req.capability)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason:
        `Surface "${req.surfaceId}" does not permit capability ` +
        `${req.capability}. Allowed: ${surface.allowedL13Uses.join(', ')}`,
      surface,
      violationCode:
        L13ConstitutionalViolationCode.L13C_ILLEGAL_DEPENDENCY_USAGE,
    };
  }

  if (
    surface.contradictionAware &&
    req.contradictionPostureProvided !== true
  ) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: 'Contradiction posture not declared for contradiction-aware surface',
      surface,
      violationCode:
        L13ConstitutionalViolationCode.L13C_HIDES_CONTRADICTION,
    };
  }

  if (surface.restrictionRequired && req.restrictionsHonoured !== true) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: 'Restriction profile not honoured',
      surface,
      violationCode:
        L13ConstitutionalViolationCode.L13C_IGNORES_RESTRICTION,
    };
  }

  if (surface.regimeAware && req.regimePostureProvided !== true) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: 'Regime posture not declared for regime-aware surface',
      surface,
      violationCode:
        L13ConstitutionalViolationCode.L13C_REBUILDS_REGIME,
    };
  }

  if (surface.sequenceAware && req.sequencePostureProvided !== true) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: 'Sequence posture not declared for sequence-aware surface',
      surface,
      violationCode:
        L13ConstitutionalViolationCode.L13C_REBUILDS_SEQUENCE,
    };
  }

  if (
    surface.hypothesisAware &&
    req.hypothesisPostureProvided !== true
  ) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: 'Hypothesis posture not declared for hypothesis-aware surface',
      surface,
      violationCode:
        L13ConstitutionalViolationCode.L13C_REBUILDS_HYPOTHESIS,
    };
  }

  if (
    surface.sourceLayer === L13DependencyLayer.L11_SCORE &&
    surface.scoreContextAware
  ) {
    if (req.consumesFullScoreContextBundle !== true) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          'L11 score consumed without declaring the full score-context bundle',
        surface,
        violationCode:
          L13ConstitutionalViolationCode.L13C_SCORE_AS_RECOMMENDATION,
      };
    }
    const bundle = req.l11ConsumedBundle ?? [];
    const missing = L13_L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS.filter(
      id => !bundle.includes(id),
    );
    if (missing.length > 0) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason: `L11 score-context bundle incomplete; missing: ${missing.join(', ')}`,
        surface,
        violationCode:
          L13ConstitutionalViolationCode.L13C_SCORE_AS_RECOMMENDATION,
      };
    }
  }

  if (
    surface.sourceLayer === L13DependencyLayer.L12_SCENARIO &&
    surface.scenarioAware
  ) {
    if (req.consumesFullScenarioBundle !== true) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          'L12 scenario consumed without declaring the full scenario bundle (triggers / invalidations / path confidence / restrictions)',
        surface,
        violationCode:
          L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_INVALIDATION_DISCLOSURE,
      };
    }
    const bundle = req.l12ConsumedBundle ?? [];
    const missing = L13_L12_SCENARIO_BUNDLE_SURFACE_IDS.filter(
      id => !bundle.includes(id),
    );
    if (missing.length > 0) {
      const missesTriggers = missing.includes('l12:scenario_triggers');
      const missesInvalidations = missing.includes(
        'l12:scenario_invalidations',
      );
      const code = missesInvalidations
        ? L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_INVALIDATION_DISCLOSURE
        : missesTriggers
          ? L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_TRIGGER_DISCLOSURE
          : L13ConstitutionalViolationCode.L13C_REBUILDS_SCENARIO;
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason: `L12 scenario bundle incomplete; missing: ${missing.join(', ')}`,
        surface,
        violationCode: code,
      };
    }
  }

  return {
    surfaceId: req.surfaceId,
    allowed: true,
    reason: 'Access legal',
    surface,
    violationCode: null,
  };
}

export function assertL13DependencyAccess(
  req: L13DependencyAccessRequest,
): void {
  const r = requestL13DependencyAccess(req);
  if (!r.allowed) {
    throw new L13ConstitutionalError(
      r.violationCode ??
        L13ConstitutionalViolationCode.L13C_ILLEGAL_DEPENDENCY_USAGE,
      r.reason,
      { surfaceId: req.surfaceId, requestor: req.requestor },
    );
  }
}
