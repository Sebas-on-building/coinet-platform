// @ts-nocheck
/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Mock framer-motion for test stability
jest.mock("framer-motion", () => ({
  motion: {
    div: "div",
    tr: "tr",
    button: "button",
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
// Mock icons
jest.mock("react-icons/fi", () => ({
  FiTrendingUp: () => <span data-testid="icon-up" />,
  FiTrendingDown: () => <span data-testid="icon-down" />,
  FiInfo: () => <span data-testid="icon-info" />,
}));

// Mock GlassyTooltip
const GlassyTooltip = ({ text }: any) => (
  <div data-testid="tooltip">{text}</div>
);

// Mock hooks for order book, trades, and stats
jest.mock("../../hooks/useBinanceOrderBook", () => ({
  useBinanceOrderBook: () => ({
    bids: [
      { price: 100, size: 1 },
      { price: 99, size: 2 },
    ],
    asks: [
      { price: 101, size: 1.5 },
      { price: 102, size: 2.5 },
    ],
  }),
}));
jest.mock("../../hooks/useBinanceRecentTrades", () => ({
  useBinanceRecentTrades: () => [
    { id: 1, price: 100, qty: 0.5, side: "buy", time: Date.now() },
    { id: 2, price: 101, qty: 0.7, side: "sell", time: Date.now() },
  ],
}));
jest.mock("../../hooks/useCoinGeckoStats", () => ({
  useCoinGeckoStats: () => ({ high: 105, low: 95, volume: 10000 }),
}));

import OrderBookPanel from "./OrderBookPanel";

describe("OrderBookPanel", () => {
  it("renders analytics bar and headings", () => {
    render(<OrderBookPanel />);
    expect(screen.getByLabelText(/order book panel/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /order book \(btc\/usdt\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/spread/i)).toBeInTheDocument();
    expect(screen.getByText(/vwap/i)).toBeInTheDocument();
    expect(screen.getByText(/24h high/i)).toBeInTheDocument();
    expect(screen.getByText(/24h low/i)).toBeInTheDocument();
    expect(screen.getByText(/imbalance/i)).toBeInTheDocument();
    expect(screen.getByText(/liquidity/i)).toBeInTheDocument();
  });

  it("renders bids and asks tables", () => {
    render(<OrderBookPanel />);
    expect(screen.getByText("Bids")).toBeInTheDocument();
    expect(screen.getByText("Asks")).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(2); // header + data rows
  });

  it("renders recent trades and allows filter", async () => {
    render(<OrderBookPanel />);
    expect(screen.getByText(/recent trades/i)).toBeInTheDocument();
    // All trades
    expect(screen.getAllByText(/buy|sell/i).length).toBeGreaterThan(0);
    // Filter buttons
    fireEvent.click(screen.getByRole("button", { name: /buy/i }));
    expect(screen.getAllByText(/buy/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /sell/i }));
    expect(screen.getAllByText(/sell/i).length).toBeGreaterThan(0);
  });

  it("has accessible analytics and tables", () => {
    render(<OrderBookPanel />);
    expect(
      screen.getByRole("region", { name: /order book analytics/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("table").length).toBeGreaterThan(1);
  });
});
