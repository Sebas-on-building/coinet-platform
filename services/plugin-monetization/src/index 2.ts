import fastify from 'fastify';
const app = fastify();

app.post('/api/purchase', async (req, reply) => {
  const { pluginId, userId, paymentMethod } = req.body as { pluginId: string, userId: string, paymentMethod: string };
  // TODO: Integrate with Stripe/Solana Pay
  const result = { status: 'success', transactionId: 'txn_123' };
  reply.send(result);
});

app.get('/api/pricing/:pluginId', async (req, reply) => {
  // TODO: Fetch pricing from DB or Stripe
  reply.send({ pluginId: req.params.pluginId, price: 9.99, currency: 'USD' });
});

app.listen({ port: 4005 }, () => console.log('Plugin Monetization Service running on :4005')); 