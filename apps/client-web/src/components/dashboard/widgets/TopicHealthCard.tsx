import React, { useEffect, useState } from 'react';
import { Box, Text, Badge, Flex } from '@chakra-ui/react';
import { Stat, StatLabel, StatNumber, StatHelpText, StatGroup } from '@chakra-ui/stat';

export const TopicHealthCard = () => {
  const [data, setData] = useState({
    status: 'Healthy',
    partitions: 12,
    replication: 3,
    isr: 12,
    underReplicated: 0,
  });

  // TODO: Replace with real API call
  useEffect(() => {
    const interval = setInterval(() => {
      setData(d => ({ ...d, underReplicated: Math.random() > 0.95 ? 1 : 0 }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box bg="white" borderRadius="2xl" boxShadow="lg" p={6} minH={180}>
      <Flex align="center" justify="space-between" mb={2}>
        <Text fontWeight={700} fontSize="xl">Kafka Topic Health</Text>
        <Badge colorScheme={data.status === 'Healthy' ? 'green' : 'red'}>{data.status}</Badge>
      </Flex>
      <StatGroup>
        <Stat>
          <StatLabel>Partitions</StatLabel>
          <StatNumber>{data.partitions}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Replication</StatLabel>
          <StatNumber>{data.replication}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>ISR</StatLabel>
          <StatNumber>{data.isr}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Under-Replicated</StatLabel>
          <StatNumber color={data.underReplicated ? 'red.500' : 'green.500'}>{data.underReplicated}</StatNumber>
          <StatHelpText>{data.underReplicated ? 'Check brokers!' : 'All good'}</StatHelpText>
        </Stat>
      </StatGroup>
    </Box>
  );
}; 