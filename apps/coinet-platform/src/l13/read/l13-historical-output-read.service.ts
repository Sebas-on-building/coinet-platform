/**
 * L13.10 — Historical Output Read Service
 *
 * §13.10.29 / §13.10.30 — Governed read surface for historical
 * output facts. Append-only; never mutates.
 */

import type { L13HistoricalAIOutputFact } from '../contracts/l13-historical-output-fact';
import {
  getAllL13HistoricalAIOutputFacts,
  getL13HistoricalAIOutputFactsByOutputId,
} from './l13-durable-store';

export function readL13HistoricalAIOutputFactsByOutputId(
  outputId: string,
): readonly L13HistoricalAIOutputFact[] {
  return getL13HistoricalAIOutputFactsByOutputId(outputId);
}

export function readAllL13HistoricalAIOutputFacts():
  readonly L13HistoricalAIOutputFact[] {
  return getAllL13HistoricalAIOutputFacts();
}
