/**
 * L10.2 — HypothesisSubjectClass Registry
 *
 * §10.2.17 — Responsible for object-kind lookup and legality of subject
 * classes. Rejects duplicate registrations and unknown classes.
 */

import {
  L10HypothesisSubjectClass,
  ALL_L10_HYPOTHESIS_SUBJECT_CLASSES,
  L10ScopeType,
  ALL_L10_SCOPE_TYPES,
} from '../contracts/hypothesis-subject-class';

export interface L10SubjectClassRegistration {
  readonly subjectClass: L10HypothesisSubjectClass;
  readonly legalScopeTypes: readonly L10ScopeType[];
  readonly description: string;
}

export class L10HypothesisSubjectClassRegistry {
  private readonly byClass = new Map<L10HypothesisSubjectClass, L10SubjectClassRegistration>();

  register(reg: L10SubjectClassRegistration): void {
    if (!ALL_L10_HYPOTHESIS_SUBJECT_CLASSES.includes(reg.subjectClass)) {
      throw new Error(`L10.2 registry: unknown subject class '${reg.subjectClass}'`);
    }
    if (this.byClass.has(reg.subjectClass)) {
      throw new Error(`L10.2 registry: duplicate subject class '${reg.subjectClass}'`);
    }
    for (const s of reg.legalScopeTypes) {
      if (!ALL_L10_SCOPE_TYPES.includes(s)) {
        throw new Error(`L10.2 registry: illegal scope '${s}' for ${reg.subjectClass}`);
      }
    }
    this.byClass.set(reg.subjectClass, reg);
  }

  has(cls: L10HypothesisSubjectClass): boolean {
    return this.byClass.has(cls);
  }

  get(cls: L10HypothesisSubjectClass): L10SubjectClassRegistration | undefined {
    return this.byClass.get(cls);
  }

  allowsScope(cls: L10HypothesisSubjectClass, scope: L10ScopeType): boolean {
    const reg = this.byClass.get(cls);
    return !!reg && reg.legalScopeTypes.includes(scope);
  }

  size(): number {
    return this.byClass.size;
  }

  list(): readonly L10SubjectClassRegistration[] {
    return Array.from(this.byClass.values());
  }
}

const DEFAULTS: readonly L10SubjectClassRegistration[] = [
  { subjectClass: L10HypothesisSubjectClass.ASSET_EXPLANATION,
    legalScopeTypes: ['ASSET'], description: 'Explanatory problem over an asset.' },
  { subjectClass: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
    legalScopeTypes: ['TOKEN', 'PROTOCOL'], description: 'Explanatory problem over a token.' },
  { subjectClass: L10HypothesisSubjectClass.PROTOCOL_EXPLANATION,
    legalScopeTypes: ['PROTOCOL', 'TOKEN'], description: 'Explanatory problem over a protocol.' },
  { subjectClass: L10HypothesisSubjectClass.SECTOR_EXPLANATION,
    legalScopeTypes: ['SECTOR', 'ECOSYSTEM'], description: 'Sector-level explanatory problem.' },
  { subjectClass: L10HypothesisSubjectClass.CHAIN_EXPLANATION,
    legalScopeTypes: ['CHAIN'], description: 'Chain-level explanatory problem.' },
  { subjectClass: L10HypothesisSubjectClass.ECOSYSTEM_EXPLANATION,
    legalScopeTypes: ['ECOSYSTEM', 'CHAIN'], description: 'Ecosystem explanatory problem.' },
  { subjectClass: L10HypothesisSubjectClass.NARRATIVE_CLUSTER_EXPLANATION,
    legalScopeTypes: ['NARRATIVE_CLUSTER', 'SECTOR'], description: 'Narrative cluster explanatory problem.' },
  { subjectClass: L10HypothesisSubjectClass.MARKET_EXPLANATION,
    legalScopeTypes: ['MARKET'], description: 'Market-wide explanatory problem.' },
];

let _defaultReg: L10HypothesisSubjectClassRegistry | null = null;
export function getDefaultL10HypothesisSubjectClassRegistry(): L10HypothesisSubjectClassRegistry {
  if (!_defaultReg) {
    _defaultReg = new L10HypothesisSubjectClassRegistry();
    for (const r of DEFAULTS) _defaultReg.register(r);
  }
  return _defaultReg;
}
