/**
 * L7.5 — Contradiction Ontology Registry
 *
 * §7.5.4.4 — Registers every legal contradiction family with support
 * domains, challenge domains, legal subject classes, severity baseline,
 * blocking/cap defaults, and runtime-parent mapping.
 *
 * §7.5.4.5 — A contradiction family may only be applied where the
 * relevant support/challenge domains are present, the subject class is
 * legal for the family, and the contradiction is temporally relevant.
 */

import { L7ContradictionSeverity } from '../contracts/contradiction-bundle';
import {
  L7ContradictionFamilyClass,
  ALL_L7_CONTRADICTION_FAMILIES,
  L7ContradictionFamilyDescriptor,
  L7_CONTRADICTION_FAMILY_DESCRIPTORS,
  getBaselineSeverity,
} from '../contracts/contradiction-family';
import {
  L7ValidationSubjectClass,
  L7SupportPattern,
} from '../contracts/validation-subject-class';

export interface L7ContradictionFamilyApplicabilityInput {
  readonly family: L7ContradictionFamilyClass;
  readonly subjectClass: L7ValidationSubjectClass;
  readonly presentSupportDomains: readonly L7SupportPattern[];
  readonly presentChallengeDomains: readonly L7SupportPattern[];
  /** Support/challenge temporal freshness posture. */
  readonly temporallyRelevant: boolean;
}

export interface L7ContradictionFamilyApplicability {
  readonly applicable: boolean;
  readonly missingSupportDomains: readonly L7SupportPattern[];
  readonly missingChallengeDomains: readonly L7SupportPattern[];
  readonly subjectClassLegal: boolean;
  readonly temporallyRelevantSatisfied: boolean;
  readonly reasons: readonly string[];
}

export class L7ContradictionOntologyRegistry {
  private readonly byFamily: Map<
    L7ContradictionFamilyClass,
    L7ContradictionFamilyDescriptor
  >;

  constructor(
    descriptors: readonly L7ContradictionFamilyDescriptor[] = L7_CONTRADICTION_FAMILY_DESCRIPTORS,
  ) {
    this.byFamily = new Map(descriptors.map(d => [d.family, d]));
  }

  list(): readonly L7ContradictionFamilyDescriptor[] {
    return Array.from(this.byFamily.values());
  }

  get(
    family: L7ContradictionFamilyClass,
  ): L7ContradictionFamilyDescriptor | undefined {
    return this.byFamily.get(family);
  }

  isRegistered(code: string): code is L7ContradictionFamilyClass {
    return (ALL_L7_CONTRADICTION_FAMILIES as readonly string[]).includes(code);
  }

  baselineSeverity(
    family: L7ContradictionFamilyClass,
  ): L7ContradictionSeverity | undefined {
    return getBaselineSeverity(family);
  }

  /**
   * §7.5.4.5 — Determines whether a contradiction family may legally
   * fire against a given subject under the current surface posture.
   */
  checkApplicability(
    input: L7ContradictionFamilyApplicabilityInput,
  ): L7ContradictionFamilyApplicability {
    const d = this.byFamily.get(input.family);
    if (!d) {
      return {
        applicable: false,
        missingSupportDomains: [],
        missingChallengeDomains: [],
        subjectClassLegal: false,
        temporallyRelevantSatisfied: false,
        reasons: [`family ${input.family} is not registered`],
      };
    }

    const reasons: string[] = [];

    const present = new Set(input.presentSupportDomains);
    const missingSupport = d.supportDomains.filter(p => !present.has(p));
    if (missingSupport.length > 0) {
      reasons.push(`missing support domains: ${missingSupport.join(', ')}`);
    }

    const presentChallenge = new Set(input.presentChallengeDomains);
    const missingChallenge = d.challengeDomains.filter(p => !presentChallenge.has(p));
    if (missingChallenge.length > 0) {
      reasons.push(`missing challenge domains: ${missingChallenge.join(', ')}`);
    }

    const subjectClassLegal = d.legalSubjectClasses.includes(input.subjectClass);
    if (!subjectClassLegal) {
      reasons.push(`subject class ${input.subjectClass} not legal for family ${input.family}`);
    }

    const temporallyRelevantSatisfied =
      !d.temporalRelevanceRequired || input.temporallyRelevant;
    if (!temporallyRelevantSatisfied) {
      reasons.push(`family ${input.family} requires temporal relevance`);
    }

    const applicable =
      missingSupport.length === 0 &&
      missingChallenge.length === 0 &&
      subjectClassLegal &&
      temporallyRelevantSatisfied;

    return {
      applicable,
      missingSupportDomains: missingSupport,
      missingChallengeDomains: missingChallenge,
      subjectClassLegal,
      temporallyRelevantSatisfied,
      reasons,
    };
  }
}

const defaultContradictionOntologyRegistry = new L7ContradictionOntologyRegistry();

export function getDefaultContradictionOntologyRegistry(): L7ContradictionOntologyRegistry {
  return defaultContradictionOntologyRegistry;
}
