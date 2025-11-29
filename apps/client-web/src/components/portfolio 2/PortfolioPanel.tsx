import { useEffect, useState } from 'react';
import { PortfolioAnalyticsPanel } from './PortfolioAnalyticsPanel';

export function PortfolioPanel({ portfolioId }: { portfolioId: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/v1/portfolios/${portfolioId}`);
      setData(await res.json());
    }
    fetchData();
    const ws = new WebSocket(`wss://your-ws-server/portfolio?portfolioId=${portfolioId}`);
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setData((prev: any) => ({ ...prev, ...update }));
    };
    return () => ws.close();
  }, [portfolioId]);
  if (!data) return <div className="p-8">Loading...</div>;
  return (
    <div className="p-8 rounded-3xl bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] shadow-2xl flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Portfolio</h2>
      <div className="mb-4 flex justify-between">
        <div className="font-semibold">Value</div>
        <div className="text-2xl">${data.value?.toFixed(2)}</div>
      </div>
      <div className="mb-4 flex justify-between">
        <div className="font-semibold">P&amp;L</div>
        <div className={data.pnl >= 0 ? 'text-2xl text-green-600' : 'text-2xl text-red-500'}>
          ${data.pnl?.toFixed(2)}
        </div>
      </div>
      <div>
        <div className="font-semibold mb-2">Holdings</div>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pr-4">Symbol</th>
              <th className="pr-4">Quantity</th>
              <th className="pr-4">Avg Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.holdings?.map((h: any) => (
              <tr key={h.symbol}>
                <td className="pr-4">{h.symbol}</td>
                <td className="pr-4">{h.quantity}</td>
                <td className="pr-4">${h.avg_cost?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PortfolioAnalyticsPanel portfolioId={portfolioId} />
    </div>
  );
} 