import React, { useState, useEffect } from 'react';
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Switch,
  Tooltip
} from '@chakra-ui/react';
import { Edit as EditIcon, Trash2 as DeleteIcon, Eye as ViewIcon } from 'lucide-react';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  expression: string;
  isActive: boolean;
  createdAt: string;
  metadata: {
    category: string;
    severity: string;
    tags: string[];
  };
  conditions: {
    evaluationWindow: number;
    requiredSignals: number;
  };
}

export const AlertRulesList: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Load rules from API
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);

      // This would call the AlertAPI getAllRules endpoint
      const response = await fetch('/api/alerts/rules');
      if (!response.ok) throw new Error('Failed to load rules');

      const data = await response.json();
      setRules(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to load alert rules',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle rule active state
  const toggleRuleActive = async (ruleId: string, isActive: boolean) => {
    try {
      const endpoint = isActive ? '/api/alerts/rules/deactivate' : '/api/alerts/rules/activate';
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId })
      });

      if (!response.ok) throw new Error('Failed to update rule');

      // Update local state
      setRules(prev => prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive } : rule
      ));

      toast({
        title: 'Success',
        description: `Rule ${isActive ? 'deactivated' : 'activated'} successfully`,
        status: 'success',
        duration: 2000
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to update rule',
        status: 'error',
        duration: 3000
      });
    }
  };

  // Delete rule
  const deleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete rule');

      // Remove from local state
      setRules(prev => prev.filter(rule => rule.id !== ruleId));

      toast({
        title: 'Success',
        description: 'Rule deleted successfully',
        status: 'success',
        duration: 2000
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        status: 'error',
        duration: 3000
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'price': return 'green';
      case 'volume': return 'blue';
      case 'social': return 'purple';
      case 'onchain': return 'orange';
      case 'technical': return 'red';
      case 'composite': return 'cyan';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" />
        <Text mt={4}>Loading alert rules...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertIcon />
        Error loading rules: {error}
        <Button ml={4} size="sm" onClick={loadRules}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <Heading size="lg">Alert Rules</Heading>
          <Text color="gray.600">
            {rules.length} rule{rules.length !== 1 ? 's' : ''}
          </Text>
        </HStack>

        {/* Rules Table */}
        <Card>
          <CardHeader>
            <Heading size="md">Active Rules</Heading>
          </CardHeader>
          <CardBody>
            {rules.length === 0 ? (
              <Box textAlign="center" py={8} color="gray.500">
                <Text>No alert rules found</Text>
                <Text fontSize="sm">Create your first rule in the Studio tab</Text>
              </Box>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Description</Th>
                    <Th>Expression</Th>
                    <Th>Category</Th>
                    <Th>Severity</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rules.map((rule) => (
                    <Tr key={rule.id}>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">{rule.name}</Text>
                          <Text fontSize="xs" color="gray.500">
                            Created {new Date(rule.createdAt).toLocaleDateString()}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm" noOfLines={2}>
                          {rule.description}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="xs" fontFamily="mono" bg="gray.100" p={2} borderRadius="md">
                          {rule.expression}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={getCategoryColor(rule.metadata.category)} fontSize="xs">
                          {rule.metadata.category}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={getSeverityColor(rule.metadata.severity)} fontSize="xs">
                          {rule.metadata.severity}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Switch
                            isChecked={rule.isActive}
                            onChange={(e) => toggleRuleActive(rule.id, e.target.checked)}
                            colorScheme="green"
                          />
                          <Text fontSize="sm">
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </HStack>
                      </Td>
                      <Td>
                        <HStack spacing={1}>
                          <Tooltip label="View details">
                            <IconButton
                              aria-label="View rule"
                              icon={<ViewIcon />}
                              size="sm"
                              variant="ghost"
                            />
                          </Tooltip>
                          <Tooltip label="Edit rule">
                            <IconButton
                              aria-label="Edit rule"
                              icon={<EditIcon />}
                              size="sm"
                              variant="ghost"
                            />
                          </Tooltip>
                          <Tooltip label="Delete rule">
                            <IconButton
                              aria-label="Delete rule"
                              icon={<DeleteIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => deleteRule(rule.id)}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Summary Stats */}
        <HStack spacing={4}>
          <Card flex={1}>
            <CardBody>
              <VStack align="center" spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {rules.filter(r => r.isActive).length}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Active Rules
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card flex={1}>
            <CardBody>
              <VStack align="center" spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {rules.length}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Total Rules
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card flex={1}>
            <CardBody>
              <VStack align="center" spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {Object.keys(
                    rules.reduce((acc, rule) => {
                      rule.metadata.tags.forEach(tag => acc[tag] = true);
                      return acc;
                    }, {} as Record<string, boolean>)
                  ).length}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Unique Tags
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </HStack>
      </VStack>
    </Box>
  );
};
