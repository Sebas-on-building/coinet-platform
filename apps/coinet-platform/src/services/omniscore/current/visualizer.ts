// ═══════════════════════════════════════════════════════════════════════════════
// OMNISCORE VISUALIZER (ASCII / MARKDOWN)
// ═══════════════════════════════════════════════════════════════════════════════

import { OmniScoreProductionResponse } from '../../omniscore-v2.5';
import { DEFAULT_QS_THRESHOLD, DEFAULT_OS_THRESHOLD } from '../../omniscore-constants';

export interface VisualizerProject {
  ticker: string;
  qs: number;
  os: number | null; // null if gated
  pos: number;
  posAdj: number;
  confidence: string;
  nmiTier: string;
  sector?: string;
  capBucket?: string;
}

/**
 * Generate a text-based quadrant visualization for chat responses
 */
export function generateQuadrantVisualization(projects: VisualizerProject[]): string {
  if (projects.length === 0) return '';

  // Sort by POS_adj descending
  const sorted = [...projects].sort((a, b) => b.posAdj - a.posAdj);

  // 1. Ranked List
  let output = `### 🏆 OmniScore Rankings\n\n`;
  output += `_POS* = posAdj (if available), else POS_\n\n`;
  output += `| Rank | Project | POS* | QS | OS | Confidence | Risk |\n`;
  output += `|:--|:--|:--|:--|:--|:--|:--|\n`;
  
  sorted.forEach((p, i) => {
    const osDisplay = p.os === null ? '🔒 GATED' : p.os.toFixed(0);
    const riskIcon = p.nmiTier === 'clean' ? '✅' : p.nmiTier === 'suspicious' ? '⚠️' : '🚨';
    output += `| ${i + 1} | **${p.ticker}** | **${p.posAdj.toFixed(1)}** | ${p.qs.toFixed(0)} | ${osDisplay} | ${p.confidence} | ${riskIcon} ${p.nmiTier} |\n`;
  });
  output += `\n`;

  // 2. Coordinate Table
  output += `### 📍 Quadrant Position\n\n`;
  output += `QS threshold = ${DEFAULT_QS_THRESHOLD} | OS threshold = ${DEFAULT_OS_THRESHOLD}\n\n`;
  output += `> **Target Zone** (Q1): High Quality + High Potential\n`;
  output += `> **Hype Zone** (Q2): Low Quality + High Potential (Risky)\n`;
  output += `> **Builder Zone** (Q4): High Quality + Low Potential (Undervalued)\n\n`;

  // 3. ASCII Quadrant Map
  // We'll plot projects on a 2x2 grid roughly
  // Q1: QS>=60, OS>=60
  // Q2: QS<60, OS>=60
  // Q3: QS<60, OS<60
  // Q4: QS>=60, OS<60
  
  const q1 = projects.filter(p => p.qs >= DEFAULT_QS_THRESHOLD && (p.os ?? DEFAULT_OS_THRESHOLD) >= DEFAULT_OS_THRESHOLD);
  const q2 = projects.filter(p => p.qs < DEFAULT_QS_THRESHOLD && (p.os ?? DEFAULT_OS_THRESHOLD) >= DEFAULT_OS_THRESHOLD);
  const q3 = projects.filter(p => p.qs < DEFAULT_QS_THRESHOLD && (p.os ?? DEFAULT_OS_THRESHOLD) < DEFAULT_OS_THRESHOLD);
  const q4 = projects.filter(p => p.qs >= DEFAULT_QS_THRESHOLD && (p.os ?? DEFAULT_OS_THRESHOLD) < DEFAULT_OS_THRESHOLD);

  const formatList = (list: VisualizerProject[]) => {
    if (list.length === 0) return '  (empty)';
    return list.map(p => `  • ${p.ticker} (QS${p.qs.toFixed(0)}, OS${p.os === null ? '🔒' : p.os.toFixed(0)})`).join('\n');
  };

  output += '```\n';
  output += '                OS (Potential) ↑\n';
  output += '      High                          High\n';
  output += '      ┌──────────────────────────────┐\n';
  output += '      │  Hype/Spec Zone (Q2)         │\n'; // Q2 is Top Left (Low QS, High OS) - wait, standard graph X is QS.
  // Standard Graph:
  // Q2 (Top Left) | Q1 (Top Right)
  // --------------+---------------
  // Q3 (Bot Left) | Q4 (Bot Right)
  
  // Actually, prompt says:
  // Q1: High OS / High QS = Target Zone
  // Q2: High OS / Low QS = Hype/Spec Zone
  // If X=QS, Y=OS:
  // Top Right = High QS, High OS = Q1
  // Top Left = Low QS, High OS = Q2
  
  // So:
  output += '      │  Hype/Spec Zone (Q2)         │  Target Zone (Q1)            │\n';
  output += '      │  (Low QS, High OS)           │  (High QS, High OS)          │\n';
  
  // We can't easily draw side-by-side lists in ASCII without fixed width messiness.
  // Let's list them block by block roughly mapped.
  
  // Actually, let's try a vertical split if few items, or just list them in quadrant blocks.
  // The user prompt example used a specific layout:
  /*
      ┌──────────────────────────────┐
      │  Target Zone                 │
      │  ...                         │
      ├──────────────────────────────┤
      │  Hype/Spec Zone              │
      │  ...                         │
      └──────────────────────────────┘
  */
  // But that example layout had Target on Top and Hype below?
  // "Target Zone (High QS, High OS)" vs "Hype/Spec Zone (Low QS, High OS)"
  // If Y is OS, both are High OS. They should be side-by-side.
  
  // Let's adhere to the prompt's layout request which was:
  /*
      High                  High
      ┌──────────────────────────────┐
      │  Target Zone                 │
      │  (High QS, High OS)          │
      │  • ETH ...                   │
      ├──────────────────────────────┤
      │  Hype/Spec Zone              │
      │  ...                         │
      └──────────────────────────────┘
      Low                   Low
  */
  // Wait, if Hype is Low QS/High OS, and Target is High/High, they share the Top half.
  // The prompt's ASCII example stacked them vertically?
  // "Target Zone" (Top box)
  // "Hype/Spec Zone" (Bottom box)
  // This implies the prompt's example might have been conceptual or simplifed.
  // Or maybe it meant Q1 vs Q2.
  
  // Let's make a better 2x2 grid representation.
  
  output = `### 📊 OmniScore Quadrant Map\n\n`;
  output += '```text\n';
  output += '                 High OS (Potential) \n';
  output += '        ┌──────────────────────┬──────────────────────┐\n';
  output += '        │ HYPE / SPEC (Q2)     │ TARGET ZONE (Q1)     │\n';
  output += '        │ (Low QS, High OS)    │ (High QS, High OS)   │\n';
  output += '        │                      │                      │\n';
  
  // We need to fit items into these columns. 
  // Let's format lines.
  const maxLinesTop = Math.max(q2.length, q1.length);
  for (let i = 0; i < maxLinesTop; i++) {
    const p2 = q2[i] ? `${q2[i].ticker} ${q2[i].os===null?'🔒':q2[i].os?.toFixed(0)}` : '';
    const p1 = q1[i] ? `${q1[i].ticker} ${q1[i].os===null?'🔒':q1[i].os?.toFixed(0)}` : '';
    // Pad to ~20 chars
    const col2 = p2.padEnd(20).substring(0, 20);
    const col1 = p1.padEnd(20).substring(0, 20);
    output += `        │ ${col2} │ ${col1} │\n`;
  }
  if (maxLinesTop === 0) output += `        │                      │                      │\n`;

  output += '        ├──────────────────────┼──────────────────────┤\n';
  output += '        │ AVOID ZONE (Q3)      │ BUILDER ZONE (Q4)    │\n';
  output += '        │ (Low QS, Low OS)     │ (High QS, Low OS)    │\n';
  output += '        │                      │                      │\n';

  const maxLinesBot = Math.max(q3.length, q4.length);
  for (let i = 0; i < maxLinesBot; i++) {
    const p3 = q3[i] ? `${q3[i].ticker} ${q3[i].os===null?'🔒':q3[i].os?.toFixed(0)}` : '';
    const p4 = q4[i] ? `${q4[i].ticker} ${q4[i].os===null?'🔒':q4[i].os?.toFixed(0)}` : '';
    const col3 = p3.padEnd(20).substring(0, 20);
    const col4 = p4.padEnd(20).substring(0, 20);
    output += `        │ ${col3} │ ${col4} │\n`;
  }
  if (maxLinesBot === 0) output += `        │                      │                      │\n`;

  output += '        └──────────────────────┴──────────────────────┘\n';
  output += '      Low QS (Quality)                    High QS\n';
  output += '```\n';

  return output;
}

/**
 * Format a single project response with visual elements
 */
export function formatOmniScoreVisual(response: OmniScoreProductionResponse): string {
  const p = response;
  // This is for single project, maybe just return the standard text
  // The visualizer is mostly for comparisons.
  return ''; 
}

