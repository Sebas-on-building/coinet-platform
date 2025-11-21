import React from "react";
import { ToolbarButton, ToolbarMenu } from "./ToolbarComponents";
import { AiAssistantButton } from "./AiAssistantButton";
import { UserProfileMenu } from "./UserProfileMenu";
import "./TopToolbar.css";

export const TopToolbar: React.FC = () => (
  <header className="top-toolbar" role="toolbar" aria-label="Main Toolbar">
    <ToolbarButton icon="undo" label="Undo" shortcut="⌘Z" onClick={undo} />
    <ToolbarButton icon="redo" label="Redo" shortcut="⌘⇧Z" onClick={redo} />
    <ToolbarButton icon="add" label="Add Data" onClick={openDataDialog} />
    <AiAssistantButton />
    <ToolbarMenu icon="save" label="Save" options={saveOptions} />
    <ToolbarMenu icon="export" label="Export" options={exportOptions} />
    <div className="toolbar-spacer" />
    <UserProfileMenu />
  </header>
); 