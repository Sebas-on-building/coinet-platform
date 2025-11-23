import React, { useState } from 'react';
import { Box, Heading, Input, Button, Stat, StatLabel, StatNumber, useToast } from '@chakra-ui/react';

export const AdminDashboardRateLimit = () => {
  const [userId, setUserId] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const toast = useToast();

  const fetchCount = async () => {
    const res = await fetch(`/api/rate-limit/count/${userId}`);
    const data = await res.json();
    setCount(data.count);
  };

  const resetCount = async () => {
    await fetch(`/api/rate-limit/reset/${userId}`, { method: 'POST' });
    setCount(0);
    toast({ title: 'Rate limit reset', status: 'success' });
  };

  return (
    <Box p={8} bg="white" borderRadius="2xl" boxShadow="2xl">
      <Heading size="lg" mb={4}>Rate Limit Monitor</Heading>
      <Input placeholder="User ID" value={userId} onChange={e => setUserId(e.target.value)} />
      <Button colorScheme="blue" mt={2} onClick={fetchCount}>Fetch</Button>
      <Button colorScheme="red" mt={2} onClick={resetCount}>Reset</Button>
      {count !== null && (
        <Stat mt={4}>
          <StatLabel>Requests in window</StatLabel>
          <StatNumber>{count}</StatNumber>
        </Stat>
      )}
    </Box>
  );
}; 