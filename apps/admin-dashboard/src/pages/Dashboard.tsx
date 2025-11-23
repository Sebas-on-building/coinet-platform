import React from 'react';
import { ServiceCard } from '../components/ServiceCard';
import { LiveMetricsChart } from '../components/LiveMetricsChart';
import { RedisDashboard } from '../components/RedisDashboard';

const services = [
  { name: 'API Gateway', status: 'healthy' },
  { name: 'Auth', status: 'healthy' },
  { name: 'Market Data', status: 'degraded' },
  { name: 'Analytics', status: 'healthy' },
  { name: 'Redis', status: 'healthy' },
  { name: 'Kafka', status: 'healthy' },
  { name: 'Postgres', status: 'healthy' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Coinet Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {services.map(s => (
          <ServiceCard
            key={s.name}
            name={s.name}
            status={s.status as any}
            onRestart={() => alert(`Restarting ${s.name}`)}
            onViewLogs={() => alert(`Viewing logs for ${s.name}`)}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <LiveMetricsChart title="API Requests" data={[10, 20, 30, 25, 40]} labels={["Mon", "Tue", "Wed", "Thu", "Fri"]} />
        <LiveMetricsChart title="Error Rate" data={[0, 1, 0, 2, 1]} labels={["Mon", "Tue", "Wed", "Thu", "Fri"]} />
      </div>
      <div className="mt-12">
        <RedisDashboard />
      </div>
    </div>
  );
} 