import { useState } from 'react';

export function StrategyForm({ onCreated }: { onCreated?: (strategy: any) => void }) {
  const [type, setType] = useState('atr_breakout');
  const [symbol, setSymbol] = useState('BTCUSD');
  const [period, setPeriod] = useState(14);
  const [multiplier, setMultiplier] = useState(2);
  const [name, setName] = useState('BTC ATR Breakout');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-123',
          name,
          definition: { type, symbol, period, multiplier },
        }),
      });
      if (!res.ok) throw new Error('Failed to create strategy');
      const data = await res.json();
      onCreated?.(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] shadow-2xl flex flex-col gap-6 w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create ATR Breakout Strategy</h2>
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Strategy Name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="rounded-lg px-3 py-2 border border-gray-200 focus:ring-2 focus:ring-blue-400 transition" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Symbol</label>
        <input value={symbol} onChange={e => setSymbol(e.target.value)} className="rounded-lg px-3 py-2 border border-gray-200 focus:ring-2 focus:ring-blue-400 transition" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Period</label>
        <input type="number" value={period} min={2} max={100} onChange={e => setPeriod(Number(e.target.value))} className="rounded-lg px-3 py-2 border border-gray-200 focus:ring-2 focus:ring-blue-400 transition" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Multiplier</label>
        <input type="number" value={multiplier} min={0.1} step={0.1} max={10} onChange={e => setMultiplier(Number(e.target.value))} className="rounded-lg px-3 py-2 border border-gray-200 focus:ring-2 focus:ring-blue-400 transition" />
      </div>
      <button type="submit" disabled={loading} className="rounded-lg px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow hover:from-indigo-500 hover:to-blue-500 transition">
        {loading ? 'Creating...' : 'Create Strategy'}
      </button>
      {error && <div className="text-red-500 font-semibold">{error}</div>}
    </form>
  );
} 