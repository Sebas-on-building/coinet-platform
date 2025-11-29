import { useState } from 'react';
import { 
  Settings, 
  Clock, 
  Bell, 
  HelpCircle, 
  MessageCircle,
  ChevronRight,
  User,
  LogOut
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { cn } from '@/lib/utils';

interface MobileMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: string) => void;
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  badge?: number;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

function MenuItem({ icon: Icon, label, description, badge, onClick, variant = 'default' }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-lg transition-colors text-left",
        variant === 'destructive' 
          ? "hover:bg-destructive/10 text-destructive" 
          : "hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg shrink-0",
        variant === 'destructive' 
          ? "bg-destructive/10" 
          : "bg-primary/10"
      )}>
        <Icon className={cn(
          "w-5 h-5",
          variant === 'destructive' ? "text-destructive" : "text-primary"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium",
            variant === 'destructive' && "text-destructive"
          )}>
            {label}
          </span>
          {badge !== undefined && badge > 0 && (
            <Badge variant="default" className="h-5 min-w-5 px-1.5">
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  );
}

export function MobileMoreSheet({ open, onOpenChange, onNavigate }: MobileMoreSheetProps) {
  const { user, profile, signOut } = useAuth();

  const handleNavigate = (section: string) => {
    onNavigate(section);
    onOpenChange(false);
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  const getInitials = () => {
    const firstName = profile?.first_name || user?.email?.charAt(0) || "";
    const lastName = profile?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const getDisplayName = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return user?.email || "User";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-6">
          <SheetTitle className="text-2xl">More</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto h-[calc(100%-4rem)] pb-safe">
          {/* User Profile Card */}
          {user && (
            <>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-background">
                    <AvatarImage src={profile?.avatar_url} alt="Profile" />
                    <AvatarFallback className="text-lg font-semibold bg-primary/20">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{getDisplayName()}</h3>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 px-3 gap-2"
                      onClick={() => handleNavigate('profile')}
                    >
                      <User className="w-4 h-4" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Main Navigation Items */}
          <div className="space-y-2">
            <MenuItem
              icon={Settings}
              label="Settings"
              description="Preferences and configuration"
              onClick={() => handleNavigate('settings')}
            />
            <MenuItem
              icon={Clock}
              label="Recent Chats"
              description="View your conversation history"
              onClick={() => handleNavigate('recent-chats')}
            />
            <MenuItem
              icon={Bell}
              label="Notifications"
              description="Manage your alerts"
              badge={0}
              onClick={() => handleNavigate('alerts')}
            />
          </div>

          <Separator />

          {/* Help & Support */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
              Support
            </p>
            <MenuItem
              icon={HelpCircle}
              label="Help Center"
              description="Get help and support"
              onClick={() => window.open('https://docs.lovable.dev', '_blank')}
            />
            <MenuItem
              icon={MessageCircle}
              label="Send Feedback"
              description="Share your thoughts with us"
              onClick={() => handleNavigate('settings')}
            />
          </div>

          <Separator />

          {/* Account Actions */}
          {user && (
            <div className="space-y-2 pb-4">
              <MenuItem
                icon={LogOut}
                label="Sign Out"
                description="Sign out from your account"
                onClick={handleSignOut}
                variant="destructive"
              />
            </div>
          )}

          {/* App Info */}
          <div className="text-center text-xs text-muted-foreground space-y-1 pb-4">
            <p>Coinet AI v1.0.0</p>
            <div className="flex items-center justify-center gap-3">
              <button className="hover:text-foreground transition-colors">Privacy</button>
              <span>•</span>
              <button className="hover:text-foreground transition-colors">Terms</button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
