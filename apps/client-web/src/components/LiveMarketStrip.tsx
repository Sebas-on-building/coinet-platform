import { TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketMetric {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  risk?: "low" | "medium" | "high";
  icon?: React.ReactNode;
}

interface LiveMarketStripProps {
  className?: string;
}

export function LiveMarketStrip({ className }: LiveMarketStripProps) {
  // Mock data - in production, this would come from real-time API
  const metrics: MarketMetric[] = [
    {
      label: "BTC",
      value: "$67,234",
      change: "+2.4%",
      isPositive: true,
      icon: <TrendingUp className="w-3 h-3" />
    },
    {
      label: "Funding",
      value: "+0.08%",
      change: "8h",
      isPositive: true,
      icon: <Activity className="w-3 h-3" />
    },
    {
      label: "Open Interest",
      value: "$12.3B",
      change: "+3.2%",
      isPositive: true,
      icon: <Activity className="w-3 h-3" />
    },
    {
      label: "Risk Level",
      value: "Medium",
      risk: "medium",
      icon: <AlertTriangle className="w-3 h-3" />
    }
  ];

  const getRiskColor = (risk?: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return "text-success";
      case "medium":
        return "text-warning";
      case "high":
        return "text-destructive";
      default:
        return "";
    }
  };

  const getRiskDotColor = (risk?: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return "bg-success";
      case "medium":
        return "bg-warning";
      case "high":
        return "bg-destructive";
      default:
        return "";
    }
  };

  return (
    <div className={cn("w-full max-w-2xl", className)}>
      <div className="flex flex-wrap items-center gap-2 overflow-x-hidden pb-2">
        {metrics.map((metric, index) => (
          <button
            key={index}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/20 bg-card/50 hover:bg-card/80 hover:border-border/40 transition-all duration-200 whitespace-nowrap group flex-shrink-0"
            onClick={() => {
              // In production, this would trigger relevant analysis
              console.log(`Opening ${metric.label} analysis`);
            }}
          >
            {/* Risk indicator dot */}
            {metric.risk && (
              <span className={cn(
                "w-2 h-2 rounded-full",
                getRiskDotColor(metric.risk)
              )} />
            )}

            {/* Icon */}
            {metric.icon && (
              <span className={cn(
                "text-muted-foreground group-hover:text-primary transition-colors",
                metric.isPositive && "text-success",
                metric.risk && getRiskColor(metric.risk)
              )}>
                {metric.icon}
              </span>
            )}

            {/* Label */}
            <span className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </span>

            {/* Value */}
            <span className={cn(
              "text-sm font-semibold text-foreground",
              metric.isPositive && "text-success",
              metric.isPositive === false && "text-destructive",
              metric.risk && getRiskColor(metric.risk)
            )}>
              {metric.value}
            </span>

            {/* Change */}
            {metric.change && (
              <span className={cn(
                "text-xs text-muted-foreground",
                metric.isPositive && "text-success/80",
                metric.isPositive === false && "text-destructive/80"
              )}>
                {metric.change}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
