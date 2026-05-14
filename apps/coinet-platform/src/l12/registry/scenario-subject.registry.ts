/**
 * L12.2 — Scenario subject registry (§12.2.16).
 *
 * Tracks scenario subjects emitted by callers. Enforces id uniqueness and
 * basic structural completeness. The registry is in-memory and replay-safe.
 */

import { L12ScenarioSubject } from '../contracts/scenario-subject';

const SUBJECTS: Map<string, L12ScenarioSubject> = new Map();

export interface L12SubjectRegistrationResult {
  readonly registered: boolean;
  readonly reason?: string;
}

export function registerL12ScenarioSubject(
  subject: L12ScenarioSubject,
): L12SubjectRegistrationResult {
  if (!subject.scenario_subject_id) {
    return { registered: false, reason: 'subject_id missing' };
  }
  if (SUBJECTS.has(subject.scenario_subject_id)) {
    return { registered: false, reason: 'duplicate subject_id' };
  }
  SUBJECTS.set(subject.scenario_subject_id, subject);
  return { registered: true };
}

export function getRegisteredL12ScenarioSubject(
  id: string,
): L12ScenarioSubject | undefined {
  return SUBJECTS.get(id);
}

export function isL12ScenarioSubjectRegistered(id: string): boolean {
  return SUBJECTS.has(id);
}

export function listRegisteredL12ScenarioSubjects(): readonly L12ScenarioSubject[] {
  return [...SUBJECTS.values()];
}

export function clearL12ScenarioSubjectRegistry(): void {
  SUBJECTS.clear();
}

export function getL12ScenarioSubjectRegistryCount(): number {
  return SUBJECTS.size;
}
