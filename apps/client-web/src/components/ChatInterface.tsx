import { useState, useRef, useEffect } from "react";
import { Copy, MoreHorizontal, RotateCcw, Settings, TrendingUp, Search, Target } from "lucide-react";
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
import { OmniScoreQuadrantBoard, QuadrantProject } from "@/components/OmniScoreQuadrantBoard";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  charts?: any[];
  timestamp: number;
  isRead?: boolean;
  sources?: Source[];
  userFeedback?: 'positive' | 'negative' | null;
}

interface ChatInterfaceProps {
  activeAgent?: CustomAgent | null;
  conversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
}

export function ChatInterface({ activeAgent, conversationId, onConversationChange }: ChatInterfaceProps) {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Use prop conversationId if provided, otherwise manage internally
  const currentConversationId = conversationId ?? null;
  const setCurrentConversationId = (id: string | null) => {
    onConversationChange?.(id);
  };
  
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

  const renderChatCharts = (charts: any[]) => {
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
          
          const projects: QuadrantProject[] = chart.projects.map((p: any) => ({
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
              interval={(chart.interval || "1H") as any}
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
      // Load existing conversation
      apiClient.getConversationHistory(currentConversationId)
        .then((response) => {
          if (response.success) {
            const loadedMessages: Message[] = response.data.conversation.messages.map(msg => ({
              id: msg.id,
              type: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content,
              sources: msg.sources,
              charts: msg.charts as any[] | undefined,
              timestamp: new Date(msg.createdAt).getTime(),
              isRead: true,
            }));
            setMessages(loadedMessages);
          }
        })
        .catch((error) => {
          console.error('Failed to load conversation history:', error);
        });
    } else {
      // New chat - clear messages
      setMessages([]);
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
      const charts = apiResponse.data.message.charts as any[] | undefined;
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
      
      // Handle authentication errors
      if (error instanceof Error && (
        error.message.includes('Please log in') || 
        error.message.includes('AUTH_MISSING_TOKEN') ||
        error.message.includes('AUTH_INVALID_TOKEN') ||
        error.message.includes('AUTH_EXPIRED_TOKEN')
      )) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue.",
          variant: "destructive",
        });
        // Redirect to login page
        window.location.href = '/auth';
        return;
      }
      
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

  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    try {
      // Update local state immediately for responsiveness
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, userFeedback: feedback }
            : msg
        )
      );

      // Submit feedback to backend
      await apiClient.submitFeedback({
        messageId,
        type: feedback === 'positive' ? 'THUMBS_UP' : 'THUMBS_DOWN',
      });

      toast({
        title: feedback === 'positive' ? "Thanks!" : "Feedback noted",
        description: feedback === 'positive' 
          ? "Glad this helped." 
          : "We'll use this to improve.",
      });
    } catch (error) {
      console.error('Failed to submit feedback', error);
      // Revert on error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, userFeedback: null }
            : msg
        )
      );
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Responsive centered layout */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden w-full relative",
        !isMobile && "max-w-4xl mx-auto"
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
                    className="h-8 px-3 rounded-full bg-background/95 backdrop-blur-sm border-border/50 hover:bg-accent/50 transition-all duration-200 shadow-sm"
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
              <div className="flex flex-col items-center justify-center py-16 px-4">
                {/* Primary Heading */}
                <div className="text-center mb-12">
                  <h1 className="text-5xl font-bold text-foreground mb-4 animate-fade-in">
                    {activeAgent ? `${activeAgent.name}` : 'What can I analyze for you?'}
                  </h1>
                  
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {activeAgent 
                      ? activeAgent.personality
                      : 'Get AI-powered market insights and trading intelligence'}
                  </p>
                </div>
                
                {/* 3 Visual Quick Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
                  <button
                    onClick={() => setInputValue("Show me the current market overview")}
                    className="group p-8 rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card to-card/50 hover:from-accent/50 hover:to-accent/30 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📊</div>
                    <h3 className="text-lg font-semibold text-foreground">Market Overview</h3>
                  </button>
                  
                  <button
                    onClick={() => setInputValue("Create an alert for Bitcoin")}
                    className="group p-8 rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card to-card/50 hover:from-accent/50 hover:to-accent/30 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎯</div>
                    <h3 className="text-lg font-semibold text-foreground">Create Alert</h3>
                  </button>
                  
                  <button
                    onClick={() => setInputValue("Build a custom trading agent")}
                    className="group p-8 rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card to-card/50 hover:from-accent/50 hover:to-accent/30 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🤖</div>
                    <h3 className="text-lg font-semibold text-foreground">Custom Agent</h3>
                  </button>
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
                     <div className={`max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] ${message.type === 'user' ? 'order-first' : ''}`}>
                       {/* Charts rendered OUTSIDE the message bubble for better visibility */}
                       {message.charts && message.charts.length > 0 && message.type === 'assistant' && (
                         <div className="w-full mb-4">
                           {renderChatCharts(message.charts)}
                         </div>
                       )}
                       
                       <div className={`rounded-2xl md:rounded-3xl px-4 md:px-6 py-3 md:py-4 ${
                         message.type === 'user'
                           ? 'bg-primary text-primary-foreground shadow-sm'
                           : 'bg-background/80 backdrop-blur-sm border border-border/50 text-foreground shadow-sm'
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
                           userFeedback={message.userFeedback}
                           onCopy={copyMessage}
                           onRegenerate={message.type === 'assistant' ? () => regenerateMessage(message.id) : undefined}
                           onExport={exportMessage}
                           onDelete={deleteMessage}
                           onFeedback={message.type === 'assistant' ? handleFeedback : undefined}
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
          
          {/* ChatGPT-style floating input area */}
          <div className="border-t border-border/50 bg-background/50 backdrop-blur-sm sticky bottom-0 md:relative">
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
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl sm:rounded-3xl blur-xl opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
                  
                  <div className={cn(
                    "relative flex items-center gap-2 bg-background/20 border-2 rounded-2xl sm:rounded-3xl p-4 min-h-[64px] shadow-lg transition-all duration-300",
                    inputValue.trim() || isFocused
                      ? "ring-2 ring-blue-500/60 ring-offset-2 ring-offset-background border-transparent shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                      : "border-border/30 hover:border-border/50"
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
                          className="shrink-0 h-10 w-10 rounded-full hover:bg-muted/70 mobile-tap-target transition-colors"
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
                          className="shrink-0 h-10 w-10 rounded-full hover:bg-muted/70 mobile-tap-target transition-colors"
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
                          : "What would you like to analyze?"
                      }
                      autoResize
                      minHeight={48}
                      maxHeight={160}
                      className="min-h-[48px] max-h-[160px] resize-none border-0 bg-transparent px-0 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base leading-7 placeholder:text-muted-foreground/50 w-full"
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
                            "h-11 w-11 p-0 rounded-full flex-shrink-0 transition-all duration-200 relative mobile-tap-target",
                            !inputValue.trim() || isLoading
                              ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-40"
                              : "bg-white text-black hover:bg-zinc-100 active:scale-90 shadow-lg hover:shadow-xl"
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

              <p className="text-xs text-muted-foreground/30 mt-3 sm:mt-4 text-center hidden sm:block">
                {activeAgent ? `${activeAgent.name} AI` : 'Coinet AI'} can make mistakes. Consider checking important information.
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