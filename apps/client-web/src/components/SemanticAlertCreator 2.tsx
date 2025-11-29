import React, { useState } from "react";
import { Brain, Sparkles, Mic, Send, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/types/alerts";
import { toast } from "@/hooks/use-toast";

interface SemanticAlertCreatorProps {
  onClose: () => void;
  onCreate: (alert: Omit<Alert, "id" | "createdAt" | "updatedAt" | "triggerCount">) => Promise<Alert>;
}

export function SemanticAlertCreator({ onClose, onCreate }: SemanticAlertCreatorProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedAlert, setParsedAlert] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);

  const exampleQueries = [
    "Alert me when Bitcoin price goes above $100,000",
    "Tell me if Ethereum drops more than 10% in a day",
    "Notify me when there's FUD about Solana",
    "Alert me if any DeFi token pumps more than 50%",
    "Tell me when social sentiment for Cardano turns negative",
    "Alert me if whale activity increases for LINK",
    "Notify me when RSI for BTC goes below 30",
    "Tell me if there's any big news about regulation",
  ];

  const handleVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak your alert request now.",
      });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      toast({
        title: "Speech Recognition Error",
        description: "Failed to recognize speech. Please try again.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const parseQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter an alert request.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // This would typically call an AI service to parse the natural language
      // For now, we'll simulate the parsing with a mock implementation
      const parsed = await mockParseSemanticQuery(query);
      setParsedAlert(parsed);
    } catch (error) {
      toast({
        title: "Parsing Failed",
        description: "Failed to understand your request. Please try rephrasing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!parsedAlert) return;

    setLoading(true);
    try {
      await onCreate(parsedAlert);
      toast({
        title: "Alert Created",
        description: `Your semantic alert "${parsedAlert.name}" is now active.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create alert. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const useExample = (example: string) => {
    setQuery(example);
    setParsedAlert(null);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Alert Creator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Introduction */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-primary mb-2">Natural Language Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Describe your alert in plain English and our AI will understand your intent and create the appropriate conditions. 
                    You can use voice input or type your request.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Query Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Describe your alert</label>
              <div className="relative">
                <Textarea
                  placeholder="Tell me what you want to be alerted about... e.g., 'Alert me when Bitcoin price goes above $100,000'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[100px] pr-12"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVoiceInput}
                  disabled={isListening}
                  className={`absolute top-2 right-2 ${isListening ? 'text-red-500' : 'text-muted-foreground hover:text-primary'}`}
                >
                  <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={parseQuery}
                disabled={loading || !query.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                    Understanding...
                  </>
                ) : (
                  <>
                    Parse Alert
                    <Brain className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
              
              {parsedAlert && (
                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  className="bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl animate-scale-in"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Alert
                      <Sparkles className="h-4 w-4 ml-2 animate-pulse" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Example Queries */}
          <div>
            <h3 className="text-sm font-medium mb-3">Try these examples:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {exampleQueries.map((example, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-md hover:scale-[1.02] border-border/30 group animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => useExample(example)}
                >
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      "{example}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Parsed Alert Preview */}
          {parsedAlert && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Parsed Alert Preview
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Name:</label>
                    <p className="text-sm">{parsedAlert.name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description:</label>
                    <p className="text-sm text-muted-foreground">{parsedAlert.description}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Type & Priority:</label>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{parsedAlert.type}</Badge>
                      <Badge variant="outline">{parsedAlert.priority}</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Conditions:</label>
                    <div className="space-y-1 mt-1">
                      {parsedAlert.trigger.conditions.map((condition: any, index: number) => (
                        <div key={index} className="text-sm p-2 bg-background rounded border">
                          {condition.asset && `${condition.asset} `}
                          {condition.field} {condition.operator} {condition.value}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {parsedAlert.aiContext && (
                    <div>
                      <label className="text-sm font-medium">AI Insights:</label>
                      <div className="text-sm p-2 bg-background rounded border mt-1">
                        <p className="text-muted-foreground">{parsedAlert.aiContext.reasoning}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Confidence: {Math.round(parsedAlert.aiContext.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Mock function to simulate AI parsing of natural language queries
async function mockParseSemanticQuery(query: string): Promise<Omit<Alert, "id" | "createdAt" | "updatedAt" | "triggerCount">> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const lowerQuery = query.toLowerCase();
  
  // Extract asset
  let asset = "BTC";
  const assetMatches = query.match(/\b(bitcoin|btc|ethereum|eth|solana|sol|cardano|ada|chainlink|link|defi|whale)\b/i);
  if (assetMatches) {
    const match = assetMatches[0].toLowerCase();
    switch (match) {
      case "bitcoin":
      case "btc":
        asset = "BTC";
        break;
      case "ethereum":
      case "eth":
        asset = "ETH";
        break;
      case "solana":
      case "sol":
        asset = "SOL";
        break;
      case "cardano":
      case "ada":
        asset = "ADA";
        break;
      case "chainlink":
      case "link":
        asset = "LINK";
        break;
    }
  }
  
  // Determine alert type and conditions
  let alertType: Alert["type"] = "price";
  let priority: Alert["priority"] = "medium";
  let conditions: Alert["trigger"]["conditions"] = [];
  
  // Price patterns
  const pricePattern = /(?:price|cost|value)\s*(?:goes|drops|rises|falls|above|below|over|under)\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i;
  const priceMatch = query.match(pricePattern);
  
  if (priceMatch) {
    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
    const operator = lowerQuery.includes('above') || lowerQuery.includes('over') || lowerQuery.includes('rises') ? 'gt' : 'lt';
    
    conditions.push({
      id: crypto.randomUUID(),
      type: "price",
      asset,
      field: "price",
      operator,
      value: price,
    });
    
    if (price > 50000) priority = "high";
  }
  
  // Percentage patterns
  const percentPattern = /(?:drops|falls|rises|pumps|increases|decreases).*?(\d+)%/i;
  const percentMatch = query.match(percentPattern);
  
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    const isIncrease = lowerQuery.includes('rises') || lowerQuery.includes('pumps') || lowerQuery.includes('increases');
    
    conditions.push({
      id: crypto.randomUUID(),
      type: "price",
      asset,
      field: "percentage_change_24h",
      operator: isIncrease ? "gt" : "lt",
      value: isIncrease ? percent : -percent,
      timeframe: "24h",
    });
    
    if (percent >= 50) priority = "high";
    if (percent >= 100) priority = "critical";
  }
  
  // Sentiment patterns
  if (lowerQuery.includes('fud') || lowerQuery.includes('sentiment') || lowerQuery.includes('negative') || lowerQuery.includes('positive')) {
    alertType = "sentiment";
    const isNegative = lowerQuery.includes('fud') || lowerQuery.includes('negative');
    
    conditions.push({
      id: crypto.randomUUID(),
      type: "sentiment",
      asset,
      field: "sentiment_score",
      operator: isNegative ? "lt" : "gt",
      value: isNegative ? -0.5 : 0.5,
    });
  }
  
  // Volume/whale patterns
  if (lowerQuery.includes('whale') || lowerQuery.includes('volume') || lowerQuery.includes('activity')) {
    if (lowerQuery.includes('whale')) {
      alertType = "onchain";
      conditions.push({
        id: crypto.randomUUID(),
        type: "onchain",
        asset,
        field: "large_transactions",
        operator: "gt",
        value: 10000000, // $10M
      });
    } else {
      alertType = "volume";
      conditions.push({
        id: crypto.randomUUID(),
        type: "volume",
        asset,
        field: "volume_change_24h",
        operator: "gt",
        value: 100, // 100% increase
      });
    }
    priority = "high";
  }
  
  // RSI patterns
  if (lowerQuery.includes('rsi')) {
    alertType = "technical";
    const rsiValue = lowerQuery.includes('below') ? 30 : 70;
    const operator = lowerQuery.includes('below') ? "lt" : "gt";
    
    conditions.push({
      id: crypto.randomUUID(),
      type: "technical",
      asset,
      field: "rsi",
      operator,
      value: rsiValue,
    });
  }
  
  // News/regulation patterns
  if (lowerQuery.includes('news') || lowerQuery.includes('regulation')) {
    alertType = "news";
    conditions.push({
      id: crypto.randomUUID(),
      type: "news",
      asset,
      field: "news_sentiment",
      operator: "contains",
      value: "regulation",
    });
    priority = "high";
  }
  
  // Default condition if none found
  if (conditions.length === 0) {
    conditions.push({
      id: crypto.randomUUID(),
      type: "price",
      asset,
      field: "price",
      operator: "gt",
      value: 50000,
    });
  }
  
  return {
    name: `AI Alert: ${query.slice(0, 50)}${query.length > 50 ? '...' : ''}`,
    description: `Semantic alert created from: "${query}"`,
    type: alertType,
    trigger: {
      conditions,
      logicalOperator: "AND",
    },
    actions: [
      {
        id: crypto.randomUUID(),
        type: "notification",
        config: {
          channels: ["in_app", "push"],
          message: `Alert triggered: ${query}`,
        },
        enabled: true,
      }
    ],
    status: "active",
    priority,
    tags: ["semantic", "ai-generated", asset.toLowerCase()],
    aiContext: {
      confidence: 0.85,
      reasoning: `Alert created from semantic analysis of: "${query}". Detected ${alertType} alert for ${asset} with ${conditions.length} condition(s).`,
      insightType: "pattern_recognition",
    },
    smartSettings: {
      adaptiveFrequency: true,
      patternRecognition: true,
      contextualAdjustment: true,
      learningEnabled: true,
      anticipatoryMode: false,
      relativeAnalysis: false,
    },
  };
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}