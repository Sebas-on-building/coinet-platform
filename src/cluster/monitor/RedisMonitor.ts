import { RedisClusterManager } from '../manager/RedisClusterManager';
import { sendAlert } from '../../utils/alert';

export class RedisMonitor {
  constructor(private clusterManager: RedisClusterManager) { }

  public async monitorMemory() {
    const info = await this.clusterManager.getCluster().info();
    const usedMemory = parseInt(info.match(/used_memory:(\d+)/)[1], 10);
    if (usedMemory > 1.8 * 1024 * 1024 * 1024) { // 1.8GB
      sendAlert('Redis memory usage high', { usedMemory });
    }
  }

  // Add more monitoring: latency, failover, slot migration, etc.
} 