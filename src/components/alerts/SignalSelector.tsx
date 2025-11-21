import React, { useState } from 'react';
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
  Input,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Divider,
  Tooltip,
  useColorModeValue,
  Collapse,
  IconButton
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, InfoIcon } from '@chakra-ui/icons';

interface SignalSelectorProps {
  availableSignals: string[];
  selectedSignals: string[];
  onSignalSelect: (signal: string) => void;
}

interface SignalTypeInfo {
  name: string;
  description: string;
  fields: Array<{
    name: string;
    type: 'number' | 'string' | 'boolean';
    description: string;
    example?: any;
  }>;
  category: 'price' | 'volume' | 'social' | 'onchain' | 'technical' | 'news';
}

const SIGNAL_TYPE_INFO: Record<string, SignalTypeInfo> = {
  price: {
    name: 'Price',
    description: 'Market price data from exchanges',
    category: 'price',
    fields: [
      { name: 'value', type: 'number', description: 'Current price value', example: 50000 },
      { name: 'change', type: 'number', description: 'Price change percentage', example: 2.5 },
      { name: 'volume', type: 'number', description: 'Trading volume', example: 1000000 }
    ]
  },
  volume: {
    name: 'Volume',
    description: 'Trading volume metrics',
    category: 'volume',
    fields: [
      { name: 'value', type: 'number', description: 'Volume amount', example: 1000000 },
      { name: 'change', type: 'number', description: 'Volume change percentage', example: 15.2 }
    ]
  },
  social_media: {
    name: 'Social Media',
    description: 'Social media sentiment and engagement',
    category: 'social',
    fields: [
      { name: 'sentiment_score', type: 'number', description: 'Sentiment score (-1 to 1)', example: 0.8 },
      { name: 'engagement', type: 'number', description: 'Social engagement level', example: 85 },
      { name: 'mention_count', type: 'number', description: 'Number of mentions', example: 1200 }
    ]
  },
  on_chain: {
    name: 'On-Chain',
    description: 'Blockchain transaction and activity data',
    category: 'onchain',
    fields: [
      { name: 'transfer_value', type: 'number', description: 'Transaction value in ETH', example: 100.5 },
      { name: 'gas_price', type: 'number', description: 'Gas price in gwei', example: 25 },
      { name: 'active_addresses', type: 'number', description: 'Active wallet count', example: 50000 }
    ]
  },
  technical: {
    name: 'Technical',
    description: 'Technical indicators and analysis',
    category: 'technical',
    fields: [
      { name: 'rsi', type: 'number', description: 'Relative Strength Index (0-100)', example: 65 },
      { name: 'macd', type: 'number', description: 'MACD indicator value', example: 0.02 },
      { name: 'bb_upper', type: 'number', description: 'Bollinger Band upper', example: 52000 },
      { name: 'bb_lower', type: 'number', description: 'Bollinger Band lower', example: 48000 }
    ]
  }
};

export const SignalSelector: React.FC<SignalSelectorProps> = ({
  availableSignals,
  selectedSignals,
  onSignalSelect
}) => {
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const [conditionConfig, setConditionConfig] = useState<{
    signalType: string;
    field: string;
    operator: string;
    threshold: number;
  } | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSignalExpand = (signalType: string) => {
    setExpandedSignal(expandedSignal === signalType ? null : signalType);
  };

  const handleFieldSelect = (signalType: string, field: string) => {
    setConditionConfig({
      signalType,
      field,
      operator: '>',
      threshold: 0
    });
  };

  const handleConditionCreate = () => {
    if (!conditionConfig) return;

    // Create a condition expression
    const expression = `${conditionConfig.signalType}.${conditionConfig.field} ${conditionConfig.operator} ${conditionConfig.threshold}`;

    // This would typically call the rule builder to add the condition
    console.log('Creating condition:', expression);

    setConditionConfig(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'price': return 'green';
      case 'volume': return 'blue';
      case 'social': return 'purple';
      case 'onchain': return 'orange';
      case 'technical': return 'red';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={3} align="stretch" h="100%">
      <Text fontSize="sm" fontWeight="medium" color="gray.700">
        Click on a signal type to explore available fields and create conditions
      </Text>

      {/* Signal Types List */}
      <VStack spacing={2} align="stretch" flex={1} overflowY="auto">
        {availableSignals.map((signalType) => {
          const info = SIGNAL_TYPE_INFO[signalType];
          if (!info) return null;

          const isExpanded = expandedSignal === signalType;
          const isSelected = selectedSignals.includes(signalType);

          return (
            <Card key={signalType} size="sm">
              <CardHeader p={3} pb={isExpanded ? 2 : 3}>
                <HStack justify="space-between" align="center">
                  <HStack spacing={2}>
                    <Badge colorScheme={getCategoryColor(info.category)} fontSize="xs">
                      {info.category}
                    </Badge>
                    <Text fontSize="sm" fontWeight="medium">
                      {info.name}
                    </Text>
                  </HStack>

                  <HStack spacing={1}>
                    <Tooltip label={info.description}>
                      <IconButton
                        aria-label="Info"
                        icon={<InfoIcon />}
                        size="xs"
                        variant="ghost"
                      />
                    </Tooltip>

                    <IconButton
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                      size="xs"
                      variant="ghost"
                      onClick={() => handleSignalExpand(signalType)}
                    />
                  </HStack>
                </HStack>
              </CardHeader>

              <Collapse in={isExpanded}>
                <CardBody pt={0} px={3} pb={3}>
                  <VStack spacing={3} align="stretch">
                    <Text fontSize="xs" color="gray.600">
                      {info.description}
                    </Text>

                    <Divider />

                    {/* Available Fields */}
                    <VStack spacing={2} align="stretch">
                      <Text fontSize="xs" fontWeight="medium" color="gray.700">
                        Available Fields:
                      </Text>

                      {info.fields.map((field) => (
                        <Button
                          key={field.name}
                          size="xs"
                          variant="outline"
                          justifyContent="flex-start"
                          h="auto"
                          py={2}
                          onClick={() => handleFieldSelect(signalType, field.name)}
                        >
                          <VStack align="start" spacing={0}>
                            <Text fontSize="xs" fontWeight="medium">
                              {field.name}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {field.description}
                            </Text>
                          </VStack>
                        </Button>
                      ))}
                    </VStack>

                    {/* Condition Configuration */}
                    {conditionConfig && conditionConfig.signalType === signalType && (
                      <>
                        <Divider />
                        <VStack spacing={3} align="stretch">
                          <Text fontSize="xs" fontWeight="medium" color="gray.700">
                            Configure Condition:
                          </Text>

                          <FormControl size="xs">
                            <FormLabel fontSize="xs">Field</FormLabel>
                            <Text fontSize="xs" p={2} bg="gray.100" borderRadius="md">
                              {conditionConfig.signalType}.{conditionConfig.field}
                            </Text>
                          </FormControl>

                          <FormControl size="xs">
                            <FormLabel fontSize="xs">Operator</FormLabel>
                            <Select
                              size="xs"
                              value={conditionConfig.operator}
                              onChange={(e) => setConditionConfig(prev => prev ? {...prev, operator: e.target.value} : null)}
                            >
                              <option value=">">greater than {'>'}</option>
                              <option value="<">less than (&lt;)</option>
                              <option value=">=">greater or equal (&gt;=)</option>
                              <option value="<=">less or equal (&lt;=)</option>
                              <option value="==">equal (==)</option>
                              <option value="!=">not equal (!=)</option>
                            </Select>
                          </FormControl>

                          <FormControl size="xs">
                            <FormLabel fontSize="xs">Threshold</FormLabel>
                            <NumberInput
                              size="xs"
                              value={conditionConfig.threshold}
                              onChange={(value) => setConditionConfig(prev => prev ? {...prev, threshold: parseFloat(value) || 0} : null)}
                            >
                              <NumberInputField />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          </FormControl>

                          <HStack spacing={2}>
                            <Button
                              size="xs"
                              colorScheme="blue"
                              onClick={handleConditionCreate}
                              flex={1}
                            >
                              Add Condition
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setConditionConfig(null)}
                            >
                              Cancel
                            </Button>
                          </HStack>
                        </VStack>
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Collapse>
            </Card>
          );
        })}
      </VStack>

      {/* Selected Signals Summary */}
      {selectedSignals.length > 0 && (
        <Box>
          <Divider mb={2} />
          <Text fontSize="xs" fontWeight="medium" color="gray.700" mb={2}>
            Selected Signals ({selectedSignals.length}):
          </Text>
          <HStack spacing={1} wrap="wrap">
            {selectedSignals.map((signal) => (
              <Badge key={signal} colorScheme="blue" fontSize="xs">
                {signal}
              </Badge>
            ))}
          </HStack>
        </Box>
      )}
    </VStack>
  );
};
