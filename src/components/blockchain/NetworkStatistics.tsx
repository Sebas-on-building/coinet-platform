import React from 'react';
import { NetworkStats } from '@/services/blockchain';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Activity, Shield, Box, Server } from 'lucide-react';

interface NetworkStatisticsProps {
  stats: NetworkStats;
  chainSymbol: string;
}

/**
 * NetworkStatistics component
 * 
 * Displays detailed network statistics for a blockchain
 */
export const NetworkStatistics: React.FC<NetworkStatisticsProps> = ({ stats, chainSymbol }) => {
  // Mock throughput data for display purposes
  const throughputData = [
    { time: '1h', tps: Math.round(1000 / (stats.avgBlockTime * 1000)) * 0.85 },
    { time: '2h', tps: Math.round(1000 / (stats.avgBlockTime * 1000)) * 1.1 },
    { time: '3h', tps: Math.round(1000 / (stats.avgBlockTime * 1000)) * 0.95 },
    { time: '4h', tps: Math.round(1000 / (stats.avgBlockTime * 1000)) * 1.2 },
    { time: '5h', tps: Math.round(1000 / (stats.avgBlockTime * 1000)) * 0.9 },
    { time: '6h', tps: Math.round(1000 / (stats.avgBlockTime * 1000)) * 1.05 },
    { time: 'now', tps: Math.round(1000 / (stats.avgBlockTime * 1000)) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium mb-1">Network Performance</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li className="flex justify-between items-center">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Block Time:
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{stats.avgBlockTime.toFixed(2)}s</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="flex items-center">
                <Activity className="h-3 w-3 mr-1" />
                TPS:
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {Math.round(1000 / (stats.avgBlockTime * 1000))}
              </span>
            </li>
            <li className="flex justify-between items-center">
              <span className="flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                Network Difficulty:
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {stats.difficulty ? stats.difficulty.toExponential(2) : 'N/A'}
              </span>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Blockchain Details</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li className="flex justify-between items-center">
              <span className="flex items-center">
                <Box className="h-3 w-3 mr-1" />
                Latest Block:
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{stats.blockHeight.toLocaleString()}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="flex items-center">
                <Server className="h-3 w-3 mr-1" />
                Active Validators:
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{stats.activeValidators.toLocaleString()}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="flex items-center">
                <Activity className="h-3 w-3 mr-1" />
                Pending Transactions:
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{stats.pendingTxCount.toLocaleString()}</span>
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-1">Network Throughput (TPS)</h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={throughputData}>
              <XAxis dataKey="time" tickSize={0} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)} tx/s`, 'Throughput']}
                labelFormatter={(label) => `${label} ago`}
                contentStyle={{ fontSize: '12px' }}
              />
              <Bar
                dataKey="tps"
                fill="#8884d8"
                radius={[4, 4, 0, 0]}
                animationDuration={300}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-xs text-center text-gray-500 mt-2">
        Data updates every block. Current chain: {chainSymbol}
      </div>
    </div>
  );
}; 