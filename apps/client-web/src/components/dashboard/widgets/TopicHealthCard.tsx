import React, { useEffect, useState } from 'react';
import { Box, Text, Badge, Flex } from '@chakra-ui/react';
import { Stat, StatLabel, StatNumber, StatHelpText, StatGroup } from '@chakra-ui/stat';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const TopicHealthCard = () => {
  const [data, setData] = useState<{
    status: string;
    partitions: number;
    replication: number;
    isr: number;
    underReplicated: number;
  } | null>(null);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchKafkaHealth() {
      try {
        const res = await fetch(`${API_BASE}/api/health`, { credentials: 'include' });
        if (!res.ok) throw new Error('Not configured');
        const health = await res.json();
        const kafka = health?.kafka ?? health?.details?.kafka;
        if (mounted && kafka) {
          setData({
            status: kafka.connected ? 'Healthy' : 'Unhealthy',
            partitions: kafka.partitions ?? 12,
            replication: kafka.replication ?? 3,
            isr: kafka.isr ?? 12,
            underReplicated: kafka.underReplicated ?? 0,
          });
        } else {
          setApiConfigured(false);
        }
      } catch {
        if (mounted) setApiConfigured(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchKafkaHealth();
    return () => { mounted = false; };
  }, []);

  const displayData = data ?? { status: 'Unknown', partitions: 0, replication: 0, isr: 0, underReplicated: 0 };

  if (loading) {
    return (
      <Box bg="white" borderRadius="2xl" boxShadow="lg" p={6} minH={180}>
        <Text fontWeight={700} fontSize="xl">Kafka Topic Health</Text>
        <Text mt={2} color="gray.500">Loading...</Text>
      </Box>
    );
  }

  if (!apiConfigured || !data) {
    return (
      <Box bg="white" borderRadius="2xl" boxShadow="lg" p={6} minH={180}>
        <Flex align="center" justify="space-between" mb={2}>
          <Text fontWeight={700} fontSize="xl">Kafka Topic Health</Text>
          <Badge colorScheme="gray">API not configured</Badge>
        </Flex>
        <Text color="gray.500" mt={2}>Connect to a backend with /api/health to view Kafka topic metrics.</Text>
      </Box>
    );
  }

  return (
    <Box bg="white" borderRadius="2xl" boxShadow="lg" p={6} minH={180}>
      <Flex align="center" justify="space-between" mb={2}>
        <Text fontWeight={700} fontSize="xl">Kafka Topic Health</Text>
        <Badge colorScheme={displayData.status === 'Healthy' ? 'green' : 'red'}>{displayData.status}</Badge>
      </Flex>
      <StatGroup>
        <Stat>
          <StatLabel>Partitions</StatLabel>
          <StatNumber>{displayData.partitions}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Replication</StatLabel>
          <StatNumber>{displayData.replication}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>ISR</StatLabel>
          <StatNumber>{displayData.isr}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Under-Replicated</StatLabel>
          <StatNumber color={displayData.underReplicated ? 'red.500' : 'green.500'}>{displayData.underReplicated}</StatNumber>
          <StatHelpText>{displayData.underReplicated ? 'Check brokers!' : 'All good'}</StatHelpText>
        </Stat>
      </StatGroup>
    </Box>
  );
}; 