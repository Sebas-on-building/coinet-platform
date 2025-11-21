import React from "react";
import { Card } from "./Card";

export interface ConsentAIProps {
  consents: any[];
}

/**
 * AI Privacy Assistant: Shows AI-driven privacy recommendations for the user.
 * Future: Integrate with real AI API for personalized suggestions.
 */
export const ConsentAI: React.FC<ConsentAIProps> = ({ consents }) => {
  // Placeholder: In production, call an AI API with consents
  const recommendations = [
    "Review your Google profile scope for minimal data sharing.",
    "Consider revoking unused provider consents.",
    "Enable expiry reminders for sensitive consents.",
  ];
  return (
    <Card className="p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-2xl shadow-xl mt-8">
      <h3 className="text-lg font-bold mb-2">AI Privacy Assistant</h3>
      <ul className="list-disc pl-6">
        {recommendations.map((rec, i) => (
          <li key={i} className="mb-1 text-gray-700 dark:text-gray-200">
            {rec}
          </li>
        ))}
      </ul>
    </Card>
  );
};
