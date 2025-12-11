import React, { useMemo, useCallback } from "react";
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
  Cell,
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

// Muted TradingView-style colors for better readability
const COLORS: Record<string, string> = {
  clean: "#26a69a",        // Teal - muted green
  suspicious: "#d4a574",    // Brown/amber - muted yellow
  manipulated: "#ce7e5c",   // Orange - muted orange
  severe: "#ef5350",        // Red - muted red
  default: "#5b9cf6",       // Blue - muted blue
  gated: "#5d606b",         // Gray - muted gray
};

const getNMIColor = (tier?: "clean" | "suspicious" | "manipulated" | "severe", isGated?: boolean): string => {
  if (isGated) return COLORS.gated;
  switch (tier) {
    case "clean":
      return COLORS.clean;
    case "suspicious":
      return COLORS.suspicious;
    case "manipulated":
      return COLORS.manipulated;
    case "severe":
      return COLORS.severe;
    default:
      return COLORS.default;
  }
};

const getQuadrant = (qs: number, os: number | null): "target" | "hype" | "avoid" | "builder" => {
  const effectiveOS = os ?? 50;
  if (qs >= QS_THRESHOLD && effectiveOS >= OS_THRESHOLD) return "target";
  if (qs < QS_THRESHOLD && effectiveOS >= OS_THRESHOLD) return "hype";
  if (qs < QS_THRESHOLD && effectiveOS < OS_THRESHOLD) return "avoid";
  return "builder";
};

// Custom bubble component with improved styling
const CustomBubble = React.memo(({
  cx,
  cy,
  payload,
}: {
  cx?: number;
  cy?: number;
  payload?: QuadrantProject & { displayOS: number; bubbleSize: number; color: string };
}) => {
  if (!cx || !cy || !payload) return null;

  const isGated = payload.os === null;
  const color = payload.color || getNMIColor(payload.nmi?.tier, isGated);
  const size = payload.bubbleSize || 16;
  const fontSize = Math.max(7, Math.min(10, size / 2.2));
  const ticker = payload.ticker?.slice(0, 4) || payload.name?.slice(0, 4) || "?";

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={color}
        opacity={0.75}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.3}
        style={{ cursor: "pointer" }}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#1a1d29"
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="IBM Plex Mono, monospace"
        style={{ pointerEvents: "none" }}
      >
        {ticker}
      </text>
    </g>
  );
});

CustomBubble.displayName = "CustomBubble";

// Custom tooltip component
const QuadrantTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const isGated = data.os === null;
  const color = data.color || getNMIColor(data.nmi?.tier, isGated);
  const quadrant = getQuadrant(data.qs, data.os);

  const quadrantLabels = {
    target: "TARGET",
    hype: "HYPE",
    avoid: "AVOID",
    builder: "BUILDER",
  };

  return (
    <div className="bg-popover border border-border rounded px-3 py-2.5 shadow-lg animate-fade-in text-[13px]">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border mb-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium text-foreground">{data.name}</span>
        {data.ticker && (
          <span className="text-muted-foreground font-mono text-xs">
            {data.ticker}
          </span>
        )}
      </div>

      {/* Scores Grid */}
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">QS</span>
          <span className="font-mono text-foreground">{data.qs.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">OS</span>
          <span className="font-mono text-foreground">
            {isGated ? <span className="text-muted-foreground">—</span> : data.os?.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">POS*</span>
          <span className="font-mono" style={{ color }}>
            {(data.posAdj ?? data.pos).toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between gap-6 pt-1 border-t border-border/50 mt-1">
          <span className="text-muted-foreground">NMI</span>
          <span className="font-mono text-xs uppercase" style={{ color }}>
            {isGated ? "gated" : data.nmi?.tier || "—"}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Zone</span>
          <span className="text-foreground text-xs">{quadrantLabels[quadrant]}</span>
        </div>
      </div>
    </div>
  );
};

export const OmniScoreQuadrantBoard: React.FC<OmniScoreQuadrantBoardProps> = ({
  projects,
  title = "OmniScore Quadrant",
  showLegend = true,
}) => {
  // Process data with improved jitter algorithm
  const processedData = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const data = projects.map((project) => ({
      ...project,
      displayOS: project.os ?? 50,
      bubbleSize: Math.max(12, Math.min(28, (project.posAdj ?? project.pos) / 4 + 8)),
      color: getNMIColor(project.nmi?.tier, project.os === null),
    }));

    // Improved jitter algorithm using angle-based spreading
    const jitterMap = new Map<string, number>();
    return data.map((item) => {
      const key = `${Math.round(item.qs / 3)}-${Math.round(item.displayOS / 3)}`;
      const count = jitterMap.get(key) || 0;
      jitterMap.set(key, count + 1);

      if (count > 0) {
        const angle = (count * 60 * Math.PI) / 180;
        return {
          ...item,
          qs: Math.max(0, Math.min(100, item.qs + Math.cos(angle) * 1.5)),
          displayOS: Math.max(0, Math.min(100, item.displayOS + Math.sin(angle) * 1.5)),
        };
      }
      return item;
    });
  }, [projects]);

  // Calculate stats for header
  const stats = useMemo(() => {
    const targetCount = projects.filter(p => p.qs >= QS_THRESHOLD && (p.os ?? 0) >= OS_THRESHOLD).length;
    const cleanCount = projects.filter(p => p.nmi?.tier === "clean").length;
    return { targetCount, cleanCount };
  }, [projects]);

  const shapeFunction = useCallback((props: any) => <CustomBubble {...props} />, []);
  
  if (!projects || projects.length === 0) {
    return (
      <div className="w-full bg-card border border-border rounded-lg p-4">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const nmiTiers = [
    { label: "Clean", color: COLORS.clean },
    { label: "Suspicious", color: COLORS.suspicious },
    { label: "Manipulated", color: COLORS.manipulated },
    { label: "Severe", color: COLORS.severe },
    { label: "Gated", color: COLORS.gated },
  ];

  return (
    <div className="w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground font-mono">
            {projects.length}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            Target: <span className="text-primary font-mono">{stats.targetCount}</span>
          </span>
          <span className="text-muted-foreground">
            Clean: <span className="font-mono" style={{ color: COLORS.clean }}>{stats.cleanCount}</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[360px] sm:h-[420px] lg:h-[480px] bg-card rounded border border-border">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 24, right: 24, bottom: 44, left: 44 }}>
            <CartesianGrid
              strokeDasharray="1 4"
              stroke="hsl(225 10% 16%)"
              opacity={0.6}
            />

            <XAxis
              type="number"
              dataKey="qs"
              domain={[0, 100]}
              tickCount={5}
              tick={{ fill: "hsl(220 8% 45%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(225 10% 20%)" }}
              tickLine={{ stroke: "hsl(225 10% 20%)" }}
              label={{
                value: "Quality Score",
                position: "bottom",
                offset: 24,
                style: { fill: "hsl(220 8% 45%)", fontSize: 11 },
              }}
            />

            <YAxis
              type="number"
              dataKey="displayOS"
              domain={[0, 100]}
              tickCount={5}
              tick={{ fill: "hsl(220 8% 45%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(225 10% 20%)" }}
              tickLine={{ stroke: "hsl(225 10% 20%)" }}
              label={{
                value: "Opportunity Score",
                angle: -90,
                position: "left",
                offset: 24,
                style: { fill: "hsl(220 8% 45%)", fontSize: 11, textAnchor: "middle" },
              }}
            />

            <ZAxis type="number" dataKey="bubbleSize" range={[80, 600]} />

            {/* Threshold lines */}
            <ReferenceLine
              x={QS_THRESHOLD}
              stroke="hsl(220 8% 30%)"
              strokeDasharray="6 3"
            />
            <ReferenceLine
              y={OS_THRESHOLD}
              stroke="hsl(220 8% 30%)"
              strokeDasharray="6 3"
            />

            {/* Zone labels */}
            <text x="88%" y="12%" textAnchor="middle" fill={COLORS.clean} fontSize={10} opacity={0.5}>
              TARGET
            </text>
            <text x="20%" y="12%" textAnchor="middle" fill={COLORS.suspicious} fontSize={10} opacity={0.5}>
              HYPE
            </text>
            <text x="20%" y="88%" textAnchor="middle" fill={COLORS.severe} fontSize={10} opacity={0.4}>
              AVOID
            </text>
            <text x="88%" y="88%" textAnchor="middle" fill={COLORS.default} fontSize={10} opacity={0.5}>
              BUILDER
            </text>

            <Tooltip
              content={<QuadrantTooltip />}
              cursor={false}
            />

            <Scatter name="Projects" data={processedData} shape={shapeFunction}>
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-4 flex-wrap">
            {nmiTiers.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Bubble size = POS*
          </div>
        </div>
      )}
    </div>
  );
};

