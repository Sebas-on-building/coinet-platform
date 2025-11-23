import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  TrendingUp, 
  Search, 
  BarChart3,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConceptTranspilerProps {
  concept: string;
  hypothesis: string;
  onConceptChange: (value: string) => void;
  onHypothesisChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

export function ConceptTranspiler({
  concept,
  hypothesis,
  onConceptChange,
  onHypothesisChange,
  onSubmit,
  isProcessing
}: ConceptTranspilerProps) {
  const conceptExamples = [
    {
      title: "Mean Reversion Theory",
      concept: "Assets that drop significantly below their moving average tend to bounce back",
      hypothesis: "If Bitcoin drops 15% below its 30-day moving average while maintaining high volume, it will recover 80% of the drop within 7 days"
    },
    {
      title: "Social Sentiment Correlation",
      concept: "Strong positive social media sentiment preceded by negative news creates buying opportunities",
      hypothesis: "When negative news is followed by 70%+ positive sentiment within 24 hours, price increases by 5-10% in the next 48 hours"
    },
    {
      title: "Whale Activity Pattern",
      concept: "Large whale transactions during low volatility periods signal upcoming price movements",
      hypothesis: "Whale accumulation during sub-2% daily volatility predicts 20%+ price increases within 14 days"
    }
  ];

  const loadExample = (example: typeof conceptExamples[0]) => {
    onConceptChange(example.concept);
    onHypothesisChange(example.hypothesis);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Trading Concept to Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Concept-to-Agent Transpilation:</strong> Describe your trading theory or market hypothesis, 
              and our AI will create an agent to test and validate your concept with real market data.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="concept">Your Trading Concept</Label>
              <Textarea
                id="concept"
                placeholder="Example: I believe that assets with strong community engagement tend to recover faster from market dips than those without active communities..."
                value={concept}
                onChange={(e) => onConceptChange(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="hypothesis">Testable Hypothesis (Optional)</Label>
              <Textarea
                id="hypothesis"
                placeholder="Example: If an asset has 50%+ increase in social mentions and drops 10%+ in price, it will recover 70% of the drop within 3 days..."
                value={hypothesis}
                onChange={(e) => onHypothesisChange(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            <Button 
              onClick={onSubmit}
              disabled={!concept.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Generate Research Agent
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example Concepts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1">
            {conceptExamples.map((example, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {example.title}
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => loadExample(example)}
                  >
                    Use This
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <Badge variant="outline" className="mb-1">Concept</Badge>
                    <p className="text-sm text-muted-foreground">{example.concept}</p>
                  </div>
                  
                  <div>
                    <Badge variant="outline" className="mb-1">Hypothesis</Badge>
                    <p className="text-sm text-muted-foreground">{example.hypothesis}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Your Research Agent Will Do</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium">Data Collection</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Gather historical market data</li>
                <li>• Monitor social sentiment metrics</li>
                <li>• Track on-chain activities</li>
                <li>• Analyze news and events</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Hypothesis Testing</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Statistical significance testing</li>
                <li>• Correlation analysis</li>
                <li>• Confidence interval calculations</li>
                <li>• Bias detection and mitigation</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Research Reports</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Evidence-based conclusions</li>
                <li>• Visual data presentations</li>
                <li>• Risk factor identification</li>
                <li>• Strategy recommendations</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Continuous Learning</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Update analysis with new data</li>
                <li>• Refine hypothesis based on results</li>
                <li>• Adapt to changing market conditions</li>
                <li>• Provide ongoing insights</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}