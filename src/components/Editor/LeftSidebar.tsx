import React, { useState } from "react";
import { SidebarTab, SidebarPanel } from "./SidebarComponents";
import { ChartTypePanel } from "./ChartTypePanel";
import { ElementsPanel } from "./ElementsPanel";
import { DataPanel } from "./DataPanel";
import { AiSuggestionsPanel } from "./AiSuggestionsPanel";
import "./LeftSidebar.css";

const TABS = [
  { icon: "bar_chart", label: "Charts", panel: <ChartTypePanel /> },
  { icon: "widgets", label: "Elements", panel: <ElementsPanel /> },
  { icon: "table_chart", label: "Data", panel: <DataPanel /> },
  { icon: "lightbulb", label: "AI", panel: <AiSuggestionsPanel /> },
];

export const LeftSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <aside className="left-sidebar" aria-label="Sidebar">
      <nav className="sidebar-tabs" aria-label="Sidebar Tabs">
        {TABS.map((tab, i) => (
          <SidebarTab
            key={tab.label}
            icon={tab.icon}
            label={tab.label}
            active={i === activeTab}
            onClick={() => setActiveTab(i)}
          />
        ))}
      </nav>
      <SidebarPanel>{TABS[activeTab].panel}</SidebarPanel>
    </aside>
  );
}; 