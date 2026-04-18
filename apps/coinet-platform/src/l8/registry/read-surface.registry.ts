/**
 * L8.8 — Read Surface Registry
 *
 * §8.8.7 — The frozen `L8_READ_SURFACE_REGISTRY` that governs every
 * later-layer lookup against L8 truth. Callers may not address raw
 * durable surfaces; they must request a governed read surface, which
 * this registry exposes.
 */

import {
  L8ConsumerClass,
  L8ReadMode,
  L8ReadSurfaceDescriptor,
  L8ReadSurfaceId,
  ALL_L8_READ_SURFACE_IDS,
} from '../contracts/l8-read-surface';
import { L8DurableSurfaceId } from '../contracts/l8-persistence-surface';

// Consumer sets reused across surfaces.
const READ_MOST_CONSUMERS: readonly L8ConsumerClass[] = [
  L8ConsumerClass.SCENARIO_WEIGHTER,
  L8ConsumerClass.DETERMINISTIC_SCORER,
  L8ConsumerClass.FINAL_JUDGMENT,
  L8ConsumerClass.EXPLANATION_SURFACE,
  L8ConsumerClass.FORENSIC_TOOL,
  L8ConsumerClass.INTERNAL_L8,
];

const READ_FORENSIC_ONLY: readonly L8ConsumerClass[] = [
  L8ConsumerClass.FORENSIC_TOOL,
  L8ConsumerClass.REPLAY_ADAPTER,
  L8ConsumerClass.REPAIR_ADAPTER,
  L8ConsumerClass.INTERNAL_L8,
];

const READ_HISTORICAL_CONSUMERS: readonly L8ConsumerClass[] = [
  L8ConsumerClass.SCENARIO_WEIGHTER,
  L8ConsumerClass.DETERMINISTIC_SCORER,
  L8ConsumerClass.FINAL_JUDGMENT,
  L8ConsumerClass.EXPLANATION_SURFACE,
  L8ConsumerClass.FORENSIC_TOOL,
  L8ConsumerClass.REPLAY_ADAPTER,
  L8ConsumerClass.REPAIR_ADAPTER,
  L8ConsumerClass.INTERNAL_L8,
];

function mk(
  id: L8ReadSurfaceId,
  backing: readonly L8DurableSurfaceId[],
  modes: readonly L8ReadMode[],
  consumers: readonly L8ConsumerClass[],
  opts: {
    readonly resolves_archive_payload?: boolean;
    readonly requires_scope?: boolean;
    readonly requires_subject?: boolean;
    readonly description: string;
  },
): L8ReadSurfaceDescriptor {
  return {
    surface_id: id,
    backing_durable_surfaces: backing,
    allowed_modes: modes,
    allowed_consumers: consumers,
    resolves_archive_payload: opts.resolves_archive_payload ?? false,
    requires_scope: opts.requires_scope ?? false,
    requires_subject: opts.requires_subject ?? false,
    description: opts.description,
  };
}

export const L8_READ_SURFACE_REGISTRY: Readonly<
  Record<L8ReadSurfaceId, L8ReadSurfaceDescriptor>
> = {
  // ── Current by scope ──
  [L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE]: mk(
    L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE,
    [L8DurableSurfaceId.CURRENT_REGIME_REGISTRY],
    [L8ReadMode.LIVE_CURRENT],
    READ_MOST_CONSUMERS,
    { requires_scope: true,
      description: 'Current regime state by (family, scope).' },
  ),
  [L8ReadSurfaceId.CURRENT_TRANSITION_BY_SCOPE]: mk(
    L8ReadSurfaceId.CURRENT_TRANSITION_BY_SCOPE,
    [L8DurableSurfaceId.CURRENT_TRANSITION_REGISTRY],
    [L8ReadMode.LIVE_CURRENT],
    READ_MOST_CONSUMERS,
    { requires_scope: true,
      description: 'Current transition profile by scope.' },
  ),
  [L8ReadSurfaceId.CURRENT_CONFIDENCE_BY_SCOPE]: mk(
    L8ReadSurfaceId.CURRENT_CONFIDENCE_BY_SCOPE,
    [L8DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY],
    [L8ReadMode.LIVE_CURRENT],
    READ_MOST_CONSUMERS,
    { requires_scope: true,
      description: 'Current confidence band by scope.' },
  ),
  [L8ReadSurfaceId.CURRENT_MULTIPLIER_BY_SCOPE]: mk(
    L8ReadSurfaceId.CURRENT_MULTIPLIER_BY_SCOPE,
    [L8DurableSurfaceId.CURRENT_MULTIPLIER_REGISTRY],
    [L8ReadMode.LIVE_CURRENT],
    READ_MOST_CONSUMERS,
    { requires_scope: true,
      description: 'Current multiplier + reliance posture by scope.' },
  ),
  [L8ReadSurfaceId.CURRENT_REGIME_BY_FAMILY_SCOPE]: mk(
    L8ReadSurfaceId.CURRENT_REGIME_BY_FAMILY_SCOPE,
    [L8DurableSurfaceId.CURRENT_REGIME_REGISTRY],
    [L8ReadMode.LIVE_CURRENT],
    READ_MOST_CONSUMERS,
    { requires_scope: true,
      description: 'Current regime snapshot by (family, scope) with family filter.' },
  ),

  // ── Historical windows ──
  [L8ReadSurfaceId.REGIME_HISTORY_BY_SCOPE]: mk(
    L8ReadSurfaceId.REGIME_HISTORY_BY_SCOPE,
    [L8DurableSurfaceId.HISTORICAL_REGIME_FACTS],
    [L8ReadMode.LIVE_HISTORICAL, L8ReadMode.REPLAY_HISTORICAL],
    READ_HISTORICAL_CONSUMERS,
    { requires_scope: true,
      description: 'Historical regime facts by scope and window.' },
  ),
  [L8ReadSurfaceId.TRANSITION_HISTORY_BY_SCOPE]: mk(
    L8ReadSurfaceId.TRANSITION_HISTORY_BY_SCOPE,
    [L8DurableSurfaceId.HISTORICAL_TRANSITION_FACTS],
    [L8ReadMode.LIVE_HISTORICAL, L8ReadMode.REPLAY_HISTORICAL],
    READ_HISTORICAL_CONSUMERS,
    { requires_scope: true,
      description: 'Historical transition facts by scope and window.' },
  ),
  [L8ReadSurfaceId.CONFIDENCE_HISTORY_BY_SCOPE]: mk(
    L8ReadSurfaceId.CONFIDENCE_HISTORY_BY_SCOPE,
    [L8DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS],
    [L8ReadMode.LIVE_HISTORICAL, L8ReadMode.REPLAY_HISTORICAL],
    READ_HISTORICAL_CONSUMERS,
    { requires_scope: true,
      description: 'Historical confidence facts by scope and window.' },
  ),
  [L8ReadSurfaceId.MULTIPLIER_HISTORY_BY_SCOPE]: mk(
    L8ReadSurfaceId.MULTIPLIER_HISTORY_BY_SCOPE,
    [L8DurableSurfaceId.HISTORICAL_MULTIPLIER_FACTS],
    [L8ReadMode.LIVE_HISTORICAL, L8ReadMode.REPLAY_HISTORICAL],
    READ_HISTORICAL_CONSUMERS,
    { requires_scope: true,
      description: 'Historical multiplier facts by scope and window.' },
  ),

  // ── Evidence ──
  [L8ReadSurfaceId.REGIME_EVIDENCE_BY_SUBJECT]: mk(
    L8ReadSurfaceId.REGIME_EVIDENCE_BY_SUBJECT,
    [L8DurableSurfaceId.EVIDENCE_REGISTRY],
    [L8ReadMode.EVIDENCE_VIEW],
    READ_FORENSIC_ONLY,
    { resolves_archive_payload: true, requires_subject: true,
      description: 'Regime evidence pack for a subject.' },
  ),
  [L8ReadSurfaceId.TRANSITION_EVIDENCE_BY_PROFILE]: mk(
    L8ReadSurfaceId.TRANSITION_EVIDENCE_BY_PROFILE,
    [L8DurableSurfaceId.EVIDENCE_REGISTRY],
    [L8ReadMode.EVIDENCE_VIEW],
    READ_FORENSIC_ONLY,
    { resolves_archive_payload: true, requires_subject: true,
      description: 'Transition evidence bundle for a profile.' },
  ),
  [L8ReadSurfaceId.CONFIDENCE_FACTORS_BY_ASSESSMENT]: mk(
    L8ReadSurfaceId.CONFIDENCE_FACTORS_BY_ASSESSMENT,
    [L8DurableSurfaceId.EVIDENCE_REGISTRY],
    [L8ReadMode.EVIDENCE_VIEW],
    READ_FORENSIC_ONLY,
    { resolves_archive_payload: true, requires_subject: true,
      description: 'Confidence factor snapshot for an assessment.' },
  ),
  [L8ReadSurfaceId.MULTIPLIER_DERIVATION_BY_PROFILE]: mk(
    L8ReadSurfaceId.MULTIPLIER_DERIVATION_BY_PROFILE,
    [L8DurableSurfaceId.EVIDENCE_REGISTRY],
    [L8ReadMode.EVIDENCE_VIEW],
    READ_FORENSIC_ONLY,
    { resolves_archive_payload: true, requires_subject: true,
      description: 'Multiplier derivation bundle for a profile.' },
  ),

  // ── Lineage / replay-vs-live / repair ──
  [L8ReadSurfaceId.REGIME_LINEAGE_BY_RUN]: mk(
    L8ReadSurfaceId.REGIME_LINEAGE_BY_RUN,
    [L8DurableSurfaceId.LINEAGE_REGISTRY, L8DurableSurfaceId.REGIME_RUNS],
    [L8ReadMode.LINEAGE_VIEW],
    READ_HISTORICAL_CONSUMERS,
    { description: 'Regime lineage for a compute run.' },
  ),
  [L8ReadSurfaceId.REPLAY_VS_LIVE_BY_SUBJECT]: mk(
    L8ReadSurfaceId.REPLAY_VS_LIVE_BY_SUBJECT,
    [
      L8DurableSurfaceId.HISTORICAL_REGIME_FACTS,
      L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
      L8DurableSurfaceId.REGIME_RUNS,
    ],
    [L8ReadMode.REPLAY_HISTORICAL],
    READ_FORENSIC_ONLY,
    { requires_subject: true,
      description: 'Compare replay-reconstructed regime vs live-current.' },
  ),
  [L8ReadSurfaceId.REPAIR_LINEAGE_BY_SUBJECT]: mk(
    L8ReadSurfaceId.REPAIR_LINEAGE_BY_SUBJECT,
    [
      L8DurableSurfaceId.LINEAGE_REGISTRY,
      L8DurableSurfaceId.REGIME_RUNS,
      L8DurableSurfaceId.HISTORICAL_REGIME_FACTS,
    ],
    [L8ReadMode.REPAIR_VIEW, L8ReadMode.LINEAGE_VIEW],
    READ_FORENSIC_ONLY,
    { requires_subject: true,
      description: 'Repair lineage chain for a subject across runs.' },
  ),
};

// ── Registry class ──────────────────────────────────────────────────────

export class L8ReadSurfaceRegistry {
  constructor(
    private readonly table: Readonly<
      Record<L8ReadSurfaceId, L8ReadSurfaceDescriptor>
    > = L8_READ_SURFACE_REGISTRY,
  ) {}

  isRegistered(id: L8ReadSurfaceId): boolean { return !!this.table[id]; }

  get(id: L8ReadSurfaceId): L8ReadSurfaceDescriptor | undefined {
    return this.table[id];
  }

  list(): readonly L8ReadSurfaceDescriptor[] {
    return ALL_L8_READ_SURFACE_IDS
      .map(id => this.table[id])
      .filter((d): d is L8ReadSurfaceDescriptor => !!d);
  }

  byMode(mode: L8ReadMode): readonly L8ReadSurfaceDescriptor[] {
    return this.list().filter(d => d.allowed_modes.includes(mode));
  }

  byConsumer(c: L8ConsumerClass): readonly L8ReadSurfaceDescriptor[] {
    return this.list().filter(d => d.allowed_consumers.includes(c));
  }
}

let _defaultReadRegistry: L8ReadSurfaceRegistry | null = null;
export function getDefaultL8ReadSurfaceRegistry():
  L8ReadSurfaceRegistry {
  if (!_defaultReadRegistry) _defaultReadRegistry = new L8ReadSurfaceRegistry();
  return _defaultReadRegistry;
}
