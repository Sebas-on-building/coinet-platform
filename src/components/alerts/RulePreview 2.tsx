import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Button,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertDescription,
  Spinner,
  Divider,
  Card,
  CardBody,
  CardHeader,
  Heading
} from '@chakra-ui/react';

interface RulePreviewProps {
  expression: string;
  validationErrors: string[];
  ast?: any;
}

interface PerformanceMetrics {
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedLatency: number;
  memoryUsage: number;
}

export const RulePreview: React.FC<RulePreviewProps> = ({
  expression,
  validationErrors,
  ast
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Simulate validation and performance estimation
  useEffect(() => {
    if (expression.trim()) {
      setIsValidating(true);

      // Simulate API call to validation endpoint
      setTimeout(() => {
        const mockValidation = simulateValidation(expression);
        setPerformance(mockValidation.performance);
        setIsValidating(false);
      }, 500);
    } else {
      setPerformance(null);
    }
  }, [expression]);

  // Simulate validation logic (would be replaced with actual API call)
  const simulateValidation = (expr: string) => {
    const complexity = expr.length > 50 ? 'complex' : expr.length > 20 ? 'moderate' : 'simple';
    const estimatedLatency = complexity === 'complex' ? 45 : complexity === 'moderate' ? 25 : 15;
    const memoryUsage = complexity === 'complex' ? 4.5 : complexity === 'moderate' ? 2.5 : 1.2;

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      performance: {
        complexity,
        estimatedLatency,
        memoryUsage
      }
    };
  };

  // Simulate rule evaluation
  const handleTestEvaluation = async () => {
    if (!expression.trim()) return;

    setIsEvaluating(true);

    // Simulate evaluation delay
    setTimeout(() => {
      setIsEvaluating(false);
      // In a real app, this would show actual evaluation results
    }, 2000);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'green';
      case 'moderate': return 'yellow';
      case 'complex': return 'red';
      default: return 'gray';
    }
  };

  const getPerformanceColor = (latency: number) => {
    if (latency <= 20) return 'green';
    if (latency <= 50) return 'yellow';
    return 'red';
  };

  return (
    <VStack spacing={4} align="stretch" h="100%">
      {/* Validation Status */}
      <Card>
        <CardHeader pb={2}>
          <Heading size="sm">Validation</Heading>
        </CardHeader>
        <CardBody pt={0}>
          {isValidating ? (
            <HStack spacing={2}>
              <Spinner size="sm" />
              <Text fontSize="sm" color="gray.600">Validating...</Text>
            </HStack>
          ) : validationErrors.length > 0 ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                <VStack align="start" spacing={1}>
                  {validationErrors.map((error, index) => (
                    <Text key={index} fontSize="xs">• {error}</Text>
                  ))}
                </VStack>
              </AlertDescription>
            </Alert>
          ) : expression.trim() ? (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                Expression is valid
              </AlertDescription>
            </Alert>
          ) : (
            <Text fontSize="sm" color="gray.500">
              Enter an expression to see validation results
            </Text>
          )}
        </CardBody>
      </Card>

      {/* Performance Metrics */}
      {performance && (
        <Card>
          <CardHeader pb={2}>
            <Heading size="sm">Performance</Heading>
          </CardHeader>
          <CardBody pt={0}>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm">Complexity:</Text>
                <Badge colorScheme={getComplexityColor(performance.complexity)}>
                  {performance.complexity}
                </Badge>
              </HStack>

              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">Estimated Latency:</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {performance.estimatedLatency}ms
                  </Text>
                </HStack>
                <Progress
                  value={Math.min(performance.estimatedLatency, 100)}
                  max={100}
                  colorScheme={getPerformanceColor(performance.estimatedLatency)}
                  size="sm"
                  borderRadius="md"
                />
              </Box>

              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">Memory Usage:</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {performance.memoryUsage}MB
                  </Text>
                </HStack>
                <Progress
                  value={Math.min(performance.memoryUsage * 20, 100)}
                  max={100}
                  colorScheme={performance.memoryUsage <= 2 ? 'green' : performance.memoryUsage <= 4 ? 'yellow' : 'red'}
                  size="sm"
                  borderRadius="md"
                />
              </Box>

              <Alert status={performance.estimatedLatency <= 50 ? 'success' : 'warning'} borderRadius="md">
                <AlertDescription fontSize="xs">
                  {performance.estimatedLatency <= 50
                    ? 'Performance meets requirements (< 100ms)'
                    : 'Consider simplifying for better performance'
                  }
                </AlertDescription>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* AST Preview */}
      {ast && (
        <Card flex={1}>
          <CardHeader pb={2}>
            <Heading size="sm">AST Structure</Heading>
          </CardHeader>
          <CardBody pt={0}>
            <Box
              p={3}
              bg="gray.100"
              borderRadius="md"
              fontFamily="mono"
              fontSize="xs"
              maxH="150px"
              overflowY="auto"
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(ast, null, 2)}
              </pre>
            </Box>
          </CardBody>
        </Card>
      )}

      {/* Test Evaluation */}
      {expression.trim() && (
        <>
          <Divider />
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading size="sm">Test Evaluation</Heading>
                <Text fontSize="sm" color="gray.600">
                  Test your rule against sample data to see how it behaves
                </Text>
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={handleTestEvaluation}
                  isLoading={isEvaluating}
                  loadingText="Evaluating..."
                  isDisabled={!expression.trim() || validationErrors.length > 0}
                >
                  Test Rule
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!expression.trim() && (
        <Card flex={1}>
          <CardBody>
            <VStack spacing={4} align="center" justify="center" h="100%" color="gray.500">
              <Text fontSize="md" textAlign="center">
                Rule Preview
              </Text>
              <Text fontSize="sm" textAlign="center">
                Build an expression in the Rule Builder to see validation, performance metrics, and AST structure
              </Text>
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};
