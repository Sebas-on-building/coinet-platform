import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
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
  Spinner,
  Alert,
  AlertIcon,
  Button,
  Select,
  useToast
} from '@chakra-ui/react';

interface AlertNotification {
  id: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: string;
  severity: string;
  title: string;
  description: string;
  channels: string[];
  metadata: {
    confidence: number;
    evaluationResult: any;
  };
}

export const AlertHistory: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const toast = useToast();

  // Load alerts from API
  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      // This would call the AlertAPI to get alert history
      const response = await fetch('/api/alerts/history');
      if (!response.ok) throw new Error('Failed to load alert history');

      const data = await response.json();
      setAlerts(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to load alert history',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
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

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'green';
      case 'webhook': return 'purple';
      case 'dashboard': return 'blue';
      case 'telegram': return 'cyan';
      case 'discord': return 'indigo';
      default: return 'gray';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.severity === filter;
  });

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" />
        <Text mt={4}>Loading alert history...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading alert history: {error}
        <Button ml={4} size="sm" onClick={loadAlerts}>
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
          <Heading size="lg">Alert History</Heading>
          <HStack spacing={4}>
            <Text color="gray.600">
              {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
            </Text>
            <Select size="sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </Select>
          </HStack>
        </HStack>

        {/* Alerts Table */}
        <Card>
          <CardHeader>
            <Heading size="md">Recent Alerts</Heading>
          </CardHeader>
          <CardBody>
            {filteredAlerts.length === 0 ? (
              <Box textAlign="center" py={8} color="gray.500">
                <Text>No alerts found</Text>
                {filter !== 'all' && (
                  <Text fontSize="sm">Try changing the filter to see more alerts</Text>
                )}
              </Box>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Alert</Th>
                    <Th>Rule</Th>
                    <Th>Severity</Th>
                    <Th>Channels</Th>
                    <Th>Confidence</Th>
                    <Th>Triggered</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredAlerts.map((alert) => (
                    <Tr key={alert.id}>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">{alert.title}</Text>
                          <Text fontSize="xs" color="gray.600" noOfLines={2}>
                            {alert.description}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm">{alert.ruleName}</Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={getSeverityColor(alert.severity)} fontSize="xs">
                          {alert.severity}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={1} wrap="wrap">
                          {alert.channels.map((channel) => (
                            <Badge key={channel} colorScheme={getChannelColor(channel)} fontSize="xs">
                              {channel}
                            </Badge>
                          ))}
                        </HStack>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Text fontSize="sm">{Math.round(alert.metadata.confidence * 100)}%</Text>
                          <Box w="60px" h="4px" bg="gray.200" borderRadius="full" overflow="hidden">
                            <Box
                              w={`${alert.metadata.confidence * 100}%`}
                              h="100%"
                              bg={alert.metadata.confidence > 0.8 ? 'green.400' : alert.metadata.confidence > 0.6 ? 'yellow.400' : 'red.400'}
                              borderRadius="full"
                            />
                          </Box>
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm">
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </Text>
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
                <Text fontSize="2xl" fontWeight="bold" color="red.500">
                  {alerts.filter(a => a.severity === 'critical').length}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Critical Alerts
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card flex={1}>
            <CardBody>
              <VStack align="center" spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="yellow.500">
                  {alerts.filter(a => a.severity === 'warning').length}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Warning Alerts
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card flex={1}>
            <CardBody>
              <VStack align="center" spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {alerts.filter(a => a.severity === 'info').length}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Info Alerts
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card flex={1}>
            <CardBody>
              <VStack align="center" spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {alerts.length > 0 ? Math.round(alerts.reduce((acc, a) => acc + a.metadata.confidence, 0) / alerts.length * 100) : 0}%
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Avg Confidence
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </HStack>
      </VStack>
    </Box>
  );
};
