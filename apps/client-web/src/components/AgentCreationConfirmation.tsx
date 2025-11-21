import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Palette,
  Calendar,
  Bell,
  ArrowLeft
} from "lucide-react";
import { NLPResponse } from "@/types/naturalLanguage";
import { CustomAgent } from "@/types/agents";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AgentCreationConfirmationProps {
  parsedAgent: NLPResponse;
  onConfirm: (agent: CustomAgent) => void;
  onCancel: () => void;
}

export function AgentCreationConfirmation({
  parsedAgent,
  onConfirm,
  onCancel
}: AgentCreationConfirmationProps) {
  const [agentConfig, setAgentConfig] = useState({
    name: parsedAgent.agent.name,
    description: parsedAgent.agent.description,
    color: parsedAgent.agent.color,
    isActive: false,
    maxExecutionsPerDay: 100,
    notifications: {
      email: true,
      push: true,
      frequency: "realtime" as const
    }
  });

  const [currentTab, setCurrentTab] = useState("overview");

  const handleConfirm = () => {
    const finalAgent: CustomAgent = {
      id: crypto.randomUUID(),
      name: agentConfig.name,
      description: agentConfig.description,
      personality: parsedAgent.agent.personality,
      expertise: parsedAgent.agent.expertise,
      systemPrompt: parsedAgent.agent.systemPrompt,
      color: agentConfig.color,
      isActive: agentConfig.isActive,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      // Enhanced capabilities from parsed structure
      triggers: parsedAgent.agent.triggers,
      strategies: parsedAgent.agent.strategies,
      dataSources: parsedAgent.agent.dataSources,
      
      // Default performance tracking
      performance: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
      },
      
      // Empty arrays for new agent
      backtestResults: [],
      executions: [],
      
      // Learning configuration
      learningConfig: {
        enabled: false,
        adaptationRate: 0.1,
        minSampleSize: 100,
        optimizationGoals: ["profit"],
        parameterBounds: {},
      },
      
      // Configuration
      maxExecutionsPerDay: agentConfig.maxExecutionsPerDay,
      executionTimeout: 30,
      retryAttempts: 3,
      notificationPreferences: {
        email: agentConfig.notifications.email,
        push: agentConfig.notifications.push,
        frequency: agentConfig.notifications.frequency,
        types: ["execution", "error"],
      },
      
      // Advanced features
      tags: parsedAgent.agent.tags,
      version: "2.0.0",
      isPublic: false,
      collaborators: [],
    };

    onConfirm(finalAgent);
  };

  const colorOptions = [
    { name: "Blue", value: "#192CFC" },
    { name: "Green", value: "#10b981" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Orange", value: "#f97316" },
    { name: "Pink", value: "#ec4899" },
    { name: "Red", value: "#ef4444" },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Confirm Agent Creation</h1>
          <p className="text-muted-foreground">Review and customize your agent before creation</p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="data">Data Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Agent Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={agentConfig.name}
                    onChange={(e) => setAgentConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={agentConfig.description}
                    onChange={(e) => setAgentConfig(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Color Theme</Label>
                  <div className="flex gap-2 mt-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setAgentConfig(prev => ({ ...prev, color: color.value }))}
                        className={`w-8 h-8 rounded-full border-2 ${
                          agentConfig.color === color.value ? 'border-primary' : 'border-border'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Expertise Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {parsedAgent.agent.expertise.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {parsedAgent.agent.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Triggers</span>
                  <Badge variant="default">{parsedAgent.agent.triggers.length}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Data Sources</span>
                  <Badge variant="default">{parsedAgent.agent.dataSources.length}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {parsedAgent.explanation.riskFactors.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important Risk Considerations:</strong>
                <ul className="mt-2 space-y-1">
                  {parsedAgent.explanation.riskFactors.map((risk, index) => (
                    <li key={index} className="text-sm">• {risk}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Execution Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Start Active</Label>
                  <Switch
                    id="active"
                    checked={agentConfig.isActive}
                    onCheckedChange={(checked) => 
                      setAgentConfig(prev => ({ ...prev, isActive: checked }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="maxExecutions">Max Executions Per Day</Label>
                  <Input
                    id="maxExecutions"
                    type="number"
                    value={agentConfig.maxExecutionsPerDay}
                    onChange={(e) => setAgentConfig(prev => ({ 
                      ...prev, 
                      maxExecutionsPerDay: parseInt(e.target.value) || 100 
                    }))}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email">Email Notifications</Label>
                  <Switch
                    id="email"
                    checked={agentConfig.notifications.email}
                    onCheckedChange={(checked) => 
                      setAgentConfig(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, email: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="push">Push Notifications</Label>
                  <Switch
                    id="push"
                    checked={agentConfig.notifications.push}
                    onCheckedChange={(checked) => 
                      setAgentConfig(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, push: checked }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          {parsedAgent.agent.triggers.map((trigger, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {trigger.type} Trigger
                  <Badge variant={trigger.enabled ? "default" : "secondary"}>
                    {trigger.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium mb-2">Conditions ({trigger.logicalOperator})</h5>
                    <div className="space-y-2">
                      {trigger.conditions.map((condition, condIndex) => (
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
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {parsedAgent.agent.dataSources.map((source, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {source.name}
                    <Badge variant={source.enabled ? "default" : "secondary"}>
                      {source.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Type</span>
                    <Badge variant="outline">{source.type}</Badge>
                  </div>
                  {source.config.refreshInterval && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Update Frequency</span>
                      <Badge variant="outline">{source.config.refreshInterval}ms</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Create Agent
        </Button>
      </div>
    </div>
  );
}