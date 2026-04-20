/**
 * L10.5 — HypothesisShiftConditionPolicy Registry
 *
 * §10.5.9.1 — Holds shift-condition-policy declarations per subject.
 * Unlike the other L10.5 registries, this one is keyed by subject,
 * because shift conditions describe the *competition*, not a
 * candidate.
 */

import { L10HypothesisShiftConditionPolicy } from '../contracts/hypothesis-shift-condition-policy';

export class L10HypothesisShiftConditionPolicyRegistry {
  private readonly byId =
    new Map<string, L10HypothesisShiftConditionPolicy>();
  private readonly bySubject =
    new Map<string, L10HypothesisShiftConditionPolicy>();

  register(p: L10HypothesisShiftConditionPolicy): void {
    if (!p.policy_id) {
      throw new Error('L10.5 shift-condition registry: missing policy_id');
    }
    if (this.byId.has(p.policy_id)) {
      throw new Error(
        `L10.5 shift-condition registry: duplicate policy_id '${p.policy_id}'`,
      );
    }
    if (this.bySubject.has(p.hypothesis_subject_id)) {
      throw new Error(
        `L10.5 shift-condition registry: duplicate shift-condition policy ` +
          `for subject '${p.hypothesis_subject_id}'`,
      );
    }
    this.byId.set(p.policy_id, p);
    this.bySubject.set(p.hypothesis_subject_id, p);
  }

  has(policy_id: string): boolean { return this.byId.has(policy_id); }
  get(policy_id: string): L10HypothesisShiftConditionPolicy | undefined {
    return this.byId.get(policy_id);
  }
  getForSubject(
    hypothesis_subject_id: string,
  ): L10HypothesisShiftConditionPolicy | undefined {
    return this.bySubject.get(hypothesis_subject_id);
  }
  size(): number { return this.byId.size; }
  list(): readonly L10HypothesisShiftConditionPolicy[] {
    return Array.from(this.byId.values());
  }
  clear(): void { this.byId.clear(); this.bySubject.clear(); }
}

let _default: L10HypothesisShiftConditionPolicyRegistry | null = null;
export function getDefaultL10ShiftConditionPolicyRegistry(): L10HypothesisShiftConditionPolicyRegistry {
  if (!_default) _default = new L10HypothesisShiftConditionPolicyRegistry();
  return _default;
}
