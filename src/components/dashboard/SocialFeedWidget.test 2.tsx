// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockSWR = jest.fn();
jest.mock(
  "swr",
  () =>
    (...args: any[]) =>
      mockSWR(...args),
);

const mockUseSocialFeedRealtime = jest.fn();
jest.mock("../../hooks/useSocialFeedRealtime", () => ({
  useSocialFeedRealtime: (...args: any[]) => mockUseSocialFeedRealtime(...args),
}));

describe("SocialFeedWidget", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders initial SWR feed and real-time events", async () => {
    mockSWR.mockReturnValue({
      data: {
        feed: [
          {
            id: "1",
            type: "tweet",
            user: "Alice",
            avatar: "/alice.png",
            content: "Hello world!",
            sentiment: "positive",
            timestamp: 1700000000000,
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    mockUseSocialFeedRealtime.mockReturnValue({
      events: [
        {
          id: "2",
          type: "news",
          user: "Bob",
          avatar: "/bob.png",
          content: "Breaking news!",
          sentiment: "neutral",
          timestamp: 1700000001000,
        },
      ],
      latest: {
        id: "2",
        type: "news",
        user: "Bob",
        avatar: "/bob.png",
        content: "Breaking news!",
        sentiment: "neutral",
        timestamp: 1700000001000,
      },
      clearLatest: jest.fn(),
    });
    const { SocialFeedWidget } = await import("./SocialFeedWidget");
    render(<SocialFeedWidget symbol="btc" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Hello world!")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Breaking news!")).toBeInTheDocument();
  });

  it("shows accessibility live region for new real-time item", async () => {
    mockSWR.mockReturnValue({
      data: { feed: [] },
      isLoading: false,
      error: null,
    });
    mockUseSocialFeedRealtime.mockReturnValue({
      events: [
        {
          id: "2",
          type: "news",
          user: "Bob",
          avatar: "/bob.png",
          content: "Breaking news!",
          sentiment: "neutral",
          timestamp: 1700000001000,
        },
      ],
      latest: {
        id: "2",
        type: "news",
        user: "Bob",
        avatar: "/bob.png",
        content: "Breaking news!",
        sentiment: "neutral",
        timestamp: 1700000001000,
      },
      clearLatest: jest.fn(),
    });
    const { SocialFeedWidget } = await import("./SocialFeedWidget");
    render(<SocialFeedWidget symbol="btc" />);
    const liveRegion = screen.getByRole("status", { hidden: true });
    expect(liveRegion).toHaveTextContent("New news by Bob: Breaking news!");
  });

  it("shows loading state", async () => {
    mockSWR.mockReturnValue({ data: null, isLoading: true, error: null });
    mockUseSocialFeedRealtime.mockReturnValue({
      events: [],
      latest: null,
      clearLatest: jest.fn(),
    });
    const { SocialFeedWidget } = await import("./SocialFeedWidget");
    render(<SocialFeedWidget symbol="btc" />);
    expect(
      screen.getByText((content) => /Loading/i.test(content)),
    ).toBeInTheDocument();
  });

  it("shows error state", async () => {
    mockSWR.mockReturnValue({ data: null, isLoading: false, error: true });
    mockUseSocialFeedRealtime.mockReturnValue({
      events: [],
      latest: null,
      clearLatest: jest.fn(),
    });
    const { SocialFeedWidget } = await import("./SocialFeedWidget");
    render(<SocialFeedWidget symbol="btc" />);
    expect(
      screen.getByText((content) => /Failed to load feed/i.test(content)),
    ).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    mockSWR.mockReturnValue({
      data: { feed: [] },
      isLoading: false,
      error: null,
    });
    mockUseSocialFeedRealtime.mockReturnValue({
      events: [],
      latest: null,
      clearLatest: jest.fn(),
    });
    const { SocialFeedWidget } = await import("./SocialFeedWidget");
    render(<SocialFeedWidget symbol="btc" />);
    expect(
      screen.getByText((content) => /No feed items found/i.test(content)),
    ).toBeInTheDocument();
  });
});
