import { useState, useRef, useEffect } from "react";
import { Copy, Bot, User, MoreHorizontal, RotateCcw, Settings, TrendingUp, Search, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CustomAgent } from "@/types/agents";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { TradingViewChatChart } from "@/components/charts/TradingViewChatChart";
import { ProfessionalCandlestickChart } from "@/components/charts/ProfessionalCandlestickChart";
import { TechnicalIndicatorsChart } from "@/components/charts/TechnicalIndicatorsChart";
import { useTradingData } from "@/hooks/useTradingData";
import { AlertsQuickAccess } from "@/components/AlertsQuickAccess";
import { DataSourceManager } from "@/components/DataSourceManager";
import { MessageActions } from "@/components/ui/message-actions";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { Paperclip, Send, X, Mic, StopCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SourceCitation, Source } from "@/components/SourceCitation";
import { SourcesPanel } from "@/components/SourcesPanel";
import { apiClient } from "@/services/api-client";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { OmniScoreQuadrantBoard, QuadrantProject } from "@/components/OmniScoreQuadrantBoard";
import {
  CoinetMark,
  ConfidenceMeter,
  ContradictionCard,
  JudgmentCard,
  SignalStackCard,
  SystemLabel,
  TerminalPanel,
} from "@/components/coinet/TerminalPrimitives";

type ChatChartProject = {
  name?: string;
  ticker?: string;
  qs?: number;
  os?: number | null;
  pos?: number;
  posAdj?: number;
  confidence?: number;
  nmiTier?: string;
};

type ChatChart = {
  type?: string;
  symbol?: string;
  interval?: string;
  projects?: ChatChartProject[];
};

type TradingViewInterval = React.ComponentProps<typeof TradingViewChatChart>["interval"];

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  charts?: ChatChart[];
  timestamp: number;
  isRead?: boolean;
  sources?: Source[];
}

interface ChatInterfaceProps {
  activeAgent?: CustomAgent | null;
}

const terminalPrompts = [
  {
    label: "RUN JUDGMENT",
    title: "BTC market state",
    prompt: "Run a structured judgment on Bitcoin: state, cause, thesis, contradictions, timing, and confidence.",
  },
  {
    label: "CHECK CONTRADICTIONS",
    title: "Leverage risk",
    prompt: "Check whether the current crypto market thesis is weakened by leverage, liquidity, or sentiment contradictions.",
  },
  {
    label: "VIEW THE STACK",
    title: "Signal stack",
    prompt: "Build a signal stack across derivatives, on-chain, sentiment, liquidity, narratives, and risk.",
  },
];

const sampleJudgmentRows = [
  {
    label: "State",
    value: "BTC remains structurally strong, but short-term leverage is crowded.",
  },
  {
    label: "Cause",
    value: "Spot demand is stable while derivatives pressure is rising faster than liquidity support.",
  },
  {
    label: "Thesis",
    value: "Continuation is possible, but cleaner after a leverage reset.",
  },
  {
    label: "Timing",
    value: "Short-term risk. Mid-term structure intact.",
  },
];

const sampleSignals = [
  { label: "Derivatives", value: "Pressure rising", tone: "risk" as const },
  { label: "On-chain", value: "Accumulation stable", tone: "positive" as const },
  { label: "Sentiment", value: "Attention cooling" },
  { label: "Liquidity", value: "Support intact", tone: "positive" as const },
  { label: "AI Judgment", value: "Constructive, not clean" },
];

export function ChatInterface({ activeAgent }: ChatInterfaceProps) {
  // Sync Clerk auth with API client
  useAuthenticatedApi();
  
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // Get trading data using the hook
  const tradingData = useTradingData('1D');
  
  // Track user message count for feedback timing
  const [userMessageCount, setUserMessageCount] = useState(() => {
    const stored = localStorage.getItem('user_message_count');
    return stored ? parseInt(stored, 10) : 0;
  });
  
  // Feedback timing hook
  // Sources panel state
  const [sourcesPanel, setSourcesPanel] = useState<{
    open: boolean;
    messageId: string | null;
    sources: Source[];
  }>({
    open: false,
    messageId: null,
    sources: []
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const detectChartRequest = (message: string): { type: string; symbol?: string; interval?: string } | null => {
    const lowerMessage = message.toLowerCase();
    
    // Extract symbol
    let symbol = 'BTCUSD';
    if (lowerMessage.includes('ethereum') || lowerMessage.includes('eth')) {
      symbol = 'ETHUSD';
    } else if (lowerMessage.includes('bitcoin') || lowerMessage.includes('btc')) {
      symbol = 'BTCUSD';
    }
    
    // Extract interval
    let interval = '1H';
    if (lowerMessage.includes('daily') || lowerMessage.includes('1d')) {
      interval = 'D';
    } else if (lowerMessage.includes('weekly') || lowerMessage.includes('1w')) {
      interval = 'W';
    } else if (lowerMessage.includes('4h') || lowerMessage.includes('4 hour')) {
      interval = '240';
    }
    
    // Check if chart is requested
    if (lowerMessage.includes('chart') || lowerMessage.includes('price') || 
        lowerMessage.includes('analysis') || lowerMessage.includes('trading') ||
        lowerMessage.includes('bitcoin') || lowerMessage.includes('ethereum') ||
        lowerMessage.includes('market')) {
      return { type: 'tradingview', symbol, interval };
    }
    
    return null;
  };

  const renderChatCharts = (charts: ChatChart[]) => {
    if (!charts || charts.length === 0) {
      console.log('📊 ChatInterface: No charts to render');
      return null;
    }
    
    console.log('📊 ChatInterface: Rendering charts:', charts);
    console.log('📊 ChatInterface: Charts array length:', charts.length);
    console.log('📊 ChatInterface: Charts array:', JSON.stringify(charts, null, 2));
    
    return charts.map((chart, index) => {
      try {
        console.log(`📊 ChatInterface: Chart ${index}:`, {
          type: chart?.type,
          hasProjects: Array.isArray(chart?.projects),
          projectsCount: chart?.projects?.length,
          chart: chart,
        });
        
        if (chart?.type === "omniscore-quadrant" && Array.isArray(chart.projects)) {
          console.log('📊 ChatInterface: Rendering OmniScore quadrant with projects:', chart.projects);
          
          const projects: QuadrantProject[] = chart.projects.map((p) => ({
            name: p.ticker || p.name || "Project",
            ticker: p.ticker,
            qs: p.qs ?? 0,
            os: p.os ?? null,
            pos: p.pos ?? 0,
            posAdj: p.posAdj ?? p.pos ?? 0,
            confidence: p.confidence,
            nmi: { tier: p.nmiTier },
          }));

          console.log('📊 ChatInterface: Mapped projects for OmniScoreQuadrantBoard:', projects);

          if (projects.length === 0) {
            console.warn('📊 ChatInterface: No valid projects to render');
            return null;
          }

          return (
            <div 
              key={`omniscore-${index}`} 
              className={cn(
                "w-full mb-6",
                isMobile ? "mb-4" : "mb-6"
              )}
              style={{ minHeight: '360px' }}
            >
              <OmniScoreQuadrantBoard projects={projects} title="OmniScore Quadrant" />
            </div>
          );
        }

        // Fallback to TradingView charts
        return (
          <div key={index} className={cn("mb-6", isMobile ? "mb-4" : "mb-6")}>
            <TradingViewChatChart
              symbol={chart.symbol || "BTCUSD"}
              interval={(chart.interval || "1H") as TradingViewInterval}
              isMobile={isMobile}
            />
          </div>
        );
      } catch (error) {
        console.error(`📊 ChatInterface: Error rendering chart ${index}:`, error);
        return (
          <div key={`error-${index}`} className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">Error rendering chart: {error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        );
      }
    });
  };

  // Load conversation history when conversationId changes
  useEffect(() => {
    if (currentConversationId) {
      apiClient.getConversationHistory(currentConversationId)
        .then((response) => {
          if (response.success) {
            const loadedMessages: Message[] = response.data.conversation.messages.map(msg => ({
              id: msg.id,
              type: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content,
              sources: msg.sources,
              charts: msg.charts as ChatChart[] | undefined,
              timestamp: new Date(msg.createdAt).getTime(),
              isRead: true,
            }));
            setMessages(loadedMessages);
          }
        })
        .catch((error) => {
          console.error('Failed to load conversation history:', error);
        });
    }
  }, [currentConversationId]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setAttachedFiles([]);
    setIsLoading(true);
    
    // Increment user message count
    const newCount = userMessageCount + 1;
    setUserMessageCount(newCount);
    localStorage.setItem('user_message_count', newCount.toString());

    try {
      // Debug: Log what we're trying to do
      console.log('🔍 Sending message to backend...');
      console.log('📍 Current URL:', window.location.href);
      
      // Call the real API
      const apiResponse = await apiClient.sendChatMessage({
        message: userMessage.content,
        conversationId: currentConversationId || undefined,
        agentId: activeAgent?.id,
        context: {
          includeSources: true,
          includeCharts: true,
          analysisDepth: 'standard',
        },
      });
      
      console.log('✅ Response received:', apiResponse);

      // Update conversation ID if it's a new conversation
      if (apiResponse.data.conversationId !== currentConversationId) {
        setCurrentConversationId(apiResponse.data.conversationId);
      }

      // Convert backend response to frontend message format
      const charts = apiResponse.data.message.charts as ChatChart[] | undefined;
      console.log('📊 Charts received from backend:', charts);
      console.log('📊 Charts type:', typeof charts);
      console.log('📊 Charts is array:', Array.isArray(charts));
      console.log('📊 Charts length:', charts?.length);
      if (charts && charts.length > 0) {
        console.log('📊 First chart:', charts[0]);
        console.log('📊 First chart type:', charts[0]?.type);
        console.log('📊 First chart projects:', charts[0]?.projects);
      }
      
      const assistantMessage: Message = {
        id: apiResponse.data.message.id,
        type: "assistant",
        content: apiResponse.data.message.content,
        charts: charts,
        timestamp: new Date(apiResponse.data.message.createdAt).getTime(),
        isRead: true,
        sources: apiResponse.data.message.sources,
      };
      
      console.log('📊 Assistant message created with charts:', assistantMessage.charts);

      // Mark user message as read
      setMessages(prev => prev.map(m => 
        m.id === userMessage.id ? { ...m, isRead: true } : m
      ));

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat API error:', error);
      
      // Provide more helpful error messages
      let errorMessage = "Failed to generate response. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('Failed to connect') || error.message.includes('Failed to fetch')) {
          errorMessage = "Unable to connect to the backend API. Please check your connection or contact support.";
        } else if (error.message.includes('API URL not configured')) {
          errorMessage = "Backend API is not configured. Please check environment variables.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const regenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;

    const previousUserMessage = messages[messageIndex - 1];
    if (previousUserMessage.type !== 'user') return;

    setIsLoading(true);
    try {
      const response = await generateResponse(previousUserMessage.content);
      const chartRequest = detectChartRequest(previousUserMessage.content);
      const charts = chartRequest ? [chartRequest] : undefined;

      const newMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: response.text,
        charts,
        timestamp: Date.now(),
        isRead: true,
        sources: response.sources,
      };

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[messageIndex] = newMessage;
        return newMessages;
      });

      toast({
        title: "Response regenerated",
        description: "Generated a new response",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    toast({
      title: "Message deleted",
      description: "Message removed from conversation",
    });
  };

  const exportMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const text = `[${message.type === "user" ? "You" : "AI"}]\n${message.content}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message_${messageId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Message exported",
      description: "Message saved to file",
    });
  };


  return (
    <div className="coinet-terminal-bg flex h-full flex-col overflow-hidden">
      {/* Responsive centered layout */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden w-full relative",
        !isMobile && "max-w-6xl mx-auto"
      )}>
        {/* Subtle Agent Pill - Top Right (Only when agent active) */}
        {activeAgent && (
          <div className="absolute top-4 right-4 z-10 animate-fade-in">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full border-border/70 bg-surface/90 px-3 font-mono text-[11px] uppercase tracking-[0.14em] shadow-glow backdrop-blur-sm transition-all duration-200 hover:bg-accent/50"
                  >
                    <div 
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: activeAgent.color }}
                    />
                    <span className="text-xs font-medium">{activeAgent.name}</span>
                    <Bot className="w-3 h-3 ml-1.5 opacity-60" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="font-medium mb-1">{activeAgent.name}</p>
                  <p className="text-xs text-muted-foreground">{activeAgent.description}</p>
                  {activeAgent.expertise && activeAgent.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activeAgent.expertise.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {activeAgent.expertise.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{activeAgent.expertise.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Container */}
          <ScrollArea className="flex-1">
            {messages.length === 0 && (
              <div className="px-4 py-10 sm:px-6 lg:py-14">
                <div className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
                  <div className="space-y-8">
                    <div className="space-y-5">
                      <CoinetMark showWordmark size="lg" />
                      <SystemLabel>Market Intelligence Terminal</SystemLabel>
                      <div className="space-y-4">
                        <h1 className="coinet-display max-w-4xl text-5xl font-semibold leading-[0.94] sm:text-6xl lg:text-7xl">
                          {activeAgent ? activeAgent.name : "Crypto Judgment AI"}
                        </h1>
                        <p className="coinet-body-copy max-w-2xl text-base sm:text-lg">
                          {activeAgent
                            ? activeAgent.personality
                            : "Coinet turns fragmented crypto data into ranked market judgment, showing what is happening, why it matters, what contradicts it, and how much confidence it deserves."}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {terminalPrompts.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => setInputValue(item.prompt)}
                          className="group coinet-panel-subtle p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-brand"
                        >
                          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                            {item.label}
                          </div>
                          <div className="mt-3 text-sm font-medium text-foreground">{item.title}</div>
                          <div className="mt-4 coinet-signal-line opacity-40 transition-opacity group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <JudgmentCard rows={sampleJudgmentRows} />
                    <div className="grid gap-4 sm:grid-cols-[1fr_0.78fr]">
                      <SignalStackCard signals={sampleSignals} />
                      <div className="grid gap-4">
                        <ConfidenceMeter
                          value={74}
                          description="High conviction, but dependent on liquidity support holding."
                        />
                        <ContradictionCard>
                          Bullish structure remains valid, but leverage is becoming crowded. A flush becomes more likely before continuation.
                        </ContradictionCard>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={cn(
              "py-4 space-y-6",
              isMobile ? "px-3 space-y-4" : "px-6 md:space-y-12"
            )}>
              {messages.map((message) => (
                <div key={message.id} className="group relative">
                  <div className={cn(
                    "flex",
                    message.type === 'user' ? 'justify-end' : 'justify-start',
                    isMobile ? "gap-3 max-w-full" : "gap-6 max-w-5xl mx-auto"
                  )}>
                    {message.type === 'assistant' && (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 shadow-glow md:h-10 md:w-10">
                        <Bot className="h-4 w-4 text-primary md:h-5 md:w-5" />
                      </div>
                    )}
                    
                     <div className={`max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] ${message.type === 'user' ? 'order-first' : ''}`}>
                       {/* Charts rendered OUTSIDE the message bubble for better visibility */}
                       {message.charts && message.charts.length > 0 && message.type === 'assistant' && (
                         <div className="w-full mb-4">
                           {renderChatCharts(message.charts)}
                         </div>
                       )}
                       
                       <div className={`rounded-2xl px-4 py-3 md:px-6 md:py-4 ${
                         message.type === 'user'
                           ? 'bg-primary text-primary-foreground shadow-brand'
                           : 'border border-border/70 bg-surface/70 text-foreground shadow-glow backdrop-blur-sm'
                       }`}>
                         {/* Text explanation */}
                         {message.content && (
                           <div className="prose prose-sm max-w-none">
                             <p className="whitespace-pre-wrap m-0 leading-relaxed text-sm md:text-base">{message.content}</p>
                           </div>
                         )}
                       </div>
                      
                       {/* Message actions - appear on hover like ChatGPT */}
                       <div className={`mt-3 ${
                         message.type === 'user' ? 'flex justify-end' : 'flex justify-start'
                       }`}>
                         <MessageActions
                           messageId={message.id}
                           messageContent={message.content}
                           messageType={message.type}
                           timestamp={message.timestamp}
                           isRead={message.isRead}
                           onCopy={copyMessage}
                           onRegenerate={message.type === 'assistant' ? () => regenerateMessage(message.id) : undefined}
                           onExport={exportMessage}
                           onDelete={deleteMessage}
                         />
                       </div>
                       
                       {/* Source Citation */}
                       {message.type === 'assistant' && message.sources && (
                         <SourceCitation
                           sources={message.sources}
                           messageId={message.id}
                           onOpenSources={() => setSourcesPanel({
                             open: true,
                             messageId: message.id,
                             sources: message.sources || []
                           })}
                         />
                       )}
                     </div>
                    
                    {message.type === 'user' && (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted/80">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Enhanced loading state with typing indicator */}
              {isLoading && (
                <div className="animate-fade-in">
                  <TypingIndicator variant="dots" size="md" />
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </ScrollArea>
          
          {/* Judgment terminal input area */}
          <div className="sticky bottom-0 border-t border-border/60 bg-[#030712]/82 backdrop-blur-xl md:relative">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
              <div className="relative">
                {/* Attached Files Preview */}
                {attachedFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{file.name}</span>
                        <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 rounded-full hover:bg-destructive/20"
                          onClick={() => removeFile(index)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative group">
                  {/* Gradient Glow Effect on Focus */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-[#7B61FF]/10 blur-xl opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 sm:rounded-3xl" />
                  
                  <div className={cn(
                    "relative flex min-h-[64px] items-center gap-2 rounded-2xl border p-4 shadow-glow transition-all duration-300 sm:rounded-3xl",
                    inputValue.trim() || isFocused
                      ? "border-primary/70 bg-surface/90 ring-1 ring-primary/50 shadow-brand"
                      : "border-border/70 bg-surface/70 hover:border-primary/40"
                  )}>
                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Attachment Button - Always Visible */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="mobile-tap-target h-10 w-10 shrink-0 rounded-full hover:bg-muted/70"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isLoading}
                          aria-label="Attach file"
                        >
                          <Paperclip className="w-5 h-5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Attach files</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Voice Input Button - Always Visible */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="mobile-tap-target h-10 w-10 shrink-0 rounded-full hover:bg-muted/70"
                          disabled={isLoading}
                          aria-label="Voice input"
                        >
                          <Mic className="w-5 h-5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Voice input</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Large, Inviting Text Input */}
                  <div className="flex-1 relative min-h-[48px] flex items-center">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder={
                        activeAgent 
                          ? `Ask ${activeAgent.name} anything...` 
                          : "Ask Coinet to run judgment..."
                      }
                      autoResize
                      minHeight={48}
                      maxHeight={160}
                      className="min-h-[48px] max-h-[160px] w-full resize-none border-0 bg-transparent px-0 py-0 text-base leading-7 placeholder:text-muted-foreground/55 focus-visible:ring-0 focus-visible:ring-offset-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                  </div>

                  {/* Send Button - ChatGPT Style */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleSend}
                          disabled={!inputValue.trim() || isLoading}
                          size="sm"
                          className={cn(
                            "mobile-tap-target relative h-11 w-11 flex-shrink-0 rounded-full p-0 transition-all duration-200",
                            !inputValue.trim() || isLoading
                              ? "cursor-not-allowed bg-muted/60 text-muted-foreground opacity-50"
                              : "bg-primary text-primary-foreground shadow-brand hover:bg-brand-primary-light active:scale-90"
                          )}
                          aria-label="Send message"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p>Send (Enter)</p>
                        <p className="text-muted-foreground">Shift+Enter for newline</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  </div>
                </div>
              </div>

              <p className="mt-3 hidden text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50 sm:mt-4 sm:block">
                Judgment is structured conviction, not certainty. Verify important market decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sources Panel */}
      <SourcesPanel
        open={sourcesPanel.open}
        onOpenChange={(open) => setSourcesPanel(prev => ({ ...prev, open }))}
        sources={sourcesPanel.sources}
      />
    </div>
  );
}