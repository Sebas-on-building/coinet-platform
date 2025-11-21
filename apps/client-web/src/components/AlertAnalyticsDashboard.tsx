import React from "react";
import { TrendingUp, TrendingDown, Target, Clock, Brain, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertAnalytics } from "@/types/alerts";

interface AlertAnalyticsDashboardProps {
  analytics: AlertAnalytics;
}

export function AlertAnalyticsDashboard({ analytics }: AlertAnalyticsDashboardProps) {
  const { metrics, patterns, recommendations } = analytics;

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return "text-green-600";
    if (accuracy >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="group hover:border-primary/20 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-primary">
                  {Math.round((metrics.successfulAlerts / Math.max(metrics.triggeredAlerts, 1)) * 100)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-primary/50 group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:border-green-500/20 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">User Satisfaction</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.userSatisfactionScore.toFixed(1)}/5
                </p>
              </div>
              <Star className="h-8 w-8 text-green-500/50 group-hover:text-green-500 transition-colors" />
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:border-blue-500/20 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(metrics.averageResponseTime / (60 * 1000))}m
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500/50 group-hover:text-blue-500 transition-colors" />
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:border-orange-500/20 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">False Positives</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round((metrics.falsePositives / Math.max(metrics.triggeredAlerts, 1)) * 100)}%
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500/50 group-hover:text-orange-500 transition-colors" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Type Accuracy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Alert Type Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(metrics.accuracyByType).map(([type, accuracy]) => (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {type.replace('_', ' ')}
                  </span>
                  <span className={`text-sm font-medium ${getAccuracyColor(accuracy)}`}>
                    {Math.round(accuracy * 100)}%
                  </span>
                </div>
                <Progress value={accuracy * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Peak Alert Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patterns.peakAlertHours.map((hour) => (
                <div key={hour} className="flex items-center justify-between">
                  <span className="text-sm">
                    {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00
                  </span>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    Peak
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(patterns.responsePatterns).map(([pattern, percentage]) => (
                <div key={pattern} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {pattern.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium">
                      {Math.round(percentage * 100)}%
                    </span>
                  </div>
                  <Progress value={percentage * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preferred Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Preferred Notification Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {patterns.preferredChannels.map((channel) => (
              <Badge key={channel} variant="outline" className="bg-accent/10 text-accent">
                {channel.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <TrendingUp className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Suggested Improvements</h4>
              <ul className="space-y-1">
                {recommendations.suggestedImprovements.map((improvement, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>

            {recommendations.alertsToModify.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Alerts to Review</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendations.alertsToModify.map((alertId) => (
                    <Badge key={alertId} variant="outline" className="text-orange-600 border-orange-500/50">
                      Alert {alertId.slice(0, 8)}...
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dismissal Reasons */}
      <Card>
        <CardHeader>
          <CardTitle>Common Dismissal Reasons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(patterns.dismissalReasons).map(([reason, percentage]) => (
              <div key={reason} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {reason.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round(percentage * 100)}%
                  </span>
                </div>
                <Progress value={percentage * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}