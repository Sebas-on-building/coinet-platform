/**
 * L7.2 — Validation Output Class Registry
 *
 * §7.2.7.3 — Enumerates the four legal L7.2 output classes and their
 * field / lineage / replay / consumer requirements.
 */

import {
  L7ValidationOutputClass,
  ALL_VALIDATION_OUTPUT_CLASSES,
  REQUIRED_FIELDS_BY_OUTPUT,
} from '../contracts/validation-output-class';

export interface OutputClassDescriptor {
  readonly class: L7ValidationOutputClass;
  readonly required_fields: readonly string[];
  readonly required_lineage: readonly string[];
  readonly replay_required: boolean;
  readonly allowed_downstream_consumers: readonly string[];
  readonly description: string;
}

export const OUTPUT_CLASS_DESCRIPTORS: readonly OutputClassDescriptor[] = [
  {
    class: L7ValidationOutputClass.VALIDATION_ASSESSMENT,
    required_fields: REQUIRED_FIELDS_BY_OUTPUT[L7ValidationOutputClass.VALIDATION_ASSESSMENT],
    required_lineage: ['trace_id', 'manifest_id'],
    replay_required: true,
    allowed_downstream_consumers: ['L7.x', 'L8', 'L9'],
    description: 'Primary structured verdict on a claim candidate.',
  },
  {
    class: L7ValidationOutputClass.CONTRADICTION_BUNDLE,
    required_fields: REQUIRED_FIELDS_BY_OUTPUT[L7ValidationOutputClass.CONTRADICTION_BUNDLE],
    required_lineage: ['trace_id', 'manifest_id'],
    replay_required: true,
    allowed_downstream_consumers: ['L7.x', 'L8', 'L9'],
    description: 'Typed, lineage-linked record of material contradictions.',
  },
  {
    class: L7ValidationOutputClass.CONFIDENCE_ASSESSMENT,
    required_fields: REQUIRED_FIELDS_BY_OUTPUT[L7ValidationOutputClass.CONFIDENCE_ASSESSMENT],
    required_lineage: ['trace_id', 'manifest_id'],
    replay_required: true,
    allowed_downstream_consumers: ['L7.x', 'L8', 'L9'],
    description: 'Justified reliance score with factor breakdown.',
  },
  {
    class: L7ValidationOutputClass.CLAIM_RESTRICTION_PROFILE,
    required_fields: REQUIRED_FIELDS_BY_OUTPUT[L7ValidationOutputClass.CLAIM_RESTRICTION_PROFILE],
    required_lineage: ['trace_id', 'manifest_id'],
    replay_required: true,
    allowed_downstream_consumers: ['L7.x', 'L8', 'L9'],
    description: 'Machine-usable downstream usage rights.',
  },
];

export class ValidationOutputClassRegistry {
  private readonly byClass: Map<L7ValidationOutputClass, OutputClassDescriptor>;

  constructor(descriptors: readonly OutputClassDescriptor[] = OUTPUT_CLASS_DESCRIPTORS) {
    this.byClass = new Map(descriptors.map(d => [d.class, d]));
  }

  list(): readonly OutputClassDescriptor[] {
    return Array.from(this.byClass.values());
  }

  get(cls: L7ValidationOutputClass): OutputClassDescriptor | undefined {
    return this.byClass.get(cls);
  }

  isRegistered(cls: string): boolean {
    return ALL_VALIDATION_OUTPUT_CLASSES.includes(cls as L7ValidationOutputClass);
  }

  requiredFields(cls: L7ValidationOutputClass): readonly string[] {
    return this.byClass.get(cls)?.required_fields ?? [];
  }

  downstreamConsumers(cls: L7ValidationOutputClass): readonly string[] {
    return this.byClass.get(cls)?.allowed_downstream_consumers ?? [];
  }
}

const defaultOutputClassRegistry = new ValidationOutputClassRegistry();

export function getDefaultOutputClassRegistry(): ValidationOutputClassRegistry {
  return defaultOutputClassRegistry;
}
