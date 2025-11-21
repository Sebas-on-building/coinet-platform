/**
 * Formula Parser and Evaluator
 * 
 * Uses jsep to parse user-defined formulas and evaluate them against data series.
 * Provides a safe execution environment for user-defined expressions.
 */

import jsep, { Expression } from 'jsep';
import { calculateSMA } from './indicators/sma';
import { calculateEMA } from './indicators/ema';
import { calculateRSI } from './indicators/rsi';
import { calculateMACD } from './indicators/macd';
import { calculateBollingerBands } from './indicators/bollinger';
import { Candle, Series } from './indicators/types';

// Extend jsep to handle our custom functions
jsep.addBinaryOp('?', 10);
jsep.addBinaryOp(':', 10);

// Add type guards to improve type safety
function isIdentifierNode(node: Expression): node is jsep.Identifier {
  return node.type === 'Identifier';
}

function isBinaryExpressionNode(node: Expression): node is jsep.BinaryExpression {
  return node.type === 'BinaryExpression';
}

function isUnaryExpressionNode(node: Expression): node is jsep.UnaryExpression {
  return node.type === 'UnaryExpression';
}

function isCallExpressionNode(node: Expression): node is jsep.CallExpression {
  return node.type === 'CallExpression';
}

function isConditionalExpressionNode(node: Expression): node is jsep.ConditionalExpression {
  return node.type === 'ConditionalExpression';
}

function isLiteralNode(node: Expression): node is jsep.Literal {
  return node.type === 'Literal';
}

// Pre-process known function calls to make them usable with jsep
export function preprocessFormula(formula: string): string {
  // Replace known functions with safe identifiers
  // For example: SMA(20) -> SMA_20
  const functionRegex = /(SMA|EMA|RSI|MACD|BBANDS)\\((\\d+)(?:,(\\d+)(?:,(\\d+))?)?\\)/g;
  return formula.replace(functionRegex, (match, fn, p1, p2, p3) => {
    if (fn === 'SMA' || fn === 'EMA' || fn === 'RSI') {
      return `${fn}_${p1}`;
    } else if (fn === 'MACD') {
      const fast = p1 || '12';
      const slow = p2 || '26';
      const signal = p3 || '9';
      return `${fn}_${fast}_${slow}_${signal}`;
    } else if (fn === 'BBANDS') {
      const period = p1 || '20';
      const stdDev = p2 || '2';
      return `${fn}_${period}_${stdDev}`;
    }
    return match;
  });
}

/**
 * Parse a formula string into a jsep expression
 */
export function parseFormula(formula: string): Expression {
  // Basic sanitation: disallow certain patterns for safety
  if (/document|window|process|require|eval|Function|setTimeout|setInterval|fetch/i.test(formula)) {
    throw new Error('Disallowed identifiers in formula');
  }

  // Preprocess to handle function calls
  const processedFormula = preprocessFormula(formula);

  try {
    return jsep(processedFormula);
  } catch (err: any) {
    throw new Error(`Formula parsing error: ${err.message}`);
  }
}

/**
 * Validate if a formula is syntactically correct
 */
export function validateFormula(formula: string): boolean {
  try {
    parseFormula(formula);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Evaluate a parsed expression against series data
 */
export function evalFormulaOnData(
  ast: Expression,
  dataSeries: Record<string, number[]>
): number[] {
  // Get length of data series (all should be the same length)
  const length = Object.values(dataSeries)[0]?.length || 0;
  if (length === 0) return [];

  // Pre-compute any technical indicators needed by the formula
  const computedSeries = prepareIndicators(ast, dataSeries);

  // Combine original data with computed indicators
  const allData = { ...dataSeries, ...computedSeries };

  // Evaluate for each point in the series
  const result: number[] = [];
  for (let i = 0; i < length; i++) {
    try {
      const value = evaluateAst(ast, allData, i);
      result.push(value);
    } catch (err) {
      // For evaluation errors, push NaN to maintain series length
      result.push(NaN);
    }
  }

  return result;
}

/**
 * Recursively find and prepare any indicators referenced in the AST
 */
function prepareIndicators(
  node: Expression,
  data: Record<string, number[]>
): Record<string, number[]> {
  const result: Record<string, number[]> = {};

  // Extract series needed for calculations
  const series: Series = data.close || [];

  if (isIdentifierNode(node)) {
    const name = node.name;

    // Pattern match for preprocessed indicator names
    // Example: SMA_20, EMA_50, RSI_14, MACD_12_26_9
    const smaMatch = name.match(/^SMA_(\d+)$/);
    const emaMatch = name.match(/^EMA_(\d+)$/);
    const rsiMatch = name.match(/^RSI_(\d+)$/);
    const macdMatch = name.match(/^MACD_(\d+)_(\d+)_(\d+)$/);

    if (smaMatch && !result[name]) {
      const period = parseInt(smaMatch[1], 10);
      const smaResult = calculateSMA(series, period);
      // Convert any null values to NaN
      result[name] = smaResult.map(val => val === null ? NaN : val);
    } else if (emaMatch && !result[name]) {
      const period = parseInt(emaMatch[1], 10);
      const emaResult = calculateEMA(series, period);
      result[name] = emaResult.map(val => val === null ? NaN : val);
    } else if (rsiMatch && !result[name]) {
      const period = parseInt(rsiMatch[1], 10);
      const rsiResult = calculateRSI(series, period);
      result[name] = rsiResult.map(val => val === null ? NaN : val);
    } else if (macdMatch && !result[name]) {
      const fastPeriod = parseInt(macdMatch[1], 10);
      const slowPeriod = parseInt(macdMatch[2], 10);
      const signalPeriod = parseInt(macdMatch[3], 10);
      const macdResult = calculateMACD(series, fastPeriod, slowPeriod, signalPeriod);
      result[name] = macdResult.macdLine.map(val => val === null ? NaN : val);
      result[`${name}_signal`] = macdResult.signalLine.map(val => val === null ? NaN : val);
      result[`${name}_hist`] = macdResult.histogram.map(val => val === null ? NaN : val);
    }
  }

  // Recursively check child nodes
  if (isBinaryExpressionNode(node)) {
    const leftIndicators = prepareIndicators(node.left, data);
    const rightIndicators = prepareIndicators(node.right, data);
    Object.assign(result, leftIndicators, rightIndicators);
  } else if (isUnaryExpressionNode(node)) {
    const argIndicators = prepareIndicators(node.argument, data);
    Object.assign(result, argIndicators);
  } else if (isCallExpressionNode(node)) {
    node.arguments.forEach((arg) => {
      const argIndicators = prepareIndicators(arg, data);
      Object.assign(result, argIndicators);
    });
  } else if (isConditionalExpressionNode(node)) {
    const testIndicators = prepareIndicators(node.test, data);
    const consequentIndicators = prepareIndicators(node.consequent, data);
    const alternateIndicators = prepareIndicators(node.alternate, data);
    Object.assign(result, testIndicators, consequentIndicators, alternateIndicators);
  }

  return result;
}

/**
 * Recursively evaluate a jsep AST for a specific index in the data series
 */
function evaluateAst(
  node: Expression,
  data: Record<string, number[]>,
  index: number
): number {
  switch (node.type) {
    case 'BinaryExpression': {
      if (isBinaryExpressionNode(node)) {
        const left = evaluateAst(node.left, data, index);
        const right = evaluateAst(node.right, data, index);

        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return right !== 0 ? left / right : NaN;
          case '%': return right !== 0 ? left % right : NaN;
          case '^': return Math.pow(left, right);
          case '>': return left > right ? 1 : 0;
          case '<': return left < right ? 1 : 0;
          case '>=': return left >= right ? 1 : 0;
          case '<=': return left <= right ? 1 : 0;
          case '==': return left === right ? 1 : 0;
          case '!=': return left !== right ? 1 : 0;
          case '&&': return left && right ? 1 : 0;
          case '||': return left || right ? 1 : 0;
          case '?': throw new Error('Ternary operator used incorrectly');
          case ':': throw new Error('Ternary operator used incorrectly');
          default: throw new Error(`Unsupported operator ${node.operator}`);
        }
      }
      throw new Error('Invalid binary expression node');
    }

    case 'UnaryExpression': {
      if (isUnaryExpressionNode(node)) {
        const val = evaluateAst(node.argument, data, index);

        switch (node.operator) {
          case '+': return +val;
          case '-': return -val;
          case '!': return !val ? 1 : 0;
          default: throw new Error(`Unsupported unary operator ${node.operator}`);
        }
      }
      throw new Error('Invalid unary expression node');
    }

    case 'Literal': {
      if (isLiteralNode(node)) {
        const val = node.value;
        return typeof val === 'number' ? val : NaN;
      }
      throw new Error('Invalid literal node');
    }

    case 'Identifier': {
      if (isIdentifierNode(node)) {
        const series = data[node.name];
        if (!series) throw new Error(`Unknown identifier ${node.name}`);
        return series[index] ?? NaN;
      }
      throw new Error('Invalid identifier node');
    }

    case 'ConditionalExpression': {
      if (isConditionalExpressionNode(node)) {
        const test = evaluateAst(node.test, data, index);
        return test ? evaluateAst(node.consequent, data, index) : evaluateAst(node.alternate, data, index);
      }
      throw new Error('Invalid conditional expression node');
    }

    case 'CallExpression': {
      if (isCallExpressionNode(node)) {
        // Handle any remaining function calls that weren't preprocessed
        const callee = node.callee as jsep.Identifier;
        const fnName = callee.name;
        const args = node.arguments.map((arg: Expression) => evaluateAst(arg, data, index));

        switch (fnName) {
          case 'abs': return Math.abs(args[0]);
          case 'min': return Math.min(...args);
          case 'max': return Math.max(...args);
          case 'avg': return args.reduce((sum: number, val: number) => sum + val, 0) / args.length;
          case 'sqrt': return Math.sqrt(args[0]);
          case 'log': return Math.log(args[0]);
          case 'round': return Math.round(args[0]);
          case 'floor': return Math.floor(args[0]);
          case 'ceil': return Math.ceil(args[0]);
          default: throw new Error(`Unknown function ${fnName}`);
        }
      }
      throw new Error('Invalid call expression node');
    }

    default:
      throw new Error(`Unsupported expression type: ${node.type}`);
  }
}

/**
 * Helper function to create a data object for formula evaluation from candles
 */
export function createDataFromCandles(candles: Candle[]): Record<string, Series> {
  const open = candles.map(c => c.open);
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const close = candles.map(c => c.close);
  const volume = candles.map(c => c.volume || 0);

  // Add support for accessing previous values through array notation
  // e.g. close[1] for the previous close
  const lookbackOpen: Record<string, number[]> = {};
  const lookbackHigh: Record<string, number[]> = {};
  const lookbackLow: Record<string, number[]> = {};
  const lookbackClose: Record<string, number[]> = {};
  const lookbackVolume: Record<string, number[]> = {};

  // Create lookback arrays for each data point (up to lookback 10)
  for (let i = 1; i <= 10; i++) {
    lookbackOpen[i] = [NaN, ...open.slice(0, -1)];
    lookbackHigh[i] = [NaN, ...high.slice(0, -1)];
    lookbackLow[i] = [NaN, ...low.slice(0, -1)];
    lookbackClose[i] = [NaN, ...close.slice(0, -1)];
    lookbackVolume[i] = [NaN, ...volume.slice(0, -1)];
  }

  // Pre-calculate common indicators
  const sma20 = calculateSMA(close, 20);
  const sma50 = calculateSMA(close, 50);
  const sma200 = calculateSMA(close, 200);
  const ema12 = calculateEMA(close, 12);
  const ema26 = calculateEMA(close, 26);
  const rsi14 = calculateRSI(close, 14);
  const macd = calculateMACD(close, 12, 26, 9);
  const bbands20 = calculateBollingerBands(close, 20, 2);

  // Remove null values from indicator arrays
  const cleanArray = (arr: (number | null)[]): number[] => arr.map(val => val === null ? NaN : val);

  return {
    open,
    high,
    low,
    close,
    volume,

    // Add lookback data
    ...Object.fromEntries(Object.entries(lookbackOpen).map(([k, v]) => [`open_${k}`, v])),
    ...Object.fromEntries(Object.entries(lookbackHigh).map(([k, v]) => [`high_${k}`, v])),
    ...Object.fromEntries(Object.entries(lookbackLow).map(([k, v]) => [`low_${k}`, v])),
    ...Object.fromEntries(Object.entries(lookbackClose).map(([k, v]) => [`close_${k}`, v])),
    ...Object.fromEntries(Object.entries(lookbackVolume).map(([k, v]) => [`volume_${k}`, v])),

    // Add pre-calculated indicators
    SMA_20: cleanArray(sma20),
    SMA_50: cleanArray(sma50),
    SMA_200: cleanArray(sma200),
    EMA_12: cleanArray(ema12),
    EMA_26: cleanArray(ema26),
    RSI_14: cleanArray(rsi14),
    MACD_12_26_9: cleanArray(macd.macdLine),
    MACD_SIGNAL_12_26_9: cleanArray(macd.signalLine),
    MACD_HIST_12_26_9: cleanArray(macd.histogram),
    BBANDS_UPPER_20_2: cleanArray(bbands20.upper),
    BBANDS_MIDDLE_20_2: cleanArray(bbands20.middle),
    BBANDS_LOWER_20_2: cleanArray(bbands20.lower),
  };
} 