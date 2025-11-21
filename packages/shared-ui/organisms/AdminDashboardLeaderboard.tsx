import React, { useState } from 'react';
import { Box, Heading, Input, Button, Table, Tbody, Tr, Td, Thead, Th } from '@chakra-ui/react';

export const AdminDashboardLeaderboard = () => {
  const [key, setKey] = useState('');
  const [top, setTop] = useState<any[]>([]);

  const fetchTop = async () => {
    const res = await fetch(`/api/leaderboard/top/${key}/10`);
    const data = await res.json();
    setTop(data.top);
  };

  return (
    <Box p={8} bg="white" borderRadius="2xl" boxShadow="2xl">
      <Heading size="lg" mb={4}>Leaderboard</Heading>
      <Input placeholder="Leaderboard key" value={key} onChange={e => setKey(e.target.value)} />
      <Button colorScheme="blue" mt={2} onClick={fetchTop}>Fetch Top 10</Button>
      <Table mt={4}>
        <Thead>
          <Tr>
            <Th>Rank</Th>
            <Th>Member</Th>
            <Th>Score</Th>
          </Tr>
        </Thead>
        <Tbody>
          {top.map((entry, i) => (
            <Tr key={i}>
              <Td>{i + 1}</Td>
              <Td>{entry.value}</Td>
              <Td>{entry.score}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}; 