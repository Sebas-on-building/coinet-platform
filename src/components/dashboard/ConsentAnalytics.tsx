import React from "react";
import { Card } from "../ui/Card";

// Placeholder chart components
const LineChart = ({ data, title }: { data: any; title: string }) => (
  <div className="h-48 flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl">
    <span className="text-lg font-semibold mb-2">{title}</span>
    <span className="text-gray-400">[Line Chart Placeholder]</span>
  </div>
);
const PieChart = ({ data, title }: { data: any; title: string }) => (
  <div className="h-48 flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-xl">
    <span className="text-lg font-semibold mb-2">{title}</span>
    <span className="text-gray-400">[Pie Chart Placeholder]</span>
  </div>
);

export interface ConsentAnalyticsProps {
  data: {
    revokesOverTime: any;
    providerDistribution: any;
  };
}

/**
 * ConsentAnalytics dashboard visualizes consent activity, revokes, provider usage, and trends.
 * Ready for real chart integration.
 */
export const ConsentAnalytics: React.FC<ConsentAnalyticsProps> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
    <Card>
      <LineChart data={data.revokesOverTime} title="Revokes Over Time" />
    </Card>
    <Card>
      <PieChart
        data={data.providerDistribution}
        title="Provider Distribution"
      />
    </Card>
  </div>
);
