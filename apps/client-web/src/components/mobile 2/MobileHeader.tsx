import { MobileNavigation } from './MobileNavigation';
import coinetLogo from '@/assets/coinet-logo.png';

interface MobileHeaderProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
  title?: string;
}

export function MobileHeader({ activeItem, onItemClick, title = "Coinet AI" }: MobileHeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-40 w-full bg-surface border-b border-border safe-area-top">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Left - Hamburger Menu */}
        <div data-mobile-menu-trigger>
          <MobileNavigation 
            activeItem={activeItem} 
            onItemClick={onItemClick}
          />
        </div>
        
        {/* Center - Logo */}
        <img 
          src={coinetLogo} 
          alt="Coinet" 
          className="h-10 object-contain"
        />
        
        {/* Right - Empty space for balance */}
        <div className="w-9 h-9" />
      </div>
    </header>
  );
}