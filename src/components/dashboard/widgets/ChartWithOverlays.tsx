import React from "react";
import { ChartGlowEffects } from "./ChartGlowEffects";
import { ChartAccessibilityLayer } from "./ChartAccessibilityLayer";
import { ChartTooltip } from "./ChartTooltip";
import { ChartSelectionHandles } from "./ChartSelectionHandles";
import { ChartLegend } from "./ChartLegend";

export const ChartWithOverlays: React.FC<{
  overlays?: React.ReactNode[];
  children: React.ReactNode;
  themeColor?: string;
}> = ({ overlays = [], children, themeColor = "#7F5FFF" }) => {
  return (
    <ChartGlowEffects color={themeColor} intensity={0.7}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {children}
        {overlays.map((o, i) => (
          <React.Fragment key={i}>{o}</React.Fragment>
        ))}
        <ChartTooltip />
        <ChartSelectionHandles />
        <ChartLegend />
        <ChartAccessibilityLayer />
      </div>
    </ChartGlowEffects>
  );
}; 