import React from 'react';
import { Box, Button, HStack, Text } from '@chakra-ui/react';

export const VideoExportPanel = () => (
  <Box bg="white" borderRadius="xl" boxShadow="lg" p={4} mt={4}>
    <Text fontWeight={600} mb={2}>Export Video</Text>
    <HStack spacing={4}>
      <Button colorScheme="blue">Export MP4</Button>
      <Button colorScheme="purple">Export GIF</Button>
      <Button colorScheme="green">Export PNG</Button>
    </HStack>
  </Box>
); 