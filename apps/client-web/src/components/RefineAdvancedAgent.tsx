import React from "react";
import { EnhancedRefineAndTestTab } from "./EnhancedRefineAndTestTab";
import { createMockAgentData } from "@/data/mockAgentData";

interface RefineAdvancedAgentProps {
  formData: {
    name: string;
    description: string;
    personality: string;
    expertise: string[];
    systemPrompt: string;
    color: string;
    isActive: boolean;
  };
}

export function RefineAdvancedAgent({ formData }: RefineAdvancedAgentProps) {
  // Generate mock data for testing based on form inputs
  const agentType = formData.description.toLowerCase().includes("conservative") || 
                   formData.description.toLowerCase().includes("safe") ? "conservative" :
                   formData.description.toLowerCase().includes("aggressive") ||
                   formData.description.toLowerCase().includes("fast") ? "aggressive" : "balanced";
  
  const mockParsedAgent = createMockAgentData(agentType);
  
  // Customize with actual form data
  const customizedAgent = {
    ...mockParsedAgent,
    agent: {
      ...mockParsedAgent.agent,
      name: formData.name,
      description: formData.description,
      personality: formData.personality || "Professional and analytical",
      expertise: formData.expertise.length > 0 ? formData.expertise : ["General Trading"],
      systemPrompt: formData.systemPrompt || "You are a trading assistant focused on data-driven decisions."
    },
    explanation: {
      ...mockParsedAgent.explanation,
      overview: `Generated analysis for ${formData.name}: ${formData.description}`
    }
  };

  return (
    <EnhancedRefineAndTestTab parsedAgent={customizedAgent} />
  );
}