/**
 * L9.5 — Lead-Lag Registry
 *
 * §9.5.5 / §9.5.11.2 — Runtime registry wrapping the frozen lead-lag
 * policy. Every downstream engine reaches admissibility thresholds and
 * quality law through this registry, never by inlining the table.
 */

import { L9SequenceFamily } from '../contracts/sequence-family';
import {
  L9LagContradictionPosture,
} from '../contracts/lead-lag-relation';
import {
  L9LeadLagAdmissibility,
  L9LeadLagQualityClass,
  L9SemanticLagClass,
  L9_LEAD_LAG_ADMISSIBILITY,
  classifyL9SemanticLag,
  deriveL9LeadLagQuality,
  getL9LeadLagAdmissibility,
  isL9LagAdmissible,
  l9LagSupportsEarlyStructure,
  l9LagSupportsOnlyLateness,
} from '../contracts/l9-lead-lag-policy';

export class L9LeadLagRegistry {
  private readonly byFamily: Map<L9SequenceFamily, L9LeadLagAdmissibility>;

  constructor(
    entries: readonly L9LeadLagAdmissibility[] = L9_LEAD_LAG_ADMISSIBILITY,
  ) {
    this.byFamily = new Map(entries.map(e => [e.family, e]));
  }

  list(): readonly L9LeadLagAdmissibility[] {
    return Array.from(this.byFamily.values());
  }

  admissibility(family: L9SequenceFamily): L9LeadLagAdmissibility | undefined {
    return this.byFamily.get(family);
  }

  classifySemanticLag(
    family: L9SequenceFamily, lag_ms: number,
  ): L9SemanticLagClass {
    return classifyL9SemanticLag(family, lag_ms);
  }

  isAdmissible(family: L9SequenceFamily, lag_ms: number): boolean {
    return isL9LagAdmissible(family, lag_ms);
  }

  supportsEarlyStructure(cls: L9SemanticLagClass): boolean {
    return l9LagSupportsEarlyStructure(cls);
  }

  supportsOnlyLateness(cls: L9SemanticLagClass): boolean {
    return l9LagSupportsOnlyLateness(cls);
  }

  deriveQuality(input: {
    readonly family: L9SequenceFamily;
    readonly lag_ms: number;
    readonly contradiction_posture: L9LagContradictionPosture;
    readonly decay_adjustment: number;
    readonly scope_aligned: boolean;
    readonly lineage_complete: boolean;
  }): {
    readonly semantic_lag_class: L9SemanticLagClass;
    readonly quality_class: L9LeadLagQualityClass;
    readonly narrowing_reasons: readonly string[];
  } {
    return deriveL9LeadLagQuality(input);
  }
}

const defaultLeadLagRegistry = new L9LeadLagRegistry();

export function getDefaultL9LeadLagRegistry(): L9LeadLagRegistry {
  return defaultLeadLagRegistry;
}

export {
  classifyL9SemanticLag,
  deriveL9LeadLagQuality,
  getL9LeadLagAdmissibility,
  isL9LagAdmissible,
  l9LagSupportsEarlyStructure,
  l9LagSupportsOnlyLateness,
};
