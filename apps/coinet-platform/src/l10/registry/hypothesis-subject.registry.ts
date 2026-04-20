/**
 * L10.2 — HypothesisSubject Registry
 *
 * §10.2.17 — Tracks live hypothesis subjects for replay identity and
 * duplicate-subject detection within a run.
 */

import { L10HypothesisSubject } from '../contracts/hypothesis-subject';

export class L10HypothesisSubjectRegistry {
  private readonly byId = new Map<string, L10HypothesisSubject>();

  register(s: L10HypothesisSubject): void {
    if (!s.hypothesis_subject_id) {
      throw new Error('L10.2 subject registry: missing hypothesis_subject_id');
    }
    if (this.byId.has(s.hypothesis_subject_id)) {
      throw new Error(
        `L10.2 subject registry: duplicate subject id '${s.hypothesis_subject_id}'`,
      );
    }
    this.byId.set(s.hypothesis_subject_id, s);
  }

  has(id: string): boolean { return this.byId.has(id); }

  get(id: string): L10HypothesisSubject | undefined { return this.byId.get(id); }

  size(): number { return this.byId.size; }

  list(): readonly L10HypothesisSubject[] {
    return Array.from(this.byId.values());
  }

  clear(): void { this.byId.clear(); }
}

let _defaultReg: L10HypothesisSubjectRegistry | null = null;
export function getDefaultL10HypothesisSubjectRegistry(): L10HypothesisSubjectRegistry {
  if (!_defaultReg) _defaultReg = new L10HypothesisSubjectRegistry();
  return _defaultReg;
}
