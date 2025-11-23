import React, { useState, useRef } from 'react';
import { Box, Text, Button } from '@chakra-ui/react';

export const WidgetAdhocQuery = () => {
  const [query, setQuery] = useState('SELECT symbol, avg(price) FROM market_ticks_ch GROUP BY symbol LIMIT 10');
  const [result, setResult] = useState<any[]>([]);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  const runQuery = async () => {
    const res = await fetch('/api/analytics/adhoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setResult(data);
  };

  // Keyboard navigation for table rows
  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowDown') {
      rowRefs.current[idx + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      rowRefs.current[idx - 1]?.focus();
    }
  };

  return (
    <Box bg="#fff" borderRadius={"2xl"} boxShadow="lg" p={6} minH={320}>
      <Text fontWeight={700} fontSize="2xl" mb={2}>Ad-hoc Query Explorer</Text>
      <Box as="textarea" value={query} onChange={e => setQuery(e.target.value)} rows={4}
        width="100%" borderRadius={"md"} border="1px solid #E5E5EA" p={2} fontFamily="monospace" mb={2} />
      <Button onClick={runQuery} colorScheme="blue" mb={4}>Run Query</Button>
      <Box mt={4} maxH={120} overflowY="auto" fontFamily="monospace" fontSize="sm">
        {result.length > 0 && (
          <Box as="table" width="100%" borderCollapse="collapse" role="table" aria-label="Ad-hoc Query Results">
            <Box as="thead" bg="gray.50">
              <Box as="tr" role="row">
                {Object.keys(result[0]).map(key => (
                  <Box as="th" key={key} textAlign="left" p={2} fontWeight={600} role="columnheader">{key}</Box>
                ))}
              </Box>
            </Box>
            <Box as="tbody" role="rowgroup">
              {result.map((row, i) => (
                <Box
                  as="tr"
                  key={i}
                  _hover={{ bg: 'gray.50' }}
                  tabIndex={0}
                  ref={el => (rowRefs.current[i] = el)}
                  onKeyDown={e => handleKeyDown(e, i)}
                  role="row"
                  aria-label={`Row ${i + 1}`}
                >
                  {Object.values(row).map((v, j) => (
                    <Box as="td" key={j} p={2} role="cell">{v}</Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}; 