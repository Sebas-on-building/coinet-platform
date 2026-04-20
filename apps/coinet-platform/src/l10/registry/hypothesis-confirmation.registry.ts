/**
 * L10.5 — HypothesisConfirmationPolicy Registry
 *
 * §10.5.9.1 — Holds confirmation-policy declarations per candidate.
 */

import { L10HypothesisConfirmationPolicy } from '../contracts/hypothesis-confirmation-policy';

export class L10HypothesisConfirmationPolicyRegistry {
  private readonly byId = new Map<string, L10HypothesisConfirmationPolicy>();
  private readonly byCandidate =
    new Map<string, L10HypothesisConfirmationPolicy>();

  register(p: L10HypothesisConfirmationPolicy): void {
    if (!p.policy_id) {
      throw new Error('L10.5 confirmation registry: missing policy_id');
    }
    if (this.byId.has(p.policy_id)) {
      throw new Error(
        `L10.5 confirmation registry: duplicate policy_id '${p.policy_id}'`,
      );
    }
    if (this.byCandidate.has(p.hypothesis_candidate_id)) {
      throw new Error(
        `L10.5 confirmation registry: duplicate confirmation policy for ` +
          `candidate '${p.hypothesis_candidate_id}'`,
      );
    }
    this.byId.set(p.policy_id, p);
    this.byCandidate.set(p.hypothesis_candidate_id, p);
  }

  has(policy_id: string): boolean { return this.byId.has(policy_id); }
  get(policy_id: string): L10HypothesisConfirmationPolicy | undefined {
    return this.byId.get(policy_id);
  }
  getForCandidate(
    hypothesis_candidate_id: string,
  ): L10HypothesisConfirmationPolicy | undefined {
    return this.byCandidate.get(hypothesis_candidate_id);
  }
  size(): number { return this.byId.size; }
  list(): readonly L10HypothesisConfirmationPolicy[] {
    return Array.from(this.byId.values());
  }
  clear(): void { this.byId.clear(); this.byCandidate.clear(); }
}

let _default: L10HypothesisConfirmationPolicyRegistry | null = null;
export function getDefaultL10ConfirmationPolicyRegistry(): L10HypothesisConfirmationPolicyRegistry {
  if (!_default) _default = new L10HypothesisConfirmationPolicyRegistry();
  return _default;
}
