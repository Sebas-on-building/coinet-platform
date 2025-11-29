// @ts-nocheck
/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// Mock framer-motion for test stability
jest.mock("framer-motion", () => ({
  motion: {
    div: (props: any) => <div {...props} />,
    li: (props: any) => <li {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
// Mock icons
jest.mock("react-icons/fi", () => ({
  FiTrendingUp: () => <span data-testid="icon-up" />,
  FiTrendingDown: () => <span data-testid="icon-down" />,
}));
// Mock Tooltip
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <span>{children}</span>,
}));
// Mock useCountUp to always return the target value
jest.mock("./MarketMoversPanel", () => {
  const actual = jest.requireActual("./MarketMoversPanel");
  return {
    __esModule: true,
    ...actual,
    useCountUp: (target: number) => target,
    default: actual.default,
  };
});

const mockGainers = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 50000,
    change24h: 5.2,
    sparkline: [1, 2, 3, 4, 5],
    icon: "/btc.png",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 4000,
    change24h: 3.1,
    sparkline: [1, 2, 3, 4, 5],
    icon: "/eth.png",
  },
];
const mockLosers = [
  {
    symbol: "DOGE",
    name: "Dogecoin",
    price: 0.2,
    change24h: -2.5,
    sparkline: [1, 2, 3, 4, 5],
    icon: "/doge.png",
  },
];

// Polyfill fetch for all tests
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      // Simulate a list of assets for sorting
      {
        symbol: "btc",
        name: "Bitcoin",
        current_price: 50000,
        price_change_percentage_24h: 5.2,
        sparkline_in_7d: { price: [1, 2, 3, 4, 5] },
        image: "/btc.png",
      },
      {
        symbol: "eth",
        name: "Ethereum",
        current_price: 4000,
        price_change_percentage_24h: 3.1,
        sparkline_in_7d: { price: [1, 2, 3, 4, 5] },
        image: "/eth.png",
      },
      {
        symbol: "doge",
        name: "Dogecoin",
        current_price: 0.2,
        price_change_percentage_24h: -2.5,
        sparkline_in_7d: { price: [1, 2, 3, 4, 5] },
        image: "/doge.png",
      },
    ],
  }) as any;
});
afterEach(() => {
  jest.clearAllMocks();
});

const { default: MarketMoversPanel } = require("./MarketMoversPanel");

describe("MarketMoversPanel", () => {
  it("renders loading state", () => {
    render(<MarketMoversPanel />);
    expect(screen.getByText(/market movers/i)).toBeInTheDocument();
    expect(
      screen.getByText(/loading/i, { selector: "span" }),
    ).toBeInTheDocument();
  });

  it("renders gainers and losers", async () => {
    render(<MarketMoversPanel />);
    await waitFor(() =>
      expect(screen.getAllByText("BTC").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("ETH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DOGE").length).toBeGreaterThan(0);
    expect(screen.getByText(/top gainers/i)).toBeInTheDocument();
    expect(screen.getByText(/top losers/i)).toBeInTheDocument();
    // Check images
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });

  it("handles empty gainers/losers", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    render(<MarketMoversPanel />);
    await waitFor(() =>
      expect(screen.getByText(/top gainers/i)).toBeInTheDocument(),
    );
    // No gainers/losers rendered
    expect(screen.queryByText("BTC")).not.toBeInTheDocument();
    expect(screen.queryByText("DOGE")).not.toBeInTheDocument();
  });

  it("has accessible headings and alt text", async () => {
    render(<MarketMoversPanel />);
    await waitFor(() =>
      expect(screen.getAllByText("BTC").length).toBeGreaterThan(0),
    );
    expect(
      screen.getByRole("heading", { name: /market movers/i }),
    ).toBeInTheDocument();
    screen.getAllByRole("img").forEach((img) => {
      expect(img).toHaveAttribute("alt");
    });
  });
});
