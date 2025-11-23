/// <reference lib="webworker" />
import { parseFormula, evalFormulaOnData } from '../lib/formula';

addEventListener('message', (event) => {
  const { formula, data } = event.data;
  try {
    const ast = parseFormula(formula);
    const resultSeries = evalFormulaOnData(ast, data);
    postMessage({ result: resultSeries });
  } catch (err: any) {
    postMessage({ error: err.message || 'Formula evaluation error' });
  }
}); 