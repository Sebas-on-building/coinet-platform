import { useState, useEffect } from "react";
import { Search, Calendar, ExternalLink, Trash2, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SavedBrief {
  id: string;
  query: string;
  timestamp: number;
  brief: {
    thesis: string;
    risks: string[];
    catalysts: string[];
    sentiment: {
      score: number;
      label: string;
    };
    tldr: string;
    sources: Array<{
      title: string;
      url: string;
      type: string;
    }>;
  };
}

export function RecentBriefs() {
  const [briefs, setBriefs] = useState<SavedBrief[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrief, setSelectedBrief] = useState<SavedBrief | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("coinet-recent-briefs");
    if (saved) {
      try {
        setBriefs(JSON.parse(saved));
      } catch {
        setBriefs([]);
      }
    }
  }, []);

  const filteredBriefs = briefs.filter(brief =>
    brief.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brief.brief.thesis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const deleteBrief = (id: string) => {
    const updated = briefs.filter(brief => brief.id !== id);
    setBriefs(updated);
    localStorage.setItem("coinet-recent-briefs", JSON.stringify(updated));
    if (selectedBrief?.id === id) {
      setSelectedBrief(null);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score >= 60) return "text-green-600 bg-green-50";
    if (score <= 40) return "text-red-600 bg-red-50";
    return "text-yellow-600 bg-yellow-50";
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 fade-in pb-24 sm:pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Recent Briefs</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Access your previously generated research insights</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Panel - Brief List */}
          <div className="lg:col-span-1">
            <div className="mb-3 sm:mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search briefs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredBriefs.length === 0 ? (
                <Card className="p-6 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No recent briefs found</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    {briefs.length === 0 ? "Generate your first brief to get started" : "Try a different search term"}
                  </p>
                </Card>
              ) : (
                filteredBriefs.map((brief) => (
                  <Card
                    key={brief.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedBrief?.id === brief.id ? "ring-2 ring-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedBrief(brief)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate mb-1">
                            {brief.query}
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{formatDate(brief.timestamp)}</span>
                          </div>
                          <div className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getSentimentColor(brief.brief.sentiment.score)}`}>
                            {brief.brief.sentiment.label}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBrief(brief.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Brief Details */}
          <div className="lg:col-span-2">
            {selectedBrief ? (
              <Card className="h-fit">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{selectedBrief.query}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(selectedBrief.timestamp)}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(selectedBrief.brief.sentiment.score)}`}>
                          {selectedBrief.brief.sentiment.label} ({selectedBrief.brief.sentiment.score}/100)
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Thesis */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Thesis</h3>
                    </div>
                    <p className="text-foreground leading-relaxed">{selectedBrief.brief.thesis}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Risks */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingDown className="w-5 h-5 text-destructive" />
                        <h3 className="text-lg font-semibold text-foreground">Risks</h3>
                      </div>
                      <ul className="space-y-2">
                        {selectedBrief.brief.risks.map((risk, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Catalysts */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        <h3 className="text-lg font-semibold text-foreground">Catalysts</h3>
                      </div>
                      <ul className="space-y-2">
                        {selectedBrief.brief.catalysts.map((catalyst, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                            <span>{catalyst}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* TL;DR */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">TL;DR</h3>
                    <p className="text-foreground leading-relaxed font-medium bg-muted/30 p-4 rounded-lg">
                      {selectedBrief.brief.tldr}
                    </p>
                  </div>

                  {/* Sources */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ExternalLink className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-foreground">Sources</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {selectedBrief.brief.sources.map((source, index) => (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{source.title}</p>
                            <p className="text-xs text-muted-foreground">{source.type}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Select a brief to view details</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Choose from your recent research briefs</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}