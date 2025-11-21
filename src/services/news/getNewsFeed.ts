import { NewsItem } from "../../types/news";

export async function getNewsFeed(): Promise<NewsItem[]> {
  // Fetch news from CryptoPanic (public headlines only)
  const res = await fetch("https://cryptopanic.com/api/v1/posts/?public=true");
  const data = await res.json();
  return (data.results || []).map((item: any) => ({
    title: item.title,
    source: item.domain,
    sentiment: item.votes?.important ? "positive" : "neutral",
    impact: item.votes?.positive ? "high" : "medium",
    url: item.url,
    published_at: item.published_at,
  }));
}
