import { useState, useEffect } from "react";
import { CustomAgent } from "@/types/agents";

const STORAGE_KEY = "custom_agents";

export function useCustomAgents() {
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [activeAgent, setActiveAgent] = useState<CustomAgent | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsedAgents = JSON.parse(stored);
        setAgents(parsedAgents);
      } catch (error) {
        console.error("Failed to parse stored agents:", error);
      }
    }
  }, []);

  const saveAgents = (newAgents: CustomAgent[]) => {
    setAgents(newAgents);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAgents));
  };

  const createAgent = (agentData: Omit<CustomAgent, "id" | "createdAt" | "updatedAt" | "triggers" | "strategies" | "dataSources" | "performance" | "backtestResults" | "learningConfig" | "executions" | "maxExecutionsPerDay" | "executionTimeout" | "retryAttempts" | "notificationPreferences" | "tags" | "version" | "isPublic" | "collaborators">) => {
    const newAgent: CustomAgent = {
      ...agentData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      // Initialize enhanced capabilities with defaults
      triggers: [],
      strategies: [],
      dataSources: [],
      performance: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
      },
      backtestResults: [],
      learningConfig: {
        enabled: false,
        adaptationRate: 0.1,
        minSampleSize: 100,
        optimizationGoals: ["profit"],
        parameterBounds: {},
      },
      executions: [],
      
      // Configuration defaults
      maxExecutionsPerDay: 100,
      executionTimeout: 30,
      retryAttempts: 3,
      notificationPreferences: {
        email: true,
        push: true,
        frequency: "realtime",
        types: ["execution", "error"],
      },
      
      // Advanced features defaults
      tags: [],
      version: "1.0.0",
      isPublic: false,
      collaborators: [],
    };
    
    const updatedAgents = [...agents, newAgent];
    saveAgents(updatedAgents);
    return newAgent;
  };

  const updateAgent = (id: string, updates: Partial<CustomAgent>) => {
    const updatedAgents = agents.map(agent =>
      agent.id === id
        ? { ...agent, ...updates, updatedAt: Date.now() }
        : agent
    );
    saveAgents(updatedAgents);
  };

  const deleteAgent = (id: string) => {
    const updatedAgents = agents.filter(agent => agent.id !== id);
    saveAgents(updatedAgents);
    
    if (activeAgent?.id === id) {
      setActiveAgent(null);
    }
  };

  const duplicateAgent = (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    const duplicated = createAgent({
      ...agent,
      name: `${agent.name} (Copy)`,
      isActive: false,
    });
    
    return duplicated;
  };

  return {
    agents,
    activeAgent,
    setActiveAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    duplicateAgent,
  };
}