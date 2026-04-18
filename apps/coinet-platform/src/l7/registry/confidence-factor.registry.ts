/**
 * L7.6 — Confidence Factor Registry
 *
 * §7.6.3 — Single source of truth for the seven governed factor groups.
 * The confidence scoring validator uses this registry to:
 *
 *   - reject unknown factor groups
 *   - check that every required factor group is present in inputs
 *   - check that factor values lie inside the registered range
 *   - check that factor weights are within their max-legal envelope
 *   - report which factor groups are bounded by truth-safety law
 */

import {
  L7ConfidenceFactorGroup,
  L7ConfidenceFactorDescriptor,
  L7_CONFIDENCE_FACTOR_DESCRIPTORS,
  L7_BOUNDED_FACTOR_GROUPS,
  ALL_L7_CONFIDENCE_FACTOR_GROUPS,
  isL7ConfidenceFactorGroup,
} from '../contracts/confidence-factor';

export class L7ConfidenceFactorRegistry {
  private readonly byGroup: Map<L7ConfidenceFactorGroup, L7ConfidenceFactorDescriptor>;

  constructor(
    descriptors: readonly L7ConfidenceFactorDescriptor[] = L7_CONFIDENCE_FACTOR_DESCRIPTORS,
  ) {
    this.byGroup = new Map(descriptors.map(d => [d.group, d]));
  }

  list(): readonly L7ConfidenceFactorDescriptor[] {
    return Array.from(this.byGroup.values());
  }

  get(group: L7ConfidenceFactorGroup): L7ConfidenceFactorDescriptor | undefined {
    return this.byGroup.get(group);
  }

  isRegistered(raw: string): boolean {
    return isL7ConfidenceFactorGroup(raw) && this.byGroup.has(raw);
  }

  requiredGroups(): readonly L7ConfidenceFactorGroup[] {
    return ALL_L7_CONFIDENCE_FACTOR_GROUPS;
  }

  isBounded(group: L7ConfidenceFactorGroup): boolean {
    return L7_BOUNDED_FACTOR_GROUPS.includes(group);
  }

  /** Check whether a value falls within the registered range. */
  isValueLegal(group: L7ConfidenceFactorGroup, value: number): boolean {
    const d = this.byGroup.get(group);
    if (!d) return false;
    if (!isFinite(value)) return false;
    return value >= d.valueRange.min && value <= d.valueRange.max;
  }

  /** Check whether a weight falls within the registered max-legal envelope. */
  isWeightLegal(group: L7ConfidenceFactorGroup, weight: number): boolean {
    const d = this.byGroup.get(group);
    if (!d) return false;
    if (!isFinite(weight) || weight < 0) return false;
    return weight <= d.maxLegalWeight;
  }

  /** Default weight for a factor group when policy omits it. */
  defaultWeight(group: L7ConfidenceFactorGroup): number {
    return this.byGroup.get(group)?.defaultWeight ?? 0;
  }
}

const defaultConfidenceFactorRegistry = new L7ConfidenceFactorRegistry();

export function getDefaultConfidenceFactorRegistry(): L7ConfidenceFactorRegistry {
  return defaultConfidenceFactorRegistry;
}
