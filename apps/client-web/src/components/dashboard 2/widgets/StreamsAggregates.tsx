import React, { useEffect, useState, useRef } from 'react';
import { Box, Text } from '@chakra-ui/react';

const windows = ['10s', '30s', '5m', '1h', '1d'];

export const StreamsAggregates = () => {
  const [data, setData] = useState(
    windows.map(w => ({ window: w, avg: 10000, median: 10000, stddev: 100 }))
  );
  const rowRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(ds => ds.map(d => ({
        ...d,
        avg: Math.max(9000, d.avg + Math.round(Math.random() * 200 - 100)),
        median: Math.max(9000, d.median + Math.round(Math.random() * 200 - 100)),
        stddev: Math.max(80, d.stddev + Math.round(Math.random() * 10 - 5)),
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
      <Text fontWeight={700} fontSize="xl" mb={2}>Streams & Aggregates</Text>
      <Box as="table" width="100%" borderCollapse="collapse" mt={2} role="table" aria-label="Streams & Aggregates">
        <Box as="thead" bg="gray.50">
          <Box as="tr" role="row">
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Window</Box>
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Avg</Box>
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Median</Box>
            <Box as="th" textAlign="left" p={2} fontWeight={600} role="columnheader">Stddev</Box>
          </Box>
        </Box>
        <Box as="tbody" role="rowgroup">
          {data.map((d, idx) => (
            <Box
              as="tr"
              key={d.window}
              _hover={{ bg: 'gray.50' }}
              tabIndex={0}
              ref={el => (rowRefs.current[idx] = el)}
              onKeyDown={e => handleKeyDown(e, idx)}
              role="row"
              aria-label={`Window ${d.window}`}
            >
              <Box as="td" p={2} role="cell">{d.window}</Box>
              <Box as="td" p={2} role="cell">{d.avg}</Box>
              <Box as="td" p={2} role="cell">{d.median}</Box>
              <Box as="td" p={2} role="cell">{d.stddev}</Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}; 