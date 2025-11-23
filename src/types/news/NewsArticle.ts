export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  summary?: string;
  publishedAt: Date;
  source: string;
  assetsMentioned: string[];
}
