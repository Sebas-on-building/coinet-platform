import * as React from "react";
import { render, screen } from "@testing-library/react";
import DevActivityWidget from "./DevActivityWidget";

describe("DevActivityWidget", () => {
  beforeEach(() => {
    (window as any).gtag = jest.fn();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fires analyticsEvent on mount", () => {
    render(<DevActivityWidget analyticsEvent="test_dev_activity" />);
    expect((window as any).gtag).toHaveBeenCalledWith(
      "event",
      "test_dev_activity",
      { label: "DevActivityWidget" },
    );
  });

  it("has accessible ARIA labels and headings", () => {
    render(<DevActivityWidget analyticsEvent="test_dev_activity" />);
    // Main card
    expect(screen.getByLabelText("Dev Activity")).toBeInTheDocument();
    // Heading
    expect(
      screen.getByRole("heading", { name: /dev activity/i }),
    ).toBeInTheDocument();
    // Anomaly Detection
    expect(screen.getByLabelText("Anomaly Detection")).toBeInTheDocument();
    // AI Explainer
    expect(screen.getByLabelText("AI Explainer")).toBeInTheDocument();
    // Community Q&A
    expect(screen.getByLabelText("Community Q&A")).toBeInTheDocument();
  });

  it("is keyboard accessible", () => {
    render(<DevActivityWidget analyticsEvent="test_dev_activity" />);
    const mainCard = screen.getByLabelText("Dev Activity");
    expect(mainCard).toHaveAttribute("tabindex", "0");
  });
});
