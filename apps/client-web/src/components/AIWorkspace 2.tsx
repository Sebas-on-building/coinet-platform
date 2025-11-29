import { ChatInterface } from "./ChatInterface";
import { CustomAgent } from "@/types/agents";

interface AIWorkspaceProps {
  activeAgent?: CustomAgent | null;
}

export function AIWorkspace({ activeAgent }: AIWorkspaceProps) {
  return (
    <main className="flex-1 h-full overflow-hidden coinet-fade-in">
      <ChatInterface activeAgent={activeAgent} />
    </main>
  );
}