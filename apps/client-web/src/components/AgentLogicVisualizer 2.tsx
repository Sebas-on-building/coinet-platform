import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GitBranch, 
  Database, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  Settings2,
  MessageSquare,
  Loader2,
  Activity,
  Target,
  BarChart3,
  PieChart
} from "lucide-react";
import { NLPResponse } from "@/types/naturalLanguage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InteractiveDecisionTree } from "./InteractiveDecisionTree";
import { PerformanceChart } from "./PerformanceChart";
import { createMockPerformanceData } from "@/data/mockAgentData";

interface AgentLogicVisualizerProps {
  parsedAgent: NLPResponse;
  onRefinementRequest: (feedback: string) => void;
  onCreateAgent: () => void;
  isRefining: boolean;
}

export function AgentLogicVisualizer({
  parsedAgent,
  onRefinementRequest,
  onCreateAgent,
  isRefining
}: AgentLogicVisualizerProps) {
  const [feedback, setFeedback] = useState("");
  const [activeVisualization, setActiveVisualization] = useState("overview");

  const { agent, explanation, confidence } = parsedAgent;

  const handleSubmitFeedback = () => {
    if (feedback.trim()) {
      onRefinementRequest(feedback);
      setFeedback("");
    }
  };

  const renderDecisionTree = () => {
    return (
      <InteractiveDecisionTree 
        decisionNodes={explanation.decisionTree}
        className="w-full"
      />
    );
  };

  const renderTriggerLogic = () => {
    return (
      <div className="space-y-6">
        {explanation.triggerLogic.map((triggerExp, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{triggerExp.trigger.type} Trigger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">Human-Readable Logic</h5>
                <p className="text-sm text-muted-foreground">{triggerExp.humanReadable}</p>
              </div>

              <div>
                <h5 className="font-medium mb-2">Conditions</h5>
                <div className="space-y-2">
                  {triggerExp.trigger.conditions.map((condition, condIndex) => (
                    <div key={condIndex} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{condition.field}</Badge>
                      <span>{condition.operator}</span>
                      <Badge variant="secondary">{condition.value}</Badge>
                      {condition.timeframe && (
                        <Badge variant="outline">over {condition.timeframe}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium mb-2">Data Points Used</h5>
                <div className="flex flex-wrap gap-2">
                  {triggerExp.dataPoints.map((point, pointIndex) => (
                    <Badge key={pointIndex} variant="outline">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium mb-2">Example Scenarios</h5>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {triggerExp.examples.map((example, exampleIndex) => (
                    <li key={exampleIndex}>• {example}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderDataSources = () => {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {explanation.dataSourcesUsed.map((sourceExp, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {sourceExp.source.name}
                <Badge 
                  variant={sourceExp.reliability === "high" ? "default" : 
                          sourceExp.reliability === "medium" ? "secondary" : "outline"}
                >
                  {sourceExp.reliability} reliability
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{sourceExp.purpose}</p>
              
              <div className="flex items-center justify-between text-sm">
                <span>Update Frequency</span>
                <Badge variant="outline">{sourceExp.frequency}</Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Cost</span>
                <Badge 
                  variant={sourceExp.cost === "free" ? "default" : "secondary"}
                >
                  {sourceExp.cost}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Agent Logic Overview
            <div className="flex items-center gap-2">
              <Badge variant={confidence > 80 ? "default" : "secondary"}>
                {confidence}% Confidence
              </Badge>
              <Badge variant="outline">{agent.triggers.length} Triggers</Badge>
              <Badge variant="outline">{agent.dataSources.length} Data Sources</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Agent Summary</h4>
              <p className="text-sm text-muted-foreground">{explanation.overview}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Expected Behavior</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {explanation.expectedBehavior.map((behavior, index) => (
                  <li key={index}>• {behavior}</li>
                ))}
              </ul>
            </div>

            {explanation.riskFactors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Risk Factors to Consider:</strong>
                  <ul className="mt-2 space-y-1">
                    {explanation.riskFactors.map((risk, index) => (
                      <li key={index} className="text-sm">• {risk}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeVisualization} onValueChange={setActiveVisualization}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Decision Tree</TabsTrigger>
          <TabsTrigger value="triggers">Trigger Logic</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderDecisionTree()}
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          {renderTriggerLogic()}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Sources & Integration</CardTitle>
            </CardHeader>
            <CardContent>
              {renderDataSources()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Refinement Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="feedback">Suggest improvements or changes</Label>
            <Textarea
              id="feedback"
              placeholder="Example: Make the agent more conservative by requiring stronger signals, or add a condition to avoid trading during market volatility..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim() || isRefining}
              variant="outline"
            >
              {isRefining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refine Agent
            </Button>
            
            <Button 
              onClick={onCreateAgent}
              disabled={isRefining}
              className="flex-1"
            >
              Create Agent
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}