import React from "react";
import { useSelectedElement } from "./CanvasContext";
import { PropertiesInspector } from "./PropertiesInspector";
import "./RightSidebar.css";

export const RightSidebar: React.FC = () => {
  const selected = useSelectedElement();
  return (
    <aside
      className={`right-sidebar${selected ? " open" : ""}`}
      aria-label="Properties Inspector"
      aria-hidden={!selected}
    >
      {selected && <PropertiesInspector element={selected} />}
    </aside>
  );
}; 