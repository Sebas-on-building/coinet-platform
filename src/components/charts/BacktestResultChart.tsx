/**
 * Backtest Result Chart
 * 
 * Visualizes backtest results using Recharts, showing equity curve,
 * trade performance, monthly returns and key metrics.
 * 
 * Features a professional design inspired by TradingView and Bloomberg.
 */

import React, { useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
  ComposedChart, Scatter, ZAxis, Brush
} from 'recharts';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  CalculatorIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { Trade, EquityPoint, MonthlyReturn } from '@/lib/backtester';
import { twMerge } from 'tailwind-merge';

export interface BacktestResultData {
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

interface BacktestResultChartProps {
  data: BacktestResultData;
  symbol: string;
  timeframe: string;
  className?: string;
}

const BacktestResultChart: React.FC<BacktestResultChartProps> = ({
  data,
  symbol,
  timeframe,
  className
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // State for active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'monthly' | 'drawdown'>('overview');

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Chart colors
  const colors = {
    equity: isDark ? '#10B981' : '#047857', // emerald-500/700
    drawdown: isDark ? '#EF4444' : '#B91C1C', // red-500/700
    profit: isDark ? '#10B981' : '#047857', // emerald-500/700
    loss: isDark ? '#EF4444' : '#B91C1C', // red-500/700
    grid: isDark ? '#374151' : '#E5E7EB', // gray-700/200
    axis: isDark ? '#9CA3AF' : '#6B7280', // gray-400/500
    text: isDark ? '#D1D5DB' : '#374151', // gray-300/700
    tooltip: {
      bg: isDark ? '#1F2937' : '#FFFFFF', // gray-800/white
      border: isDark ? '#374151' : '#E5E7EB', // gray-700/200
      text: isDark ? '#F9FAFB' : '#1F2937' // gray-50/800
    }
  };

  // Transform data for drawdown chart
  const drawdownData = useMemo(() => {
    if (!data.equityCurve.length) return [];

    let peak = data.equityCurve[0].value;
    return data.equityCurve.map(point => {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = peak > 0 ? ((peak - point.value) / peak) * 100 : 0;
      return {
        time: point.time,
        value: point.value,
        drawdown: -drawdown // Negative to show it going down
      };
    });
  }, [data.equityCurve]);

  // Transform data for trades chart
  const tradesData = useMemo(() => {
    return data.trades.map((trade, index) => ({
      index: index + 1,
      profit: trade.profitPct,
      isProfit: trade.profitPct > 0,
      entryDate: formatDate(trade.entryTime),
      exitDate: trade.exitTime ? formatDate(trade.exitTime) : 'Open',
      duration: trade.exitTime
        ? Math.round((trade.exitTime - trade.entryTime) / (1000 * 60 * 60 * 24))
        : 0,
      ...trade
    }));
  }, [data.trades]);

  // Prepare monthly returns data
  const monthlyReturnsData = useMemo(() => {
    return [...data.monthlyReturns].sort((a, b) => a.month.localeCompare(b.month));
  }, [data.monthlyReturns]);

  // Calculate cumulative returns for equity curve
  const cumulativeData = useMemo(() => {
    if (!data.equityCurve.length) return [];

    const initialValue = data.equityCurve[0].value;
    return data.equityCurve.map(point => ({
      time: point.time,
      value: point.value,
      percentChange: ((point.value - initialValue) / initialValue) * 100
    }));
  }, [data.equityCurve]);

  return (
    <div className={twMerge(
      'rounded-xl overflow-hidden shadow-md',
      'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Backtest Results: {symbol} ({timeframe})
            </h2>
            {data.strategyDescription && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {data.strategyDescription}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className={twMerge(
              'px-2 py-1 rounded-md text-sm font-medium',
              data.totalReturn >= 0
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
            )}>
              {formatPercent(data.totalReturn)}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={twMerge(
            'px-4 py-2 text-sm font-medium',
            activeTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={twMerge(
            'px-4 py-2 text-sm font-medium',
            activeTab === 'trades'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          Trades
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={twMerge(
            'px-4 py-2 text-sm font-medium',
            activeTab === 'monthly'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          Monthly Returns
        </button>
        <button
          onClick={() => setActiveTab('drawdown')}
          className={twMerge(
            'px-4 py-2 text-sm font-medium',
            activeTab === 'drawdown'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          Drawdown
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center">
                  <div className={twMerge(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  )}>
                    <CurrencyDollarIcon className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Return</div>
                    <div className={twMerge(
                      'text-base font-semibold',
                      data.totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {formatPercent(data.totalReturn)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center">
                  <div className={twMerge(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  )}>
                    <ArrowDownIcon className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Max Drawdown</div>
                    <div className="text-base font-semibold text-red-600 dark:text-red-400">
                      {formatPercent(-data.maxDrawdown)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center">
                  <div className={twMerge(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  )}>
                    <CalculatorIcon className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Win Rate</div>
                    <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {data.winRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center">
                  <div className={twMerge(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  )}>
                    <ChartBarIcon className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Profit Factor</div>
                    <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {data.profitFactor === Infinity ? '∞' : data.profitFactor.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Equity Curve Chart */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Equity Curve</h3>
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={cumulativeData}>
                    <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={formatDate}
                      stroke={colors.axis}
                    />
                    <YAxis
                      yAxisId="value"
                      orientation="left"
                      tickFormatter={(value) => formatCurrency(value)}
                      stroke={colors.axis}
                    />
                    <YAxis
                      yAxisId="percent"
                      orientation="right"
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                      stroke={colors.axis}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.tooltip.bg,
                        borderColor: colors.tooltip.border,
                        color: colors.tooltip.text
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === 'value') return [formatCurrency(value), 'Equity'];
                        if (name === 'percentChange') return [formatPercent(value), 'Return'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      yAxisId="value"
                      fill={colors.equity}
                      fillOpacity={0.1}
                      stroke={colors.equity}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentChange"
                      yAxisId="percent"
                      stroke="#3B82F6" // blue-500
                      strokeWidth={1}
                      dot={false}
                    />
                    <Brush
                      dataKey="time"
                      height={30}
                      stroke={colors.axis}
                      tickFormatter={formatDate}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Sharpe Ratio</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.sharpeRatio.toFixed(2)}</div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Avg. Win</div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">{formatPercent(data.averageWin)}</div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Avg. Loss</div>
                <div className="text-lg font-semibold text-red-600 dark:text-red-400">{formatPercent(-data.averageLoss)}</div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Trades</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.trades.length}</div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Winning Trades</div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {data.trades.filter(t => t.profitPct > 0).length}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Max Consecutive Losses</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.maxConsecutiveLosses}</div>
              </div>
            </div>
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <div className="space-y-6">
            {/* Trades Chart */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trade Performance</h3>
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={tradesData}>
                    <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="index"
                      stroke={colors.axis}
                      label={{ value: 'Trade #', position: 'insideBottom', offset: -5, fill: colors.text }}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      stroke={colors.axis}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.tooltip.bg,
                        borderColor: colors.tooltip.border,
                        color: colors.tooltip.text
                      }}
                      formatter={(value: any, name: any) => {
                        return name === 'profit' ? [formatPercent(value), 'Profit/Loss'] : [value, name];
                      }}
                      labelFormatter={(label) => `Trade #${label}`}
                    />
                    <Bar
                      dataKey="profit"
                      radius={[4, 4, 0, 0]}
                      fill={(entry: any) => entry.isProfit ? colors.profit : colors.loss}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trades List */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      #
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Side
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Entry Date
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Exit Date
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Entry Price
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Exit Price
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      P/L %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {tradesData.slice(0, 15).map((trade) => (
                    <tr key={trade.index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {trade.index}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={twMerge(
                          'px-2 py-1 rounded-md text-xs font-medium',
                          trade.side === 'long'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                        )}>
                          {trade.side === 'long' ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {trade.entryDate}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {trade.exitDate}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatCurrency(trade.entryPrice)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}
                      </td>
                      <td className={twMerge(
                        'px-3 py-2 whitespace-nowrap text-sm font-medium text-right',
                        trade.isProfit
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      )}>
                        {formatPercent(trade.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tradesData.length > 15 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-3">
                  Showing 15 of {tradesData.length} trades
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly Returns Tab */}
        {activeTab === 'monthly' && (
          <div className="space-y-6">
            {/* Monthly Returns Chart */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monthly Returns</h3>
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyReturnsData}>
                    <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      stroke={colors.axis}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      stroke={colors.axis}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.tooltip.bg,
                        borderColor: colors.tooltip.border,
                        color: colors.tooltip.text
                      }}
                      formatter={(value: any) => [formatPercent(value), 'Return']}
                    />
                    <Bar
                      dataKey="return"
                      fill={(entry: any) => entry.return >= 0 ? colors.profit : colors.loss}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Returns Grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {monthlyReturnsData.map((month) => (
                <div
                  key={month.month}
                  className={twMerge(
                    'p-3 rounded-lg',
                    month.return >= 0
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50'
                  )}
                >
                  <div className="text-xs text-gray-600 dark:text-gray-400">{month.month}</div>
                  <div className={twMerge(
                    'text-sm font-medium',
                    month.return >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}>
                    {formatPercent(month.return)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drawdown Tab */}
        {activeTab === 'drawdown' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drawdown Analysis</h3>
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={drawdownData}>
                    <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={formatDate}
                      stroke={colors.axis}
                    />
                    <YAxis
                      yAxisId="value"
                      orientation="left"
                      tickFormatter={(value) => formatCurrency(value)}
                      stroke={colors.axis}
                    />
                    <YAxis
                      yAxisId="drawdown"
                      orientation="right"
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                      stroke={colors.axis}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.tooltip.bg,
                        borderColor: colors.tooltip.border,
                        color: colors.tooltip.text
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === 'value') return [formatCurrency(value), 'Equity'];
                        if (name === 'drawdown') return [formatPercent(value), 'Drawdown'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      yAxisId="value"
                      stroke={colors.equity}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      yAxisId="drawdown"
                      fill={colors.drawdown}
                      fillOpacity={0.2}
                      stroke={colors.drawdown}
                      dot={false}
                    />
                    <Brush
                      dataKey="time"
                      height={30}
                      stroke={colors.axis}
                      tickFormatter={formatDate}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Drawdown Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-sm text-gray-500 dark:text-gray-400">Maximum Drawdown</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatPercent(-data.maxDrawdown)}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The largest drop from peak to trough in portfolio value
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-sm text-gray-500 dark:text-gray-400">Recovery Factor</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(Math.abs(data.totalReturn) / data.maxDrawdown).toFixed(2)}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Total return divided by maximum drawdown
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-sm text-gray-500 dark:text-gray-400">Calmar Ratio</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.annualizedReturn
                    ? (data.annualizedReturn / data.maxDrawdown).toFixed(2)
                    : (data.totalReturn / data.maxDrawdown).toFixed(2)
                  }
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Annualized return divided by maximum drawdown
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestResultChart; 