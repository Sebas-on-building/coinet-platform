export interface ServiceConfig {
  name: string;
  version: string;
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  dependencies: Record<string, 'healthy' | 'unhealthy'>;
}

export interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  service: string;
  metadata?: Record<string, unknown>;
} 