import { Server } from 'socket.io';
import { RedisClusterManager } from '../../cluster/manager/RedisClusterManager';

export function setupRedisSocket(io: Server, clusterManager: RedisClusterManager) {
  io.of('/api/redis').on('connection', (socket) => {
    // Emit cluster status every 2s
    const interval = setInterval(async () => {
      const cluster = clusterManager.getCluster();
      const nodes = await cluster.nodes('all');
      socket.emit('clusterStatus', {
        nodes: nodes.map(n => ({
          id: n.id,
          role: n.role,
          host: n.options.host,
          port: n.options.port,
          status: n.status
        }))
      });
      const info = await cluster.info();
      const usedMemory = parseInt(info.match(/used_memory:(\d+)/)[1], 10);
      socket.emit('memoryUsage', { timestamp: Date.now(), usedMemory });
    }, 2000);

    socket.on('disconnect', () => clearInterval(interval));
  });
} 