import React from 'react';
import { Card, Badge } from 'shared-ui';

export const MarketIntelligenceStatus = ({ status }: { status: string }) => (
  <div className="flex items-center space-x-2">
    <span className="relative flex h-2 w-2" role="status">
      <span
        className={`absolute inline-flex h-full w-full rounded-full opacity-75
          ${
            status === "active"
              ? "bg-green-500 animate-ping"
              : "bg-red-500 animate-pulse"
          }`}
      ></span>
      <span
        className={`relative inline-flex rounded-full h-2 w-2
          ${
            status === "active" ? "bg-green-600" : "bg-red-600"
          }`}
      ></span>
    </span>
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
      Market Intelligence Status: {status === "active" ? "Active" : "Inactive"}
    </span>
  </div>
);
