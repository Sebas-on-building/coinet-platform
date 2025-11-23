import { useState, useCallback } from "react";
import { AgentTrigger, TriggerCondition } from "@/types/agents";
import { validateTrigger, evaluateTriggerConditions } from "@/lib/agentUtils";

export function useAgentTriggers(initialTriggers: AgentTrigger[] = []) {
  const [triggers, setTriggers] = useState<AgentTrigger[]>(initialTriggers);

  const addTrigger = useCallback((trigger: Omit<AgentTrigger, "id">) => {
    const newTrigger: AgentTrigger = {
      ...trigger,
      id: crypto.randomUUID(),
    };
    setTriggers(prev => [...prev, newTrigger]);
    return newTrigger;
  }, []);

  const updateTrigger = useCallback((id: string, updates: Partial<AgentTrigger>) => {
    setTriggers(prev => prev.map(trigger => 
      trigger.id === id ? { ...trigger, ...updates } : trigger
    ));
  }, []);

  const removeTrigger = useCallback((id: string) => {
    setTriggers(prev => prev.filter(trigger => trigger.id !== id));
  }, []);

  const addCondition = useCallback((triggerId: string, condition: Omit<TriggerCondition, "id">) => {
    setTriggers(prev => prev.map(trigger => {
      if (trigger.id === triggerId) {
        return {
          ...trigger,
          conditions: [...trigger.conditions, condition as TriggerCondition]
        };
      }
      return trigger;
    }));
  }, []);

  const updateCondition = useCallback((triggerId: string, conditionIndex: number, updates: Partial<TriggerCondition>) => {
    setTriggers(prev => prev.map(trigger => {
      if (trigger.id === triggerId) {
        const newConditions = [...trigger.conditions];
        newConditions[conditionIndex] = { ...newConditions[conditionIndex], ...updates };
        return { ...trigger, conditions: newConditions };
      }
      return trigger;
    }));
  }, []);

  const removeCondition = useCallback((triggerId: string, conditionIndex: number) => {
    setTriggers(prev => prev.map(trigger => {
      if (trigger.id === triggerId) {
        return {
          ...trigger,
          conditions: trigger.conditions.filter((_, index) => index !== conditionIndex)
        };
      }
      return trigger;
    }));
  }, []);

  const validateAllTriggers = useCallback(() => {
    return triggers.every(validateTrigger);
  }, [triggers]);

  const evaluateTriggers = useCallback((data: Record<string, any>) => {
    return triggers
      .filter(trigger => trigger.enabled)
      .map(trigger => ({
        trigger,
        triggered: evaluateTriggerConditions(trigger, data)
      }));
  }, [triggers]);

  const getActiveTriggers = useCallback(() => {
    return triggers.filter(trigger => trigger.enabled);
  }, [triggers]);

  const duplicateTrigger = useCallback((id: string) => {
    const trigger = triggers.find(t => t.id === id);
    if (!trigger) return;

    const { id: _, ...triggerWithoutId } = trigger;
    const duplicated = addTrigger({
      ...triggerWithoutId,
      enabled: false, // Start disabled to avoid accidental triggers
    });
    
    return duplicated;
  }, [triggers, addTrigger]);

  return {
    triggers,
    setTriggers,
    addTrigger,
    updateTrigger,
    removeTrigger,
    addCondition,
    updateCondition,
    removeCondition,
    validateAllTriggers,
    evaluateTriggers,
    getActiveTriggers,
    duplicateTrigger,
  };
}