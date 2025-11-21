import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { CompetitiveIntelligenceService } from "@/services/analysis/CompetitiveIntelligenceService";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  ChartPieIcon,
  ArrowPathIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

const competitiveIntelligenceService =
  CompetitiveIntelligenceService.getInstance();

export function CompetitiveIntelligence() {
  const [activeTab, setActiveTab] = useState("coverage");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });
  const [coverageAnalysis, setCoverageAnalysis] = useState<any[]>([]);
  const [narrativeShifts, setNarrativeShifts] = useState<any[]>([]);
  const [marketCorrelations, setMarketCorrelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProjects.length > 0 && dateRange.from && dateRange.to) {
      loadData();
    }
  }, [selectedProjects, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "coverage") {
        const analysis =
          await competitiveIntelligenceService.compareProjectsCoverage(
            selectedProjects,
            { startDate: dateRange.from!, endDate: dateRange.to! },
          );
        setCoverageAnalysis(analysis);
      } else if (activeTab === "narratives") {
        const shifts =
          await competitiveIntelligenceService.trackNarrativeShifts(
            selectedProjects,
            { startDate: dateRange.from!, endDate: dateRange.to! },
          );
        setNarrativeShifts(shifts);
      } else if (activeTab === "correlations") {
        const correlations =
          await competitiveIntelligenceService.analyzeMarketCorrelations(
            selectedProjects,
            { startDate: dateRange.from!, endDate: dateRange.to! },
          );
        setMarketCorrelations(correlations);
      }
    } catch (error) {
      console.error("Error loading competitive intelligence data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCoverageAnalysis = () => (
    <div className="space-y-6">
      {coverageAnalysis.map((analysis) => (
        <Card key={analysis.projectId} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold">{analysis.projectName}</h3>
              <p className="text-gray-500">Total News: {analysis.newsCount}</p>
            </div>
            <div className="flex items-center">
              <Badge
                variant={analysis.sentimentTrend > 0 ? "success" : "danger"}
              >
                {analysis.sentimentTrend > 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                )}
                Sentiment Trend: {(analysis.sentimentTrend * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">Price Impact</h4>
              <div className="text-2xl font-bold">
                {analysis.marketImpact.priceChange.toFixed(2)}%
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium mb-2">Volume Impact</h4>
              <div className="text-2xl font-bold">
                {analysis.marketImpact.volumeChange.toFixed(2)}%
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium mb-2">Social Engagement</h4>
              <div className="text-2xl font-bold">
                {analysis.marketImpact.socialEngagement.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Top Narratives</h4>
              <div className="space-y-2">
                {analysis.topNarratives.map((narrative: any) => (
                  <div
                    key={narrative.name}
                    className="flex justify-between items-center"
                  >
                    <span>{narrative.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <FireIcon className="w-4 h-4 mr-1" />
                        {(narrative.momentum * 100).toFixed(1)}%
                      </Badge>
                      <Badge
                        variant={narrative.sentiment > 0 ? "success" : "danger"}
                      >
                        {(narrative.sentiment * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Coverage Distribution</h4>
              <div className="space-y-2">
                {analysis.coverageDistribution.map((source: any) => (
                  <div
                    key={source.source}
                    className="flex justify-between items-center"
                  >
                    <span>{source.source}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{source.count} articles</Badge>
                      <Badge
                        variant={source.sentiment > 0 ? "success" : "danger"}
                      >
                        {(source.sentiment * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderNarrativeShifts = () => (
    <div className="space-y-6">
      {narrativeShifts.map((shift) => (
        <Card key={shift.narrative} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold">{shift.narrative}</h3>
              <p className="text-gray-500">
                Overall Trend: {(shift.overallTrend * 100).toFixed(1)}%
              </p>
            </div>
            <Badge variant={shift.overallTrend > 0 ? "success" : "danger"}>
              {shift.overallTrend > 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              {shift.overallTrend > 0 ? "Growing" : "Declining"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(shift.projects).map(
              ([projectId, stats]: [string, any]) => (
                <div key={projectId} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">{projectId}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Momentum</span>
                      <Badge variant="secondary">
                        <FireIcon className="w-4 h-4 mr-1" />
                        {(stats.momentum * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Sentiment</span>
                      <Badge
                        variant={stats.sentiment > 0 ? "success" : "danger"}
                      >
                        {(stats.sentiment * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>News Count</span>
                      <Badge variant="secondary">{stats.newsCount}</Badge>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  const renderMarketCorrelations = () => (
    <div className="space-y-6">
      {marketCorrelations.map((correlation) => (
        <Card key={correlation.projectId} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold">{correlation.projectId}</h3>
              <p className="text-gray-500">Market Correlations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(correlation.correlations).map(
              ([otherProjectId, stats]: [string, any]) => (
                <div key={otherProjectId} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">{otherProjectId}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Price Correlation</span>
                      <Badge
                        variant={
                          Math.abs(stats.priceCorrelation) > 0.7
                            ? "success"
                            : "secondary"
                        }
                      >
                        {(stats.priceCorrelation * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Volume Correlation</span>
                      <Badge
                        variant={
                          Math.abs(stats.volumeCorrelation) > 0.7
                            ? "success"
                            : "secondary"
                        }
                      >
                        {(stats.volumeCorrelation * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Sentiment Correlation</span>
                      <Badge
                        variant={
                          Math.abs(stats.sentimentCorrelation) > 0.7
                            ? "success"
                            : "secondary"
                        }
                      >
                        {(stats.sentimentCorrelation * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Narrative Overlap</span>
                      <Badge
                        variant={
                          stats.narrativeOverlap > 0.5 ? "success" : "secondary"
                        }
                      >
                        {(stats.narrativeOverlap * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Competitive Intelligence</h2>
        <div className="flex flex-wrap gap-4">
          <Select
            value={selectedProjects.join(",")}
            onChange={(e) => setSelectedProjects(e.target.value.split(","))}
            className="min-w-[200px]"
          >
            <option value="">Select Projects</option>
            <option value="bitcoin,ethereum,solana">
              Bitcoin, Ethereum, Solana
            </option>
            <option value="ethereum,cardano,polkadot">
              Ethereum, Cardano, Polkadot
            </option>
            <option value="solana,avalanche,polygon">
              Solana, Avalanche, Polygon
            </option>
          </Select>
          <DateRangePicker
            onRangeChange={(range) =>
              setDateRange({
                from: range.startDate ? new Date(range.startDate) : undefined,
                to: range.endDate ? new Date(range.endDate) : undefined,
              })
            }
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="coverage">News Coverage</TabsTrigger>
          <TabsTrigger value="narratives">Narrative Shifts</TabsTrigger>
          <TabsTrigger value="correlations">Market Correlations</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage">
          {loading ? (
            <div className="text-center py-8">Loading coverage analysis...</div>
          ) : (
            renderCoverageAnalysis()
          )}
        </TabsContent>

        <TabsContent value="narratives">
          {loading ? (
            <div className="text-center py-8">Loading narrative shifts...</div>
          ) : (
            renderNarrativeShifts()
          )}
        </TabsContent>

        <TabsContent value="correlations">
          {loading ? (
            <div className="text-center py-8">
              Loading market correlations...
            </div>
          ) : (
            renderMarketCorrelations()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
