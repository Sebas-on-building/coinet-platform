/**
 * Chat Audit Logger — stores every BTC query for grounding evaluation.
 * In-memory for now; can be persisted to DB later.
 */

import type { ChatAuditEntry, AuditStats, GroundingCheckSummary } from './types';
import type { ReasoningContext, GroundingReport } from '../reasoning-context/types';

const auditLog: ChatAuditEntry[] = [];
let entryCounter = 0;

export function logChatAudit(
  asset: string,
  prompt: string,
  contextSerialized: string,
  response: string,
  ctx: ReasoningContext,
  grounding: GroundingReport,
): ChatAuditEntry {
  entryCounter++;
  const entry: ChatAuditEntry = {
    id: `audit_${Date.now()}_${entryCounter}`,
    timestamp: new Date().toISOString(),
    asset,
    prompt,
    context_serialized: contextSerialized,
    response,
    grounding_verdict: grounding.verdict,
    grounding_passed: grounding.passed,
    grounding_failed: grounding.failed,
    grounding_checks: grounding.checks.map(c => ({
      field: c.field,
      passed: !c.hallucinated,
      hallucinated: c.hallucinated,
      detail: c.detail,
    })),
    quantum_score: ctx.quantum?.score ?? null,
    quantum_state: ctx.quantum?.state ?? null,
    quantum_confidence: ctx.quantum?.confidence ?? null,
    sources_available: ctx.system_state.sources_available,
    sources_total: ctx.system_state.sources_total,
  };

  auditLog.push(entry);
  return entry;
}

export function getAuditLog(): ChatAuditEntry[] {
  return [...auditLog];
}

export function getAuditStats(): AuditStats {
  if (auditLog.length === 0) {
    return {
      total_entries: 0,
      clean_count: 0,
      minor_count: 0,
      hallucination_count: 0,
      hallucination_rate: 0,
      avg_grounding_score: 0,
      most_common_failures: [],
    };
  }

  const clean = auditLog.filter(e => e.grounding_verdict === 'CLEAN').length;
  const minor = auditLog.filter(e => e.grounding_verdict === 'MINOR_ISSUE').length;
  const hallucination = auditLog.filter(e => e.grounding_verdict === 'HALLUCINATION_DETECTED').length;

  const avgScore = auditLog.reduce((sum, e) => {
    const total = e.grounding_passed + e.grounding_failed;
    return sum + (total > 0 ? e.grounding_passed / total : 1);
  }, 0) / auditLog.length;

  const failureCounts: Record<string, number> = {};
  for (const entry of auditLog) {
    for (const check of entry.grounding_checks) {
      if (check.hallucinated) {
        failureCounts[check.field] = (failureCounts[check.field] || 0) + 1;
      }
    }
  }

  const mostCommon = Object.entries(failureCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([field, count]) => ({ field, count }));

  return {
    total_entries: auditLog.length,
    clean_count: clean,
    minor_count: minor,
    hallucination_count: hallucination,
    hallucination_rate: hallucination / auditLog.length,
    avg_grounding_score: Math.round(avgScore * 100) / 100,
    most_common_failures: mostCommon,
  };
}

export function getAuditCount(): number {
  return auditLog.length;
}

export function clearAuditLog(): void {
  auditLog.length = 0;
}
