import React, { useState } from 'react';
import { Box, Text, VStack, HStack, Button, Badge } from '@chakra-ui/react';

const mockPlugins = [
  { id: 'ai-video', name: 'AI Video Summarizer', installed: true, description: 'Summarize videos with AI.' },
  { id: 'collab', name: 'Real-Time Collaboration', installed: false, description: 'Collaborate live with your team.' },
];

export const PluginMarketplace = () => {
  const [plugins, setPlugins] = useState(mockPlugins);

  const toggleInstall = (id: string) => {
    setPlugins(ps => ps.map(p => p.id === id ? { ...p, installed: !p.installed } : p));
  };

  return (
    <Box bg="white" borderRadius="2xl" boxShadow="2xl" p={6} minH={320}>
      <Text fontWeight={700} fontSize="xl" mb={2}>Plugin Marketplace</Text>
      <VStack align="stretch" spacing={4} mt={2}>
        {plugins.map(p => (
          <HStack key={p.id} spacing={4} align="center" justify="space-between" bg="gray.50" borderRadius="md" p={3}>
            <Box>
              <Text fontWeight={600}>{p.name}</Text>
              <Text fontSize="sm" color="gray.500">{p.description}</Text>
            </Box>
            <Badge colorScheme={p.installed ? 'green' : 'gray'}>{p.installed ? 'Installed' : 'Available'}</Badge>
            <Button size="sm" colorScheme={p.installed ? 'red' : 'blue'} onClick={() => toggleInstall(p.id)}>
              {p.installed ? 'Uninstall' : 'Install'}
            </Button>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
}; 