import React from 'react';
import { GasMetrics } from '@/services/blockchain';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface GasTrackerProps {
  gasData: GasMetrics;
  chainSymbol: string;
}

/**
 * GasTracker component
 * 
 * Displays detailed gas price information with historical chart
 */
export const GasTracker: React.FC<GasTrackerProps> = ({ gasData, chainSymbol }) => {
  // Mock historical data for display purposes
  const historicalData = [
    { time: '1h', price: gasData.baseFee * 0.9 },
    { time: '2h', price: gasData.baseFee * 1.1 },
    { time: '3h', price: gasData.baseFee * 1.2 },
    { time: '4h', price: gasData.baseFee * 0.8 },
    { time: '5h', price: gasData.baseFee * 0.95 },
    { time: '6h', price: gasData.baseFee },
    { time: 'now', price: gasData.baseFee },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium mb-1">Current EIP-1559 Details</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li className="flex justify-between">
              <span>Base Fee:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{gasData.baseFee} Gwei</span>
            </li>
            <li className="flex justify-between">
              <span>Priority Fee (Tip):</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{gasData.priorityFee} Gwei</span>
            </li>
            <li className="flex justify-between">
              <span>Max Fee:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{gasData.baseFee + gasData.priorityFee * 2} Gwei</span>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Estimated Transaction Cost</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li className="flex justify-between">
              <span>Standard Transfer:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {(gasData.average.price * 21000 / 1e9).toFixed(6)} {chainSymbol}
              </span>
            </li>
            <li className="flex justify-between">
              <span>ERC20 Transfer:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {(gasData.average.price * 65000 / 1e9).toFixed(6)} {chainSymbol}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Swap:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {(gasData.average.price * 150000 / 1e9).toFixed(6)} {chainSymbol}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-1">Gas Price Trend (6h)</h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tickSize={0} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} Gwei`, 'Gas Price']}
                labelFormatter={(label) => `${label}`}
                contentStyle={{ fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gasGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}; 