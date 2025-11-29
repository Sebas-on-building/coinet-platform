import React, { useEffect, useState } from 'react';
import { Box, Text, Flex, Stat, StatLabel, StatNumber, StatHelpText, StatGroup } from '@chakra-ui/stat';

export const ThroughputWidget = () => {
  const [data, setData] = useState({
    messages: 1200,
    bytes: 204800,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData(d => ({
        messages: Math.max(1000, d.messages + Math.round(Math.random() * 100 - 50)),
        bytes: Math.max(100000, d.bytes + Math.round(Math.random() * 10000 - 5000)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box bg="white" borderRadius="2xl" boxShadow="lg" p={6} minH={180}>
      <Text fontWeight={700} fontSize="xl" mb={2}>Kafka Throughput</Text>
      <StatGroup>
        <Stat>
          <StatLabel>Messages/sec</StatLabel>
          <StatNumber>{data.messages}</StatNumber>
          <StatHelpText>Last 1m</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Bytes/sec</StatLabel>
          <StatNumber>{(data.bytes / 1024).toFixed(1)} KB</StatNumber>
          <StatHelpText>Last 1m</StatHelpText>
        </Stat>
      </StatGroup>
    </Box>
  );
}; 