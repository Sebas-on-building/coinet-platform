import { Router } from 'express';
import { RedisClusterManager } from '../../cluster/manager/RedisClusterManager';
import { PluginManager } from '../../cluster/plugins/PluginManager';

const router = Router();
const clusterManager = new RedisClusterManager([
  { url: 'redis://10.0.0.1:6379' },
  { url: 'redis://10.0.0.2:6379' },
  { url: 'redis://10.0.0.3:6379' }
], {});

const pluginManager = new PluginManager();

router.get('/status', async (req, res) => {
  const cluster = clusterManager.getCluster();
  // Fetch real status from Redis
  const nodes = await cluster.nodes('all');
  res.json({
    nodes: nodes.map(n => ({
      id: n.id,
      role: n.role,
      host: n.options.host,
      port: n.options.port,
      status: n.status
    }))
  });
});

router.get('/memory', async (req, res) => {
  const cluster = clusterManager.getCluster();
  const info = await cluster.info();
  const usedMemory = parseInt(info.match(/used_memory:(\d+)/)[1], 10);
  res.json({ usedMemory });
});

// Plugin management endpoints
router.get('/plugins', (req, res) => {
  res.json({ plugins: pluginManager.plugins.map(p => p.name) });
});

router.post('/plugins', (req, res) => {
  const { plugin } = req.body;
  pluginManager.register(plugin);
  res.status(201).json({ success: true });
});

export default router; 