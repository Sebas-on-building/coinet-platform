import React from 'react';
import { Box, Button, VStack, HStack, Text } from '@chakra-ui/react';

export const WidgetPalette = ({ widgetRegistry, addWidget }) => (
  <Box position="fixed" top={20} right={8} zIndex={2000} bg="white" boxShadow="2xl" borderRadius="xl" p={4} minW={220}>
    <VStack spacing={3} align="stretch">
      {Object.values(widgetRegistry).map(widget => (
        <Button key={widget.id} onClick={() => addWidget(widget.id)} leftIcon={<span>{widget.icon}</span>} variant="outline" colorScheme="blue" borderRadius="lg" boxShadow="sm">
          <HStack spacing={2}>
            <Text>{widget.name}</Text>
            {widget.category && <Text color="gray.400" fontSize="xs">{widget.category}</Text>}
          </HStack>
        </Button>
      ))}
    </VStack>
  </Box>
); 