import { BarChart3, Target, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  {
    icon: BarChart3,
    text: "Market Overview",
    prompt: "Show me a comprehensive market overview"
  },
  {
    icon: Target,
    text: "Create Alert",
    prompt: "Help me create a new alert",
    isPrimary: true
  },
  {
    icon: Bot,
    text: "Custom Agent",
    prompt: "I want to build a custom trading agent"
  }
];

interface WelcomeScreenProps {
  onPromptClick: (prompt: string) => void;
}

export function WelcomeScreen({ onPromptClick }: WelcomeScreenProps) {

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-semibold text-foreground mb-3">
          What can I analyze for you?
        </h1>
        <p className="text-lg text-muted-foreground">
          Get AI-powered market insights and trading intelligence
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => onPromptClick(action.prompt)}
            className={cn(
              "flex flex-col items-center gap-4 p-8 rounded-2xl border transition-colors",
              "bg-card hover:border-primary/50",
              action.isPrimary 
                ? "border-primary" 
                : "border-border"
            )}
            aria-label={action.text}
          >
            <action.icon className="w-8 h-8 text-primary" />
            <div className="font-medium text-lg text-foreground text-center">
              {action.text}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}