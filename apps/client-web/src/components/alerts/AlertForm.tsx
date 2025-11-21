import { useState } from 'react';

export function AlertForm({ onCreated }: { onCreated?: () => void }) {
  const [symbol, setSymbol] = useState('BTCUSD');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [cooldown, setCooldown] = useState(3600);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          symbol,
          condition,
          threshold: parseFloat(threshold),
          cooldown: Number(cooldown),
        }),
      });
      if (!res.ok) throw new Error('Failed to create alert');
      setThreshold('');
      if (onCreated) onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] shadow-xl flex flex-col gap-4 w-full max-w-md">
      <h2 className="text-xl font-bold mb-2">Create Alert</h2>
      <label className="font-medium">Symbol
        <select className="ml-2 px-2 py-1 rounded-lg border border-gray-300" value={symbol} onChange={e => setSymbol(e.target.value)}>
          <option value="BTCUSD">BTCUSD</option>
          <option value="ETHUSD">ETHUSD</option>
        </select>
      </label>
      <label className="font-medium">Condition
        <select className="ml-2 px-2 py-1 rounded-lg border border-gray-300" value={condition} onChange={e => setCondition(e.target.value as 'above' | 'below')}>
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
      </label>
      <label className="font-medium">Threshold
        <input type="number" className="ml-2 px-2 py-1 rounded-lg border border-gray-300" value={threshold} onChange={e => setThreshold(e.target.value)} required />
      </label>
      <label className="font-medium">Cooldown (seconds)
        <input type="number" className="ml-2 px-2 py-1 rounded-lg border border-gray-300" value={cooldown} onChange={e => setCooldown(Number(e.target.value))} min={60} />
      </label>
      <button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg shadow mt-2" disabled={loading}>
        {loading ? 'Creating...' : 'Create Alert'}
      </button>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </form>
  );
} 