import fastify from 'fastify';
const app = fastify();

app.post('/api/scan', async (req, reply) => {
  const { pluginRepoUrl } = req.body as { pluginRepoUrl: string };
  // TODO: Run static analysis, dependency scan, etc.
  // Example: const result = await snykTest(pluginRepoUrl);
  const result = { status: 'clean', issues: [] };
  reply.send(result);
});

app.listen({ port: 4003 }, () => console.log('Plugin Security Scanner running on :4003')); 