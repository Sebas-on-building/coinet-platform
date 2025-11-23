import express from 'express';
import swaggerDocsRouter from './rest/docs';
import graphqlDocsRouter from './graphql/docs';
// ...other imports

const app = express();

// World-class API docs
app.use('/api', swaggerDocsRouter);
app.use('/api', graphqlDocsRouter);

// ...other routes and middleware

export default app; 