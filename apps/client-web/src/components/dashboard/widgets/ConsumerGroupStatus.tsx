import React, { useEffect, useState, useRef } from 'react';
import { Box, Text, Badge } from '@chakra-ui/react';

export const ConsumerGroupStatus = () => {
  const [groups, setGroups] = useState([
    { name: 'ws-broadcast-group', lag: 3, status: 'Healthy' },
    { name: 'portfolio-service-group', lag: 0, status: 'Healthy' },
    { name: 'alerts-service-group', lag: 7, status: 'Warning' },
    { name: 'analytics-service-group', lag: 0, status: 'Healthy' },
  ]);
  const rowRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGroups(gs => gs.map(g => ({ ...g, lag: Math.max(0, g.lag + Math.round(Math.random() * 4 - 2)) })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e, idx) => {
    if (e.key === 'ArrowDown') {
      rowRefs.current[idx + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      rowRefs.current[idx - 1]?.focus();
    }
  };

  return (
    <Box bg="white" borderRadius="2xl" boxShadow="lg" p={6} minH={180}>
      <Text fontWeight={700} fontSize="xl" mb={2}>Consumer Groups</Text>
      <Box as="table" width="100%" borderCollapse="collapse" mt={2} role="table" aria-label="Consumer Groups">
        <Box as="thead" bg="gray.50">
          <Box as="tr" role="row">
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Name</Box>
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Lag</Box>
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Status</Box>
          </Box>
        </Box>
        <Box as="tbody" role="rowgroup">
          {groups.map((g, idx) => (
            <Box
              as="tr"
              key={g.name}
              _hover={{ bg: 'gray.50' }}
              tabIndex={0}
              ref={el => (rowRefs.current[idx] = el)}
              onKeyDown={e => handleKeyDown(e, idx)}
              role="row"
              aria-label={`Consumer group ${g.name}`}
            >
              <Box as="td" p={2} role="cell">{g.name}</Box>
              <Box as="td" p={2} role="cell">{g.lag}</Box>
              <Box as="td" p={2} role="cell"><Badge colorScheme={g.status === 'Healthy' ? 'green' : 'orange'}>{g.status}</Badge></Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}; 