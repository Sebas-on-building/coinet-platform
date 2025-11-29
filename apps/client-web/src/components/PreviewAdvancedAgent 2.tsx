import React from "react";
import { AgentLogicVisualizer } from "./AgentLogicVisualizer";
import { createMockAgentData } from "@/data/mockAgentData";

interface PreviewAdvancedAgentProps {
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

export function PreviewAdvancedAgent({ formData }: PreviewAdvancedAgentProps) {
  // Generate mock preview data based on form inputs
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
      overview: `Generated preview for ${formData.name}: ${formData.description}`
    }
  };

  const handleRefinement = async (feedback: string) => {
    // Mock refinement for advanced setup
    console.log("Refinement feedback:", feedback);
  };

  const handleCreateAgent = () => {
    // Mock create for preview
    console.log("Creating agent from advanced setup");
  };

  return (
    <AgentLogicVisualizer
      parsedAgent={customizedAgent}
      onRefinementRequest={handleRefinement}
      onCreateAgent={handleCreateAgent}
      isRefining={false}
    />
  );
}