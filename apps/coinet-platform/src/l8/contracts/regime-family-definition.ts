/**
 * L8.6 — Regime Family Definition Contract
 *
 * §8.6.7.1 — Canonical family-definition layer, enriching the L8.2
 * family descriptor with rollout phase, legal input families, legal
 * validation families, default confidence posture, and default
 * multiplier posture.
 *
 * The L8.2 `L8RegimeFamilyDescriptor` remains the coexistence-law
 * source; this L8.6 definition adds the rollout and semantic doctrine
 * needed for templates.
 */

import {
  L8RegimeFamily,
  L8RegimeScopeType,
} from './regime-family';
import type { L8RegimeClass } from './regime-class';
import type { L8RegimeInputFamily } from './regime-input-family';
import { L8RegimeRolloutPhase } from './regime-rollout-phase';
import type {
  L8RegimeConfidencePostureDefault,
  L8RegimeMultiplierPostureDefault,
  L8RegimeValidationPattern,
} from './regime-template';

export interface L8RegimeFamilyDefinition {
  readonly family: L8RegimeFamily;
  readonly description: string;
  readonly legal_scope_types: readonly L8RegimeScopeType[];

  /** §8.6.7.1 — legal L6/L7 input families for any template in this family. */
  readonly legal_input_families: readonly L8RegimeInputFamily[];

  /** §8.6.7.1 — validation families the family is expected to consume. */
  readonly legal_validation_patterns:
    readonly L8RegimeValidationPattern[];

  /** §8.6.2.1 — regime classes that belong to the family. */
  readonly member_regime_classes: readonly L8RegimeClass[];

  /** §8.6.3.10 — default confidence posture this family's templates inherit. */
  readonly default_confidence_posture:
    readonly L8RegimeConfidencePostureDefault[];

  /** §8.6.3.11 — default multiplier posture. */
  readonly default_multiplier_posture:
    readonly L8RegimeMultiplierPostureDefault[];

  /** §8.6.6.1 — rollout phase the family belongs to. */
  readonly rollout_phase: L8RegimeRolloutPhase;
}
