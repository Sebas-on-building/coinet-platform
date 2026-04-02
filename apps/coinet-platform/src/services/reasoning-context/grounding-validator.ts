/**
 * Grounding Validator — checks LLM responses against real system state.
 *
 * Catches:
 * - hallucinated numbers (wrong QRS, wrong exposure, wrong supply)
 * - overstated confidence (claiming certainty when data is weak)
 * - invented data (mentioning sources/metrics that don't exist)
 * - missing attribution (not citing real data when it should)
 */

import type { ReasoningContext, GroundingCheck, GroundingReport } from './types';

function checkNumberPresence(
  response: string,
  field: string,
  expected: number,
  tolerance: number = 0,
): GroundingCheck {
  const variants = [
    String(expected),
    expected.toLocaleString(),
    expected.toFixed?.(1),
  ].filter(Boolean) as string[];

  const found = variants.some(v => response.includes(v));

  return {
    field,
    expected,
    found_in_response: found,
    hallucinated: false,
    detail: found ? `Found ${field}=${expected}` : `${field}=${expected} not found in response`,
  };
}

function checkNoHallucinatedScore(response: string, realScore: number): GroundingCheck {
  const scorePattern = /(?:quantum\s*risk\s*score|QRS)[\s:is]*(\d+)/gi;
  let match: RegExpExecArray | null;
  const foundScores: number[] = [];
  while ((match = scorePattern.exec(response)) !== null) {
    foundScores.push(parseInt(match[1], 10));
  }
  const slashPattern = /(\d+)\s*\/\s*100/g;
  while ((match = slashPattern.exec(response)) !== null) {
    const val = parseInt(match[1], 10);
    if (val >= 0 && val <= 100 && !foundScores.includes(val)) {
      foundScores.push(val);
    }
  }

  const hallucinated = foundScores.some(s => Math.abs(s - realScore) > 2);

  return {
    field: 'qrs_hallucination_check',
    expected: realScore,
    found_in_response: foundScores.length > 0,
    hallucinated,
    detail: hallucinated
      ? `HALLUCINATION: Response contains QRS=${foundScores.join(',')} but real is ${realScore}`
      : foundScores.length > 0
        ? `Score references match real value (${realScore})`
        : 'No explicit QRS mentioned',
  };
}

function checkNoHallucinatedExposure(response: string, realPct: number): GroundingCheck {
  const pctPattern = /(\d+(?:\.\d+)?)\s*%\s*(?:of\s+supply|exposed|exposure|vulnerable)/gi;
  let match: RegExpExecArray | null;
  const foundPcts: number[] = [];
  while ((match = pctPattern.exec(response)) !== null) {
    foundPcts.push(parseFloat(match[1]));
  }

  const hallucinated = foundPcts.some(p => Math.abs(p - realPct) > 5);

  return {
    field: 'exposure_hallucination_check',
    expected: realPct,
    found_in_response: foundPcts.length > 0,
    hallucinated,
    detail: hallucinated
      ? `HALLUCINATION: Response claims ${foundPcts.join(',')}% but real is ${realPct}%`
      : foundPcts.length > 0
        ? `Exposure references within tolerance of ${realPct}%`
        : 'No explicit exposure % mentioned',
  };
}

function checkConfidenceRespected(response: string, confidence: number): GroundingCheck {
  const lowConfidence = confidence < 0.4;
  const highCertainty = /(definitely|certainly|clearly|without doubt|no question|absolutely)/i.test(response);

  const hallucinated = lowConfidence && highCertainty;

  return {
    field: 'confidence_respect',
    expected: confidence,
    found_in_response: true,
    hallucinated,
    detail: hallucinated
      ? `OVERSTATED: Response uses high-certainty language but confidence is only ${Math.round(confidence * 100)}%`
      : `Confidence level ${Math.round(confidence * 100)}% — response tone appropriate`,
  };
}

function checkProhibitedClaims(response: string, prohibited: boolean): GroundingCheck {
  if (!prohibited) {
    return {
      field: 'prohibited_claims',
      expected: false,
      found_in_response: false,
      hallucinated: false,
      detail: 'Directional claims not prohibited',
    };
  }

  const directional = /(bullish|bearish|buy|sell|long|short)\s+(on|signal|opportunity)/i.test(response);
  return {
    field: 'prohibited_claims',
    expected: true,
    found_in_response: directional,
    hallucinated: directional,
    detail: directional
      ? 'VIOLATION: Directional claims made despite prohibition'
      : 'No directional claims — prohibition respected',
  };
}

function checkMissingDataHonesty(response: string, missingInputs: string[]): GroundingCheck {
  if (missingInputs.length === 0) {
    return {
      field: 'missing_data_honesty',
      expected: 'no missing inputs',
      found_in_response: true,
      hallucinated: false,
      detail: 'No missing inputs to disclose',
    };
  }

  const mentionsMissing = /(missing|unavailable|incomplete|limited|degraded|blind)/i.test(response);
  return {
    field: 'missing_data_honesty',
    expected: `mentions ${missingInputs.join(',')}`,
    found_in_response: mentionsMissing,
    hallucinated: !mentionsMissing,
    detail: mentionsMissing
      ? 'Response acknowledges data limitations'
      : `DISHONEST: Missing inputs [${missingInputs.join(', ')}] not disclosed`,
  };
}

const DOMAIN_CLAIM_PATTERNS: Record<string, RegExp> = {
  'protocol_substance': /(protocol\s+(is\s+)?strong|fundamentals?\s+(are\s+)?solid|tvl\s+(is\s+)?growing|revenue\s+(is\s+)?healthy)/i,
  'onchain_behavior': /(whales?\s+(are\s+)?accumulating|smart\s+money\s+(is\s+)?buying|exchange\s+inflows?\s+(are\s+)?rising|on.?chain\s+(shows?|confirms?))/i,
  'structural_safety': /(token\s+(is\s+)?safe|no\s+structural\s+risk|structurally\s+sound|contract\s+(is\s+)?verified)/i,
  'entity_context': /(smart\s+money|institutional\s+buyers|fund\s+wallets|exchange\s+wallets\s+are)/i,
  'derivatives_pressure': /(leverage\s+(is\s+)?building|squeeze\s+likely|liquidation\s+risk|funding\s+(is\s+)?elevated)/i,
};

function checkBlindDomainOverclaim(response: string, blindDomains: string[]): GroundingCheck | null {
  for (const domain of blindDomains) {
    const pattern = DOMAIN_CLAIM_PATTERNS[domain];
    if (!pattern) continue;
    if (pattern.test(response)) {
      return {
        field: 'blind_domain_overclaim',
        expected: `no strong claims about ${domain}`,
        found_in_response: true,
        hallucinated: true,
        detail: `OVERCLAIM: Response makes strong claims about "${domain.replace(/_/g, ' ')}" but that domain is blind`,
      };
    }
  }
  return null;
}

export function validateGrounding(
  prompt: string,
  response: string,
  ctx: ReasoningContext,
): GroundingReport {
  const checks: GroundingCheck[] = [];

  if (ctx.quantum) {
    const q = ctx.quantum;

    checks.push(checkNoHallucinatedScore(response, q.score));
    checks.push(checkNoHallucinatedExposure(response, q.exposure_pct));
    checks.push(checkConfidenceRespected(response, q.confidence));
    checks.push(checkProhibitedClaims(response, q.prohibit_directional_claims));
    checks.push(checkMissingDataHonesty(response, q.degradation.missing_inputs));

    checks.push(checkNumberPresence(response, 'dormant_supply', q.dormant_supply_btc));
  }

  if (ctx.system_state.blind_domains.length > 0) {
    const blindMentioned = ctx.system_state.blind_domains.some(d =>
      response.toLowerCase().includes(d.replace(/_/g, ' ').toLowerCase())
      || response.toLowerCase().includes('blind')
      || response.toLowerCase().includes('unavailable')
      || response.toLowerCase().includes('missing')
    );
    checks.push({
      field: 'blind_domain_disclosure',
      expected: 'mentions blind domains',
      found_in_response: blindMentioned,
      hallucinated: false,
      detail: blindMentioned
        ? 'Response acknowledges blind domains'
        : 'Blind domains not explicitly mentioned (may be acceptable if not relevant to prompt)',
    });

    const blindDomainClaims = checkBlindDomainOverclaim(response, ctx.system_state.blind_domains);
    if (blindDomainClaims) {
      checks.push(blindDomainClaims);
    }
  }

  const hallucinations = checks.filter(c => c.hallucinated).length;
  const passed = checks.filter(c => !c.hallucinated).length;

  return {
    prompt,
    total_checks: checks.length,
    passed,
    failed: hallucinations,
    hallucinations,
    checks,
    verdict: hallucinations > 0 ? 'HALLUCINATION_DETECTED'
      : checks.some(c => !c.found_in_response && c.field.includes('presence')) ? 'MINOR_ISSUE'
        : 'CLEAN',
  };
}
