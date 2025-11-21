import { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from './drawer';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';
import { X } from 'lucide-react';
import { Button } from './button';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
  showHandle?: boolean;
  snapPoints?: number[];
  dismissible?: boolean;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  footer,
  className,
  showHandle = true,
  snapPoints,
  dismissible = true,
}: BottomSheetProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      triggerHaptic('light');
    }
    onOpenChange(newOpen);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      snapPoints={snapPoints}
      dismissible={dismissible}
    >
      <DrawerContent className={cn('max-h-[90vh]', className)}>
        {showHandle && (
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-4" />
        )}
        
        {(title || description) && (
          <DrawerHeader className="text-left">
            <div className="flex items-start justify-between">
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {dismissible && (
                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => triggerHaptic('light')}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DrawerClose>
              )}
            </div>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
        )}

        <div className="flex-1 overflow-y-auto px-4">
          {children}
        </div>

        {footer && (
          <DrawerFooter className="pt-4">
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

interface BottomSheetActionProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function BottomSheetAction({
  icon,
  label,
  description,
  onClick,
  destructive = false,
  disabled = false,
}: BottomSheetActionProps) {
  const handleClick = () => {
    triggerHaptic('light');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-lg transition-colors',
        'hover:bg-accent active:bg-accent/80',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        destructive && 'text-destructive hover:bg-destructive/10 active:bg-destructive/20'
      )}
    >
      {icon && (
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1 text-left">
        <div className="font-medium">{label}</div>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
    </button>
  );
}
