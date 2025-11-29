import React from 'react';
import { Box, Text, Badge } from '@chakra-ui/react';

export const PluginExampleWidget = () => (
  <Box bg="white" borderRadius="2xl" boxShadow="lg" p={6} minH={120}>
    <Text fontWeight={700} fontSize="xl">Plugin Example Widget</Text>
    <Badge colorScheme="blue" mt={2}>Powered by Plugin SDK</Badge>
  </Box>
); 