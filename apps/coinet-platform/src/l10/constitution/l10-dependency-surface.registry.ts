/**
 * L10.1 — Dependency Surface Registry (Runtime)
 *
 * §10.1.4 / §10.1.10 — Runtime registry that validates every dependency
 * access. Any code path using an unregistered surface, misusing a
 * surface, consuming a restriction-aware L7/L8/L9 surface outside its
 * declared rights, or consuming a regime- or sequence-posture-aware
 * surface without declaring posture awareness, is blocked at validator
 * time.
 */

import {
  L10_DEPENDENCY_SURFACES,
  isL10RegisteredDependency,
  isL10UsableFor,
  type L10DependencySurfaceDescriptor,
} from '../contracts/l10-dependency-surfaces';
import type { L10DependencyUsability } from '../contracts/l10-constitutional-types';
import {
  L10ConstitutionalError,
  L10ConstitutionalViolationCode,
} from '../contracts/l10-violation-codes';

export interface L10DependencyAccessRequest {
  readonly surfaceId: string;
  readonly requestedUsage: L10DependencyUsability;
  readonly requestor: string;
  readonly timestamp: string;
  /**
   * §10.1.3.6 / §10.1.8 — For restriction-aware surfaces (L7/L8/L9
   * stable handoffs) the caller must declare the restriction posture
   * attached to the object being consumed.
   */
  readonly restrictionPosture?: {
    readonly allowsSupportEvidence: boolean;
    readonly allowsContradictionEvidence: boolean;
    readonly allowsRankingInput: boolean;
    readonly allowsConfidenceInput: boolean;
    readonly allowsRegimeConditioning: boolean;
    readonly allowsSequenceConditioning: boolean;
  };
  /**
   * §10.1.3.7 — For regime-posture-aware surfaces (L8) the caller must
   * declare that regime posture is honoured.
   */
  readonly honoursRegimePosture?: boolean;
  /**
   * §10.1.3.8 — For sequence-posture-aware surfaces (L9) the caller
   * must declare that sequence posture (lead-lag/phase/decay/causal-
   * restraint/ambiguity) is honoured.
   */
  readonly honoursSequencePosture?: boolean;
}

export interface L10DependencyAccessResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly surface: L10DependencySurfaceDescriptor | null;
  readonly violationCode: L10ConstitutionalViolationCode | null;
}

export function requestL10DependencyAccess(
  req: L10DependencyAccessRequest,
): L10DependencyAccessResult {
  if (!isL10RegisteredDependency(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Surface "${req.surfaceId}" is not registered in L10DependencySurfaceRegistry`,
      surface: null,
      violationCode: L10ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
    };
  }

  if (!isL10UsableFor(req.surfaceId, req.requestedUsage)) {
    const surface = L10_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason:
        `Surface "${req.surfaceId}" is not usable for ${req.requestedUsage}. ` +
        `Allowed: ${surface.usableFor.join(', ')}`,
      surface,
      violationCode: L10ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
    };
  }

  const surface = L10_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;

  // §10.1.3.6 / §10.1.8 — Restriction-aware L7/L8/L9 surfaces.
  if (surface.restrictionAware) {
    const p = req.restrictionPosture;
    if (!p) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          `Surface "${req.surfaceId}" is restriction-aware; request must declare a restriction posture.`,
        surface,
        violationCode: L10ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
      };
    }
    const needs = req.requestedUsage;
    const coveredByPosture =
      (needs === 'SUPPORT_EVIDENCE' && p.allowsSupportEvidence) ||
      (needs === 'CONTRADICTION_EVIDENCE' && p.allowsContradictionEvidence) ||
      (needs === 'RANKING_INPUT' && p.allowsRankingInput) ||
      (needs === 'CONFIDENCE_INPUT' && p.allowsConfidenceInput) ||
      (needs === 'REGIME_CONDITIONING' && p.allowsRegimeConditioning) ||
      (needs === 'SEQUENCE_CONDITIONING' && p.allowsSequenceConditioning) ||
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
        violationCode: L10ConstitutionalViolationCode.RESTRICTION_BYPASS,
      };
    }
  }

  // §10.1.3.7 — Regime-posture-aware surfaces (L8). Usages that
  // materially depend on regime must declare posture adherence.
  if (surface.regimePostureAware) {
    const regimeSensitive: ReadonlyArray<L10DependencyUsability> = [
      'REGIME_CONDITIONING',
      'RANKING_INPUT',
      'CONFIDENCE_INPUT',
      'SUPPORT_EVIDENCE',
      'CONTRADICTION_EVIDENCE',
    ];
    if (regimeSensitive.includes(req.requestedUsage) && req.honoursRegimePosture !== true) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          `Surface "${req.surfaceId}" is regime-posture-aware and usage ${req.requestedUsage} ` +
          `requires honoursRegimePosture=true`,
        surface,
        violationCode: L10ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
      };
    }
  }

  // §10.1.3.8 — Sequence-posture-aware surfaces (L9). Usages that
  // materially depend on sequence/lead-lag/phase/decay must honour
  // posture, especially causal-restraint tagging.
  if (surface.sequencePostureAware) {
    const sequenceSensitive: ReadonlyArray<L10DependencyUsability> = [
      'SEQUENCE_CONDITIONING',
      'RANKING_INPUT',
      'CONFIDENCE_INPUT',
      'SUPPORT_EVIDENCE',
      'CONTRADICTION_EVIDENCE',
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
        violationCode: L10ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED,
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

export function assertL10DependencyAccess(
  req: L10DependencyAccessRequest,
): L10DependencySurfaceDescriptor {
  const result = requestL10DependencyAccess(req);
  if (!result.allowed) {
    const code = result.violationCode ?? L10ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE;
    throw new L10ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      requestedUsage: req.requestedUsage,
      requestor: req.requestor,
    });
  }
  return result.surface!;
}

export function getAllL10RegisteredSurfaceIds(): readonly string[] {
  return L10_DEPENDENCY_SURFACES.map(s => s.surfaceId);
}
