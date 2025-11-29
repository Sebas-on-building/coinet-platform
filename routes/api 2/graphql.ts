import * as express from 'express';
import { ApolloServer, gql, PubSub } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import depthLimit from 'graphql-depth-limit';
import { Request } from 'express';

const pubsub = new PubSub();
const MARKET_PRICE_UPDATED = 'MARKET_PRICE_UPDATED';
const PORTFOLIO_UPDATED = 'PORTFOLIO_UPDATED';

// --- GraphQL Type Definitions ---
const typeDefs = gql`
  type Query {
    portfolio(id: ID!): Portfolio
    marketPrice(symbol: String!): MarketTick
    user: User
  }
  type Mutation {
    createPortfolio(name: String!): Portfolio
    createAlert(symbol: String!, condition: String!, threshold: Float!): Alert
  }
  type Subscription {
    marketPriceUpdated(symbol: String!): MarketTick
    portfolioUpdated(userId: ID!): Portfolio
  }
  type Portfolio { id: ID!, name: String!, holdings: [Holding!]! }
  type Holding { symbol: String!, quantity: Float!, avgCost: Float! }
  type MarketTick { symbol: String!, price: Float!, volume: Float! }
  type Alert { id: ID!, symbol: String!, condition: String!, threshold: Float! }
  type User { id: ID!, email: String!, portfolios: [Portfolio!]! }
`;

// --- GraphQL Resolvers ---
const resolvers = {
  Query: {
    // Fetch a portfolio by ID, with auth check
    portfolio: async (_: any, { id }: any, ctx: any) => {
      if (!ctx.user) throw new Error('Unauthorized');
      const portfolio = await ctx.db('portfolios').where({ id, user_id: ctx.user.id }).first();
      if (!portfolio) throw new Error('Not found');
      const holdings = await ctx.db('portfolio_holdings').where({ portfolio_id: id });
      return { ...portfolio, holdings };
    },
    // Fetch market price for a symbol
    marketPrice: async (_: any, { symbol }: any, ctx: any) => {
      const tick = await ctx.db('market_tickers').where({ symbol }).first();
      if (!tick) throw new Error('Not found');
      return tick;
    },
    // Fetch current user
    user: async (_: any, _args: any, ctx: any) => {
      if (!ctx.user) throw new Error('Unauthorized');
      const user = await ctx.db('users').where({ id: ctx.user.id }).first();
      const portfolios = await ctx.db('portfolios').where({ user_id: ctx.user.id });
      return { ...user, portfolios };
    },
  },
  Mutation: {
    // Create a new portfolio for the current user
    createPortfolio: async (_: any, { name }: any, ctx: any) => {
      if (!ctx.user) throw new Error('Unauthorized');
      const [portfolio] = await ctx.db('portfolios').insert({ user_id: ctx.user.id, name }).returning('*');
      // Publish portfolio update event
      pubsub.publish(PORTFOLIO_UPDATED, { portfolioUpdated: { ...portfolio, holdings: [] }, userId: ctx.user.id });
      return { ...portfolio, holdings: [] };
    },
    // Create a new alert for the current user
    createAlert: async (_: any, { symbol, condition, threshold }: any, ctx: any) => {
      if (!ctx.user) throw new Error('Unauthorized');
      const [alert] = await ctx.db('alerts').insert({ user_id: ctx.user.id, symbol, condition, target: threshold }).returning('*');
      return alert;
    },
  },
  Subscription: {
    marketPriceUpdated: {
      subscribe: (_: any, { symbol }: any) => pubsub.asyncIterator(`${MARKET_PRICE_UPDATED}_${symbol}`),
    },
    portfolioUpdated: {
      subscribe: (_: any, { userId }: any) => pubsub.asyncIterator(PORTFOLIO_UPDATED),
    },
  },
  // --- Sub-feature: Portfolio.holdings resolver ---
  Portfolio: {
    holdings: async (portfolio: any, _args: any, ctx: any) => {
      return ctx.db('portfolio_holdings').where({ portfolio_id: portfolio.id });
    },
  },
  // --- Sub-feature: User.portfolios resolver ---
  User: {
    portfolios: async (user: any, _args: any, ctx: any) => {
      return ctx.db('portfolios').where({ user_id: user.id });
    },
  },
};

// --- Create Executable Schema ---
const schema = makeExecutableSchema({ typeDefs, resolvers });

// --- Apollo Server Setup ---
const apollo = new ApolloServer({
  schema,
  validationRules: [depthLimit(5)], // Prevent deep/complex queries
  introspection: process.env.NODE_ENV !== 'production', // Disable introspection in prod
  context: async ({ req }: { req: Request }) => ({
    db: req.db,
    user: req.user,
    pubsub,
  }),
});

const router = express.Router();

// --- Mount Apollo GraphQL Middleware ---
(async () => {
  await apollo.start();
  router.use('/graphql', apollo.getMiddleware({ path: '/' }));
})();

// --- Example: Publish market price update (to be called from market data service) ---
export function publishMarketPriceUpdate(symbol: string, tick: any) {
  pubsub.publish(`${MARKET_PRICE_UPDATED}_${symbol}`, { marketPriceUpdated: tick });
}

export default router; 