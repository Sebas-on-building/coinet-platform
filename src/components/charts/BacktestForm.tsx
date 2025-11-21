/**
 * Backtest Form Component
 * 
 * A form for configuring and running trading strategy backtests.
 * Allows settings for time period, strategy conditions, and trade parameters.
 */

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import {
  ChevronDownIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { twMerge } from 'tailwind-merge';
import { BacktestConfig } from '@/lib/backtester';
import { useFormulaCompute } from '@/hooks/useFormulaCompute';
import { Candle } from '@/lib/indicators/types';
import { validateFormula } from '@/lib/formula';

// Tooltip component
const Tooltip: React.FC<{ children: React.ReactNode; text: string }> = ({ children, text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex"
      >
        {children}
      </div>
      {show && (
        <div className="absolute left-full ml-2 top-0 z-10 w-64 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
          {text}
        </div>
      )}
    </div>
  );
};

interface BacktestFormProps {
  symbol: string;
  timeframes: { id: string; label: string }[];
  onSubmit: (config: BacktestConfig) => void;
  isLoading?: boolean;
  onExport?: () => void;
  candles?: Candle[];
  className?: string;
}

const BacktestForm: React.FC<BacktestFormProps> = ({
  symbol,
  timeframes,
  onSubmit,
  isLoading = false,
  onExport,
  candles = [],
  className
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Form state
  const [timeframe, setTimeframe] = useState(timeframes[0]?.id || '1h');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [startCapital, setStartCapital] = useState<number>(10000);
  const [tradeSize, setTradeSize] = useState<number>(10);

  const [longCondition, setLongCondition] = useState<string>('close > SMA(20)');
  const [exitLongCondition, setExitLongCondition] = useState<string>('close < SMA(20)');
  const [shortCondition, setShortCondition] = useState<string>('');
  const [exitShortCondition, setExitShortCondition] = useState<string>('');

  const [useStopLoss, setUseStopLoss] = useState<boolean>(false);
  const [stopLossPercent, setStopLossPercent] = useState<number>(5);
  const [useTakeProfit, setUseTakeProfit] = useState<boolean>(false);
  const [takeProfitPercent, setTakeProfitPercent] = useState<number>(15);
  const [commission, setCommission] = useState<number>(0.1);
  const [slippage, setSlippage] = useState<number>(0.05);

  // Validate formula syntax
  const longFormulaValid = longCondition ? validateFormula(longCondition) : true;
  const shortFormulaValid = shortCondition ? validateFormula(shortCondition) : true;
  const exitLongFormulaValid = exitLongCondition ? validateFormula(exitLongCondition) : true;
  const exitShortFormulaValid = exitShortCondition ? validateFormula(exitShortCondition) : true;

  // Check if any formula is provided
  const hasStrategy = longCondition || shortCondition;

  // Check if form is valid
  const isValid = hasStrategy && longFormulaValid && shortFormulaValid &&
    exitLongFormulaValid && exitShortFormulaValid;

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || isLoading) return;

    const config: BacktestConfig = {
      symbol,
      startCapital,
      tradeSize,
      useStopLoss,
      useTakeProfit,
      allowSimultaneousTrades: true,
      commissionPercent: commission,
      slippagePercent: slippage
    };

    // Only add conditions if they are provided
    if (longCondition) config.longCondition = longCondition;
    if (exitLongCondition) config.exitLongCondition = exitLongCondition;
    if (shortCondition) config.shortCondition = shortCondition;
    if (exitShortCondition) config.exitShortCondition = exitShortCondition;

    // Add optional parameters
    if (useStopLoss) config.stopLossPercent = stopLossPercent;
    if (useTakeProfit) config.takeProfitPercent = takeProfitPercent;

    onSubmit(config);
  };

  return (
    <div className={twMerge(
      'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm',
      className
    )}>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Backtest Configuration: {symbol}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Time Range Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              Time Range & Settings
              <Tooltip text="Select the timeframe and date range for your backtest. Historical data will be loaded for the given period.">
                <InformationCircleIcon className="w-4 h-4 ml-1 text-gray-400" />
              </Tooltip>
            </h3>

            <div className="space-y-3">
              {/* Timeframe selection */}
              <div>
                <label htmlFor="timeframe" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Timeframe
                </label>
                <select
                  id="timeframe"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                    text-gray-900 dark:text-gray-100 text-sm py-2 px-3 focus:outline-none focus:ring-2 
                    focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  {timeframes.map(tf => (
                    <option key={tf.id} value={tf.id}>
                      {tf.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="startDate" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                      text-gray-900 dark:text-gray-100 text-sm py-2 px-3 focus:outline-none focus:ring-2 
                      focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                      text-gray-900 dark:text-gray-100 text-sm py-2 px-3 focus:outline-none focus:ring-2 
                      focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Capital & Trade Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="startCapital" className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Start Capital
                    <Tooltip text="Initial capital to use for backtesting">
                      <InformationCircleIcon className="w-4 h-4 ml-1 text-gray-400" />
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      id="startCapital"
                      value={startCapital}
                      onChange={(e) => setStartCapital(Number(e.target.value))}
                      min="100"
                      step="100"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                        text-gray-900 dark:text-gray-100 text-sm py-2 pl-7 pr-3 focus:outline-none focus:ring-2 
                        focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tradeSize" className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Trade Size
                    <Tooltip text="Percentage of capital to use for each trade">
                      <InformationCircleIcon className="w-4 h-4 ml-1 text-gray-400" />
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="tradeSize"
                      value={tradeSize}
                      onChange={(e) => setTradeSize(Number(e.target.value))}
                      min="1"
                      max="100"
                      step="1"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                        text-gray-900 dark:text-gray-100 text-sm py-2 px-3 pr-9 focus:outline-none focus:ring-2 
                        focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction Costs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="commission" className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Commission
                    <Tooltip text="Trading fee as percentage of trade value">
                      <InformationCircleIcon className="w-4 h-4 ml-1 text-gray-400" />
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="commission"
                      value={commission}
                      onChange={(e) => setCommission(Number(e.target.value))}
                      min="0"
                      max="5"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                        text-gray-900 dark:text-gray-100 text-sm py-2 px-3 pr-9 focus:outline-none focus:ring-2 
                        focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="slippage" className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Slippage
                    <Tooltip text="Price slippage as percentage of price">
                      <InformationCircleIcon className="w-4 h-4 ml-1 text-gray-400" />
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="slippage"
                      value={slippage}
                      onChange={(e) => setSlippage(Number(e.target.value))}
                      min="0"
                      max="5"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                        text-gray-900 dark:text-gray-100 text-sm py-2 px-3 pr-9 focus:outline-none focus:ring-2 
                        focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              Strategy Conditions
              <Tooltip text="Define your trading strategy using formula conditions. You can use price data (open, high, low, close, volume) and indicators like SMA(20), EMA(14), RSI(14), etc.">
                <InformationCircleIcon className="w-4 h-4 ml-1 text-gray-400" />
              </Tooltip>
            </h3>

            <div className="space-y-3">
              {/* Long Entry Condition */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="longCondition" className="block text-xs text-gray-500 dark:text-gray-400">
                    Long Entry Condition
                  </label>
                  {longCondition && !longFormulaValid && (
                    <span className="text-xs text-red-500 flex items-center">
                      <ExclamationCircleIcon className="w-3 h-3 mr-1" />
                      Invalid formula
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  id="longCondition"
                  value={longCondition}
                  onChange={(e) => setLongCondition(e.target.value)}
                  placeholder="e.g. close > SMA(20)"
                  className={twMerge(
                    "w-full rounded-md border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm py-2 px-3 focus:outline-none focus:ring-2",
                    longFormulaValid
                      ? "border-gray-300 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400"
                      : "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
                  )}
                />
              </div>

              {/* Long Exit Condition */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="exitLongCondition" className="block text-xs text-gray-500 dark:text-gray-400">
                    Long Exit Condition
                  </label>
                  {exitLongCondition && !exitLongFormulaValid && (
                    <span className="text-xs text-red-500 flex items-center">
                      <ExclamationCircleIcon className="w-3 h-3 mr-1" />
                      Invalid formula
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  id="exitLongCondition"
                  value={exitLongCondition}
                  onChange={(e) => setExitLongCondition(e.target.value)}
                  placeholder="e.g. close < SMA(20)"
                  className={twMerge(
                    "w-full rounded-md border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm py-2 px-3 focus:outline-none focus:ring-2",
                    exitLongFormulaValid
                      ? "border-gray-300 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400"
                      : "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
                  )}
                />
              </div>

              {/* Short Entry Condition */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="shortCondition" className="block text-xs text-gray-500 dark:text-gray-400">
                    Short Entry Condition (optional)
                  </label>
                  {shortCondition && !shortFormulaValid && (
                    <span className="text-xs text-red-500 flex items-center">
                      <ExclamationCircleIcon className="w-3 h-3 mr-1" />
                      Invalid formula
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  id="shortCondition"
                  value={shortCondition}
                  onChange={(e) => setShortCondition(e.target.value)}
                  placeholder="e.g. close < SMA(20)"
                  className={twMerge(
                    "w-full rounded-md border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm py-2 px-3 focus:outline-none focus:ring-2",
                    shortFormulaValid
                      ? "border-gray-300 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400"
                      : "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
                  )}
                />
              </div>

              {/* Short Exit Condition */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="exitShortCondition" className="block text-xs text-gray-500 dark:text-gray-400">
                    Short Exit Condition (optional)
                  </label>
                  {exitShortCondition && !exitShortFormulaValid && (
                    <span className="text-xs text-red-500 flex items-center">
                      <ExclamationCircleIcon className="w-3 h-3 mr-1" />
                      Invalid formula
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  id="exitShortCondition"
                  value={exitShortCondition}
                  onChange={(e) => setExitShortCondition(e.target.value)}
                  placeholder="e.g. close > SMA(20)"
                  className={twMerge(
                    "w-full rounded-md border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm py-2 px-3 focus:outline-none focus:ring-2",
                    exitShortFormulaValid
                      ? "border-gray-300 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400"
                      : "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Risk Management Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              Risk Management
              <Tooltip text="Configure stop-loss and take-profit levels to manage risk and protect profits.">
                <InformationCircleIcon className="w-4 h-4 ml-1 text-gray-400" />
              </Tooltip>
            </h3>

            <div className="space-y-3">
              {/* Stop Loss */}
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="useStopLoss"
                    checked={useStopLoss}
                    onChange={(e) => setUseStopLoss(e.target.checked)}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded border-gray-300 dark:border-gray-700"
                  />
                  <label htmlFor="useStopLoss" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Use Stop Loss
                  </label>
                </div>

                {useStopLoss && (
                  <div className="relative ml-6">
                    <input
                      type="number"
                      id="stopLossPercent"
                      value={stopLossPercent}
                      onChange={(e) => setStopLossPercent(Number(e.target.value))}
                      min="0.1"
                      max="50"
                      step="0.1"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                        text-gray-900 dark:text-gray-100 text-sm py-2 px-3 pr-9 focus:outline-none focus:ring-2 
                        focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                )}
              </div>

              {/* Take Profit */}
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="useTakeProfit"
                    checked={useTakeProfit}
                    onChange={(e) => setUseTakeProfit(e.target.checked)}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded border-gray-300 dark:border-gray-700"
                  />
                  <label htmlFor="useTakeProfit" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Use Take Profit
                  </label>
                </div>

                {useTakeProfit && (
                  <div className="relative ml-6">
                    <input
                      type="number"
                      id="takeProfitPercent"
                      value={takeProfitPercent}
                      onChange={(e) => setTakeProfitPercent(Number(e.target.value))}
                      min="0.1"
                      max="100"
                      step="0.1"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                        text-gray-900 dark:text-gray-100 text-sm py-2 px-3 pr-9 focus:outline-none focus:ring-2 
                        focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                )}
              </div>

              {/* Formula Helper */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 mt-4">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  Formula Examples:
                </h4>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• <code>close {'>'} SMA(20)</code> - Price above 20-period SMA</li>
                  <li>• <code>close {'>'} open</code> - Bullish candle</li>
                  <li>• <code>RSI(14) {'<'} 30</code> - RSI oversold condition</li>
                  <li>• <code>MACD(12,26,9) {'>'} 0</code> - MACD above zero</li>
                  <li>• <code>close {'>'} high[1]</code> - Price above previous high</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="mt-4 flex space-x-3">
                <button
                  type="submit"
                  disabled={!isValid || isLoading}
                  className={twMerge(
                    "flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2",
                    isValid && !isLoading
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Running Backtest...
                    </>
                  ) : (
                    'Run Backtest'
                  )}
                </button>

                {onExport && (
                  <button
                    type="button"
                    onClick={onExport}
                    className="flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium
                      bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700
                      hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                    Export Data
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BacktestForm; 