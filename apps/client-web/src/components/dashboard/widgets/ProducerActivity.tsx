import React, { useEffect, useState, useRef } from 'react';
import { Box, Text, Badge } from '@chakra-ui/react';

export const ProducerActivity = () => {
  const [producers, setProducers] = useState([
    { name: 'market-ingest', rate: 1200, errors: 0 },
    { name: 'strategy-service', rate: 300, errors: 1 },
    { name: 'plugin-analytics', rate: 80, errors: 0 },
  ]);
  const rowRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProducers(ps => ps.map(p => ({
        ...p,
        rate: Math.max(0, p.rate + Math.round(Math.random() * 40 - 20)),
        errors: Math.random() > 0.98 ? p.errors + 1 : p.errors
      })));
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
      <Text fontWeight={700} fontSize="xl" mb={2}>Producer Activity</Text>
      <Box as="table" width="100%" borderCollapse="collapse" mt={2} role="table" aria-label="Producer Activity">
        <Box as="thead" bg="gray.50">
          <Box as="tr" role="row">
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Name</Box>
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Rate</Box>
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Errors</Box>
          </Box>
        </Box>
        <Box as="tbody" role="rowgroup">
          {producers.map((p, idx) => (
            <Box
              as="tr"
              key={p.name}
              _hover={{ bg: 'gray.50' }}
              tabIndex={0}
              ref={el => (rowRefs.current[idx] = el)}
              onKeyDown={e => handleKeyDown(e, idx)}
              role="row"
              aria-label={`Producer ${p.name}`}
            >
              <Box as="td" p={2} role="cell">{p.name}</Box>
              <Box as="td" p={2} role="cell">{p.rate}</Box>
              <Box as="td" p={2} role="cell"><Badge colorScheme={p.errors ? 'red' : 'green'}>{p.errors}</Badge></Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}; 