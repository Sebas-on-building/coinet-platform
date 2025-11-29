import { renderHook } from "@testing-library/react";
import { useAnalyticsEvent } from "./useAnalyticsEvent";

describe("useAnalyticsEvent", () => {
  let originalGtag: any;
  let originalEnv: string | undefined;
  beforeEach(() => {
    originalGtag = (window as any).gtag;
    originalEnv = process.env.NODE_ENV;
  });
  afterEach(() => {
    (window as any).gtag = originalGtag;
    if (originalEnv) {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalEnv,
        configurable: true,
      });
    }
    jest.restoreAllMocks();
  });

  it("calls gtag if present", () => {
    const gtagMock = jest.fn();
    (window as any).gtag = gtagMock;
    const { result } = renderHook(() => useAnalyticsEvent());
    result.current({ event: "test_event", label: "Test" });
    expect(gtagMock).toHaveBeenCalledWith("event", "test_event", {
      event: "test_event",
      label: "Test",
    });
  });

  it("logs to console in development if gtag is not present", () => {
    (window as any).gtag = undefined;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const { result } = renderHook(() => useAnalyticsEvent());
    result.current({ event: "test_event", label: "Test" });
    expect(logSpy).toHaveBeenCalledWith("[AnalyticsEvent]", {
      event: "test_event",
      label: "Test",
    });
  });
});
