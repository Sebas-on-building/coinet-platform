import { Activity, Palette, Settings, Smartphone, User, Shield, CreditCard } from "lucide-react";

interface MainContentProps {
  activeSection: string;
}

const contentMap = {
  activity: {
    title: "My Activity",
    icon: Activity,
    content: "Track your activity and engagement across the platform."
  },
  personalize: {
    title: "Personalize",
    icon: Palette,
    content: "Customize your experience with themes, layouts, and preferences."
  },
  settings: {
    title: "Settings",
    icon: Settings,
    content: "Configure your application settings and preferences."
  },
  app: {
    title: "App",
    icon: Smartphone,
    content: "Manage your app settings, notifications, and integrations."
  },
  profile: {
    title: "Profile",
    icon: User,
    content: "Update your profile information and account details."
  },
  security: {
    title: "Security",
    icon: Shield,
    content: "Manage your security settings, passwords, and two-factor authentication."
  },
  billing: {
    title: "Billing",
    icon: CreditCard,
    content: "View your billing information, invoices, and payment methods."
  }
};

export function MainContent({ activeSection }: MainContentProps) {
  const currentContent = contentMap[activeSection as keyof typeof contentMap] || contentMap.settings;
  const IconComponent = currentContent.icon;

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 md:mb-8">
          <div className="coinet-glass-subtle p-3 rounded-xl">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{currentContent.title}</h1>
            <p className="text-muted-foreground mt-1">{currentContent.content}</p>
          </div>
        </div>

        {/* Content Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card-hover coinet-glass-card border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground text-sm md:text-base">General Settings</h3>
            </div>
            <p className="text-muted-foreground text-sm">Configure your basic application preferences and behavior.</p>
            <button className="coinet-glass-button bg-primary hover:bg-primary/90 text-primary-foreground mt-4 text-sm">
              Configure
            </button>
          </div>

          <div className="card-hover coinet-glass-card border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-destructive to-destructive/80 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-destructive-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Privacy & Security</h3>
            </div>
            <p className="text-muted-foreground text-sm">Manage your privacy settings and security preferences.</p>
            <button className="coinet-glass-button bg-destructive hover:bg-destructive/90 text-destructive-foreground mt-4 text-sm">
              Manage
            </button>
          </div>

          <div className="card-hover coinet-glass-card border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/80 rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Appearance</h3>
            </div>
            <p className="text-muted-foreground text-sm">Customize themes, colors, and visual preferences.</p>
            <button className="coinet-glass-button bg-accent hover:bg-accent/90 text-accent-foreground mt-4 text-sm">
              Customize
            </button>
          </div>

          <div className="card-hover coinet-glass-card border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-secondary to-secondary/80 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Notifications</h3>
            </div>
            <p className="text-muted-foreground text-sm">Control how and when you receive notifications.</p>
            <button className="coinet-glass-button bg-secondary hover:bg-secondary/90 text-secondary-foreground mt-4 text-sm">
              Setup
            </button>
          </div>

          <div className="card-hover coinet-glass-card border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Integrations</h3>
            </div>
            <p className="text-muted-foreground text-sm">Connect with third-party services and applications.</p>
            <button className="coinet-glass-button bg-primary hover:bg-primary/90 text-primary-foreground mt-4 text-sm">
              Connect
            </button>
          </div>

          <div className="card-hover coinet-glass-card border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted/80 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Billing & Plans</h3>
            </div>
            <p className="text-muted-foreground text-sm">Manage your subscription and payment information.</p>
            <button className="coinet-glass-button bg-muted hover:bg-muted/90 text-muted-foreground mt-4 text-sm">
              View Plans
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}