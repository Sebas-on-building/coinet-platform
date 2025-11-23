import { ReactNode, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreSheet } from './MobileMoreSheet';
import { PageTransition } from '@/components/ui/page-transition';

interface MobileLayoutProps {
  children: ReactNode;
  activeItem: string;
  onItemClick: (itemId: string) => void;
  className?: string;
}

export function MobileLayout({ 
  children, 
  activeItem, 
  onItemClick, 
  className = ''
}: MobileLayoutProps) {
  const isMobile = useIsMobile();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  if (!isMobile) {
    return <>{children}</>;
  }

  const handleItemClick = (itemId: string) => {
    if (itemId === 'more') {
      setShowMoreSheet(true);
    } else {
      onItemClick(itemId);
    }
  };

  const handleNavigateFromMore = (section: string) => {
    onItemClick(section);
  };

  return (
    <div className={`flex flex-col h-screen w-full max-w-screen bg-background overflow-x-hidden ${className}`}>
      {/* Content area with proper padding for bottom nav */}
      <main className="flex-1 overflow-hidden pb-16 pt-safe">
        <div className="h-full overflow-y-auto overflow-x-hidden touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
          <PageTransition key={activeItem} variant="fade" duration="fast">
            {children}
          </PageTransition>
        </div>
      </main>
      
      {/* Persistent bottom navigation */}
      <MobileBottomNav 
        activeItem={activeItem} 
        onItemClick={handleItemClick}
      />

      {/* More sheet */}
      <MobileMoreSheet
        open={showMoreSheet}
        onOpenChange={setShowMoreSheet}
        onNavigate={handleNavigateFromMore}
      />
    </div>
  );
}