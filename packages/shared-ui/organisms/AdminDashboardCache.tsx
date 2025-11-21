import React, { useEffect, useState } from 'react';
import { Box, Heading, Input, Button, Table, Tbody, Tr, Td, Thead, Th, Flex, useToast } from '@chakra-ui/react';
import { CacheStatsWidget } from './CacheStatsWidget';

export const AdminDashboardCache = () => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState<any>(null);
  const toast = useToast();

  const fetchKey = async () => {
    const res = await fetch(`/api/cache/key/${key}`);
    const data = await res.json();
    setValue(data.value);
  };

  const deleteKey = async () => {
    await fetch(`/api/cache/key/${key}`, { method: 'DELETE' });
    setValue(null);
    toast({ title: 'Key deleted', status: 'success' });
  };

  return (
    <Box p={8} bg="white" borderRadius="2xl" boxShadow="2xl">
      <Heading size="lg" mb={4}>Cache Inspector</Heading>
      <CacheStatsWidget />
      <Flex gap={2} mt={6}>
        <Input placeholder="Cache key" value={key} onChange={e => setKey(e.target.value)} />
        <Button colorScheme="blue" onClick={fetchKey}>Fetch</Button>
        <Button colorScheme="red" onClick={deleteKey}>Delete</Button>
      </Flex>
      {value && (
        <Box mt={4} p={4} bg="gray.50" borderRadius="xl">
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </Box>
      )}
    </Box>
  );
}; 