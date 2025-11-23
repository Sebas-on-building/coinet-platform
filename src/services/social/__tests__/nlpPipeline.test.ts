import { processTweet } from "../twitterStream";

describe("NLP pipeline (twitterStream)", () => {
  it("filters profane tweets", async () => {
    const tweet = {
      text: "This is a damn scam!",
      created_at: new Date().toISOString(),
    };
    const result = await processTweet(tweet);
    expect(result).toBeNull();
  });

  it("filters non-English tweets", async () => {
    const tweet = {
      text: "Ceci est un test en français.",
      created_at: new Date().toISOString(),
    };
    const result = await processTweet(tweet);
    expect(result).toBeNull();
  });

  it("scores positive sentiment", async () => {
    const tweet = {
      text: "I love $BTC! It is amazing and going up!",
      created_at: new Date().toISOString(),
    };
    const result = await processTweet(tweet);
    expect(result).not.toBeNull();
    expect(result!.sentiment).toBeGreaterThan(0);
    expect(result!.asset).toBe("BTC");
  });

  it("scores negative sentiment", async () => {
    const tweet = {
      text: "I hate $ETH. It is crashing badly.",
      created_at: new Date().toISOString(),
    };
    const result = await processTweet(tweet);
    expect(result).not.toBeNull();
    expect(result!.sentiment).toBeLessThan(0);
    expect(result!.asset).toBe("ETH");
  });
});
