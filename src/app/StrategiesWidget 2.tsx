import React from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Box, Heading, Spinner, Button, Input } from '@chakra-ui/react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/table';
import { useToast } from '@chakra-ui/toast';

const STRATEGIES_QUERY = gql`
  query GetStrategies {
    strategies {
      id
      name
      code
      description
    }
  }
`;

const CREATE_STRATEGY = gql`
  mutation CreateStrategy($name: String!, $code: String!, $description: String) {
    createStrategy(name: $name, code: $code, description: $description) {
      id
      name
      code
      description
    }
  }
`;

export default function StrategiesWidget() {
  const { data, loading, error, refetch } = useQuery(STRATEGIES_QUERY);
  const [createStrategy] = useMutation(CREATE_STRATEGY);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const toast = useToast();

  const handleCreate = async () => {
    await createStrategy({ variables: { name, code, description } });
    toast({ title: 'Strategy created', status: 'success' });
    setName(''); setCode(''); setDescription('');
    refetch();
  };

  if (loading) return <Spinner size="xl" />;
  if (error) return <Box color="red.500">Error: {error.message}</Box>;

  return (
    <Box p={8} bgGradient="linear(to-br, #f8fafc, #e2e8f0)" borderRadius="2xl" boxShadow="2xl">
      <Heading size="md" mb={4}>Strategies</Heading>
      <Box mb={4} display="flex" gap={2}>
        <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} width="120px" />
        <Input placeholder="Code" value={code} onChange={e => setCode(e.target.value)} width="200px" />
        <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} width="200px" />
        <Button colorScheme="blue" onClick={handleCreate}>Create</Button>
      </Box>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Code</Th>
            <Th>Description</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.strategies.map((s: any) => (
            <Tr key={s.id}>
              <Td>{s.name}</Td>
              <Td>{s.code}</Td>
              <Td>{s.description}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
} 