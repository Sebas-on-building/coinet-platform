/**
 * L5.4 Universal Write Contract — Typed Projection Law
 *
 * §5.4.16 — Typed Projection Law
 *
 * The typed projection exists for validation and routing.
 * It may not invent semantics absent from payload, strip
 * required evidence, become shadow authority, or diverge silently.
 */

export interface TypedProjectionValidation {
  readonly valid: boolean;
  readonly violations: readonly string[];
}

/**
 * Verify that typed_projection does not invent keys absent from payload.
 * Projection may omit data but may not add data.
 */
export function validateTypedProjection(
  payload: unknown,
  projection: unknown,
): TypedProjectionValidation {
  if (projection === null || projection === undefined) {
    return { valid: true, violations: [] };
  }

  if (typeof projection !== 'object' || typeof payload !== 'object') {
    return { valid: true, violations: [] };
  }

  if (payload === null) {
    return { valid: false, violations: ['Projection exists but payload is null'] };
  }

  const violations: string[] = [];
  const payloadObj = payload as Record<string, unknown>;
  const projObj = projection as Record<string, unknown>;

  for (const key of Object.keys(projObj)) {
    if (!(key in payloadObj)) {
      violations.push(`Projection contains key '${key}' absent from payload`);
    }
  }

  return { valid: violations.length === 0, violations };
}
