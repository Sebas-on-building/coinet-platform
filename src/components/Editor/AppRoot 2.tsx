import React from "react";
import { TopToolbar } from "./TopToolbar";
import { LeftSidebar } from "./LeftSidebar";
import { CanvasArea } from "./CanvasArea";
import { RightSidebar } from "./RightSidebar";
import { ThemeProvider } from "./ThemeProvider";
import "./AppRoot.css";

export const AppRoot: React.FC = () => (
  <ThemeProvider>
    <div className="app-root">
      <TopToolbar />
      <div className="main-content">
        <LeftSidebar />
        <CanvasArea />
        <RightSidebar />
      </div>
    </div>
  </ThemeProvider>
); 