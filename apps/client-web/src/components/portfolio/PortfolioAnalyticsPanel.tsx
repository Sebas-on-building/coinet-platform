import { useEffect, useState, useRef } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { Tooltip as ReactTooltipTooltip } from 'react-tooltip';

ChartJS.register(LineElement, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement);

const chartTypes = [
  { label: 'Line', value: 'line' },
  { label: 'Bar', value: 'bar' },
];

function downloadCSV(data: any) {
  const rows = [
    ['Metric', 'Value'],
    ...Object.entries(data).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v]),
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfolio-analytics.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPDF(data: any) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold');
  doc.text('Portfolio Analytics', 10, 10);
  let y = 20;
  Object.entries(data).forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`, 10, y);
    y += 8;
  });
  doc.save('portfolio-analytics.pdf');
}

export function PortfolioAnalyticsPanel({ portfolioId }: { portfolioId: string }) {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [windowSize, setWindowSize] = useState(30);
  const [riskFreeRate, setRiskFreeRate] = useState(0.01);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [formula, setFormula] = useState('');
  const [formulaResult, setFormulaResult] = useState<any>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/v1/portfolios/${portfolioId}/analytics?window=${windowSize}&riskFreeRate=${riskFreeRate}`);
      setData(await res.json());
      const histRes = await fetch(`/api/v1/portfolios/${portfolioId}/history?window=${windowSize}`);
      setHistory(await histRes.json());
    }
    fetchData();
  }, [portfolioId, windowSize, riskFreeRate]);

  async function handleFormulaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formula) return;
    const res = await fetch(`/api/v1/portfolios/${portfolioId}/custom-formula`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formula, window: windowSize }),
    });
    const data = await res.json();
    setFormulaResult(data.result);
    if (formulaInputRef.current) formulaInputRef.current.blur();
  }

  if (!data) return <div className="p-8">Loading...</div>;
  // Chart data
  const valueChart = {
    labels: history.map((_, i) => `T-${history.length - i}`),
    datasets: [
      {
        label: 'Portfolio Value',
        data: history,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        tension: 0.4,
        pointRadius: 0,
        fill: true,
      },
    ],
  };
  const drawdownChart = {
    labels: history.map((_, i) => `T-${history.length - i}`),
    datasets: [
      {
        label: 'Drawdown',
        data: history.map((v: number, i: number) => {
          const peak = Math.max(...history.slice(0, i + 1));
          return peak ? (peak - v) / peak : 0;
        }),
        backgroundColor: '#f87171',
      },
    ],
  };
  const sectorPie = {
    labels: data.sectorExposure?.map((s: any) => s.sector),
    datasets: [
      {
        data: data.sectorExposure?.map((s: any) => s.weight),
        backgroundColor: ['#6366f1', '#f59e42', '#10b981', '#f87171', '#818cf8', '#fbbf24', '#34d399'],
      },
    ],
  };
  return (
    <div className="p-8 rounded-3xl bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] shadow-2xl flex flex-col gap-8 w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Portfolio Analytics</h2>
      <ReactTooltipTooltip id="analytics-tooltip" className="!bg-black !text-white !rounded-xl !px-3 !py-2 !text-xs !shadow-xl" />
      <div className="flex flex-wrap gap-4 items-center mb-6 bg-white/70 rounded-xl p-4 shadow">
        <div className="flex flex-col" data-tooltip-id="analytics-tooltip" data-tooltip-content="Number of days for analytics window (e.g. 30 = last 30 days)">
          <label className="text-xs font-semibold mb-1">Window Size</label>
          <input type="number" min={5} max={365} value={windowSize} onChange={e => setWindowSize(Number(e.target.value))} className="rounded-lg px-2 py-1 border border-gray-200 focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        <div className="flex flex-col" data-tooltip-id="analytics-tooltip" data-tooltip-content="Risk-free rate for Sharpe/Sortino (e.g. 0.01 = 1%)">
          <label className="text-xs font-semibold mb-1">Risk-Free Rate</label>
          <input type="number" step={0.001} min={0} max={0.2} value={riskFreeRate} onChange={e => setRiskFreeRate(Number(e.target.value))} className="rounded-lg px-2 py-1 border border-gray-200 focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        <div className="flex flex-col" data-tooltip-id="analytics-tooltip" data-tooltip-content="Switch between line and bar chart for value visualization">
          <label className="text-xs font-semibold mb-1">Chart Type</label>
          <select value={chartType} onChange={e => setChartType(e.target.value as 'line' | 'bar')} className="rounded-lg px-2 py-1 border border-gray-200 focus:ring-2 focus:ring-blue-400 transition">
            {chartTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col ml-auto" data-tooltip-id="analytics-tooltip" data-tooltip-content="Export analytics as CSV or PDF">
          <label className="text-xs font-semibold mb-1">Export</label>
          <div className="flex gap-2">
            <button onClick={() => downloadCSV(data)} className="rounded-lg px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow hover:from-indigo-500 hover:to-blue-500 transition">CSV</button>
            <button onClick={() => downloadPDF(data)} className="rounded-lg px-3 py-1 bg-gradient-to-r from-green-400 to-blue-400 text-white font-semibold shadow hover:from-blue-400 hover:to-green-400 transition">PDF</button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-6">
        <form onSubmit={handleFormulaSubmit} className="flex gap-2 items-end" data-tooltip-id="analytics-tooltip" data-tooltip-content="Enter a custom formula using value, cost, pnl, history, holdings (e.g. (value-cost)/cost)">
          <div className="flex flex-col flex-1">
            <label className="text-xs font-semibold mb-1">Custom Formula</label>
            <input ref={formulaInputRef} type="text" value={formula} onChange={e => setFormula(e.target.value)} placeholder="e.g. (value - cost) / cost" className="rounded-lg px-2 py-1 border border-gray-200 focus:ring-2 focus:ring-blue-400 transition w-full" />
          </div>
          <button type="submit" className="rounded-lg px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow hover:from-pink-500 hover:to-purple-500 transition">Run</button>
        </form>
        {formulaResult !== null && (
          <div className="text-sm text-gray-700 mt-1">Result: <span className="font-mono text-blue-700">{String(formulaResult)}</span></div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/80 rounded-xl p-4 shadow" data-tooltip-id="analytics-tooltip" data-tooltip-content="Time-weighted return: measures compound growth, neutralizing cash flows">
          <div className="font-semibold">Time-Weighted Return</div>
          <div className="text-2xl">{data.timeWeightedReturn?.toFixed(2)}%</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow" data-tooltip-id="analytics-tooltip" data-tooltip-content="Sharpe Ratio: risk-adjusted return (higher is better)">
          <div className="font-semibold">Sharpe Ratio</div>
          <div className="text-2xl">{data.sharpeRatio?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow" data-tooltip-id="analytics-tooltip" data-tooltip-content="Sortino Ratio: downside risk-adjusted return">
          <div className="font-semibold">Sortino Ratio</div>
          <div className="text-2xl">{data.sortinoRatio?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow" data-tooltip-id="analytics-tooltip" data-tooltip-content="Max Drawdown: largest peak-to-trough drop (lower is better)">
          <div className="font-semibold">Max Drawdown</div>
          <div className="text-2xl">{data.maxDrawdown?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow" data-tooltip-id="analytics-tooltip" data-tooltip-content="Diversification Score: higher means more diversified portfolio">
          <div className="font-semibold">Diversification Score</div>
          <div className="text-2xl">{data.diversificationScore?.toFixed(4)}</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow col-span-2" data-tooltip-id="analytics-tooltip" data-tooltip-content="Sector Exposure: allocation by sector">
          <div className="font-semibold">Sector Exposure</div>
          <div className="flex flex-wrap gap-4">
            {data.sectorExposure?.map((s: any) => (
              <div key={s.sector} className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800">
                {s.sector}: {s.weight}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 shadow col-span-2" data-tooltip-id="analytics-tooltip" data-tooltip-content="Risk Metrics: Value at Risk (VaR) and Conditional VaR (CVaR)">
          <div className="font-semibold">Risk Metrics (VaR / CVaR)</div>
          <div className="text-2xl">VaR: {data.riskMetrics?.var95?.toFixed(4)} CVaR: {data.riskMetrics?.cvar95?.toFixed(4)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="bg-white/90 rounded-2xl p-6 shadow flex flex-col items-center">
          <div className="font-semibold mb-2">Portfolio Value (Interactive)</div>
          {chartType === 'line' ? (
            <Line data={valueChart} options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false, elements: { line: { borderWidth: 3 } } }} height={180} />
          ) : (
            <Bar data={valueChart} options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} height={180} />
          )}
        </div>
        <div className="bg-white/90 rounded-2xl p-6 shadow flex flex-col items-center">
          <div className="font-semibold mb-2">Drawdown</div>
          <Bar data={drawdownChart} options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} height={180} />
        </div>
        <div className="bg-white/90 rounded-2xl p-6 shadow flex flex-col items-center col-span-2">
          <div className="font-semibold mb-2">Sector Exposure</div>
          <Pie data={sectorPie} options={{ plugins: { legend: { position: 'bottom' } }, responsive: true, maintainAspectRatio: false }} height={180} />
        </div>
      </div>
    </div>
  );
} 