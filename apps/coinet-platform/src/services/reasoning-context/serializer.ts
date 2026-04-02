/**
 * Serializes a ReasoningContext into a clean text block for LLM injection.
 *
 * Rule: every number comes from the typed context. No interpolation from raw objects.
 */

import type { ReasoningContext } from './types';

export function serializeReasoningContext(ctx: ReasoningContext): string {
  const parts: string[] = [];

  if (ctx.quantum) {
    const q = ctx.quantum;
    const lines = [
      `── QUANTUM RISK ASSESSMENT — ${ctx.asset} ───────────────────────────────────────`,
      `Quantum Risk Score: ${q.score}/100 (${q.state})`,
      q.explanation,
      '',
      `Key exposure: ${q.exposure_pct}% of supply uses quantum-vulnerable key types`,
      `Dormant vulnerable supply: ${q.dormant_supply_btc.toLocaleString()} BTC in long-dormant exposed addresses`,
      `PQC migration progress: ${q.migration_progress_pct}%`,
      '',
      `Score components: exposure=${q.components.exposure} dormant=${q.components.dormant} migration=${q.components.migration}`,
      `Scenarios: fast_quantum ${q.scenarios.fast_quantum ? 'TRIGGERED' : 'inactive'} | slow_quantum ${q.scenarios.slow_quantum ? 'TRIGGERED' : 'inactive'}`,
      `Confidence: ${Math.round(q.confidence * 100)}% | Version: ${q.version}`,
    ];

    if (q.prohibit_directional_claims) {
      lines.push('');
      lines.push('⚠ DIRECTIONAL CLAIMS PROHIBITED — data quality too low for risk assessment.');
    }

    if (q.degradation.missing_inputs.length > 0) {
      lines.push('');
      lines.push(`Missing inputs: ${q.degradation.missing_inputs.join(', ')}`);
    }

    lines.push('');
    lines.push('RULES FOR USING THIS DATA:');
    lines.push('- Quantum risk is a long-horizon structural concern, NOT a short-term trading signal.');
    lines.push(`- You MUST cite the exact score (${q.score}/100), state (${q.state}), and confidence (${Math.round(q.confidence * 100)}%).`);
    lines.push(`- You MUST cite the exact exposure (${q.exposure_pct}%) and dormant supply (${q.dormant_supply_btc.toLocaleString()} BTC).`);
    lines.push('- Do NOT invent additional quantum risk data beyond what is provided here.');
    lines.push('- Do NOT overstate certainty beyond the confidence level.');
    if (q.prohibit_directional_claims) {
      lines.push('- Do NOT make directional claims (bullish/bearish) about quantum risk.');
    }
    lines.push('─────────────────────────────────────────────────────────────────────────');

    parts.push(lines.join('\n'));
  }

  // System state with L1.1 truth fingerprint
  const ss = ctx.system_state;
  const fp = ss.truth_fingerprint;
  const stateLines = [
    `── SOURCE GOVERNANCE — ${ctx.asset} ────────────────────────────────────────────`,
    `Sources available: ${ss.sources_available}/${ss.sources_total}`,
  ];
  if (ss.failed_sources.length > 0) {
    stateLines.push(`Failed: ${ss.failed_sources.join(', ')}`);
  }

  if (fp) {
    stateLines.push('');
    stateLines.push('Truth domain visibility (L1.1 doctrine):');
    for (const entry of fp.entries) {
      if (entry.truth_class === 'reasoning_expression') continue;
      const label = entry.truth_class.replace(/_/g, ' ');
      stateLines.push(`  ${label}: ${entry.visibility} (authority: ${entry.authority_level})`);
    }
    if (fp.blind_spots.length > 0) {
      stateLines.push('');
      stateLines.push(`Blind spots: ${fp.blind_spots.map(s => s.replace(/_/g, ' ')).join(', ')}`);
    }
    if (fp.tensions.length > 0) {
      stateLines.push('');
      stateLines.push('Active tensions:');
      for (const t of fp.tensions) {
        stateLines.push(`  - ${t}`);
      }
    }
    stateLines.push(`Overall coverage: ${Math.round(fp.overall_coverage * 100)}%`);
  } else if (ss.blind_domains.length > 0) {
    stateLines.push(`Blind domains: ${ss.blind_domains.join(', ')}`);
  }

  stateLines.push('');
  stateLines.push('RULES: Do NOT make strong claims about domains marked as blind or absent.');
  stateLines.push('Qualify claims when authority is low. Preserve tension rather than hiding it.');
  stateLines.push('──────────────────────────────────────────────────────────────────────────');
  parts.push(stateLines.join('\n'));

  return parts.join('\n\n');
}
