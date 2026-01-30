"use client";

import React from 'react';

interface DeFiWidgetProps {
  className?: string;
}

export default function DeFiWidget({ className }: DeFiWidgetProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg ${className || ''}`}>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        DeFi Overview
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">Total Value Locked</span>
          <span className="font-medium text-slate-900 dark:text-white">$--</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">24h Volume</span>
          <span className="font-medium text-slate-900 dark:text-white">$--</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">Active Protocols</span>
          <span className="font-medium text-slate-900 dark:text-white">--</span>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Connect your wallet to view your DeFi positions.
      </p>
    </div>
  );
}
