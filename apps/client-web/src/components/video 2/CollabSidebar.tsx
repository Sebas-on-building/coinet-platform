import React, { useState } from 'react';
import { Box, Text, Input, VStack, HStack, Avatar, Badge, Button } from '@chakra-ui/react';

const mockUsers = [
  { id: 1, name: 'Alice', status: 'editing', color: 'blue' },
  { id: 2, name: 'Bob', status: 'viewing', color: 'green' },
];

export const CollabSidebar = () => {
  const [messages, setMessages] = useState([
    { user: 'Alice', text: 'Working on the intro.' },
    { user: 'Bob', text: 'Looks great!' },
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (input.trim()) {
      setMessages(msgs => [...msgs, { user: 'You', text: input }]);
      setInput('');
    }
  };

  return (
    <Box w={320} bg="white" borderRight="1px solid #E5E5EA" boxShadow="2xl" p={6} minH="100vh" display="flex" flexDirection="column">
      <Text fontWeight={700} fontSize="xl" mb={4}>Collaboration</Text>
      <VStack align="stretch" spacing={3} mb={6}>
        {mockUsers.map(u => (
          <HStack key={u.id} spacing={3}>
            <Avatar name={u.name} bg={`${u.color}.400`} />
            <Text fontWeight={600}>{u.name}</Text>
            <Badge colorScheme={u.color}>{u.status}</Badge>
          </HStack>
        ))}
      </VStack>
      <Box flex={1} overflowY="auto" mb={4}>
        <VStack align="stretch" spacing={2}>
          {messages.map((msg, i) => (
            <Box key={i} bg="gray.50" borderRadius="md" p={2} fontSize="sm">
              <Text as="span" fontWeight={600}>{msg.user}: </Text>{msg.text}
            </Box>
          ))}
        </VStack>
      </Box>
      <HStack>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === 'Enter' && sendMessage()} />
        <Button onClick={sendMessage} colorScheme="blue">Send</Button>
      </HStack>
    </Box>
  );
}; 