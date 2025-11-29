import { createHandler } from 'graphql-http/lib/use/express';
import { buildSchema } from 'graphql';
import { resolvers } from '../api/graphql/resolvers';
import fs from 'fs';
const schema = buildSchema(fs.readFileSync('src/api/graphql/schema.graphql', 'utf8'));
export default createHandler({
  schema,
  rootValue: resolvers,
}); 