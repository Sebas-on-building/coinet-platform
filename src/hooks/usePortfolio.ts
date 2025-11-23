import { useState, useEffect } from 'react';

// Types
interface PortfolioAsset {
  available: number;
  locked: number;
}

interface Portfolio {
  [key: string]: PortfolioAsset;
}

// Mock data for the portfolio
const mockPortfolio: Portfolio = {
  BTC: { available: 0.42, locked: 0.01 },
  ETH: { available: 3.5, locked: 0 },
  SOL: { available: 25.8, locked: 1.2 },
  USDT: { available: 5000, locked: 0 },
  BNB: { available: 12.3, locked: 0 },
  ADA: { available: 4500, locked: 0 },
  XRP: { available: 2800, locked: 0 },
};

/**
 * Hook to access and manage user portfolio data
 */
export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio>(mockPortfolio);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Calculate total balance
  const totalBalance = calculateTotalBalance(portfolio);

  // Function to refresh portfolio data
  const refreshPortfolio = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would fetch from an API
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 500));

      // For demo, just return the mock data
      // You would replace this with actual API call
      setPortfolio(mockPortfolio);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch portfolio data'));
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total balance based on portfolio assets
  function calculateTotalBalance(portfolio: Portfolio): number {
    // In a real app, this would convert assets to a single currency
    // For demo purposes, we'll just use mock prices
    const prices = {
      BTC: 63500,
      ETH: 3200,
      SOL: 124,
      USDT: 1,
      BNB: 580,
      ADA: 0.55,
      XRP: 0.65,
    };

    return Object.entries(portfolio).reduce((total, [symbol, amounts]) => {
      const price = prices[symbol as keyof typeof prices] || 0;
      return total + (amounts.available + amounts.locked) * price;
    }, 0);
  }

  return {
    portfolio,
    totalBalance,
    isLoading,
    error,
    refreshPortfolio,
  };
} 