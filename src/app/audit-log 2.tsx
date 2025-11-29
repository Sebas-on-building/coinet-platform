import React, { useEffect, useState } from 'react';
import { Box, Table, Thead, Tbody, Tr, Th, Td, Spinner, Heading } from '@chakra-ui/react';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/audit.log')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n');
        const entries = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(Boolean);
        setLogs(entries.reverse());
        setLoading(false);
      });
  }, []);

  if (loading) return <Spinner size="xl" />;

  return (
    <Box p={8} bgGradient="linear(to-br, #f8fafc, #e2e8f0)" borderRadius="2xl" boxShadow="2xl">
      <Heading size="md" mb={4}>Audit Log</Heading>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>User</Th>
            <Th>Action</Th>
            <Th>Resource</Th>
            <Th>Timestamp</Th>
          </Tr>
        </Thead>
        <Tbody>
          {logs.map((log, i) => (
            <Tr key={i}>
              <Td>{log.user}</Td>
              <Td>{log.action}</Td>
              <Td>{log.resource}</Td>
              <Td>{log.timestamp}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
} 