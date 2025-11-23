/**
 * Backtester Service
 * 
 * Simulates trading strategies on historical price data to calculate performance metrics.
 * Uses formula evaluation for signal generation and tracks portfolio value over time.
 */

import { Candle } from '@/lib/indicators/types';
import { parseFormula, evalFormulaOnData, createDataFromCandles } from './formula';

// Result interfaces
export interface Trade {
  entryTime: number;
  exitTime: number | null;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  side: 'long' | 'short';
  profitLoss: number;
  profitPct: number;
}

export interface EquityPoint {
  time: number;
  value: number;
}

export interface MonthlyReturn {
  month: string;
  return: number;
}

export interface BacktestResult {
  equityCurve: EquityPoint[];
  trades: Trade[];
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxConsecutiveLosses: number;
  monthlyReturns: MonthlyReturn[];
  annualizedReturn?: number;
  strategyDescription?: string;
}

export interface BacktestConfig {
  symbol: string;
  startCapital: number;
  longCondition?: string;
  shortCondition?: string;
  exitLongCondition?: string;
  exitShortCondition?: string;
  tradeSize: number; // percentage of capital per trade
  useStopLoss: boolean;
  stopLossPercent?: number;
  useTakeProfit: boolean;
  takeProfitPercent?: number;
  commissionPercent?: number;
  slippagePercent?: number;
  allowSimultaneousTrades?: boolean;
}

/**
 * Run a backtest simulation on historical data
 */
export async function runBacktest(
  candles: Candle[],
  config: BacktestConfig
): Promise<BacktestResult> {
  if (!candles || candles.length === 0) {
    throw new Error('No data for backtest');
  }

  // Prepare data for formula evaluation
  const dataSeries = createDataFromCandles(candles);

  // Parse and evaluate condition formulas
  let longSignals: number[] = [];
  let shortSignals: number[] = [];
  let exitLongSignals: number[] = [];
  let exitShortSignals: number[] = [];

  try {
    if (config.longCondition) {
      const longAst = parseFormula(config.longCondition);
      longSignals = evalFormulaOnData(longAst, dataSeries);
    }

    if (config.shortCondition) {
      const shortAst = parseFormula(config.shortCondition);
      shortSignals = evalFormulaOnData(shortAst, dataSeries);
    }

    if (config.exitLongCondition) {
      const exitLongAst = parseFormula(config.exitLongCondition);
      exitLongSignals = evalFormulaOnData(exitLongAst, dataSeries);
    }

    if (config.exitShortCondition) {
      const exitShortAst = parseFormula(config.exitShortCondition);
      exitShortSignals = evalFormulaOnData(exitShortAst, dataSeries);
    }
  } catch (err: any) {
    throw new Error(`Formula evaluation error: ${err.message}`);
  }

  // Initialize simulation state
  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  let equity = config.startCapital;
  let cash = equity;
  let position = 0;
  let entryPrice = 0;
  let entryTime = 0;
  let activeTradeType: 'long' | 'short' | null = null;

  const commission = config.commissionPercent ? config.commissionPercent / 100 : 0;
  const slippage = config.slippagePercent ? config.slippagePercent / 100 : 0;

  // Helper function to calculate the adjusted price with slippage
  const adjustedPrice = (price: number, isBuy: boolean): number => {
    return isBuy
      ? price * (1 + slippage) // Buy at a higher price
      : price * (1 - slippage); // Sell at a lower price
  };

  // Helper function to record a trade
  const recordTrade = (
    entryTime: number,
    exitTime: number,
    entryPrice: number,
    exitPrice: number,
    quantity: number,
    side: 'long' | 'short'
  ): Trade => {
    const isLong = side === 'long';
    const entryValue = entryPrice * quantity;
    const exitValue = exitPrice * quantity;

    // Calculate P&L based on position type
    const profitLoss = isLong
      ? exitValue - entryValue
      : entryValue - exitValue;

    // Calculate P&L %
    const profitPct = isLong
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100;

    return {
      entryTime,
      exitTime,
      entryPrice,
      exitPrice,
      quantity,
      side,
      profitLoss,
      profitPct
    };
  };

  // Record initial equity
  equityCurve.push({
    time: candles[0].time as number,
    value: equity
  });

  // Simulate trading
  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const time = candle.time as number;
    const price = candle.close;

    // Check for stop loss or take profit (if position is open)
    if (activeTradeType) {
      const isLong = activeTradeType === 'long';

      // Check stop loss
      if (config.useStopLoss && config.stopLossPercent) {
        const stopPrice = isLong
          ? entryPrice * (1 - config.stopLossPercent / 100)
          : entryPrice * (1 + config.stopLossPercent / 100);

        if ((isLong && candle.low <= stopPrice) || (!isLong && candle.high >= stopPrice)) {
          // Stop loss triggered
          const exitPrice = adjustedPrice(stopPrice, !isLong);
          const tradeValue = position * exitPrice;
          const tradeFee = tradeValue * commission;

          // Close position
          cash += tradeValue - tradeFee;

          // Record trade
          trades.push(recordTrade(
            entryTime,
            time,
            entryPrice,
            exitPrice,
            position,
            activeTradeType
          ));

          // Reset position
          position = 0;
          activeTradeType = null;
        }
      }

      // Check take profit
      if (activeTradeType && config.useTakeProfit && config.takeProfitPercent) {
        const takePrice = isLong
          ? entryPrice * (1 + config.takeProfitPercent / 100)
          : entryPrice * (1 - config.takeProfitPercent / 100);

        if ((isLong && candle.high >= takePrice) || (!isLong && candle.low <= takePrice)) {
          // Take profit triggered
          const exitPrice = adjustedPrice(takePrice, !isLong);
          const tradeValue = position * exitPrice;
          const tradeFee = tradeValue * commission;

          // Close position
          cash += tradeValue - tradeFee;

          // Record trade
          trades.push(recordTrade(
            entryTime,
            time,
            entryPrice,
            exitPrice,
            position,
            activeTradeType
          ));

          // Reset position
          position = 0;
          activeTradeType = null;
        }
      }
    }

    // Check exit signals (if position is open)
    if (activeTradeType === 'long' && exitLongSignals[i] > 0) {
      const exitPrice = adjustedPrice(price, false);
      const tradeValue = position * exitPrice;
      const tradeFee = tradeValue * commission;

      // Close position
      cash += tradeValue - tradeFee;

      // Record trade
      trades.push(recordTrade(
        entryTime,
        time,
        entryPrice,
        exitPrice,
        position,
        'long'
      ));

      // Reset position
      position = 0;
      activeTradeType = null;
    } else if (activeTradeType === 'short' && exitShortSignals[i] > 0) {
      const exitPrice = adjustedPrice(price, true);
      const tradeValue = position * exitPrice;
      const tradeFee = tradeValue * commission;

      // Close position (for short, we buy back)
      cash += entryPrice * position - tradeValue - tradeFee;

      // Record trade
      trades.push(recordTrade(
        entryTime,
        time,
        entryPrice,
        exitPrice,
        position,
        'short'
      ));

      // Reset position
      position = 0;
      activeTradeType = null;
    }

    // Check entry signals (if no position)
    if (!activeTradeType && config.allowSimultaneousTrades !== false) {
      // Check long signal
      if (longSignals[i] > 0) {
        const tradeAmount = (equity * config.tradeSize / 100);
        const entryPriceWithSlippage = adjustedPrice(price, true);
        const quantity = tradeAmount / entryPriceWithSlippage;
        const tradeFee = tradeAmount * commission;

        // Enter long position
        if (cash >= tradeAmount + tradeFee) {
          cash -= tradeAmount + tradeFee;
          position = quantity;
          entryPrice = entryPriceWithSlippage;
          entryTime = time;
          activeTradeType = 'long';
        }
      }
      // Check short signal
      else if (shortSignals[i] > 0) {
        const tradeAmount = (equity * config.tradeSize / 100);
        const entryPriceWithSlippage = adjustedPrice(price, false);
        const quantity = tradeAmount / entryPriceWithSlippage;
        const tradeFee = tradeAmount * commission;

        // Enter short position
        if (cash >= tradeAmount + tradeFee) {
          cash -= tradeFee; // Only pay commission now
          position = quantity;
          entryPrice = entryPriceWithSlippage;
          entryTime = time;
          activeTradeType = 'short';
        }
      }
    }

    // Update equity (cash + position value)
    const positionValue = position * price;
    equity = cash + (activeTradeType === 'short'
      ? cash - (position * (price - entryPrice))
      : positionValue);

    // Record equity
    equityCurve.push({
      time,
      value: equity
    });
  }

  // Close any open position at the end of the backtest
  if (activeTradeType) {
    const lastCandle = candles[candles.length - 1];
    const lastPrice = lastCandle.close;
    const lastTime = lastCandle.time as number;

    const exitPrice = adjustedPrice(lastPrice, activeTradeType === 'short');
    const tradeValue = position * exitPrice;
    const tradeFee = tradeValue * commission;

    // Close position
    cash += activeTradeType === 'long'
      ? tradeValue - tradeFee
      : (entryPrice * position) - tradeValue - tradeFee;

    // Record trade
    trades.push(recordTrade(
      entryTime,
      lastTime,
      entryPrice,
      exitPrice,
      position,
      activeTradeType
    ));

    // Final equity update
    equity = cash;
    equityCurve.push({
      time: lastTime,
      value: equity
    });
  }

  // Calculate performance metrics
  const totalReturn = ((equity - config.startCapital) / config.startCapital) * 100;

  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = equityCurve[0].value;

  for (const point of equityCurve) {
    if (point.value > peak) {
      peak = point.value;
    } else {
      const drawdown = (peak - point.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  // Calculate win rate
  const winningTrades = trades.filter(t => t.profitLoss > 0);
  const losingTrades = trades.filter(t => t.profitLoss <= 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  // Calculate average win/loss
  const averageWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.profitPct, 0) / winningTrades.length
    : 0;

  const averageLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profitPct, 0) / losingTrades.length)
    : 0;

  // Calculate profit factor
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.profitLoss, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Calculate max consecutive losses
  let maxConsecutiveLosses = 0;
  let currentConsecutiveLosses = 0;

  for (const trade of trades) {
    if (trade.profitLoss <= 0) {
      currentConsecutiveLosses++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
    } else {
      currentConsecutiveLosses = 0;
    }
  }

  // Calculate monthly returns
  const monthlyReturns: MonthlyReturn[] = [];
  const monthlyData: Record<string, { start: number, end: number }> = {};

  for (let i = 0; i < equityCurve.length; i++) {
    const point = equityCurve[i];
    const date = new Date(point.time);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = {
        start: point.value,
        end: point.value
      };
    } else {
      monthlyData[monthYear].end = point.value;
    }
  }

  Object.entries(monthlyData).forEach(([month, { start, end }]) => {
    monthlyReturns.push({
      month,
      return: ((end - start) / start) * 100
    });
  });

  // Calculate Sharpe ratio (assuming risk-free rate of 0)
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const dailyReturn = (equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value;
    returns.push(dailyReturn);
  }

  const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDeviation = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / returns.length
  );

  const sharpeRatio = stdDeviation > 0 ? (averageReturn / stdDeviation) * Math.sqrt(252) : 0;

  // Prepare final result
  return {
    equityCurve,
    trades,
    totalReturn,
    maxDrawdown: maxDrawdown * 100,
    sharpeRatio,
    winRate,
    averageWin,
    averageLoss,
    profitFactor,
    maxConsecutiveLosses,
    monthlyReturns,
    strategyDescription: `Long: ${config.longCondition}, Short: ${config.shortCondition}, Exit Long: ${config.exitLongCondition}, Exit Short: ${config.exitShortCondition}`
  };
}

/**
 * Fetch historical data for a symbol from server API
 */
export async function fetchHistoricalData(
  symbol: string,
  timeframe: string,
  from: Date | string | number,
  to: Date | string | number
): Promise<Candle[]> {
  try {
    const fromTimestamp = new Date(from).getTime();
    const toTimestamp = new Date(to).getTime();

    const response = await fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&from=${fromTimestamp}&to=${toTimestamp}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch historical data: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candles;
  } catch (error: any) {
    console.error('Error fetching historical data:', error);
    throw new Error(`Failed to fetch historical data: ${error.message}`);
  }
} 