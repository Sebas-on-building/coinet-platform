import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Heading,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Switch,
  Divider,
  Alert,
  AlertIcon,
  useToast,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';

interface SequentialPattern {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    signalType: string;
    condition: string;
    threshold: number;
  }>;
  maxGap: number;
  orderSensitive: boolean;
  timeWeighted: boolean;
  minMatches: number;
  isActive: boolean;
  createdAt: string;
}

interface SequentialPatternStudioProps {
  onPatternCreate?: (pattern: Omit<SequentialPattern, 'id' | 'createdAt'>) => void;
  onPatternUpdate?: (patternId: string, updates: Partial<SequentialPattern>) => void;
  onPatternDelete?: (patternId: string) => void;
}

export const SequentialPatternStudio: React.FC<SequentialPatternStudioProps> = ({
  onPatternCreate,
  onPatternUpdate,
  onPatternDelete
}) => {
  const toast = useToast();

  // Available signal types
  const availableSignals = ['price', 'volume', 'social_media', 'on_chain', 'technical'];

  // Pattern creation state
  const [newPattern, setNewPattern] = useState({
    name: '',
    description: '',
    steps: [] as Array<{
      signalType: string;
      condition: string;
      threshold: number;
    }>,
    maxGap: 300, // 5 minutes default
    orderSensitive: true,
    timeWeighted: true,
    minMatches: 1
  });

  // Pattern management state
  const [patterns, setPatterns] = useState<SequentialPattern[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load existing patterns
  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setLoading(true);
      // This would call the SequentialPatternEngine API
      const response = await fetch('/api/alerts/patterns');
      if (response.ok) {
        const data = await response.json();
        setPatterns(data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load patterns',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a new step to the pattern
  const addStep = useCallback(() => {
    setNewPattern(prev => ({
      ...prev,
      steps: [...prev.steps, {
        signalType: availableSignals[0],
        condition: '>',
        threshold: 0
      }]
    }));
  }, [availableSignals]);

  // Remove a step from the pattern
  const removeStep = useCallback((index: number) => {
    setNewPattern(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  }, []);

  // Update a step
  const updateStep = useCallback((index: number, field: string, value: any) => {
    setNewPattern(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    }));
  }, []);

  // Create a new pattern
  const createPattern = useCallback(async () => {
    if (!newPattern.name || newPattern.steps.length === 0) {
      toast({
        title: 'Error',
        description: 'Please provide a name and at least one step',
        status: 'error',
        duration: 3000
      });
      return;
    }

    try {
      const pattern = {
        ...newPattern,
        isActive: true
      };

      const response = await fetch('/api/alerts/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pattern)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Sequential pattern created successfully',
          status: 'success',
          duration: 3000
        });

        // Reset form
        setNewPattern({
          name: '',
          description: '',
          steps: [],
          maxGap: 300,
          orderSensitive: true,
          timeWeighted: true,
          minMatches: 1
        });

        // Reload patterns
        loadPatterns();
      } else {
        throw new Error('Failed to create pattern');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create pattern',
        status: 'error',
        duration: 3000
      });
    }
  }, [newPattern, toast]);

  // Toggle pattern active state
  const togglePatternActive = useCallback(async (patternId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/alerts/patterns/${patternId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        setPatterns(prev => prev.map(p =>
          p.id === patternId ? { ...p, isActive } : p
        ));

        toast({
          title: 'Success',
          description: `Pattern ${isActive ? 'activated' : 'deactivated'}`,
          status: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update pattern',
        status: 'error',
        duration: 3000
      });
    }
  }, [toast]);

  // Delete pattern
  const deletePattern = useCallback(async (patternId: string) => {
    try {
      const response = await fetch(`/api/alerts/patterns/${patternId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPatterns(prev => prev.filter(p => p.id !== patternId));
        setSelectedPatternId(null);

        toast({
          title: 'Success',
          description: 'Pattern deleted successfully',
          status: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete pattern',
        status: 'error',
        duration: 3000
      });
    }
  }, [toast]);

  const selectedPattern = selectedPatternId ? patterns.find(p => p.id === selectedPatternId) : null;

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <Heading size="lg">Sequential Pattern Studio</Heading>
          <Text color="gray.600">
            Create and manage ordered signal sequences
          </Text>
        </HStack>

        <Tabs>
          <TabList>
            <Tab>Create Pattern</Tab>
            <Tab>Manage Patterns</Tab>
            <Tab>Pattern Analytics</Tab>
          </TabList>

          <TabPanels>
            {/* Create Pattern Tab */}
            <TabPanel>
              <Card>
                <CardHeader>
                  <Heading size="md">Create Sequential Pattern</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    {/* Basic Info */}
                    <VStack spacing={4} align="stretch">
                      <FormControl isRequired>
                        <FormLabel>Pattern Name</FormLabel>
                        <input
                          type="text"
                          value={newPattern.name}
                          onChange={(e) => setNewPattern(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Bullish Breakout Sequence"
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Description</FormLabel>
                        <textarea
                          value={newPattern.description}
                          onChange={(e) => setNewPattern(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe what this pattern detects..."
                          className="w-full p-2 border border-gray-300 rounded-md h-20 resize-none"
                        />
                      </FormControl>
                    </VStack>

                    <Divider />

                    {/* Pattern Steps */}
                    <VStack spacing={4} align="stretch">
                      <HStack justify="space-between" align="center">
                        <Heading size="sm">Pattern Steps</Heading>
                        <Button
                          leftIcon={<AddIcon />}
                          size="sm"
                          colorScheme="blue"
                          onClick={addStep}
                        >
                          Add Step
                        </Button>
                      </HStack>

                      {newPattern.steps.map((step, index) => (
                        <Card key={index} size="sm">
                          <CardBody>
                            <HStack spacing={4} align="center">
                              <Text fontSize="sm" fontWeight="medium" minW="20px">
                                {index + 1}.
                              </Text>

                              <FormControl flex={2}>
                                <FormLabel fontSize="xs">Signal Type</FormLabel>
                                <Select
                                  size="sm"
                                  value={step.signalType}
                                  onChange={(e) => updateStep(index, 'signalType', e.target.value)}
                                >
                                  {availableSignals.map(signal => (
                                    <option key={signal} value={signal}>{signal}</option>
                                  ))}
                                </Select>
                              </FormControl>

                              <FormControl flex={1}>
                                <FormLabel fontSize="xs">Condition</FormLabel>
                                <Select
                                  size="sm"
                                  value={step.condition}
                                  onChange={(e) => updateStep(index, 'condition', e.target.value)}
                                >
                                  <option value=">">greater than</option>
                                  <option value="<">less than</option>
                                  <option value=">=">greater or equal</option>
                                  <option value="<=">less or equal</option>
                                  <option value="==">equal</option>
                                  <option value="!=">not equal</option>
                                </Select>
                              </FormControl>

                              <FormControl flex={1}>
                                <FormLabel fontSize="xs">Threshold</FormLabel>
                                <NumberInput
                                  size="sm"
                                  value={step.threshold}
                                  onChange={(value) => updateStep(index, 'threshold', parseFloat(value) || 0)}
                                >
                                  <NumberInputField />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              </FormControl>

                              <IconButton
                                aria-label="Remove step"
                                icon={<DeleteIcon />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => removeStep(index)}
                              />
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}

                      {newPattern.steps.length === 0 && (
                        <Box textAlign="center" py={8} color="gray.500">
                          <Text>No steps added yet. Click "Add Step" to get started.</Text>
                        </Box>
                      )}
                    </VStack>

                    <Divider />

                    {/* Pattern Configuration */}
                    <VStack spacing={4} align="stretch">
                      <Heading size="sm">Pattern Configuration</Heading>

                      <HStack spacing={4}>
                        <FormControl>
                          <FormLabel fontSize="sm">Max Gap (seconds)</FormLabel>
                          <NumberInput
                            value={newPattern.maxGap}
                            onChange={(value) => setNewPattern(prev => ({ ...prev, maxGap: parseInt(value) || 0 }))}
                            min={1}
                            max={3600}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="sm">Min Matches</FormLabel>
                          <NumberInput
                            value={newPattern.minMatches}
                            onChange={(value) => setNewPattern(prev => ({ ...prev, minMatches: parseInt(value) || 1 }))}
                            min={1}
                            max={newPattern.steps.length}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>
                      </HStack>

                      <HStack spacing={4}>
                        <FormControl display="flex" alignItems="center">
                          <FormLabel htmlFor="order-sensitive" mb="0" fontSize="sm">
                            Order Sensitive
                          </FormLabel>
                          <Switch
                            id="order-sensitive"
                            isChecked={newPattern.orderSensitive}
                            onChange={(e) => setNewPattern(prev => ({ ...prev, orderSensitive: e.target.checked }))}
                          />
                        </FormControl>

                        <FormControl display="flex" alignItems="center">
                          <FormLabel htmlFor="time-weighted" mb="0" fontSize="sm">
                            Time Weighted
                          </FormLabel>
                          <Switch
                            id="time-weighted"
                            isChecked={newPattern.timeWeighted}
                            onChange={(e) => setNewPattern(prev => ({ ...prev, timeWeighted: e.target.checked }))}
                          />
                        </FormControl>
                      </HStack>
                    </VStack>

                    {/* Create Button */}
                    <Button
                      colorScheme="blue"
                      onClick={createPattern}
                      isDisabled={!newPattern.name || newPattern.steps.length === 0}
                    >
                      Create Sequential Pattern
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Manage Patterns Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between" align="center">
                  <Heading size="md">Existing Patterns</Heading>
                  <Text color="gray.600">
                    {patterns.length} pattern{patterns.length !== 1 ? 's' : ''}
                  </Text>
                </HStack>

                {patterns.map((pattern) => (
                  <Card key={pattern.id}>
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between" align="center">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="medium">{pattern.name}</Text>
                            <Text fontSize="sm" color="gray.600">{pattern.description}</Text>
                          </VStack>
                          <HStack spacing={2}>
                            <Badge colorScheme={pattern.isActive ? 'green' : 'gray'}>
                              {pattern.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Text fontSize="xs" color="gray.500">
                              {pattern.steps.length} steps
                            </Text>
                          </HStack>
                        </HStack>

                        {/* Pattern Steps Preview */}
                        <HStack spacing={2} wrap="wrap">
                          {pattern.steps.map((step, index) => (
                            <Badge key={index} variant="outline" fontSize="xs">
                              {step.signalType} {step.condition} {step.threshold}
                            </Badge>
                          ))}
                        </HStack>

                        {/* Pattern Config */}
                        <HStack spacing={4} fontSize="xs" color="gray.600">
                          <Text>Max Gap: {pattern.maxGap}s</Text>
                          <Text>Min Matches: {pattern.minMatches}</Text>
                          <Text>Order: {pattern.orderSensitive ? 'Sensitive' : 'Flexible'}</Text>
                          <Text>Time Weight: {pattern.timeWeighted ? 'Yes' : 'No'}</Text>
                        </HStack>

                        {/* Actions */}
                        <HStack spacing={2}>
                          <Switch
                            isChecked={pattern.isActive}
                            onChange={(e) => togglePatternActive(pattern.id, e.target.checked)}
                            colorScheme="green"
                          />
                          <Button size="sm" variant="outline" onClick={() => setSelectedPatternId(pattern.id)}>
                            View Details
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deletePattern(pattern.id)}>
                            Delete
                          </Button>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}

                {patterns.length === 0 && (
                  <Box textAlign="center" py={8} color="gray.500">
                    <Text>No sequential patterns created yet.</Text>
                    <Text fontSize="sm">Create your first pattern in the "Create Pattern" tab.</Text>
                  </Box>
                )}
              </VStack>
            </TabPanel>

            {/* Pattern Analytics Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Pattern Analytics</Heading>

                <Card>
                  <CardHeader>
                    <Heading size="sm">Performance Metrics</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <HStack justify="space-between">
                        <Text fontSize="sm">Active Patterns:</Text>
                        <Badge colorScheme="blue">
                          {patterns.filter(p => p.isActive).length}
                        </Badge>
                      </HStack>

                      <HStack justify="space-between">
                        <Text fontSize="sm">Total Patterns:</Text>
                        <Badge colorScheme="purple">
                          {patterns.length}
                        </Badge>
                      </HStack>

                      <HStack justify="space-between">
                        <Text fontSize="sm">Average Steps:</Text>
                        <Badge colorScheme="green">
                          {patterns.length > 0 ?
                            Math.round(patterns.reduce((sum, p) => sum + p.steps.length, 0) / patterns.length)
                            : 0}
                        </Badge>
                      </HStack>

                      <Alert status="info">
                        <AlertIcon />
                        <Text fontSize="sm">
                          Real-time pattern matching with sub-100ms latency and automatic memory management for millions of concurrent evaluations.
                        </Text>
                      </Alert>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};
