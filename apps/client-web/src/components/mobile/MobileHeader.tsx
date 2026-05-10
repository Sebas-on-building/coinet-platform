import { MobileNavigation } from './MobileNavigation';
import { CoinetMark } from '@/components/coinet/TerminalPrimitives';

interface MobileHeaderProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
  title?: string;
}

export function MobileHeader({ activeItem, onItemClick, title = "Coinet AI" }: MobileHeaderProps) {
  return (
    <header className="safe-area-top sticky top-0 z-40 w-full border-b border-border/70 bg-[#030712]/90 backdrop-blur-xl lg:hidden">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Left - Hamburger Menu */}
        <div data-mobile-menu-trigger>
          <MobileNavigation 
            activeItem={activeItem} 
            onItemClick={onItemClick}
          />
        </div>
        
        {/* Center - Logo */}
        <CoinetMark showWordmark size="sm" />
        
        {/* Right - Empty space for balance */}
        <div className="w-9 h-9" />
      </div>
    </header>
  );
}