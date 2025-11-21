import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { resolvers } from './resolvers';
import fs from 'fs';
const schema = buildSchema(fs.readFileSync('src/api/graphql/schema.graphql', 'utf8'));
export default graphqlHTTP((req, res) => ({
  schema,
  rootValue: resolvers,
  graphiql: true,
  context: { req, res },
})); 