import { useQuery } from "@tanstack/react-query";
import { getLatestNews } from "@/services/news";
import { format } from "date-fns";

export function NewsWidget() {
  const {
    data: news,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["latest-news"],
    queryFn: getLatestNews,
  });

  if (isLoading) return <div className="text-gray-400">Loading news...</div>;
  if (error) return <div className="text-red-400">Failed to load news.</div>;
  if (!news || news.length === 0)
    return <div className="text-gray-400">No news available</div>;

  return (
    <div className="space-y-4">
      {news.map((item, idx) => (
        <a
          key={item.url + idx}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium line-clamp-2">
                {item.title}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{item.source}</span>
                <span>•</span>
                <span>
                  {format(new Date(item.published_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </div>
          </div>
        </a>
      ))}
      <div className="text-xs text-neutral-400 mt-2">
        Source:{" "}
        <a
          href="https://cryptopanic.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          CryptoPanic
        </a>
      </div>
    </div>
  );
}
