/**
 * L7.7 — Read Surface Registry
 *
 * §7.7.6 — The frozen map of governed read surfaces to their backing
 * durable surfaces, allowed modes, and allowed consumer classes.
 * Read-surface validator + read services consult this; nothing else
 * gets to decide "can EXPLANATION_SURFACE call RESTRICTION_HISTORY?".
 */

import {
  ALL_L7_READ_SURFACE_IDS,
  L7ConsumerClass,
  L7ReadMode,
  L7ReadSurfaceDescriptor,
  L7ReadSurfaceId,
} from '../contracts/l7-read-surface';
import { L7DurableSurfaceId } from '../contracts/l7-persistence-surface';

function mk(
  id: L7ReadSurfaceId,
  backing: readonly L7DurableSurfaceId[],
  modes: readonly L7ReadMode[],
  consumers: readonly L7ConsumerClass[],
  opts: {
    readonly resolves_archive_payload?: boolean;
    readonly requires_scope?: boolean;
    readonly description: string;
  },
): L7ReadSurfaceDescriptor {
  return {
    surface_id: id,
    backing_durable_surfaces: backing,
    allowed_modes: modes,
    allowed_consumers: consumers,
    resolves_archive_payload: opts.resolves_archive_payload ?? false,
    requires_scope: opts.requires_scope ?? true,
    description: opts.description,
  };
}

const STANDARD_CURRENT_CONSUMERS: readonly L7ConsumerClass[] = [
  L7ConsumerClass.REGIME_ENGINE,
  L7ConsumerClass.SCENARIO_WEIGHTER,
  L7ConsumerClass.DETERMINISTIC_SCORER,
  L7ConsumerClass.FINAL_JUDGMENT,
  L7ConsumerClass.EXPLANATION_SURFACE,
  L7ConsumerClass.FORENSIC_TOOL,
  L7ConsumerClass.INTERNAL_L7,
];

const HISTORICAL_CONSUMERS: readonly L7ConsumerClass[] = [
  L7ConsumerClass.EXPLANATION_SURFACE,
  L7ConsumerClass.FORENSIC_TOOL,
  L7ConsumerClass.REPLAY_ADAPTER,
  L7ConsumerClass.REPAIR_ADAPTER,
  L7ConsumerClass.INTERNAL_L7,
];

const EVIDENCE_CONSUMERS: readonly L7ConsumerClass[] = [
  L7ConsumerClass.EXPLANATION_SURFACE,
  L7ConsumerClass.FORENSIC_TOOL,
  L7ConsumerClass.REPLAY_ADAPTER,
  L7ConsumerClass.REPAIR_ADAPTER,
  L7ConsumerClass.INTERNAL_L7,
];

export const L7_READ_SURFACE_REGISTRY: Readonly<
  Record<L7ReadSurfaceId, L7ReadSurfaceDescriptor>
> = {
  [L7ReadSurfaceId.CURRENT_VALIDATION_BY_SCOPE]: mk(
    L7ReadSurfaceId.CURRENT_VALIDATION_BY_SCOPE,
    [L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY],
    [L7ReadMode.CURRENT_LIVE],
    STANDARD_CURRENT_CONSUMERS,
    { description: 'Authoritative current validation assessment per scope.' },
  ),
  [L7ReadSurfaceId.CURRENT_CONTRADICTION_BY_SCOPE]: mk(
    L7ReadSurfaceId.CURRENT_CONTRADICTION_BY_SCOPE,
    [L7DurableSurfaceId.CURRENT_CONTRADICTION_REGISTRY],
    [L7ReadMode.CURRENT_LIVE],
    STANDARD_CURRENT_CONSUMERS,
    { description: 'Authoritative current contradiction bundle per scope.' },
  ),
  [L7ReadSurfaceId.CURRENT_CONFIDENCE_BY_SCOPE]: mk(
    L7ReadSurfaceId.CURRENT_CONFIDENCE_BY_SCOPE,
    [L7DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY],
    [L7ReadMode.CURRENT_LIVE],
    STANDARD_CURRENT_CONSUMERS,
    { description: 'Authoritative current confidence decision per scope.' },
  ),
  [L7ReadSurfaceId.CURRENT_RESTRICTION_BY_SCOPE]: mk(
    L7ReadSurfaceId.CURRENT_RESTRICTION_BY_SCOPE,
    [L7DurableSurfaceId.CURRENT_RESTRICTION_REGISTRY],
    [L7ReadMode.CURRENT_LIVE],
    STANDARD_CURRENT_CONSUMERS,
    { description: 'Authoritative current restriction profile per scope.' },
  ),
  [L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE]: mk(
    L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE,
    [L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS],
    [L7ReadMode.HISTORICAL_WINDOW, L7ReadMode.REPLAY_RECONSTRUCTION, L7ReadMode.REPAIR_INSPECTION],
    HISTORICAL_CONSUMERS,
    { description: 'Append-safe historical validation facts by scope + window.' },
  ),
  [L7ReadSurfaceId.CONTRADICTION_HISTORY_BY_SCOPE]: mk(
    L7ReadSurfaceId.CONTRADICTION_HISTORY_BY_SCOPE,
    [L7DurableSurfaceId.HISTORICAL_CONTRADICTION_FACTS],
    [L7ReadMode.HISTORICAL_WINDOW, L7ReadMode.REPLAY_RECONSTRUCTION, L7ReadMode.REPAIR_INSPECTION],
    HISTORICAL_CONSUMERS,
    { description: 'Append-safe historical contradiction facts by scope + window.' },
  ),
  [L7ReadSurfaceId.CONFIDENCE_HISTORY_BY_SCOPE]: mk(
    L7ReadSurfaceId.CONFIDENCE_HISTORY_BY_SCOPE,
    [L7DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS],
    [L7ReadMode.HISTORICAL_WINDOW, L7ReadMode.REPLAY_RECONSTRUCTION, L7ReadMode.REPAIR_INSPECTION],
    HISTORICAL_CONSUMERS,
    { description: 'Append-safe historical confidence facts by scope + window.' },
  ),
  [L7ReadSurfaceId.RESTRICTION_HISTORY_BY_SCOPE]: mk(
    L7ReadSurfaceId.RESTRICTION_HISTORY_BY_SCOPE,
    [L7DurableSurfaceId.HISTORICAL_RESTRICTION_FACTS],
    [L7ReadMode.HISTORICAL_WINDOW, L7ReadMode.REPLAY_RECONSTRUCTION, L7ReadMode.REPAIR_INSPECTION],
    HISTORICAL_CONSUMERS,
    { description: 'Append-safe historical restriction facts by scope + window.' },
  ),
  [L7ReadSurfaceId.VALIDATION_EVIDENCE_BY_SUBJECT]: mk(
    L7ReadSurfaceId.VALIDATION_EVIDENCE_BY_SUBJECT,
    [L7DurableSurfaceId.EVIDENCE_POINTERS],
    [L7ReadMode.FORENSIC_EVIDENCE_VIEW, L7ReadMode.REPLAY_RECONSTRUCTION, L7ReadMode.REPAIR_INSPECTION],
    EVIDENCE_CONSUMERS,
    {
      resolves_archive_payload: true,
      requires_scope: false,
      description: 'Validation evidence pack resolved via pointer + archive.',
    },
  ),
  [L7ReadSurfaceId.CONTRADICTION_EVIDENCE_BY_BUNDLE]: mk(
    L7ReadSurfaceId.CONTRADICTION_EVIDENCE_BY_BUNDLE,
    [L7DurableSurfaceId.EVIDENCE_POINTERS],
    [L7ReadMode.FORENSIC_EVIDENCE_VIEW, L7ReadMode.REPLAY_RECONSTRUCTION, L7ReadMode.REPAIR_INSPECTION],
    EVIDENCE_CONSUMERS,
    {
      resolves_archive_payload: true,
      requires_scope: false,
      description: 'Contradiction evidence bundle resolved via pointer + archive.',
    },
  ),
  [L7ReadSurfaceId.CONFIDENCE_RATIONALE_BY_ASSESSMENT]: mk(
    L7ReadSurfaceId.CONFIDENCE_RATIONALE_BY_ASSESSMENT,
    [L7DurableSurfaceId.EVIDENCE_POINTERS],
    [L7ReadMode.FORENSIC_EVIDENCE_VIEW, L7ReadMode.REPLAY_RECONSTRUCTION, L7ReadMode.REPAIR_INSPECTION],
    EVIDENCE_CONSUMERS,
    {
      resolves_archive_payload: true,
      requires_scope: false,
      description: 'Confidence rationale bundle resolved via pointer + archive.',
    },
  ),
  [L7ReadSurfaceId.RESTRICTION_RATIONALE_BY_PROFILE]: mk(
    L7ReadSurfaceId.RESTRICTION_RATIONALE_BY_PROFILE,
    [L7DurableSurfaceId.EVIDENCE_POINTERS],
    [L7ReadMode.FORENSIC_EVIDENCE_VIEW, L7ReadMode.REPLAY_RECONSTRUCTION, L7ReadMode.REPAIR_INSPECTION],
    EVIDENCE_CONSUMERS,
    {
      resolves_archive_payload: true,
      requires_scope: false,
      description: 'Restriction reason bundle resolved via pointer + archive.',
    },
  ),
  [L7ReadSurfaceId.VALIDATION_LINEAGE_BY_RUN]: mk(
    L7ReadSurfaceId.VALIDATION_LINEAGE_BY_RUN,
    [L7DurableSurfaceId.LINEAGE_POINTERS, L7DurableSurfaceId.VALIDATION_RUNS],
    [L7ReadMode.FORENSIC_EVIDENCE_VIEW, L7ReadMode.REPLAY_RECONSTRUCTION, L7ReadMode.REPAIR_INSPECTION],
    [
      L7ConsumerClass.FORENSIC_TOOL,
      L7ConsumerClass.REPLAY_ADAPTER,
      L7ConsumerClass.REPAIR_ADAPTER,
      L7ConsumerClass.INTERNAL_L7,
    ],
    { requires_scope: false, description: 'Validation lineage by compute-run id.' },
  ),
};

export class L7ReadSurfaceRegistry {
  list(): readonly L7ReadSurfaceDescriptor[] {
    return ALL_L7_READ_SURFACE_IDS.map(id => L7_READ_SURFACE_REGISTRY[id]);
  }

  get(id: L7ReadSurfaceId): L7ReadSurfaceDescriptor | null {
    return L7_READ_SURFACE_REGISTRY[id] ?? null;
  }

  isRegistered(id: unknown): boolean {
    return typeof id === 'string' && id in L7_READ_SURFACE_REGISTRY;
  }

  isModeLegal(id: L7ReadSurfaceId, mode: L7ReadMode): boolean {
    return L7_READ_SURFACE_REGISTRY[id].allowed_modes.includes(mode);
  }

  isConsumerLegal(id: L7ReadSurfaceId, consumer: L7ConsumerClass): boolean {
    return L7_READ_SURFACE_REGISTRY[id].allowed_consumers.includes(consumer);
  }

  requiresScope(id: L7ReadSurfaceId): boolean {
    return L7_READ_SURFACE_REGISTRY[id].requires_scope;
  }

  resolvesArchivePayload(id: L7ReadSurfaceId): boolean {
    return L7_READ_SURFACE_REGISTRY[id].resolves_archive_payload;
  }
}

let _defaultReadRegistry: L7ReadSurfaceRegistry | null = null;
export function getDefaultReadSurfaceRegistry(): L7ReadSurfaceRegistry {
  if (!_defaultReadRegistry) _defaultReadRegistry = new L7ReadSurfaceRegistry();
  return _defaultReadRegistry;
}
