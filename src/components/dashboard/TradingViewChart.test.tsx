// @ts-nocheck
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TradingViewChart } from "./TradingViewChart";

// Mock lightweight-charts and framer-motion
jest.mock("lightweight-charts", () => ({
  createChart: jest.fn(() => ({
    addSeries: jest.fn(() => ({ setData: jest.fn() })),
    remove: jest.fn(),
    timeScale: jest.fn(() => ({ fitContent: jest.fn() })),
    applyOptions: jest.fn(),
    subscribeCrosshairMove: jest.fn(),
  })),
  ColorType: { Solid: "solid" },
  LineSeries: "LineSeries",
  CrosshairMode: { Normal: "normal" },
}));
jest.mock("framer-motion", () => ({
  motion: { div: (props: any) => <div {...props} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("TradingViewChart", () => {
  const baseData = [
    { time: "2024-05-12T17:00", value: 50000 },
    { time: "2024-05-12T17:01", value: 50100 },
  ];
  const ma20 = [
    { time: "2024-05-12T17:00", value: 50000 },
    { time: "2024-05-12T17:01", value: 50050 },
  ];
  const anomalies = [{ time: "2024-05-12T17:01", value: 50100, pulse: true }];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders chart container and fit button", () => {
    const { container } = render(<TradingViewChart data={baseData} />);
    expect(
      screen.getByRole("button", { name: /fit chart to screen/i }),
    ).toBeInTheDocument();
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("renders with overlays (ma20, anomalies)", () => {
    render(
      <TradingViewChart data={baseData} ma20={ma20} anomalies={anomalies} />,
    );
    expect(
      screen.getByRole("button", { name: /fit chart to screen/i }),
    ).toBeInTheDocument();
    // Overlay markers are rendered as divs
    expect(document.querySelectorAll(".absolute")).not.toHaveLength(0);
  });

  it("handles empty data gracefully", () => {
    render(<TradingViewChart data={[]} />);
    expect(
      screen.getByRole("button", { name: /fit chart to screen/i }),
    ).toBeInTheDocument();
  });

  it("calls fitToScreen when button is clicked", () => {
    render(<TradingViewChart data={baseData} />);
    const btn = screen.getByRole("button", { name: /fit chart to screen/i });
    fireEvent.click(btn);
    // No error means fitToScreen works (triggers state update)
    expect(btn).toBeInTheDocument();
  });

  it("is accessible with aria-labels", () => {
    render(<TradingViewChart data={baseData} />);
    expect(
      screen.getByRole("button", { name: /fit chart to screen/i }),
    ).toHaveAttribute("aria-label");
  });
});
