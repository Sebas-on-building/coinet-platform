import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import clusterRouter from './api/redis/cluster';
import { setupRedisSocket } from './api/redis/socket';
import { RedisClusterManager } from './cluster/manager/RedisClusterManager';
import featureRouter from './api/feature';
import { httpsRedirect } from './middleware/httpsRedirect';
import { contentSecurityPolicy } from './middleware/contentSecurityPolicy';
// Placeholder imports for AI, anomaly detection, alerting
// import { aiModule } from './ai/aiModule';
// import { anomalyDetectionModule } from './ai/anomalyDetectionModule';
// import { alertingModule } from './alerts/alertingModule';

const app = express();
app.use(express.json());

// Mount Redis cluster API
app.use('/api/redis', clusterRouter);

// Placeholder: Mount AI, anomaly detection, alerting modules
// app.use('/api/ai', aiModule);
// app.use('/api/anomaly', anomalyDetectionModule);
// app.use('/api/alerts', alertingModule);

app.use(httpsRedirect); // Enforce HTTPS
app.use(contentSecurityPolicy); // Set Content Security Policy

app.use('/api', featureRouter); // All modular features

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Initialize RedisClusterManager
const clusterManager = new RedisClusterManager([
  { url: 'redis://10.0.0.1:6379' },
  { url: 'redis://10.0.0.2:6379' },
  { url: 'redis://10.0.0.3:6379' }
], {});

// Setup real-time socket
setupRedisSocket(io, clusterManager);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Coinet backend running on port ${PORT}`);
}); 