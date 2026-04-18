/**
 * L6.2 — Null Policy Contract
 *
 * §6.1.6.3 / §6.2.6.1 — Silent neutralization is forbidden. Every primitive
 * must declare its explicit policy for missing inputs. Missingness stays
 * explicit; it never becomes a silent "neutral" value.
 */

export enum L6NullPolicy {
  REJECT_IF_MISSING = 'REJECT_IF_MISSING',
  DEGRADE_EXPLICITLY = 'DEGRADE_EXPLICITLY',
  PROVISIONAL_IF_PARTIAL = 'PROVISIONAL_IF_PARTIAL',
  BLOCKED_UNTIL_RECOVERED = 'BLOCKED_UNTIL_RECOVERED',
  EXPLICIT_ABSENT_STATE = 'EXPLICIT_ABSENT_STATE',
}

export const ALL_NULL_POLICIES: readonly L6NullPolicy[] = Object.values(L6NullPolicy);

export const FORBIDDEN_NULL_POLICY_TOKENS: readonly string[] = [
  'ZERO_FILL',
  'NEUTRAL_FILL',
  'DEFAULT_NEUTRAL',
  'TREAT_AS_NORMAL',
  'ASSUME_ZERO',
  'SILENT_DEFAULT',
];

export interface NullPolicySpec {
  readonly policy: L6NullPolicy;
  readonly rationale: string;
  readonly fieldsCovered: readonly string[];
}

export function isForbiddenNullPolicyToken(token: string): boolean {
  return FORBIDDEN_NULL_POLICY_TOKENS.includes(token.toUpperCase());
}
