/**
 * L9.2 — Sequence Output Class Registry
 *
 * §9.2.10.2 — Runtime registry wrapping the seven first-class L9 output
 * classes. Every emitted L9 object must declare one of these classes;
 * unregistered output classes are rejected by the output validator.
 */

import {
  L9SequenceOutputClass,
  L9SequenceOutputClassDescriptor,
  L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS,
  getL9SequenceOutputClassDescriptor,
  isL9RegisteredSequenceOutputClass,
} from '../contracts/sequence-output-class';

export class L9SequenceOutputClassRegistry {
  private readonly byClass: Map<
    L9SequenceOutputClass,
    L9SequenceOutputClassDescriptor
  >;

  constructor(
    descriptors: readonly L9SequenceOutputClassDescriptor[] = L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS,
  ) {
    this.byClass = new Map(descriptors.map(d => [d.outputClass, d]));
  }

  list(): readonly L9SequenceOutputClassDescriptor[] {
    return Array.from(this.byClass.values());
  }

  get(cls: L9SequenceOutputClass): L9SequenceOutputClassDescriptor | undefined {
    return this.byClass.get(cls);
  }

  isRegistered(value: string): boolean {
    return this.byClass.has(value as L9SequenceOutputClass);
  }

  requiresEvidence(cls: L9SequenceOutputClass): boolean {
    return this.byClass.get(cls)?.requiresEvidence ?? false;
  }

  requiresLineage(cls: L9SequenceOutputClass): boolean {
    return this.byClass.get(cls)?.requiresLineage ?? false;
  }

  requiresReplayHash(cls: L9SequenceOutputClass): boolean {
    return this.byClass.get(cls)?.requiresReplayHash ?? false;
  }

  requiresRestrictionProfile(cls: L9SequenceOutputClass): boolean {
    return this.byClass.get(cls)?.requiresRestrictionProfile ?? false;
  }
}

const defaultOutputClassRegistry = new L9SequenceOutputClassRegistry();

export function getDefaultL9SequenceOutputClassRegistry():
  L9SequenceOutputClassRegistry {
  return defaultOutputClassRegistry;
}

export {
  getL9SequenceOutputClassDescriptor,
  isL9RegisteredSequenceOutputClass,
  L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS,
};
