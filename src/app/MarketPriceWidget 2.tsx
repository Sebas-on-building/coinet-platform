import React from 'react';
import { useQuery, useSubscription, gql } from '@apollo/client';
import { Box, Heading, Stat, StatLabel, StatNumber, StatHelpText, Spinner } from '@chakra-ui/react';

const MARKET_PRICE_QUERY = gql`
  query GetMarketPrice($symbol: String!) {
    marketPrice(symbol: $symbol) {
      symbol
      price
      volume
    }
  }
`;

const MARKET_PRICE_SUB = gql`
  subscription OnMarketPriceUpdated($symbol: String!) {
    marketPriceUpdated(symbol: $symbol) {
      symbol
      price
      volume
    }
  }
`;

export default function MarketPriceWidget({ symbol }: { symbol: string }) {
  const { data, loading, error } = useQuery(MARKET_PRICE_QUERY, { variables: { symbol } });
  const { data: subData } = useSubscription(MARKET_PRICE_SUB, { variables: { symbol } });

  const tick = subData?.marketPriceUpdated || data?.marketPrice;

  if (loading) return <Spinner size="xl" />;
  if (error) return <Box color="red.500">Error: {error.message}</Box>;
  if (!tick) return <Box>No data.</Box>;

  return (
    <Box p={8} bgGradient="linear(to-br, #f8fafc, #e2e8f0)" borderRadius="2xl" boxShadow="2xl">
      <Heading size="md" mb={4}>{tick.symbol} Market Price</Heading>
      <Stat>
        <StatLabel>Price</StatLabel>
        <StatNumber>${tick.price.toFixed(2)}</StatNumber>
        <StatHelpText>Volume: {tick.volume}</StatHelpText>
      </Stat>
    </Box>
  );
} 