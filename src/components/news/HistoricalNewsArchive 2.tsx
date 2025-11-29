"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import {
  HistoricalNewsData,
  NarrativeTimeline,
  NewsArchiveFilter,
} from "@/types/news";
import { HistoricalNewsService } from "@/services/news/HistoricalNewsService";
import {
  ChartBarIcon,
  ClockIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BookmarkIcon,
  ShareIcon,
  FireIcon,
  ChartPieIcon,
  ArrowPathIcon,
  FunnelIcon,
  ChartBarSquareIcon,
  MapIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "@heroicons/react/24/outline";

const historicalNewsService = HistoricalNewsService.getInstance();

export function HistoricalNewsArchive() {
  const [activeTab, setActiveTab] = useState("archive");
  const [historicalNews, setHistoricalNews] = useState<HistoricalNewsData[]>(
    [],
  );
  const [narratives, setNarratives] = useState<NarrativeTimeline[]>([]);
  const [selectedNarrative, setSelectedNarrative] =
    useState<NarrativeTimeline | null>(null);
  const [filter, setFilter] = useState<NewsArchiveFilter>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "impact" | "sentiment">("date");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "1d" | "1w" | "1m" | "3m" | "1y"
  >("1w");
  const [viewMode, setViewMode] = useState<"list" | "grid" | "timeline">(
    "list",
  );
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    loadData();
  }, [filter, sortBy, selectedTimeframe]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "archive") {
        const news = await historicalNewsService.searchArchive(filter);
        setHistoricalNews(news);
      } else if (activeTab === "narratives") {
        const activeNarratives =
          await historicalNewsService.getActiveNarratives();
        setNarratives(activeNarratives);
      } else if (activeTab === "analysis") {
        // Load analysis data
        const news = await historicalNewsService.searchArchive(filter);
        setHistoricalNews(news);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNarrativeSelect = async (narrativeId: string) => {
    const narrative =
      await historicalNewsService.getNarrativeTimeline(narrativeId);
    setSelectedNarrative(narrative);
  };

  const renderNewsItem = (item: HistoricalNewsData) => (
    <Card key={item.id} className="p-4 mb-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{item.newsItem.title}</h3>
            {item.newsItem.verified && (
              <Badge variant="success" className="ml-2">
                Verified
              </Badge>
            )}
          </div>
          <p className="text-gray-600 mb-2">{item.newsItem.summary}</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {item.narrativeTags.map((tag) => (
              <Badge key={tag} variant="secondary">
                <HashtagIcon className="w-4 h-4 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <ClockIcon className="w-4 h-4 mr-1" />
            {new Date(item.newsItem.published_at).toLocaleDateString()}
            <span className="mx-2">•</span>
            <span>{item.newsItem.source}</span>
          </div>
        </div>
        <div className="ml-4 text-right">
          <div className="flex items-center mb-2">
            {item.impactMetrics.priceChange24h > 0 ? (
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
            ) : (
              <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
            )}
            <span
              className={`ml-1 ${item.impactMetrics.priceChange24h > 0 ? "text-green-500" : "text-red-500"}`}
            >
              {item.impactMetrics.priceChange24h.toFixed(2)}%
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Volume: {item.impactMetrics.volumeChange24h.toFixed(2)}%
          </div>
          <div className="text-sm text-gray-500">
            Engagement: {item.impactMetrics.socialEngagement.toLocaleString()}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderNarrativeTimeline = (narrative: NarrativeTimeline) => (
    <Card
      key={narrative.id}
      className="p-4 mb-4 hover:shadow-lg transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{narrative.name}</h3>
            <Badge
              variant={narrative.status === "active" ? "success" : "secondary"}
            >
              {narrative.status}
            </Badge>
          </div>
          <p className="text-gray-600 mb-2">{narrative.description}</p>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="flex items-center">
              <ChartBarIcon className="w-4 h-4 mr-1 text-blue-500" />
              <span className="text-sm">
                {narrative.marketImpact.totalPriceChange.toFixed(2)}% total
                impact
              </span>
            </div>
            {narrative.momentum !== undefined && (
              <div className="flex items-center">
                <FireIcon className="w-4 h-4 mr-1 text-orange-500" />
                <span className="text-sm">
                  Momentum: {(narrative.momentum * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {narrative.sentimentTrend !== undefined && (
              <div className="flex items-center">
                <ChartPieIcon className="w-4 h-4 mr-1 text-purple-500" />
                <span className="text-sm">
                  Sentiment: {(narrative.sentimentTrend * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {narrative.marketCorrelation !== undefined && (
              <div className="flex items-center">
                <ArrowPathIcon className="w-4 h-4 mr-1 text-green-500" />
                <span className="text-sm">
                  Correlation: {(narrative.marketCorrelation * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Started: {new Date(narrative.startDate).toLocaleDateString()}
            {narrative.endDate &&
              ` - Ended: ${new Date(narrative.endDate).toLocaleDateString()}`}
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => handleNarrativeSelect(narrative.id)}
        >
          View Details
        </Button>
      </div>
    </Card>
  );

  const renderAdvancedFilters = () => (
    <div className="space-y-4 p-4 border rounded-lg bg-background">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Timeframe</label>
          <select
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
          >
            <option value="1d">Last 24 hours</option>
            <option value="1w">Last week</option>
            <option value="1m">Last month</option>
            <option value="3m">Last 3 months</option>
            <option value="1y">Last year</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Sort by</label>
          <select
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="date">Date</option>
            <option value="impact">Market Impact</option>
            <option value="sentiment">Sentiment</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">View Mode</label>
        <div className="flex space-x-2 mt-1">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode("grid")}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === "timeline" ? "default" : "outline"}
            onClick={() => setViewMode("timeline")}
          >
            Timeline
          </Button>
        </div>
      </div>
    </div>
  );

  const renderViewModeToggle = () => (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
      >
        <FunnelIcon className="h-4 w-4 mr-2" />
        {showAdvancedFilters ? "Hide Filters" : "Show Filters"}
      </Button>
      <div className="flex space-x-1">
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewMode("list")}
        >
          <ChartBarSquareIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewMode("grid")}
        >
          <MapIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "timeline" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewMode("timeline")}
        >
          <GlobeAltIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderTimeframeSelector = () => (
    <div className="flex space-x-2">
      {(["1d", "1w", "1m", "3m", "1y"] as const).map((timeframe) => (
        <Button
          key={timeframe}
          variant={selectedTimeframe === timeframe ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedTimeframe(timeframe)}
        >
          {timeframe}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="archive">Historical Archive</TabsTrigger>
          <TabsTrigger value="narratives">Narrative Timelines</TabsTrigger>
          <TabsTrigger value="analysis">Market Impact Analysis</TabsTrigger>
        </TabsList>

        <div className="mb-4 flex flex-wrap gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search news..."
              value={filter.query}
              onChange={(e) => setFilter({ ...filter, query: e.target.value })}
              className="pl-10"
            />
          </div>
          <DateRangePicker
            onRangeChange={(range) =>
              setFilter({
                ...filter,
                startDate: range.startDate,
                endDate: range.endDate,
              })
            }
          />
          <Select
            value={filter.sentiment || "all"}
            onChange={(e) =>
              setFilter({
                ...filter,
                sentiment: e.target.value as NewsArchiveFilter["sentiment"],
              })
            }
            className="min-w-[150px]"
          >
            <option value="all">All Sentiment</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </Select>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="min-w-[150px]"
          >
            <option value="date">Sort by Date</option>
            <option value="impact">Sort by Impact</option>
            <option value="sentiment">Sort by Sentiment</option>
          </Select>
          <Button
            variant="ghost"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <FunnelIcon className="w-4 h-4 mr-1" />
            Advanced Filters
          </Button>
        </div>

        {showAdvancedFilters && renderAdvancedFilters()}
        {renderViewModeToggle()}
        {renderTimeframeSelector()}

        <TabsContent value="archive">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-4"
              }
            >
              {historicalNews.map(renderNewsItem)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="narratives">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              {narratives.map(renderNarrativeTimeline)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Market Impact Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Price Impact</h4>
                    <div className="text-2xl font-bold">
                      {historicalNews
                        .reduce(
                          (sum, item) =>
                            sum + item.impactMetrics.priceChange24h,
                          0,
                        )
                        .toFixed(2)}
                      %
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium mb-2">Volume Impact</h4>
                    <div className="text-2xl font-bold">
                      {historicalNews
                        .reduce(
                          (sum, item) =>
                            sum + item.impactMetrics.volumeChange24h,
                          0,
                        )
                        .toFixed(2)}
                      %
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium mb-2">Social Engagement</h4>
                    <div className="text-2xl font-bold">
                      {historicalNews
                        .reduce(
                          (sum, item) =>
                            sum + item.impactMetrics.socialEngagement,
                          0,
                        )
                        .toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Top Narratives</h3>
                  <div className="space-y-2">
                    {narratives
                      .sort((a, b) => (b.momentum || 0) - (a.momentum || 0))
                      .slice(0, 5)
                      .map((narrative) => (
                        <div
                          key={narrative.id}
                          className="flex justify-between items-center"
                        >
                          <span>{narrative.name}</span>
                          <Badge variant="secondary">
                            {(narrative.momentum || 0 * 100).toFixed(1)}%
                            momentum
                          </Badge>
                        </div>
                      ))}
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Sentiment Distribution
                  </h3>
                  <div className="space-y-2">
                    {["positive", "negative", "neutral"].map((sentiment) => {
                      const count = historicalNews.filter((item) =>
                        item.marketContext.sentiment > 0.2
                          ? sentiment === "positive"
                          : item.marketContext.sentiment < -0.2
                            ? sentiment === "negative"
                            : sentiment === "neutral",
                      ).length;
                      const percentage = (
                        (count / historicalNews.length) *
                        100
                      ).toFixed(1);
                      return (
                        <div
                          key={sentiment}
                          className="flex justify-between items-center"
                        >
                          <span className="capitalize">{sentiment}</span>
                          <span>{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedNarrative && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedNarrative.name}</h2>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedNarrative(null)}
                >
                  Close
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Market Impact</h3>
                  <div className="space-y-2">
                    <div>
                      Total Price Change:{" "}
                      {selectedNarrative.marketImpact.totalPriceChange.toFixed(
                        2,
                      )}
                      %
                    </div>
                    <div>
                      Peak Price Change:{" "}
                      {selectedNarrative.marketImpact.peakPriceChange.toFixed(
                        2,
                      )}
                      %
                    </div>
                    <div>
                      Average Sentiment:{" "}
                      {selectedNarrative.marketImpact.averageSentiment.toFixed(
                        2,
                      )}
                    </div>
                    <div>
                      Total Volume:{" "}
                      {selectedNarrative.marketImpact.totalVolume.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Narrative Metrics
                  </h3>
                  <div className="space-y-2">
                    {selectedNarrative.momentum !== undefined && (
                      <div>
                        Momentum:{" "}
                        {(selectedNarrative.momentum * 100).toFixed(1)}%
                      </div>
                    )}
                    {selectedNarrative.sentimentTrend !== undefined && (
                      <div>
                        Sentiment Trend:{" "}
                        {(selectedNarrative.sentimentTrend * 100).toFixed(1)}%
                      </div>
                    )}
                    {selectedNarrative.marketCorrelation !== undefined && (
                      <div>
                        Market Correlation:{" "}
                        {(selectedNarrative.marketCorrelation * 100).toFixed(1)}
                        %
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Related Narratives
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedNarrative.relatedNarratives.map((narrative) => (
                    <Badge key={narrative} variant="secondary">
                      {narrative}
                    </Badge>
                  ))}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-4">Related News</h3>
              <div className="space-y-4">
                {selectedNarrative.relatedNews.map(renderNewsItem)}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
