jest.mock("../../coingecko");
jest.mock("../binanceClient");
jest.mock("../coinApiClient");
jest.mock("../krakenClient");

import { createMocks } from "node-mocks-http";
import handler from "../../../pages/api/price-tick";
import { CoinGeckoClient } from "../../coingecko";
import { BinanceClient } from "../binanceClient";
import { CoinApiClient } from "../coinApiClient";
import { Cache } from "@/utils/cache";
import { KrakenClient } from "../krakenClient";

const cache = new Cache();

describe("/api/price-tick", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear the cache before each test (fallback for known keys)
    if (cache.clear) {
      await cache.clear();
    } else {
      await cache.set("price-tick:btc:usdt", null, 0);
      await cache.set("price-tick:btc:eur", null, 0);
      await cache.set("price-tick:eth:usdt", null, 0);
      await cache.set("price-tick:ltc:eur", null, 0);
    }
  });

  it("returns 200 and results for valid symbol/quote with correct volume", async () => {
    (CoinGeckoClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 100,
        timestamp: 1,
        volume: 1000,
        source: "coingecko",
      }),
    }));
    (BinanceClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 101,
        timestamp: 2,
        volume: 2000,
        source: "binance",
      }),
    }));
    (CoinApiClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 102,
        timestamp: 3,
        volume: 3000,
        source: "coinapi",
      }),
    }));

    const { req, res } = createMocks({
      method: "GET",
      query: { symbol: "btc", quote: "usdt" },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.results).toHaveLength(3);
    expect(data.errors).toBeDefined();
    expect(data.results.map((r: any) => r.volume)).toEqual([1000, 2000, 3000]);
  });

  it("returns 200 and null volume for a source if not available", async () => {
    (CoinGeckoClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 100,
        timestamp: 1,
        volume: null,
        source: "coingecko",
      }),
    }));
    (BinanceClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 101,
        timestamp: 2,
        volume: 2000,
        source: "binance",
      }),
    }));
    (CoinApiClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 102,
        timestamp: 3,
        volume: null,
        source: "coinapi",
      }),
    }));

    const { req, res } = createMocks({
      method: "GET",
      query: { symbol: "btc", quote: "eur" }, // unique pair
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.results).toHaveLength(3);
    expect(data.results[0].volume).toBeNull();
    expect(data.results[1].volume).toBe(2000);
    expect(data.results[2].volume).toBeNull();
  });

  it("returns 400 for missing parameters", async () => {
    const { req, res } = createMocks({ method: "GET", query: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData().error).toMatch(/missing/i);
  });

  it("returns 502 if all sources fail", async () => {
    (CoinGeckoClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockRejectedValue(new Error("fail")),
    }));
    (BinanceClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockRejectedValue(new Error("fail")),
    }));
    (CoinApiClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockRejectedValue(new Error("fail")),
    }));
    const { req, res } = createMocks({
      method: "GET",
      query: { symbol: "eth", quote: "usdt" },
    }); // unique pair
    await handler(req, res);
    expect(res._getStatusCode()).toBe(502);
    expect(res._getJSONData().error).toMatch(/all sources failed/i);
  });

  it("returns cached result on second request for same symbol/quote", async () => {
    const cgMock = jest.fn().mockResolvedValue({
      asset: "LTC",
      price: 100,
      timestamp: 1,
      volume: 1000,
      source: "coingecko",
    });
    const binanceMock = jest.fn().mockResolvedValue({
      asset: "LTC",
      price: 101,
      timestamp: 2,
      volume: 2000,
      source: "binance",
    });
    const coinapiMock = jest.fn().mockResolvedValue({
      asset: "LTC",
      price: 102,
      timestamp: 3,
      volume: 3000,
      source: "coinapi",
    });
    (CoinGeckoClient as any).mockImplementation(() => ({ getTicker: cgMock }));
    (BinanceClient as any).mockImplementation(() => ({
      getTicker: binanceMock,
    }));
    (CoinApiClient as any).mockImplementation(() => ({
      getTicker: coinapiMock,
    }));

    const { req, res } = createMocks({
      method: "GET",
      query: { symbol: "ltc", quote: "eur" },
    }); // unique pair
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(cgMock).toHaveBeenCalledTimes(1);
    expect(binanceMock).toHaveBeenCalledTimes(1);
    expect(coinapiMock).toHaveBeenCalledTimes(1);

    // Second request should hit cache, not call mocks again
    const { req: req2, res: res2 } = createMocks({
      method: "GET",
      query: { symbol: "ltc", quote: "eur" },
    });
    await handler(req2, res2);
    expect(res2._getStatusCode()).toBe(200);
    expect(cgMock).toHaveBeenCalledTimes(1);
    expect(binanceMock).toHaveBeenCalledTimes(1);
    expect(coinapiMock).toHaveBeenCalledTimes(1);
    const data2 = res2._getJSONData();
    expect(data2.results.map((r: any) => r.volume)).toEqual([1000, 2000, 3000]);
  });

  it("returns correct aggregate and per-source fields for all new fields", async () => {
    (CoinGeckoClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 100,
        timestamp: 1,
        volume: 1000,
        source: "coingecko",
        high24h: 110,
        low24h: 90,
        marketCap: 1000000,
      }),
    }));
    (BinanceClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 102,
        timestamp: 2,
        volume: 2000,
        source: "binance",
        high24h: 112,
        low24h: 91,
        marketCap: 900000,
      }),
    }));
    (CoinApiClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 104,
        timestamp: 3,
        volume: 3000,
        source: "coinapi",
        high24h: null,
        low24h: 89,
        marketCap: null,
      }),
    }));
    (KrakenClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 106,
        timestamp: 4,
        volume: 4000,
        source: "kraken",
        high24h: 115,
        low24h: 88,
        marketCap: null,
      }),
    }));

    const { req, res } = createMocks({
      method: "GET",
      query: { symbol: "btc", quote: "usdt" },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.results).toHaveLength(4);
    expect(data.aggregate).toBeDefined();
    expect(data.aggregate.price).toBeCloseTo((100 + 102 + 104 + 106) / 4);
    expect(data.aggregate.volume).toBe(1000 + 2000 + 3000 + 4000);
    expect(data.aggregate.high24h).toBe(115); // max
    expect(data.aggregate.low24h).toBe(88); // min
    expect(data.aggregate.marketCap).toBe(1000000); // max of non-null
  });

  it("returns null for aggregate fields if all sources return null", async () => {
    (CoinGeckoClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 100,
        timestamp: 1,
        volume: 1000,
        source: "coingecko",
        high24h: null,
        low24h: null,
        marketCap: null,
      }),
    }));
    (BinanceClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 102,
        timestamp: 2,
        volume: 2000,
        source: "binance",
        high24h: null,
        low24h: null,
        marketCap: null,
      }),
    }));
    (CoinApiClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 104,
        timestamp: 3,
        volume: 3000,
        source: "coinapi",
        high24h: null,
        low24h: null,
        marketCap: null,
      }),
    }));
    (KrakenClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 106,
        timestamp: 4,
        volume: 4000,
        source: "kraken",
        high24h: null,
        low24h: null,
        marketCap: null,
      }),
    }));

    const { req, res } = createMocks({
      method: "GET",
      query: { symbol: "btc", quote: "eur" },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.results).toHaveLength(4);
    expect(data.aggregate).toBeDefined();
    expect(data.aggregate.high24h).toBeNull();
    expect(data.aggregate.low24h).toBeNull();
    expect(data.aggregate.marketCap).toBeNull();
  });

  it("correctly aggregates when only some sources provide high24h, low24h, or marketCap", async () => {
    (CoinGeckoClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 100,
        timestamp: 1,
        volume: 1000,
        source: "coingecko",
        high24h: 110,
        low24h: null,
        marketCap: 1000000,
      }),
    }));
    (BinanceClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 102,
        timestamp: 2,
        volume: 2000,
        source: "binance",
        high24h: null,
        low24h: 91,
        marketCap: null,
      }),
    }));
    (CoinApiClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 104,
        timestamp: 3,
        volume: 3000,
        source: "coinapi",
        high24h: 108,
        low24h: 89,
        marketCap: null,
      }),
    }));
    (KrakenClient as any).mockImplementation(() => ({
      getTicker: jest.fn().mockResolvedValue({
        asset: "BTC",
        price: 106,
        timestamp: 4,
        volume: 4000,
        source: "kraken",
        high24h: null,
        low24h: 88,
        marketCap: null,
      }),
    }));

    const { req, res } = createMocks({
      method: "GET",
      query: { symbol: "btc", quote: "usdt" },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.results).toHaveLength(4);
    expect(data.aggregate).toBeDefined();
    expect(data.aggregate.high24h).toBe(110); // max of 110, 108
    expect(data.aggregate.low24h).toBe(88); // min of 91, 89, 88
    expect(data.aggregate.marketCap).toBe(1000000); // only one non-null
  });
});
