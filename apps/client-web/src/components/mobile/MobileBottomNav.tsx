import { MessageSquare, Bot, Bell, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';

interface MobileBottomNavProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
}

const navItems = [
  { id: 'chat', label: 'Judgment', icon: MessageSquare },
  { id: 'agents', label: 'Modules', icon: Bot },
  { id: 'alerts', label: 'Monitors', icon: Bell },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

export function MobileBottomNav({ activeItem, onItemClick }: MobileBottomNavProps) {
  const handleItemClick = (itemId: string) => {
    triggerHaptic('light');
    onItemClick(itemId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-[#030712]/90 pb-safe shadow-glow backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = activeItem === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-[60px]",
                "transition-all duration-200 ease-smooth rounded-lg",
                "active:scale-95",
                isActive && "scale-105"
              )}
            >
              <div className={cn(
                "relative transition-all duration-200",
                isActive && "drop-shadow-[0_0_10px_hsl(var(--primary)/0.65)]"
              )}>
                <Icon 
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive ? "currentColor" : "none"}
                />
              </div>
              <span 
                className={cn(
                  "font-mono text-[9px] font-semibold uppercase tracking-[0.12em] transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
