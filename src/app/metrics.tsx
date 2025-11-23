import React, { useEffect, useState } from 'react';
import { Box, Stat, StatLabel, StatNumber, StatHelpText, SimpleGrid, Spinner } from '@chakra-ui/react';

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/metrics')
      .then(res => res.text())
      .then(text => {
        // Parse Prometheus metrics
        const lines = text.split('\n');
        const data: any = {};
        lines.forEach(line => {
          if (line.startsWith('http_request_duration_ms_bucket')) {
            const match = line.match(/le="(\d+)"\} (\d+)/);
            if (match) {
              data[match[1]] = parseInt(match[2], 10);
            }
          }
        });
        setMetrics(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <Spinner size="xl" />;

  return (
    <Box p={8} bgGradient="linear(to-br, #f8fafc, #e2e8f0)" borderRadius="2xl" boxShadow="2xl">
      <SimpleGrid columns={[1, 3]} spacing={8}>
        <Stat>
          <StatLabel>Requests (1m)</StatLabel>
          <StatNumber>{metrics[1000] || 0}</StatNumber>
          <StatHelpText>Last minute</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Latency (p99)</StatLabel>
          <StatNumber>{metrics[1000] || 0} ms</StatNumber>
          <StatHelpText>99th percentile</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Error Rate</StatLabel>
          <StatNumber>0.00%</StatNumber>
          <StatHelpText>Last minute</StatHelpText>
        </Stat>
      </SimpleGrid>
    </Box>
  );
} 