/**
 * L7.2 — Validation Materiality
 *
 * §7.2.4.2 — `materiality_class` declares how much weight a validation
 * subject carries and how strict contradiction / incompleteness / staleness
 * handling must be.
 */

export enum L7MaterialityClass {
  /**
   * A minor claim. Validation may proceed with partial support. Contradictions
   * still surface but do not block emission.
   */
  LOW = 'LOW',
  /**
   * A standard claim. Missing primary support or unblocked material
   * contradictions downgrade validation. Default posture.
   */
  STANDARD = 'STANDARD',
  /**
   * A materially important claim. Any material contradiction or missing
   * primary support must be reflected in modifiers and restriction profile.
   */
  HIGH = 'HIGH',
  /**
   * A claim whose conclusion could meaningfully change downstream judgments.
   * Strictest posture: validation requires complete required-confirmation
   * surfaces and explicit contradiction resolution.
   */
  CRITICAL = 'CRITICAL',
}

export const ALL_MATERIALITY_CLASSES: readonly L7MaterialityClass[] =
  Object.values(L7MaterialityClass);

export interface MaterialityPosture {
  readonly class: L7MaterialityClass;
  readonly requireAllConfirmationSurfaces: boolean;
  readonly blocksOnUnresolvedContradiction: boolean;
  readonly blocksOnMissingChallengeSurveys: boolean;
  readonly requiresExplicitEvidencePack: boolean;
}

export const MATERIALITY_POSTURES: Readonly<Record<L7MaterialityClass, MaterialityPosture>> = {
  [L7MaterialityClass.LOW]: {
    class: L7MaterialityClass.LOW,
    requireAllConfirmationSurfaces: false,
    blocksOnUnresolvedContradiction: false,
    blocksOnMissingChallengeSurveys: false,
    requiresExplicitEvidencePack: false,
  },
  [L7MaterialityClass.STANDARD]: {
    class: L7MaterialityClass.STANDARD,
    requireAllConfirmationSurfaces: false,
    blocksOnUnresolvedContradiction: false,
    blocksOnMissingChallengeSurveys: false,
    requiresExplicitEvidencePack: true,
  },
  [L7MaterialityClass.HIGH]: {
    class: L7MaterialityClass.HIGH,
    requireAllConfirmationSurfaces: true,
    blocksOnUnresolvedContradiction: false,
    blocksOnMissingChallengeSurveys: true,
    requiresExplicitEvidencePack: true,
  },
  [L7MaterialityClass.CRITICAL]: {
    class: L7MaterialityClass.CRITICAL,
    requireAllConfirmationSurfaces: true,
    blocksOnUnresolvedContradiction: true,
    blocksOnMissingChallengeSurveys: true,
    requiresExplicitEvidencePack: true,
  },
};

export function getMaterialityPosture(cls: L7MaterialityClass): MaterialityPosture {
  return MATERIALITY_POSTURES[cls];
}
