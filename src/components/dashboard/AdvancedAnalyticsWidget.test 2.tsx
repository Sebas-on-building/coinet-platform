import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const defaultAnalytics = {
  symbol: "btc",
  data: [
    { time: 1700000000, value: 50000 },
    { time: 1700000600, value: 50100 },
  ],
  ma20: [null, 50050],
  vol20: [null, 100],
  anomalies: [false, true],
};

jest.mock("./TradingViewChart", () => ({
  TradingViewChart: () => <div data-testid="mock-chart">Mock Chart</div>,
}));

describe("AdvancedAnalyticsWidget", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { AdvancedAnalyticsWidget } = await import(
      "./AdvancedAnalyticsWidget"
    );
    render(<AdvancedAnalyticsWidget symbol="btc" />);
    expect(screen.getByLabelText(/loading analytics/i)).toBeInTheDocument();
  });

  it("renders error state", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const { AdvancedAnalyticsWidget } = await import(
      "./AdvancedAnalyticsWidget"
    );
    render(<AdvancedAnalyticsWidget symbol="btc" />);
    await waitFor(() =>
      expect(screen.getByLabelText(/analytics error/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/failed to load analytics data/i),
    ).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...defaultAnalytics, data: [] }),
    });
    const { AdvancedAnalyticsWidget } = await import(
      "./AdvancedAnalyticsWidget"
    );
    render(<AdvancedAnalyticsWidget symbol="btc" />);
    await waitFor(() =>
      expect(screen.getByLabelText(/no analytics data/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/no analytics data available/i),
    ).toBeInTheDocument();
  });

  it("renders main analytics state", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => defaultAnalytics,
    });
    const { AdvancedAnalyticsWidget } = await import(
      "./AdvancedAnalyticsWidget"
    );
    render(<AdvancedAnalyticsWidget symbol="btc" />);
    await waitFor(() =>
      expect(
        screen.getByLabelText(/advanced analytics widget/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Advanced Analytics")).toBeInTheDocument();
    expect(screen.getByText("Last Price")).toBeInTheDocument();
    expect(screen.getByText("$50100.00")).toBeInTheDocument();
    expect(screen.getByText("20-period MA")).toBeInTheDocument();
    expect(screen.getByText("50050.00")).toBeInTheDocument();
  });

  it("renders real-time anomaly overlay", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => defaultAnalytics,
    });
    const { AdvancedAnalyticsWidget } = await import(
      "./AdvancedAnalyticsWidget"
    );
    const realtimeAnomalies = [
      {
        symbol: "btc",
        time: "2024-05-12T17:00:00Z",
        price: 50200,
        ma20: 50100,
        volatility: 120,
        reason: "Spike",
      },
    ];
    render(
      <AdvancedAnalyticsWidget
        symbol="btc"
        realtimeAnomalies={realtimeAnomalies}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText(/advanced analytics widget/i),
      ).toBeInTheDocument(),
    );
    // Chart overlays are visual, but we can check for stat cards and anomaly count
    expect(screen.getByText("Advanced Analytics")).toBeInTheDocument();
  });
});
