"use client";

import React from "react";
import { BlockchainTransaction } from "@/services/blockchain";
import { ExternalLink, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";

interface TransactionListProps {
  transactions: BlockchainTransaction[];
  chainSymbol: string;
}

/**
 * TransactionList component
 * 
 * Displays a list of recent blockchain transactions
 */
export const TransactionList: React.FC<TransactionListProps> = ({ transactions, chainSymbol }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No transactions available
      </div>
    );
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getTransactionUrl = (hash: string, chain: string) => {
    const baseUrl = chain === 'ethereum'
      ? 'https://etherscan.io/tx/'
      : chain === 'binance-smart-chain'
        ? 'https://bscscan.com/tx/'
        : 'https://explorer.com/tx/';

    return `${baseUrl}${hash}`;
  };

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500">
          <tr>
            <th className="text-left font-medium pb-2">Tx Hash</th>
            <th className="text-left font-medium pb-2">From</th>
            <th className="text-left font-medium pb-2">To</th>
            <th className="text-right font-medium pb-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.hash} className="border-t border-gray-200 dark:border-gray-700">
              <td className="py-2">
                <div className="flex items-center">
                  {tx.from.toLowerCase() === tx.to.toLowerCase() ? (
                    <RefreshCw className="h-3 w-3 mr-1 text-blue-500" />
                  ) : parseFloat(tx.value) > 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1 text-red-500" />
                  ) : (
                    <ArrowDownLeft className="h-3 w-3 mr-1 text-green-500" />
                  )}
                  <a
                    href={getTransactionUrl(tx.hash, String(chainSymbol).toLowerCase())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 font-mono flex items-center"
                  >
                    {formatAddress(tx.hash)}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </td>
              <td className="py-2 font-mono text-xs">{formatAddress(tx.from)}</td>
              <td className="py-2 font-mono text-xs">{formatAddress(tx.to)}</td>
              <td className="py-2 text-right">
                {parseFloat(tx.value).toFixed(6)} {chainSymbol}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-xs text-center text-gray-500 pt-2">
        Showing {transactions.length} most recent transactions
      </div>
    </div>
  );
};
