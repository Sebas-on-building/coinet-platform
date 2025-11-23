import { useState } from 'react';

export function PredictWidget() {
  const [symbol, setSymbol] = useState('BTCUSD');
  const [prediction, setPrediction] = useState<number | null>(null);

  const fetchPrediction = async () => {
    const res = await fetch(`/api/v1/analytics/predict?symbol=${symbol}`);
    const data = await res.json();
    setPrediction(data.prediction);
  };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] shadow-xl flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2">AI Prediction</h2>
      <select
        className="mb-4 px-4 py-2 rounded-lg border border-gray-300"
        value={symbol}
        onChange={e => setSymbol(e.target.value)}
      >
        <option value="BTCUSD">BTCUSD</option>
        <option value="ETHUSD">ETHUSD</option>
      </select>
      <button
        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg shadow mb-4"
        onClick={fetchPrediction}
      >
        Predict
      </button>
      {prediction !== null && (
        <div className="text-3xl font-mono text-green-600">{prediction.toFixed(2)}</div>
      )}
    </div>
  );
} 