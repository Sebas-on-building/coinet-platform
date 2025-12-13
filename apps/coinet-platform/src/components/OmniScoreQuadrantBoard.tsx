import React, { useState, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Label
} from 'recharts';
import { AlertCircle, CheckCircle, HelpCircle, AlertTriangle, ShieldCheck, Filter, ArrowUpDown } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ProjectPoint = {
  name: string;
  ticker?: string;
  sector?: string;
  capBucket?: string;
  qs: number;          // 0..100
  osStatus: "ok" | "gated";
  os: number | null;   // null if gated
  risk?: number;       // optional 0..100
  pos: number;         // 0..100
  posAdj?: number;     // 0..100
  // Optional 7d history for movement vectors
  qsPrev7d?: number;
  osPrev7d?: number;
  deltaQS7d?: number;
  deltaOS7d?: number;
  deltaPOSAdj7d?: number;
  nrg?: { value: number; percentile?: number; interpretation?: string };
  nmi?: { score: number; tier?: "clean" | "suspicious" | "manipulated" | "severe" };
  confidence?: "high" | "medium" | "low" | "insufficient";
  coverageQS?: number;  // 0..1
  coverageOS?: number;  // 0..1
  comm?: {
    commFinal?: number;
    icrComposite?: number;
    capsApplied?: { anyCapActive: boolean };
  };
};

import { DEFAULT_QS_THRESHOLD, DEFAULT_OS_THRESHOLD } from "../services/omniscore";

export interface OmniScoreQuadrantBoardProps {
  projects: ProjectPoint[];
  title?: string;
  showLegend?: boolean;
  showTable?: boolean;
  quadrantThreshold?: { qs: number; os: number }; // default shared constant
  sizeBy?: "pos" | "posAdj"; // default posAdj if available
  showVectors?: boolean; // default true
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  clean: "#10b981",      // green-500
  suspicious: "#f59e0b", // amber-500
  manipulated: "#f97316", // orange-500
  severe: "#ef4444",     // red-500
  default: "#3b82f6",    // blue-500
  gated: "#6b7280",      // gray-500
};

const getBubbleColor = (p: ProjectPoint) => {
  if (p.osStatus === 'gated') return COLORS.gated;
  if (p.nmi?.tier) return COLORS[p.nmi.tier] || COLORS.default;
  
  // Fallback to confidence if no NMI
  if (p.confidence === 'high') return "#10b981";
  if (p.confidence === 'medium') return "#3b82f6";
  if (p.confidence === 'low') return "#f59e0b";
  return "#6b7280";
};

const getBubbleSize = (p: ProjectPoint, mode: "pos" | "posAdj") => {
  const val = mode === "posAdj" ? (p.posAdj ?? p.pos) : p.pos;
  // Scale size: min 100, max 800 area roughly
  return 100 + (val * 8); 
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

// Custom shape to draw movement vectors + point
const PointWithVector = (props: any) => {
  const { cx, cy, payload, size, fill } = props;
  const prevX = payload.prevX;
  const prevY = payload.prevY;
  const hasVector = typeof prevX === 'number' && typeof prevY === 'number';

  return (
    <g>
      {hasVector && (
        <>
          <line
            x1={prevX}
            y1={prevY}
            x2={cx}
            y2={cy}
            stroke={fill}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.7}
          />
          {/* Arrow head */}
          <circle cx={prevX} cy={prevY} r={2} fill={fill} opacity={0.8} />
        </>
      )}
      <circle cx={cx} cy={cy} r={Math.sqrt(size / Math.PI)} fill={fill} />
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const OmniScoreQuadrantBoard: React.FC<OmniScoreQuadrantBoardProps> = ({
  projects = [],
  title = "OmniScore Market Map",
  showLegend = true,
  showTable = true,
  quadrantThreshold = { qs: DEFAULT_QS_THRESHOLD, os: DEFAULT_OS_THRESHOLD },
  sizeBy = "posAdj",
  showVectors = true
}) => {
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterCap, setFilterCap] = useState<string>("all");
  const [hideGated, setHideGated] = useState<boolean>(false);
  const [sizeMode, setSizeMode] = useState<"pos" | "posAdj">(sizeBy);
  const [vectorsOn, setVectorsOn] = useState<boolean>(showVectors);
  const labelsHidden = projects.length > 25;

  // Quadrant counts for quick scan
  const quadrantCounts = useMemo(() => {
    const qsT = quadrantThreshold.qs;
    const osT = quadrantThreshold.os;
    let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
    projects.forEach(p => {
      const osVal = p.osStatus === "gated" ? osT : (p.os ?? 0);
      if (p.qs >= qsT && osVal >= osT) q1++;
      else if (p.qs < qsT && osVal >= osT) q2++;
      else if (p.qs < qsT && osVal < osT) q3++;
      else if (p.qs >= qsT && osVal < osT) q4++;
    });
    return { q1, q2, q3, q4 };
  }, [projects, quadrantThreshold]);

  // Extract unique sectors and caps for filters
  const sectors = useMemo(() => 
    ["all", ...Array.from(new Set(projects.map(p => p.sector).filter(Boolean) as string[]))], 
    [projects]
  );
  const capBuckets = useMemo(() => 
    ["all", ...Array.from(new Set(projects.map(p => p.capBucket).filter(Boolean) as string[]))], 
    [projects]
  );

  // Filter data
  const filteredData = useMemo(() => {
    return projects.filter(p => {
      if (filterSector !== "all" && p.sector !== filterSector) return false;
      if (filterCap !== "all" && p.capBucket !== filterCap) return false;
      if (hideGated && p.osStatus === "gated") return false;
      return true;
    }).map(p => {
      const qsVal = clamp100(p.qs);
      const osVal = p.osStatus === "gated" ? quadrantThreshold.os : clamp100(p.os || 0);

      // Movement vectors: derive previous coords if provided
      const prevQ = typeof p.qsPrev7d === 'number'
        ? clamp100(p.qsPrev7d)
        : typeof p.deltaQS7d === 'number'
          ? clamp100(p.qs - p.deltaQS7d)
          : undefined;
      const prevO = typeof p.osPrev7d === 'number'
        ? clamp100(p.osPrev7d)
        : typeof p.deltaOS7d === 'number'
          ? clamp100((p.os ?? osVal) - p.deltaOS7d)
          : undefined;

      return {
        ...p,
        chartX: qsVal,
        chartY: osVal,
        chartZ: getBubbleSize(p, sizeMode),
        color: getBubbleColor(p),
        prevX: showVectors && vectorsOn && typeof prevQ === 'number' ? prevQ : undefined,
        prevY: showVectors && vectorsOn && typeof prevO === 'number' ? prevO : undefined,
      };
    });
  }, [projects, filterSector, filterCap, hideGated, sizeMode, quadrantThreshold, showVectors, vectorsOn]);

  // Sort for table
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valA = sizeMode === "posAdj" ? (a.posAdj ?? a.pos) : a.pos;
      const valB = sizeMode === "posAdj" ? (b.posAdj ?? b.pos) : b.pos;
      return valB - valA;
    });
  }, [filteredData, sizeMode]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as typeof filteredData[0];
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl text-xs z-50 max-w-xs">
          <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-1">
            <span className="font-bold text-white text-sm">{data.name} <span className="text-gray-400">({data.ticker})</span></span>
            {data.osStatus === 'gated' && <span className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[10px]">GATED</span>}
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
            <div className="text-gray-400">QS (Quality):</div>
            <div className="font-mono text-white text-right">{data.qs.toFixed(1)}</div>
            
            <div className="text-gray-400">OS (Potential):</div>
            <div className="font-mono text-white text-right">
              {data.osStatus === 'gated' ? 'GATED' : data.os?.toFixed(1)}
            </div>
            
            <div className="text-gray-400">POS{sizeMode === 'posAdj' ? ' (Adj)' : ''}:</div>
            <div className="font-mono text-blue-400 font-bold text-right">
              {(sizeMode === 'posAdj' ? data.posAdj : data.pos)?.toFixed(1)}
            </div>
          </div>

          {(data.nmi || data.nrg || data.confidence) && (
            <div className="border-t border-gray-700 pt-2 space-y-1">
              {data.confidence && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Confidence:</span>
                  <span className={`
                    ${data.confidence === 'high' ? 'text-green-400' : ''}
                    ${data.confidence === 'medium' ? 'text-blue-400' : ''}
                    ${data.confidence === 'low' ? 'text-amber-400' : ''}
                    ${data.confidence === 'insufficient' ? 'text-red-400' : ''}
                  `}>{data.confidence.toUpperCase()}</span>
                </div>
              )}
              {data.nmi && (
                <div className="flex justify-between">
                  <span className="text-gray-500">NMI Tier:</span>
                  <span style={{ color: COLORS[data.nmi.tier || 'clean'] }}>
                    {data.nmi.tier?.toUpperCase()} ({data.nmi.score})
                  </span>
                </div>
              )}
              {data.nrg && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Hype Gap:</span>
                  <span className="text-gray-300">{data.nrg.interpretation}</span>
                </div>
              )}
              {data.comm?.capsApplied?.anyCapActive && (
                <div className="text-amber-500 flex items-center gap-1 mt-1">
                  <AlertTriangle size={10} />
                  <span>Anti-gaming caps active</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#0B0C10] text-gray-300 p-4 rounded-xl border border-gray-800 font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {title}
            <ShieldCheck size={18} className="text-blue-500" />
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            QS (Quality) vs OS (Opportunity) • Size = {sizeMode.toUpperCase()} • Color = Risk
            • POS* = posAdj (if available) else pos
          </p>
            <p className="text-[10px] text-gray-600 mt-1">
              Thresholds: QS {quadrantThreshold.qs} | OS {quadrantThreshold.os} • Labels {labelsHidden ? 'hidden (dense mode)' : 'shown on hover'}
            </p>
            <p className="text-[10px] text-gray-600">
              Quadrants — Target: {quadrantCounts.q1} • Hype/Spec: {quadrantCounts.q2} • Avoid: {quadrantCounts.q3} • Builder: {quadrantCounts.q4}
            </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {/* Sector Filter */}
          <div className="flex items-center bg-gray-900 rounded px-2 py-1 border border-gray-800">
            <Filter size={12} className="mr-1 text-gray-500" />
            <select 
              value={filterSector} 
              onChange={(e) => setFilterSector(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-gray-300 cursor-pointer outline-none"
            >
              <option value="all">All Sectors</option>
              {sectors.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Cap Filter */}
          <div className="flex items-center bg-gray-900 rounded px-2 py-1 border border-gray-800">
            <ArrowUpDown size={12} className="mr-1 text-gray-500" />
            <select 
              value={filterCap} 
              onChange={(e) => setFilterCap(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-gray-300 cursor-pointer outline-none"
            >
              <option value="all">All Caps</option>
              {capBuckets.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Toggles */}
          <button 
            onClick={() => setSizeMode(prev => prev === 'pos' ? 'posAdj' : 'pos')}
            className="px-2 py-1 bg-gray-900 border border-gray-800 rounded hover:bg-gray-800 transition-colors"
          >
            Size: {sizeMode === 'pos' ? 'Raw' : 'Adj'}
          </button>
          
          <button 
            onClick={() => setHideGated(!hideGated)}
            className={`px-2 py-1 border border-gray-800 rounded transition-colors ${hideGated ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-900 hover:bg-gray-800'}`}
          >
            {hideGated ? 'Gated Hidden' : 'Show Gated'}
          </button>

          <button
            onClick={() => setVectorsOn(!vectorsOn)}
            className={`px-2 py-1 border border-gray-800 rounded transition-colors ${vectorsOn ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-800/60 text-gray-400'}`}
          >
            Vectors: {vectorsOn ? 'On' : 'Off'}
          </button>

          {labelsHidden && (
            <div
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-[10px] text-amber-400"
              title="Labels are hidden to keep the chart readable with 25+ projects."
            >
              Dense view: labels hidden
            </div>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[400px] w-full relative mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} horizontal={false} />
            <XAxis 
              type="number" 
              dataKey="chartX" 
              name="QS" 
              domain={[0, 100]} 
              stroke="#4b5563" 
              tick={{ fontSize: 10, fill: '#6b7280' }}
              label={{ value: 'QS (Fundamental Quality)', position: 'bottom', fill: '#4b5563', fontSize: 10 }}
            />
            <YAxis 
              type="number" 
              dataKey="chartY" 
              name="OS" 
              domain={[0, 100]} 
              stroke="#4b5563" 
              tick={{ fontSize: 10, fill: '#6b7280' }}
              label={{ value: 'OS (Opportunity Score)', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            {/* Quadrant Thresholds */}
            <ReferenceLine x={quadrantThreshold.qs} stroke="#374151" strokeDasharray="4 4" />
            <ReferenceLine y={quadrantThreshold.os} stroke="#374151" strokeDasharray="4 4" />
            
            {/* Quadrant Labels */}
            <Label value="Target Zone" position="insideTopRight" offset={20} fill="#10b981" fontSize={12} fontWeight="bold" />
            
            <Scatter name="Projects" data={filteredData} shape={vectorsOn ? PointWithVector : undefined}>
              {filteredData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  fillOpacity={0.7}
                  stroke={entry.confidence === 'high' ? '#10b981' : '#fff'}
                  strokeWidth={1}
                  strokeDasharray={
                    entry.confidence === 'medium'
                      ? '6 3'
                      : entry.confidence === 'low'
                        ? '2 4'
                        : entry.confidence === 'insufficient'
                          ? '1 6'
                          : undefined
                  }
                  opacity={entry.confidence === 'insufficient' ? 0.5 : 1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        
        {/* Quadrant Background Labels (Absolute) */}
        <div className="absolute top-4 right-4 text-green-500/10 text-4xl font-bold pointer-events-none select-none">Q1</div>
        <div className="absolute top-4 left-12 text-gray-700/10 text-4xl font-bold pointer-events-none select-none">Q2</div>
        <div className="absolute bottom-10 left-12 text-red-500/10 text-4xl font-bold pointer-events-none select-none">Q3</div>
        <div className="absolute bottom-10 right-4 text-blue-500/10 text-4xl font-bold pointer-events-none select-none">Q4</div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-4 justify-center mb-6 text-[10px] text-gray-500 border-t border-gray-800 pt-3">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Clean</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Suspicious</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Manipulated</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Severe</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-500"></div> Gated (OS hidden)</div>
          <div className="flex items-center gap-1 ml-4"><div className="w-2 h-2 border border-dashed border-red-500 rounded-full"></div> Low Confidence</div>
        </div>
      )}

      {/* Ranked Table */}
      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="py-2 pl-2">#</th>
                <th className="py-2">Project</th>
                <th className="py-2 text-right">QS</th>
                <th className="py-2 text-right">OS</th>
                <th className="py-2 text-right">POS{sizeMode === 'posAdj' ? '*' : ''}</th>
                <th className="py-2 text-center">Conf</th>
                <th className="py-2">Risk Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((p, i) => (
                <tr key={p.name} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                  <td className="py-2 pl-2 text-gray-600">{i + 1}</td>
                  <td className="py-2 font-medium">
                    <span className="text-white">{p.ticker || p.name}</span>
                    <span className="text-gray-600 ml-1 text-[10px] hidden md:inline">{p.sector}</span>
                  </td>
                  <td className="py-2 text-right font-mono text-gray-300">{p.qs.toFixed(0)}</td>
                  <td className="py-2 text-right font-mono text-gray-300">
                    {p.osStatus === 'gated' ? <span className="text-gray-600">--</span> : p.os?.toFixed(0)}
                  </td>
                  <td className="py-2 text-right font-mono font-bold text-blue-400">
                    {(sizeMode === 'posAdj' ? p.posAdj : p.pos)?.toFixed(1)}
                  </td>
                  <td className="py-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] bg-gray-800
                      ${p.confidence === 'high' ? 'text-green-400 border border-green-900' : ''}
                      ${p.confidence === 'medium' ? 'text-blue-400' : ''}
                      ${p.confidence === 'low' ? 'text-amber-400' : ''}
                    `}>
                      {p.confidence?.substring(0, 3).toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2">
                    {p.nmi?.tier ? (
                      <span className={`flex items-center gap-1 ${p.nmi.tier === 'clean' ? 'text-gray-500' : 'text-amber-500'}`}>
                        {p.nmi.tier === 'clean' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        <span className="capitalize">{p.nmi.tier}</span>
                      </span>
                    ) : (
                      <span className="text-gray-700">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OmniScoreQuadrantBoard;

