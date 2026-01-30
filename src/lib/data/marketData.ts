// Market data service stub

export const marketDataService = {
  async getLatestPrice(symbol: string) {
    return { symbol, price: 0, timestamp: Date.now() };
  },
  async subscribe(symbol: string, callback: (data: unknown) => void) {
    // Stub - no-op
  },
  async unsubscribe(symbol: string) {
    // Stub - no-op
  }
};
