import depthLimit from 'graphql-depth-limit';

export const graphqlDepthLimiter = depthLimit(5);
// Usage: ApolloServer({ validationRules: [graphqlDepthLimiter] }) 