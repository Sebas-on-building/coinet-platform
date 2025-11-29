import React, { useState, useCallback, useEffect } from 'react';
import { Box, Button, Flex, Heading, HStack, VStack, Text, useToast, Card, CardBody, CardHeader, Divider } from '@chakra-ui/react';
import { RuleBuilder } from '@/components/alerts/RuleBuilder';
import { RulePreview } from '@/components/alerts/RulePreview';
import { SignalSelector } from '@/components/alerts/SignalSelector';
import { AlertStudioState } from '@/services/signal-evaluation-engine/src/alerts/types';

interface AlertStudioProps {
  onRuleCreate?: (rule: any) => void;
  onRuleUpdate?: (rule: any) => void;
  initialState?: Partial<AlertStudioState>;
}

export const AlertStudio: React.FC<AlertStudioProps> = ({
  onRuleCreate,
  onRuleUpdate,
  initialState
}) => {
  const toast = useToast();

  // Studio state
  const [studioState, setStudioState] = useState<AlertStudioState>({
    currentRule: null,
    availableSignals: ['price', 'volume', 'social_media', 'on_chain', 'technical'],
    ruleTemplates: [],
    expressionBuilder: {
      selectedSignals: [],
      operators: ['>', '<', '>=', '<=', '==', '!=', 'AND', 'OR', 'NOT'],
      currentExpression: '',
      validationErrors: []
    },
    preview: {
      isEvaluating: false,
      sampleSignals: []
    }
  });

  // Merge initial state
  useEffect(() => {
    if (initialState) {
      setStudioState(prev => ({ ...prev, ...initialState }));
    }
  }, [initialState]);

  // Handle expression changes from rule builder
  const handleExpressionChange = useCallback((expression: string, ast?: any) => {
    setStudioState(prev => ({
      ...prev,
      expressionBuilder: {
        ...prev.expressionBuilder,
        currentExpression: expression
      }
    }));
  }, []);

  // Handle rule validation
  const handleValidateExpression = useCallback(async (expression: string) => {
    try {
      // This would call the AlertAPI validation endpoint
      const response = await fetch('/api/alerts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression })
      });

      const validation = await response.json();

      setStudioState(prev => ({
        ...prev,
        expressionBuilder: {
          ...prev.expressionBuilder,
          validationErrors: validation.errors || []
        }
      }));

      return validation;
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'Failed to validate expression',
        status: 'error',
        duration: 3000
      });
      return { isValid: false, errors: ['Validation failed'] };
    }
  }, [toast]);

  // Handle rule creation
  const handleCreateRule = useCallback(async () => {
    const expression = studioState.expressionBuilder.currentExpression;

    if (!expression.trim()) {
      toast({
        title: 'Error',
        description: 'Please create an expression first',
        status: 'error',
        duration: 3000
      });
      return;
    }

    try {
      const rule = {
        name: `Alert Rule ${Date.now()}`,
        description: 'Created via Alert Studio',
        expression,
        metadata: {
          category: 'composite',
          severity: 'warning',
          tags: ['studio-created'],
          cooldownPeriod: 300
        },
        conditions: {
          evaluationWindow: 60,
          requiredSignals: 1,
          stalenessThreshold: 300
        }
      };

      // This would call the AlertAPI createRule endpoint
      const response = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });

      if (response.ok) {
        toast({
          title: 'Rule Created',
          description: 'Alert rule created successfully',
          status: 'success',
          duration: 3000
        });

        onRuleCreate?.(rule);
      } else {
        throw new Error('Failed to create rule');
      }
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create alert rule',
        status: 'error',
        duration: 3000
      });
    }
  }, [studioState.expressionBuilder.currentExpression, toast, onRuleCreate]);

  return (
    <Box p={6} bg="white" borderRadius="lg" shadow="lg" minH="600px">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" color="gray.800">
            Alert Studio
          </Heading>
          <Text color="gray.600" mt={2}>
            Build sophisticated alert rules with AND/OR logical operators
          </Text>
        </Box>

        <Divider />

        {/* Main Content */}
        <Flex gap={6} h="500px">
          {/* Left Panel - Rule Builder */}
          <Card flex={2} bg="gray.50">
            <CardHeader pb={2}>
              <Heading size="md">Rule Builder</Heading>
            </CardHeader>
            <CardBody pt={0}>
              <RuleBuilder
                studioState={studioState}
                onExpressionChange={handleExpressionChange}
                onValidate={handleValidateExpression}
              />
            </CardBody>
          </Card>

          {/* Right Panel - Preview & Signals */}
          <VStack flex={1} spacing={4}>
            {/* Rule Preview */}
            <Card flex={1} bg="gray.50">
              <CardHeader pb={2}>
                <Heading size="md">Rule Preview</Heading>
              </CardHeader>
              <CardBody pt={0}>
                <RulePreview
                  expression={studioState.expressionBuilder.currentExpression}
                  validationErrors={studioState.expressionBuilder.validationErrors}
                />
              </CardBody>
            </Card>

            {/* Signal Selector */}
            <Card flex={1} bg="gray.50">
              <CardHeader pb={2}>
                <Heading size="md">Available Signals</Heading>
              </CardHeader>
              <CardBody pt={0}>
                <SignalSelector
                  availableSignals={studioState.availableSignals}
                  selectedSignals={studioState.expressionBuilder.selectedSignals}
                  onSignalSelect={(signal) => {
                    setStudioState(prev => ({
                      ...prev,
                      expressionBuilder: {
                        ...prev.expressionBuilder,
                        selectedSignals: [...prev.expressionBuilder.selectedSignals, signal]
                      }
                    }));
                  }}
                />
              </CardBody>
            </Card>
          </VStack>
        </Flex>

        {/* Footer Actions */}
        <Divider />
        <HStack justify="flex-end" spacing={4}>
          <Button
            variant="outline"
            onClick={() => {
              setStudioState(prev => ({
                ...prev,
                expressionBuilder: {
                  ...prev.expressionBuilder,
                  currentExpression: ''
                }
              }));
            }}
          >
            Clear
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleCreateRule}
            isDisabled={!studioState.expressionBuilder.currentExpression.trim()}
          >
            Create Rule
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};
