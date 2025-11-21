import React, { useEffect, useState } from 'react';
import { Box, Text, Badge, VStack, HStack } from '@chakra-ui/react';

export const VideoAIAnalytics = ({ videoId = 'demo' }) => {
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/video/ai-insights?videoId=${videoId}`)
      .then(res => res.json())
      .then(setInsights);
  }, [videoId]);

  return (
    <Box bg="white" borderRadius="2xl" boxShadow="2xl" p={6} minH={220}>
      <Text fontWeight={700} fontSize="xl" mb={2}>Video AI Insights</Text>
      <VStack align="stretch" spacing={3} mt={2}>
        {insights.map((insight, i) => (
          <HStack key={i} spacing={4} align="center">
            <Badge colorScheme="blue" fontSize="md">{insight.type}</Badge>
            <Text fontWeight={600}>{insight.value}</Text>
            {insight.confidence && <Badge colorScheme="green">{(insight.confidence * 100).toFixed(1)}%</Badge>}
          </HStack>
        ))}
      </VStack>
    </Box>
  );
}; 