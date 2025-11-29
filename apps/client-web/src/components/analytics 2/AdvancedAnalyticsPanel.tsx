import { useEffect, useState } from 'react';

export function AdvancedAnalyticsPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null);
  const [formula, setFormula] = useState('');
  useEffect(() => {
    async function fetchData() {
      const url = formula ? `/api/v1/analytics/advanced?symbol=${symbol}&formula=${encodeURIComponent(formula)}` : `/api/v1/analytics/advanced?symbol=${symbol}`;
      const res = await fetch(url);
      setData(await res.json());
    }
    fetchData();
  }, [symbol, formula]);
  if (!data) return <div className="p-8">Loading...</div>;
  return (
    <div className="p-8 rounded-3xl bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] shadow-2xl flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Advanced Analytics</h2>
      <div className="mb-4">
        <label className="font-semibold mr-2">Custom Formula:</label>
        <input
          type="text"
          className="px-2 py-1 rounded-lg border border-gray-300 w-2/3"
          placeholder="(price-mean)/stdDev"
          value={formula}
          onChange={e => setFormula(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">Volatility</div>
          <div className="text-2xl">{data.volatility?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">RSI</div>
          <div className="text-2xl">{data.rsi?.toFixed(2)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">MACD</div>
          <div className="text-2xl">{data.macd?.macd?.toFixed(4)} / {data.macd?.signal?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">Bollinger Bands</div>
          <div className="text-2xl">{data.bollingerBands?.lower?.toFixed(2)} - {data.bollingerBands?.mean?.toFixed(2)} - {data.bollingerBands?.upper?.toFixed(2)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">ATR</div>
          <div className="text-2xl">{data.atr?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">Stochastic</div>
          <div className="text-2xl">K: {data.stochastic?.k?.toFixed(2)} D: {data.stochastic?.d?.toFixed(2)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">VWAP</div>
          <div className="text-2xl">{data.vwap?.toFixed(2)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">Z-Score</div>
          <div className="text-2xl">{data.zScore?.toFixed(2)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">Sharpe Ratio</div>
          <div className="text-2xl">{data.sharpeRatio?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">Sortino Ratio</div>
          <div className="text-2xl">{data.sortinoRatio?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">Max Drawdown</div>
          <div className="text-2xl">{data.maxDrawdown?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow">
          <div className="font-semibold">Alpha/Beta</div>
          <div className="text-2xl">α: {data.alphaBeta?.alpha?.toFixed(4)} β: {data.alphaBeta?.beta?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow col-span-2">
          <div className="font-semibold">Custom Formula</div>
          <div className="text-2xl text-blue-600">{data.custom?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow col-span-2">
          <div className="font-semibold">Anomaly</div>
          <div className={data.anomaly ? 'text-2xl text-red-500' : 'text-2xl text-green-600'}>
            {data.anomaly ? 'Anomaly Detected' : 'Normal'}
          </div>
        </div>
      </div>
    </div>
  );
} 