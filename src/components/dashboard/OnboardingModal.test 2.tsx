// @ts-nocheck
/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OnboardingModal } from "./OnboardingModal";

// Mock framer-motion for test stability
jest.mock("framer-motion", () => ({
  motion: { div: (props: any) => <div {...props} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
// Mock Lucide icons
jest.mock("lucide-react", () => ({
  BarChart2: () => <span data-testid="icon-bar-chart" />,
  Twitter: () => <span data-testid="icon-twitter" />,
  User: () => <span data-testid="icon-user" />,
  Plus: () => <span data-testid="icon-plus" />,
  Sun: () => <span data-testid="icon-sun" />,
  Moon: () => <span data-testid="icon-moon" />,
}));

describe("OnboardingModal", () => {
  it("does not render when open is false", () => {
    const { container } = render(
      <OnboardingModal open={false} onClose={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders modal and features when open", () => {
    render(<OnboardingModal open={true} onClose={jest.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/welcome to coinet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/your all-in-one crypto dashboard/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /close onboarding/i }),
    ).toBeInTheDocument();
    // Features
    expect(screen.getByText(/advanced analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/social feed/i)).toBeInTheDocument();
    expect(screen.getByText(/personalized dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/add widgets/i)).toBeInTheDocument();
    expect(screen.getByText(/dark & light mode/i)).toBeInTheDocument();
  });

  it("calls onClose when Get Started button is clicked", () => {
    const onClose = jest.fn();
    render(<OnboardingModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close onboarding/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("focuses close button on open", () => {
    render(<OnboardingModal open={true} onClose={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: /close onboarding/i }),
    ).toHaveFocus();
  });

  it("calls onClose on ESC key", () => {
    const onClose = jest.fn();
    render(<OnboardingModal open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("traps focus within modal", () => {
    render(<OnboardingModal open={true} onClose={jest.fn()} />);
    const closeBtn = screen.getByRole("button", { name: /close onboarding/i });
    closeBtn.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeBtn).toHaveFocus();
  });

  it("has correct accessibility attributes", () => {
    render(<OnboardingModal open={true} onClose={jest.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "onboarding-modal-title");
    expect(screen.getByText(/welcome to coinet/i).id).toBe(
      "onboarding-modal-title",
    );
  });
});
