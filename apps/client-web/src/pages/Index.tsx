import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileChatInterface } from "@/components/mobile/MobileChatInterface";
import { CustomAgent } from "@/types/agents";
import { useCustomAgents } from "@/hooks/useCustomAgents";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertNotificationCenter } from "@/components/AlertNotificationCenter";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useKeyboardAccessibility } from "@/hooks/useAccessibility";
import { PageTransition } from "@/components/ui/page-transition";
import { EnhancedKeyboardShortcuts } from "@/components/navigation";
import { LazyLoadWrapper, LazyPageWrapper } from "@/components/ui/lazy-load-wrapper";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { SkipNav } from "@/components/ui/skip-nav";
import { CardSkeleton, ListSkeleton, DashboardSkeleton } from "@/components/ui/loading-skeleton";


// Lazy load heavy components for better performance
const Settings = lazy(() => import("@/components/Settings").then(module => ({ default: module.Settings })));
const RecentBriefs = lazy(() => import("@/components/RecentBriefs").then(module => ({ default: module.RecentBriefs })));
const AgentManager = lazy(() => import("@/components/AgentManager").then(module => ({ default: module.AgentManager })));
const AgentBuilder = lazy(() => import("@/components/AgentBuilder").then(module => ({ default: module.AgentBuilder })));
const AlertManager = lazy(() => import("@/components/AlertManager").then(module => ({ default: module.AlertManager })));
const UserProfile = lazy(() => import("@/components/UserProfile").then(module => ({ default: module.UserProfile })));

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState("chat");
  const [showAgentBuilder, setShowAgentBuilder] = useState(false);
  const [builderStartsWithNL, setBuilderStartsWithNL] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { activeAgent, setActiveAgent } = useCustomAgents();
  
  // Conversation management
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Enable keyboard accessibility and shortcuts
  useKeyboardAccessibility();
  useGlobalShortcuts({
    onOpenSettings: () => setActiveSection("settings"),
    onOpenCommandPalette: () => setShowKeyboardShortcuts(true),
    onEscape: () => {
      if (showAgentBuilder) handleCloseBuilder();
      if (showKeyboardShortcuts) setShowKeyboardShortcuts(false);
    },
  });

  // Handle navigation state from other pages and reset activeSection when navigating back to root page
  useEffect(() => {
    if (location.pathname === "/" && location.state?.activeSection) {
      setActiveSection(location.state.activeSection);
      // Clear the state to prevent issues on future navigations
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.pathname === "/") {
      setActiveSection("chat");
    }
  }, [location.pathname, location.state, navigate]);

  const handleCreateAgent = (startWithNaturalLanguage = false) => {
    setEditingAgent(null);
    setBuilderStartsWithNL(startWithNaturalLanguage);
    setShowAgentBuilder(true);
  };

  const handleCreateNLAgent = () => {
    handleCreateAgent(true);
  };

  const handleEditAgent = (agent: CustomAgent) => {
    setEditingAgent(agent);
    setBuilderStartsWithNL(false);
    setShowAgentBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowAgentBuilder(false);
    setBuilderStartsWithNL(false);
    setEditingAgent(null);
  };

  const handleSectionChange = (itemId: string) => {
    console.log('[Navigation] Switching to section:', itemId); // Debug log
    
    // Handle 'more' section on mobile - don't change activeSection, just show sheet
    if (itemId === 'more' && isMobile) {
      return; // The sheet is handled by MobileLayout
    }
    
    setActiveSection(itemId);
    
    // Close any open modals when switching sections on mobile
    if (isMobile && showAgentBuilder) {
      handleCloseBuilder();
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "settings":
        return (
          <PageTransition key="settings">
            <Suspense fallback={<div className="p-8"><CardSkeleton /></div>}>
              <LazyPageWrapper>
                <Settings />
              </LazyPageWrapper>
            </Suspense>
          </PageTransition>
        );
      case "recent-chats":
        return (
          <PageTransition key="recent-chats">
            <Suspense fallback={<div className="p-8"><ListSkeleton count={5} /></div>}>
              <LazyPageWrapper>
                <RecentBriefs />
              </LazyPageWrapper>
            </Suspense>
          </PageTransition>
        );
      case "agents":
        return (
          <PageTransition key="agents">
            <Suspense fallback={<div className="p-8"><DashboardSkeleton /></div>}>
              <LazyPageWrapper>
                <AgentManager 
                  onCreateAgent={handleCreateAgent}
                  onEditAgent={handleEditAgent}
                  onSelectAgent={(agent) => {
                    setActiveAgent(agent);
                    setActiveSection("chat");
                  }}
                />
              </LazyPageWrapper>
            </Suspense>
          </PageTransition>
        );
      case "alerts":
        return (
          <PageTransition key="alerts">
            <Suspense fallback={<div className="p-8"><ListSkeleton count={6} /></div>}>
              <LazyPageWrapper>
                <AlertManager />
              </LazyPageWrapper>
            </Suspense>
          </PageTransition>
        );
      case "profile":
        return (
          <PageTransition key="profile">
            <Suspense fallback={<div className="p-8"><CardSkeleton /></div>}>
              <LazyPageWrapper>
                <UserProfile />
              </LazyPageWrapper>
            </Suspense>
          </PageTransition>
        );
      case "chat":
      default:
        return (
          <PageTransition key="chat">
            <ErrorBoundary>
              {isMobile ? (
                <MobileChatInterface className="h-full" />
              ) : (
                <ChatInterface 
                  activeAgent={activeAgent} 
                  conversationId={selectedConversationId}
                  onConversationChange={setSelectedConversationId}
                />
              )}
            </ErrorBoundary>
          </PageTransition>
        );
    }
  };

  const getPageTitle = () => {
    switch (activeSection) {
      case "settings": return "Settings";
      case "recent-chats": return "Recent Chats";
      case "agents": return "Agents";
      case "alerts": return "Alerts";
      case "chat": 
      default: return "Coinet AI";
    }
  };

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <SkipNav contentId="main-content" />
        <MobileLayout 
          activeItem={activeSection}
          onItemClick={handleSectionChange}
        >
          <AlertNotificationCenter />
          
          <div id="main-content" tabIndex={-1}>
            {renderContent()}
          </div>
        
        {showAgentBuilder && (
          <div className="fixed inset-0 z-50">
            <AgentBuilder 
              onClose={handleCloseBuilder}
              editAgent={editingAgent}
            />
          </div>
        )}
        </MobileLayout>
        
        <EnhancedKeyboardShortcuts 
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      </>
    );
  }

  // Desktop layout
  return (
    <ErrorBoundary>
      <SkipNav contentId="main-content" />
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background font-sans">
          <nav id="main-navigation" tabIndex={-1}>
            <AppSidebar
              activeItem={activeSection}
              onItemClick={handleSectionChange}
              onNavigate={navigate}
              showNotifications={showNotifications}
              onToggleNotifications={() => setShowNotifications(!showNotifications)}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
            />
          </nav>
          
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
            <AlertNotificationCenter 
              showNotifications={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
            {renderContent()}
          </main>
          
        {showAgentBuilder && (
          <div className="fixed inset-0 z-50">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full bg-background/95 backdrop-blur-sm">
                <DashboardSkeleton />
              </div>
            }>
              <LazyLoadWrapper>
                <AgentBuilder 
                  onClose={handleCloseBuilder}
                  editAgent={editingAgent}
                />
              </LazyLoadWrapper>
            </Suspense>
          </div>
        )}
        </div>
      </SidebarProvider>
      
      <EnhancedKeyboardShortcuts 
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </ErrorBoundary>
  );
};

export default Index;