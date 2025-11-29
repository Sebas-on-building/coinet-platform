import React, { useEffect, useState } from 'react';
import { Box, Text, Flex, Badge } from '@chakra-ui/react';

export const LagChart = () => {
  const [lag, setLag] = useState<number[]>([10, 12, 8, 15, 7, 5, 3, 2]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLag(l => [...l.slice(1), Math.max(0, l[l.length - 1] + Math.round(Math.random() * 4 - 2))]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box bg="white" borderRadius="2xl" boxShadow="lg" p={6} minH={180}>
      <Flex align="center" justify="space-between" mb={2}>
        <Text fontWeight={700} fontSize="xl">Consumer Group Lag</Text>
        <Badge colorScheme={lag[lag.length - 1] > 10 ? 'red' : 'green'}>{lag[lag.length - 1] > 10 ? 'High Lag' : 'Low Lag'}</Badge>
      </Flex>
      <svg width="100%" height="100">
        <polyline
          fill="none"
          stroke="#FF9500"
          strokeWidth="3"
          points={lag.map((l, i) => `${i * 40},${100 - l * 8}`).join(' ')}
        />
      </svg>
      <Text mt={2} color="gray.500" fontSize="sm">Real-time lag per consumer group</Text>
    </Box>
  );
}; 