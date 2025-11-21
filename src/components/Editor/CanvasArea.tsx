import React from "react";
import { InfiniteCanvas } from "./InfiniteCanvas";
import { Minimap } from "./Minimap";
import "./CanvasArea.css";

export const CanvasArea: React.FC = () => (
  <main className="canvas-area" tabIndex={0} aria-label="Canvas Area">
    <InfiniteCanvas />
    <Minimap />
  </main>
); 