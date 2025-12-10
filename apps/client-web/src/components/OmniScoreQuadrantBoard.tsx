import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ZAxis,
} from "recharts";

export type QuadrantProject = {
  name: string;
  ticker?: string;
  qs: number;
  os: number | null; // null means gated
  pos: number;
  posAdj?: number;
  confidence?: string;
  nmi?: { tier?: "clean" | "suspicious" | "manipulated" | "severe" };
};

export interface OmniScoreQuadrantBoardProps {
  projects: QuadrantProject[];
  title?: string;
  showLegend?: boolean;
}

const QS_THRESHOLD = 60;
const OS_THRESHOLD = 60;

const COLORS: Record<string, string> = {
  clean: "#10b981",
  suspicious: "#f59e0b",
  manipulated: "#f97316",
  severe: "#ef4444",
  default: "#3b82f6",
  gated: "#6b7280",
};

const getColor = (p: QuadrantProject) => {
  if (p.os === null) return COLORS.gated;
  if (p.nmi?.tier) return COLORS[p.nmi.tier] || COLORS.default;
  return COLORS.default;
};

const getSize = (p: QuadrantProject) => {
  const val = p.posAdj ?? p.pos ?? 0;
  return 80 + val * 6; // simple scaling
};

// Custom shape for Scatter points with colors
const CustomShape = (props: any) => {
  const { cx, cy, payload } = props;
  
  console.log('🎨 CustomShape rendering:', { cx, cy, name: payload?.name, color: payload?.color });
  
  if (cx === null || cy === null || !payload) {
    console.warn('⚠️ CustomShape: Invalid props', { cx, cy, payload });
    return null;
  }
  
  const radius = Math.sqrt(payload.z || 100) / 2;
  const ticker = payload.name?.substring(0, 3) || payload.name || "?";
  
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={payload.color || "#3b82f6"}
        fillOpacity={0.8}
        stroke="#fff"
        strokeWidth={2}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.max(8, Math.min(12, radius / 3))}
        fontWeight="bold"
        fill="#fff"
        stroke="#000"
        strokeWidth={0.3}
        pointerEvents="none"
      >
        {ticker}
      </text>
    </g>
  );
};

export const OmniScoreQuadrantBoard: React.FC<OmniScoreQuadrantBoardProps> = ({
  projects,
  title,
}) => {
  console.log('🎯 OmniScoreQuadrantBoard rendering with', projects.length, 'projects');
  
  if (!projects || projects.length === 0) {
    console.warn('⚠️ No projects provided to OmniScoreQuadrantBoard');
    return (
      <div className="w-full bg-muted/50 border border-border/50 rounded-2xl p-4">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }
  
  const data = projects.map((p) => {
    const point = {
      x: Math.max(0, Math.min(100, p.qs)),
      y: p.os === null ? 50 : Math.max(0, Math.min(100, p.os)),
      z: getSize(p), // Use z for bubble size
      name: p.ticker || p.name,
      pos: p.pos,
      posAdj: p.posAdj ?? p.pos,
      confidence: p.confidence || "unknown",
      nmiTier: p.nmi?.tier || "clean",
      color: getColor(p),
    };
    console.log(`📍 Point: ${point.name} at (QS: ${point.x}, OS: ${point.y}), size: ${point.z}, color: ${point.color}`);
    return point;
  });
  
  console.log('📊 Chart data prepared:', data);

  return (
    <div className="w-full bg-muted/50 border border-border/50 rounded-2xl p-4">
      {title && <h3 className="text-sm font-semibold mb-2">{title}</h3>}
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="QS"
              domain={[0, 100]}
              label={{ value: "Quality Score (QS)", position: "insideBottom", dy: 10 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="OS"
              domain={[0, 100]}
              label={{ value: "Opportunity Score (OS)", angle: -90, position: "insideLeft" }}
            />
            <ZAxis dataKey="z" range={[50, 800]} />
            <ReferenceLine x={QS_THRESHOLD} stroke="#9ca3af" strokeDasharray="4 4" />
            <ReferenceLine y={OS_THRESHOLD} stroke="#9ca3af" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value: any, name: string, props: any) => {
                const payload = props.payload;
                if (name === "x") return [`${value.toFixed(1)}`, "QS"];
                if (name === "y") return [`${value.toFixed(1)}`, "OS"];
                if (name === "z") return [`${payload.posAdj.toFixed(1)}`, "POS*"];
                return value;
              }}
              contentStyle={{ fontSize: 12, backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid #333" }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.name;
                }
                return "";
              }}
            />
            <Scatter 
              data={data} 
              shape={CustomShape}
              fill="#8884d8"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        QS threshold = {QS_THRESHOLD} | OS threshold = {OS_THRESHOLD}. Bubble size = POS*, color = NMI tier.
      </div>
    </div>
  );
};

