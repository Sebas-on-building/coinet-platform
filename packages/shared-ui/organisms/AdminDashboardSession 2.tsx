import React, { useState } from 'react';
import { Box, Heading, Input, Button, useToast } from '@chakra-ui/react';

export const AdminDashboardSession = () => {
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<any>(null);
  const toast = useToast();

  const fetchSession = async () => {
    const res = await fetch(`/api/session/${sessionId}`);
    const data = await res.json();
    setSession(data.session);
  };

  const deleteSession = async () => {
    await fetch(`/api/session/${sessionId}`, { method: 'DELETE' });
    setSession(null);
    toast({ title: 'Session deleted', status: 'success' });
  };

  return (
    <Box p={8} bg="white" borderRadius="2xl" boxShadow="2xl">
      <Heading size="lg" mb={4}>Session Explorer</Heading>
      <Input placeholder="Session ID" value={sessionId} onChange={e => setSessionId(e.target.value)} />
      <Button colorScheme="blue" mt={2} onClick={fetchSession}>Fetch</Button>
      <Button colorScheme="red" mt={2} onClick={deleteSession}>Delete</Button>
      {session && (
        <Box mt={4} p={4} bg="gray.50" borderRadius="xl">
          <pre>{JSON.stringify(session, null, 2)}</pre>
        </Box>
      )}
    </Box>
  );
}; 