import { createMocks } from "node-mocks-http";
import { Cache } from "@/utils/cache";

jest.mock("../../market/MarketDataService");

const cache = new Cache();

describe("/api/health-market", () => {
  let handler: any;
  let MarketDataService: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    // Re-import after jest.mock to ensure mocks are used
    MarketDataService = require("../../market/MarketDataService");
    handler = require("../../../pages/api/health-market").default;
    if (cache.clear) {
      await cache.clear();
    } else {
      await cache.set("health-market", null, 0);
    }
  });

  it("returns 200 and health status", async () => {
    const mockHealth = {
      coingecko: { status: "ok" as const },
      binance: { status: "ok" as const },
      coinapi: { status: "ok" as const },
    };
    (
      MarketDataService.healthCheckMarketConnectors as jest.Mock
    ).mockResolvedValue(mockHealth);
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(mockHealth);
  });

  it("returns cached result on second request", async () => {
    const mockHealth = {
      coingecko: { status: "ok" as const },
      binance: { status: "ok" as const },
      coinapi: { status: "ok" as const },
    };
    const healthSpy = (
      MarketDataService.healthCheckMarketConnectors as jest.Mock
    ).mockResolvedValue(mockHealth);
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(healthSpy).toHaveBeenCalledTimes(1);
    // Second request should hit cache, not call healthCheckMarketConnectors again
    const { req: req2, res: res2 } = createMocks({ method: "GET" });
    await handler(req2, res2);
    expect(res2._getStatusCode()).toBe(200);
    expect(healthSpy).toHaveBeenCalledTimes(1);
    expect(res2._getJSONData()).toEqual(mockHealth);
  });

  it("returns 500 if health check throws", async () => {
    (
      MarketDataService.healthCheckMarketConnectors as jest.Mock
    ).mockRejectedValue(new Error("fail"));
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData().error).toMatch(/fail/i);
  });
});
