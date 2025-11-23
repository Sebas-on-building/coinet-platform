import React from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';

export const VideoTimeline = () => (
  <Box bg="gray.50" borderRadius="xl" boxShadow="md" p={4} mt={4}>
    <HStack spacing={4} align="center">
      {/* Timeline markers and draggable clips */}
      <Box w={12} h={6} bg="blue.200" borderRadius="md" />
      <Box w={24} h={6} bg="purple.200" borderRadius="md" />
      <Box w={16} h={6} bg="green.200" borderRadius="md" />
      <Text color="gray.500" ml={4}>00:00 / 03:00</Text>
    </HStack>
  </Box>
); 