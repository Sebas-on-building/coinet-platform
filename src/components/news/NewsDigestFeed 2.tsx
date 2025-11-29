import { NewsDigestCard } from "./NewsDigestCard";
import { NewsItem } from "@/types/news";

export function NewsDigestFeed({ news }: { news: NewsItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {news.map((item) => (
        <NewsDigestCard key={item.id} item={item} />
      ))}
    </div>
  );
}
