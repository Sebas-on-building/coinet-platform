import React from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Button, Input, useToast } from '@chakra-ui/react';

const ALERTS_QUERY = gql`
  query GetAlerts {
    alerts {
      id
      symbol
      condition
      target
    }
  }
`;

const CREATE_ALERT = gql`
  mutation CreateAlert($symbol: String!, $condition: String!, $target: Float!) {
    createAlert(symbol: $symbol, condition: $condition, threshold: $target) {
      id
      symbol
      condition
      target
    }
  }
`;

export default function AlertsWidget() {
  const { data, loading, error, refetch } = useQuery(ALERTS_QUERY);
  const [createAlert] = useMutation(CREATE_ALERT);
  const [symbol, setSymbol] = React.useState('');
  const [condition, setCondition] = React.useState('>');
  const [target, setTarget] = React.useState('');
  const toast = useToast();

  const handleCreate = async () => {
    await createAlert({ variables: { symbol, condition, target: parseFloat(target) } });
    toast({ title: 'Alert created', status: 'success' });
    setSymbol(''); setCondition('>'); setTarget('');
    refetch();
  };

  if (loading) return <Spinner size="xl" />;
  if (error) return <Box color="red.500">Error: {error.message}</Box>;

  return (
    <Box p={8} bgGradient="linear(to-br, #f8fafc, #e2e8f0)" borderRadius="2xl" boxShadow="2xl">
      <Heading size="md" mb={4}>Alerts</Heading>
      <Box mb={4} display="flex" gap={2}>
        <Input placeholder="Symbol" value={symbol} onChange={e => setSymbol(e.target.value)} width="120px" />
        <Input placeholder="Condition" value={condition} onChange={e => setCondition(e.target.value)} width="80px" />
        <Input placeholder="Target" value={target} onChange={e => setTarget(e.target.value)} width="100px" type="number" />
        <Button colorScheme="blue" onClick={handleCreate}>Create</Button>
      </Box>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Symbol</Th>
            <Th>Condition</Th>
            <Th>Target</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.alerts.map((a: any) => (
            <Tr key={a.id}>
              <Td>{a.symbol}</Td>
              <Td>{a.condition}</Td>
              <Td>{a.target}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
} 