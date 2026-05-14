/**
 * L11.1 — Dependency Surface Registry (Runtime)
 *
 * §11.1.6 / §11.1.14 — Runtime registry that validates every dependency
 * access. Any code path using an unregistered surface, misusing a
 * surface, consuming a restriction-aware L7/L8/L9/L10 surface outside
 * its declared rights, or consuming a regime-, sequence-, or
 * hypothesis-posture-aware surface without declaring posture
 * awareness, is blocked at validator time.
 */

import {
  L11_DEPENDENCY_SURFACES,
  isL11RegisteredDependency,
  isL11UsableFor,
  type L11DependencySurfaceDescriptor,
} from '../contracts/l11-dependency-surfaces';
import type { L11DependencyUsability } from '../contracts/l11-constitutional-types';
import {
  L11ConstitutionalError,
  L11ConstitutionalViolationCode,
} from '../contracts/l11-violation-codes';

export interface L11DependencyAccessRequest {
  readonly surfaceId: string;
  readonly requestedUsage: L11DependencyUsability;
  readonly requestor: string;
  readonly timestamp: string;
  /**
   * §11.1.6 / §11.1.11 — For restriction-aware surfaces (L7/L8/L9/L10
   * stable handoffs) the caller must declare the restriction posture
   * attached to the object being consumed.
   */
  readonly restrictionPosture?: {
    readonly allowsSupportInput: boolean;
    readonly allowsConfidenceInput: boolean;
    readonly allowsRegimeConditioning: boolean;
    readonly allowsSequenceConditioning: boolean;
    readonly allowsHypothesisConditioning: boolean;
    readonly allowsRankingInput: boolean;
    readonly allowsAttributionInput: boolean;
    readonly allowsCalibrationInput: boolean;
  };
  /** §11.1.6.7 — Regime-posture-aware surfaces (L8). */
  readonly honoursRegimePosture?: boolean;
  /** §11.1.6.8 — Sequence-posture-aware surfaces (L9). */
  readonly honoursSequencePosture?: boolean;
  /** §11.1.6.9 — Hypothesis-posture-aware surfaces (L10). */
  readonly honoursHypothesisPosture?: boolean;
}

export interface L11DependencyAccessResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly surface: L11DependencySurfaceDescriptor | null;
  readonly violationCode: L11ConstitutionalViolationCode | null;
}

export function requestL11DependencyAccess(
  req: L11DependencyAccessRequest,
): L11DependencyAccessResult {
  if (!isL11RegisteredDependency(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Surface "${req.surfaceId}" is not registered in L11DependencySurfaceRegistry`,
      surface: null,
      violationCode: L11ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
    };
  }

  if (!isL11UsableFor(req.surfaceId, req.requestedUsage)) {
    const surface = L11_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason:
        `Surface "${req.surfaceId}" is not usable for ${req.requestedUsage}. ` +
        `Allowed: ${surface.usableFor.join(', ')}`,
      surface,
      violationCode: L11ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
    };
  }

  const surface = L11_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;

  // §11.1.6 / §11.1.11 — Restriction-aware L7/L8/L9/L10 surfaces.
  if (surface.restrictionAware) {
    const p = req.restrictionPosture;
    if (!p) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason: `Surface "${req.surfaceId}" is restriction-aware; request must declare a restriction posture.`,
        surface,
        violationCode: L11ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
      };
    }
    const needs = req.requestedUsage;
    const coveredByPosture =
      (needs === 'SUPPORT_INPUT' && p.allowsSupportInput) ||
      (needs === 'CONFIDENCE_INPUT' && p.allowsConfidenceInput) ||
      (needs === 'REGIME_CONDITIONING' && p.allowsRegimeConditioning) ||
      (needs === 'SEQUENCE_CONDITIONING' && p.allowsSequenceConditioning) ||
      (needs === 'HYPOTHESIS_CONDITIONING' && p.allowsHypothesisConditioning) ||
      (needs === 'RANKING_INPUT' && p.allowsRankingInput) ||
      (needs === 'ATTRIBUTION_INPUT' && p.allowsAttributionInput) ||
      (needs === 'CALIBRATION_INPUT' && p.allowsCalibrationInput) ||
      needs === 'EVIDENCE_ONLY' ||
      needs === 'CONTEXT_ONLY' ||
      needs === 'PERSISTENCE_PATH' ||
      needs === 'REPLAY_REFERENCE' ||
      needs === 'REPAIR_REFERENCE';
    if (!coveredByPosture) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason: `Usage ${needs} of "${req.surfaceId}" exceeds declared restriction posture`,
        surface,
        violationCode: L11ConstitutionalViolationCode.RESTRICTION_BYPASS,
      };
    }
  }

  // §11.1.6.7 — Regime-posture-aware surfaces (L8).
  if (surface.regimePostureAware) {
    const regimeSensitive: ReadonlyArray<L11DependencyUsability> = [
      'REGIME_CONDITIONING',
      'CONFIDENCE_INPUT',
      'SUPPORT_INPUT',
    ];
    if (
      regimeSensitive.includes(req.requestedUsage) &&
      req.honoursRegimePosture !== true
    ) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          `Surface "${req.surfaceId}" is regime-posture-aware and usage ${req.requestedUsage} ` +
          `requires honoursRegimePosture=true`,
        surface,
        violationCode: L11ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
      };
    }
  }

  // §11.1.6.8 — Sequence-posture-aware surfaces (L9).
  if (surface.sequencePostureAware) {
    const sequenceSensitive: ReadonlyArray<L11DependencyUsability> = [
      'SEQUENCE_CONDITIONING',
      'CONFIDENCE_INPUT',
      'SUPPORT_INPUT',
    ];
    if (
      sequenceSensitive.includes(req.requestedUsage) &&
      req.honoursSequencePosture !== true
    ) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          `Surface "${req.surfaceId}" is sequence-posture-aware and usage ${req.requestedUsage} ` +
          `requires honoursSequencePosture=true`,
        surface,
        violationCode: L11ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED,
      };
    }
  }

  // §11.1.6.9 — Hypothesis-posture-aware surfaces (L10).
  if (surface.hypothesisPostureAware) {
    const hypothesisSensitive: ReadonlyArray<L11DependencyUsability> = [
      'HYPOTHESIS_CONDITIONING',
      'RANKING_INPUT',
      'CONFIDENCE_INPUT',
      'ATTRIBUTION_INPUT',
    ];
    if (
      hypothesisSensitive.includes(req.requestedUsage) &&
      req.honoursHypothesisPosture !== true
    ) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          `Surface "${req.surfaceId}" is hypothesis-posture-aware and usage ${req.requestedUsage} ` +
          `requires honoursHypothesisPosture=true`,
        surface,
        violationCode: L11ConstitutionalViolationCode.HYPOTHESIS_POSTURE_IGNORED,
      };
    }
  }

  return {
    surfaceId: req.surfaceId,
    allowed: true,
    reason: 'Access granted',
    surface,
    violationCode: null,
  };
}

export function assertL11DependencyAccess(
  req: L11DependencyAccessRequest,
): L11DependencySurfaceDescriptor {
  const result = requestL11DependencyAccess(req);
  if (!result.allowed) {
    const code =
      result.violationCode ?? L11ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE;
    throw new L11ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      requestedUsage: req.requestedUsage,
      requestor: req.requestor,
    });
  }
  return result.surface!;
}

export function getAllL11RegisteredSurfaceIds(): readonly string[] {
  return L11_DEPENDENCY_SURFACES.map(s => s.surfaceId);
}
