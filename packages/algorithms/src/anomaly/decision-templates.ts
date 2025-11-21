import type { TradingDecision } from './decision-types';

export function buildDecisionExplanation(d: TradingDecision): string {
  const parts: string[] = [];

  parts.push(`Decision ${d.id}: ${d.action.toUpperCase()} ${d.asset} size=${d.size}`);
  parts.push(`Confidence: ${(d.confidence * 100).toFixed(1)}%`);

  if (d.risk) {
    parts.push(`Risk: VaR=${d.risk.var ?? 'n/a'}, CVaR=${d.risk.cvar ?? 'n/a'}, Sharpe=${d.risk.sharpe ?? 'n/a'}`);
  }

  if (d.execution) {
    const slip = d.execution.slippageBps !== undefined ? `, slip=${d.execution.slippageBps}bps` : '';
    parts.push(`Exec: ${d.execution.strategy}${slip}`);
  }

  if (d.compliance?.restricted) {
    parts.push('Compliance: RESTRICTED');
  }

  parts.push(`Rationale: ${d.rationale}`);
  return parts.join(' | ');
}
