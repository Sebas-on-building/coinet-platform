import React from 'react';
import { useQuery, useSubscription, gql } from '@apollo/client';
import { Box, Heading, Spinner, Badge, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';

const PORTFOLIO_QUERY = gql`
  query GetPortfolio($id: ID!) {
    portfolio(id: $id) {
      id
      name
      holdings {
        symbol
        quantity
        avgCost
      }
    }
  }
`;

const PORTFOLIO_SUB = gql`
  subscription OnPortfolioUpdated($userId: ID!) {
    portfolioUpdated(userId: $userId) {
      id
      name
      holdings {
        symbol
        quantity
        avgCost
      }
    }
  }
`;

export default function PortfolioWidget({ portfolioId, userId }: { portfolioId: string, userId: string }) {
  const { data, loading, error } = useQuery(PORTFOLIO_QUERY, { variables: { id: portfolioId } });
  const { data: subData } = useSubscription(PORTFOLIO_SUB, { variables: { userId } });

  const portfolio = subData?.portfolioUpdated || data?.portfolio;

  if (loading) return <Spinner size="xl" />;
  if (error) return <Box color="red.500">Error: {error.message}</Box>;
  if (!portfolio) return <Box>No portfolio found.</Box>;

  return (
    <Box p={8} bgGradient="linear(to-br, #f8fafc, #e2e8f0)" borderRadius="2xl" boxShadow="2xl">
      <Heading size="md" mb={4}>{portfolio.name} <Badge colorScheme="blue">ID: {portfolio.id}</Badge></Heading>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Symbol</Th>
            <Th>Quantity</Th>
            <Th>Avg. Cost</Th>
          </Tr>
        </Thead>
        <Tbody>
          {portfolio.holdings.map((h: any) => (
            <Tr key={h.symbol}>
              <Td>{h.symbol}</Td>
              <Td>{h.quantity}</Td>
              <Td>${h.avgCost.toFixed(2)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
} 