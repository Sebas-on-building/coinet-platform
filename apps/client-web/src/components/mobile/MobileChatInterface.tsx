import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bot, Mic, Send, MoreVertical, MessageSquare, Volume2, Sparkles, Plus } from 'lucide-react';
import { SoundWaveIcon } from './SoundWaveIcon';
import { toast } from '@/hooks/use-toast';
import { MessageActions, CompactMessageActions } from '@/components/ui/message-actions';
import { ConversationExport } from '@/components/ui/conversation-export';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { useLongPress } from '@/hooks/useLongPress';
import { triggerHaptic } from '@/utils/haptics';
import { TradingViewChatChart } from '@/components/charts/TradingViewChatChart';
import { OmniScoreQuadrantBoard, QuadrantProject } from '@/components/OmniScoreQuadrantBoard';
import { SourceCitation, Source } from '@/components/SourceCitation';
import { SourcesPanel } from '@/components/SourcesPanel';
import { apiClient } from '@/services/api-client';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

const suggestedPrompts = [
  {
    title: "Analyze Bitcoin Trends",
    subtitle: "Get insights on Bitcoin price movements",
    prompt: "Can you analyze the current Bitcoin trends and provide insights on price movements?"
  },
  {
    title: "Market Opportunities",
    subtitle: "Find trading opportunities in crypto",
    prompt: "What are the best trading opportunities in the cryptocurrency market right now?"
  },
  {
    title: "Risk Assessment",
    subtitle: "Evaluate portfolio risk levels",
    prompt: "Help me assess the risk levels of my current cryptocurrency portfolio"
  },
  {
    title: "Technical Analysis",
    subtitle: "Chart patterns and indicators",
    prompt: "Provide technical analysis for the top cryptocurrencies using chart patterns"
  }
];

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  timestampMs: number;
  isRead?: boolean;
  charts?: any[];
  sources?: Source[];
}

interface MobileChatInterfaceProps {
  className?: string;
}

export function MobileChatInterface({ className }: MobileChatInterfaceProps) {
  // Sync Clerk auth with API client
  useAuthenticatedApi();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
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

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Track visual viewport changes for smooth keyboard handling
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let rafId: number | null = null;

    const updateKeyboardOffset = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        setKeyboardOffset(covered);
      });
    };

    updateKeyboardOffset();
    vv.addEventListener('resize', updateKeyboardOffset);
    vv.addEventListener('scroll', updateKeyboardOffset);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      vv.removeEventListener('resize', updateKeyboardOffset);
      vv.removeEventListener('scroll', updateKeyboardOffset);
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive (but not when user is typing)
  useEffect(() => {
    if (scrollAreaRef.current && !isFocused) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping, isFocused]);

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

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

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isTyping) return; // Prevent duplicate submissions

    triggerHaptic('light');
    const now = Date.now();
    const newMessage: Message = {
      id: now.toString(),
      type: 'user',
      content: text,
      timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampMs: now,
      isRead: false
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Call the real backend API
      const apiResponse = await apiClient.sendChatMessage({
        message: text,
        conversationId: undefined,
        agentId: undefined,
        context: {
          includeSources: true,
          includeCharts: true,
          analysisDepth: 'standard',
        },
      });

      // Convert backend response to frontend message format
      const charts = apiResponse.data.message.charts as any[] | undefined;
      console.log('📊 Mobile: Charts received from backend:', charts);
      console.log('📊 Mobile: Chart types:', charts?.map(c => c?.type));
      
      const assistantMessage: Message = {
        id: apiResponse.data.message.id,
        type: 'assistant',
        content: apiResponse.data.message.content,
        charts: charts,
        timestamp: new Date(apiResponse.data.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestampMs: new Date(apiResponse.data.message.createdAt).getTime(),
        isRead: true,
        sources: apiResponse.data.message.sources,
      };

      // Mark user message as read
      setMessages(prev => prev.map(m => 
        m.id === newMessage.id ? { ...m, isRead: true } : m
      ));

      setMessages(prev => [...prev, assistantMessage]);
      triggerHaptic('success');
    } catch (error) {
      console.error('Chat API error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response. Please try again.",
        variant: "destructive",
      });
      triggerHaptic('error');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  const handleVoiceInput = () => {
    if (isRecording) {
      setIsRecording(false);
      toast({ title: "Recording stopped", description: "Voice message would be processed here." });
    } else {
      setIsRecording(true);
      toast({ title: "Recording started", description: "Speak your message now." });
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Message copied to clipboard." });
  };

  const regenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;

    const previousUserMessage = messages[messageIndex - 1];
    if (previousUserMessage.type !== 'user') return;

    setIsTyping(true);
    try {
      const apiResponse = await apiClient.sendChatMessage({
        message: previousUserMessage.content,
        conversationId: undefined,
        agentId: undefined,
        context: {
          includeSources: true,
          includeCharts: true,
          analysisDepth: 'standard',
        },
      });

      const charts = apiResponse.data.message.charts as any[] | undefined;
      const newMessage: Message = {
        id: apiResponse.data.message.id,
        type: 'assistant',
        content: apiResponse.data.message.content,
        charts: charts,
        timestamp: new Date(apiResponse.data.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestampMs: new Date(apiResponse.data.message.createdAt).getTime(),
        isRead: true,
        sources: apiResponse.data.message.sources,
      };

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[messageIndex] = newMessage;
        return newMessages;
      });

      toast({ title: "Response regenerated", description: "Generated a new response" });
    } catch (error) {
      console.error('Regenerate API error:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate response",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    toast({ title: "Message deleted", description: "Message removed from conversation" });
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

    toast({ title: "Message exported", description: "Message saved to file" });
  };

  const renderCharts = (charts: any[]) => {
    if (!charts || charts.length === 0) return null;
    
    console.log('📊 Mobile: Rendering charts:', charts);
    
    return (
      <div className="space-y-4 mb-4 -mx-2">
        {charts.map((chart, index) => {
          console.log(`📊 Mobile: Rendering chart ${index}:`, chart?.type, chart);
          
          if (chart?.type === 'omniscore-quadrant' && Array.isArray(chart.projects)) {
            console.log('📊 Mobile: Rendering OmniScore quadrant with projects:', chart.projects);
            const projects: QuadrantProject[] = chart.projects.map((p: any) => ({
              name: p.ticker || p.name || 'Project',
              ticker: p.ticker,
              qs: p.qs ?? 0,
              os: p.os ?? null,
              osStatus: p.os === null ? 'gated' : 'ok',
              pos: p.pos ?? 0,
              posAdj: p.posAdj ?? p.pos ?? 0,
              confidence: p.confidence,
              nmi: { tier: p.nmiTier },
            }));

            return (
              <div key={`omniscore-${index}`} className="mb-4 w-full overflow-x-auto -mx-2 px-2">
                <OmniScoreQuadrantBoard projects={projects} title="OmniScore Quadrant" />
              </div>
            );
          }

          // Fallback to TradingView chart
          if (chart?.symbol || chart?.type === 'tradingview') {
            return (
              <TradingViewChatChart
                key={`tradingview-${index}`}
                symbol={chart.symbol || 'BTCUSD'}
                interval={(chart.interval || '1H') as any}
                isMobile={true}
              />
            );
          }

          // Unknown chart type - log and skip
          console.warn('📊 Mobile: Unknown chart type:', chart);
          return null;
        })}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="flex flex-col gap-4 p-4 pb-24">
            {messages.length === 0 ? (
              /* Welcome State with Suggested Prompts */
              <div className="flex flex-col items-center justify-center h-full min-h-[30vh] space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto bg-accent rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-foreground" />
                  </div>
                  <h2 className="text-2xl font-medium text-foreground">
                    How can I help you today?
                  </h2>
                </div>
                
                <div className="w-full max-w-md space-y-3">
                  <div className="grid gap-2">
                    {suggestedPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedPrompt(prompt.prompt)}
                        className="group text-left p-4 rounded-xl border border-border bg-surface hover:bg-surface-secondary transition-all duration-200"
                      >
                        <div className="font-medium text-sm text-foreground">
                          {prompt.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {prompt.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Messages Display */
              <>
                {messages.map((message) => (
                  <div key={message.id} className={cn(
                    "flex gap-3 max-w-full",
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}>
                    {/* Avatar */}
                    <div className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                      message.type === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-accent text-foreground"
                    )}>
                      {message.type === 'user' ? 'You' : 'AI'}
                    </div>
                    
                     {/* Message Content */}
                    <div className={cn(
                      "flex-1 min-w-0 space-y-2",
                      message.type === 'user' ? 'text-right' : 'text-left'
                    )}>
                      <div className={cn(
                        "inline-block p-3 sm:p-4 rounded-2xl break-words",
                        message.type === 'user'
                          ? "bg-primary text-primary-foreground ml-auto max-w-[85%]"
                          : "bg-surface text-foreground border border-border max-w-[95%] sm:max-w-[85%]"
                      )}>
                        {/* Charts first for assistant messages */}
                        {message.type === 'assistant' && message.charts && message.charts.length > 0 && (
                          <div className="mb-3 -mx-1 sm:-mx-2">
                            {renderCharts(message.charts)}
                          </div>
                        )}
                        
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      
                      {/* Mobile Message Actions */}
                      <div className={cn(
                        "flex items-center gap-2 mt-2",
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      )}>
                        <MessageActions
                          messageId={message.id}
                          messageContent={message.content}
                          messageType={message.type}
                          timestamp={message.timestampMs}
                          isRead={message.isRead}
                          onCopy={copyMessage}
                          onRegenerate={message.type === 'assistant' ? () => regenerateMessage(message.id) : undefined}
                          onExport={exportMessage}
                          onDelete={deleteMessage}
                          className="scale-90"
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
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="animate-fade-in">
                    <TypingIndicator variant="dots" size="sm" showAvatar={false} />
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Simplified Chat Bar - Smooth Keyboard Handling */}
      <div 
        ref={composerRef}
        className="fixed left-0 right-0 bg-card border-t border-border z-50"
        style={{ 
          bottom: 0,
          paddingBottom: '8px',
          paddingTop: '8px',
          paddingLeft: '12px',
          paddingRight: '12px',
          transform: `translate3d(0, ${-keyboardOffset}px, 0)`,
          willChange: 'transform',
          transition: 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        <div className="flex items-end gap-2">
          {/* Plus Button */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                onClick={() => triggerHaptic('light')}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[300px] pb-8">
              <SheetHeader className="text-center pb-4">
                <SheetTitle className="text-lg font-semibold">Add Attachment</SheetTitle>
              </SheetHeader>
              <div className="space-y-2 px-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-14 px-4 hover:bg-muted/50"
                  onClick={() => toast({ title: "Photo", description: "Photo picker would open here." })}
                >
                  <div className="text-left">
                    <div className="font-medium text-foreground">📷 Photo</div>
                    <div className="text-sm text-muted-foreground">Upload an image</div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-14 px-4 hover:bg-muted/50"
                  onClick={() => toast({ title: "Document", description: "Document picker would open here." })}
                >
                  <div className="text-left">
                    <div className="font-medium text-foreground">📄 Document</div>
                    <div className="text-sm text-muted-foreground">Upload a file</div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-14 px-4 hover:bg-muted/50"
                  onClick={() => toast({ title: "Chart", description: "Chart selector would open here." })}
                >
                  <div className="text-left">
                    <div className="font-medium text-foreground">📊 Chart</div>
                    <div className="text-sm text-muted-foreground">Add market data</div>
                  </div>
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Input Area */}
          <div className="flex-1 relative min-h-[36px]">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask anything"
              autoResize
              minHeight={36}
              maxHeight={100}
              className={cn(
                "min-h-[36px] max-h-[100px] resize-none px-3 py-2 bg-muted text-foreground text-[15px] placeholder:text-muted-foreground rounded-[20px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                inputValue.trim() ? "pr-10" : "pr-3"
              )}
              disabled={isTyping}
            />
            
            {/* Send Button */}
            {inputValue.trim() && (
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  handleSendMessage();
                }}
                disabled={isTyping}
                className="absolute right-1 bottom-1 w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mic Button */}
          {!inputValue.trim() && (
            <button
              onClick={() => {
                triggerHaptic('light');
                handleVoiceInput();
              }}
              className={cn(
                "flex-shrink-0 w-9 h-9 rounded-full transition-colors flex items-center justify-center",
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Mic className="w-4 h-4" />
              {isRecording && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-background border border-red-500 rounded-full text-[9px] font-semibold text-red-500 flex items-center justify-center">
                  {recordingTime}
                </span>
              )}
            </button>
          )}

          {/* Options Button */}
          <Sheet open={showChatOptions} onOpenChange={setShowChatOptions}>
            <SheetTrigger asChild>
              <button
                onClick={() => triggerHaptic('light')}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center"
              >
                <SoundWaveIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[450px] pb-8">
              <SheetHeader className="text-center pb-4">
                <SheetTitle className="text-lg font-semibold">Chat Options</SheetTitle>
              </SheetHeader>
              
              <ScrollArea className="h-full">
                <div className="space-y-6 px-1">
                  {/* Chat Management */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Chat Management
                    </h4>
                    
                    {/* Export Conversation */}
                    {messages.length > 0 && (
                      <div className="w-full">
                        <ConversationExport 
                          messages={messages.map(m => ({
                            id: m.id,
                            type: m.type,
                            content: m.content,
                            timestamp: m.timestampMs
                          }))}
                          conversationTitle="Coinet AI Mobile Chat"
                        />
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-14 px-4 hover:bg-muted/50"
                      onClick={() => {
                        setMessages([]);
                        setShowChatOptions(false);
                        toast({ title: "Chat cleared", description: "All messages have been cleared." });
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mr-4">
                        <MessageSquare className="w-5 h-5 text-destructive" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-foreground">Clear Chat</div>
                        <div className="text-sm text-muted-foreground">Remove all messages</div>
                      </div>
                    </Button>
                  </div>
                    
                  {/* Audio & Voice */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Audio & Voice
                    </h4>
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-14 px-4 hover:bg-muted/50"
                      onClick={() => {
                        setShowChatOptions(false);
                        toast({ title: "Voice settings", description: "Voice settings would open here." });
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mr-4">
                        <Volume2 className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-foreground">Voice Settings</div>
                        <div className="text-sm text-muted-foreground">Configure voice input</div>
                      </div>
                    </Button>
                  </div>

                  {/* App Settings */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      App Settings  
                    </h4>
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-14 px-4 hover:bg-muted/50"
                      onClick={() => {
                        setShowChatOptions(false);
                        toast({ title: "Settings", description: "App settings would open here." });
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mr-4">
                        <Sparkles className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-foreground">Preferences</div>
                        <div className="text-sm text-muted-foreground">Customize your experience</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
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