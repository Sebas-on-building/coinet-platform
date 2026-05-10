import { useState, useEffect } from "react";
import { 
  Moon, 
  Sun, 
  Monitor,
  Bell, 
  Zap, 
  Database,
  Key,
  Download,
  Trash2,
  Keyboard,
  Check,
  CheckCircle,
  MessageCircle,
  LifeBuoy,
  Mail,
  BookOpen,
  HelpCircle,
  Sliders
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { FeedbackDialog } from "./FeedbackDialog";
import { SupportDialog } from "./SupportDialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('appearance');
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('coinet-theme-mode');
    return saved || 'system';
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('coinet-theme');
    return saved ? saved === 'dark' : true;
  });
  const [displayDensity, setDisplayDensity] = useState(() => {
    return localStorage.getItem('coinet-display-density') || 'comfortable';
  });
  const [analysisDepth, setAnalysisDepth] = useState(() => {
    return localStorage.getItem('coinet-analysis-depth') || 'balanced';
  });
  const [riskSensitivity, setRiskSensitivity] = useState(() => {
    return localStorage.getItem('coinet-risk-sensitivity') || 'moderate';
  });
  const [socialMediaWeight, setSocialMediaWeight] = useState(() => {
    return localStorage.getItem('coinet-social-weight') || 'medium';
  });
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('coinet-notifications');
    return saved ? JSON.parse(saved) : {
      briefComplete: true,
      marketAlerts: true,
      weeklyDigest: false,
      priceAlerts: true
    };
  });
  const [aiPreferences, setAiPreferences] = useState(() => {
    const saved = localStorage.getItem('coinet-ai-preferences');
    return saved ? JSON.parse(saved) : {
      sourceDiversity: true,
      onChainAnalytics: true,
      technicalAnalysis: true
    };
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('coinet-sound-enabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  // Auto-save all settings to localStorage
  useEffect(() => {
    localStorage.setItem('coinet-display-density', displayDensity);
    localStorage.setItem('coinet-analysis-depth', analysisDepth);
    localStorage.setItem('coinet-risk-sensitivity', riskSensitivity);
    localStorage.setItem('coinet-social-weight', socialMediaWeight);
    localStorage.setItem('coinet-notifications', JSON.stringify(notifications));
    localStorage.setItem('coinet-ai-preferences', JSON.stringify(aiPreferences));
    localStorage.setItem('coinet-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('coinet-theme-mode', themeMode);
    localStorage.setItem('coinet-sound-enabled', JSON.stringify(soundEnabled));
  }, [displayDensity, analysisDepth, riskSensitivity, socialMediaWeight, notifications, aiPreferences, darkMode, themeMode, soundEnabled]);

  // Handle theme mode changes (system/light/dark)
  useEffect(() => {
    const applyTheme = (mode: string) => {
      if (mode === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(systemPrefersDark);
        document.documentElement.classList.toggle('dark', systemPrefersDark);
      } else {
        const isDark = mode === 'dark';
        setDarkMode(isDark);
        document.documentElement.classList.toggle('dark', isDark);
      }
    };

    applyTheme(themeMode);

    // Listen for system theme changes when in system mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        setDarkMode(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themeMode]);

  const handleThemeChange = (isDark: boolean) => {
    setDarkMode(isDark);
    
    // Apply theme immediately
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const handleAiPreferenceChange = (key: string, value: boolean) => {
    setAiPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const data = {
        settings: { darkMode, displayDensity, analysisDepth, riskSensitivity, socialMediaWeight, notifications, aiPreferences },
        exportDate: new Date().toISOString(),
        version: "1.0"
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coinet-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Your settings have been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    toast({
      title: "Account deletion initiated",
      description: "This feature will be available in production",
      variant: "destructive"
    });
  };

  const handleApiManagement = () => {
    setShowApiModal(false);
    toast({
      title: "API Management",
      description: "Feature coming soon in production"
    });
  };

  const SettingRow = ({ title, description, control, recommended = false }: { 
    title: string; 
    description: string; 
    control: React.ReactNode; 
    recommended?: boolean;
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-8 py-1">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{title}</Label>
          {recommended && (
            <Badge variant="outline" className="text-xs h-5 border-primary/20 bg-primary/5 text-primary">
              <Check className="w-3 h-3 mr-1" />
              Recommended
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex-shrink-0 w-full sm:w-auto sm:pt-1">
        {control}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 pb-24 sm:pb-8">
      {/* Header */}
      <div className="space-y-2 sm:space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-primary">
          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          <p>All changes are saved automatically</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-y-8">
        <TabsList className="grid w-full grid-cols-3 h-auto sm:h-14 gap-1 bg-muted/30 p-1 sm:p-1.5 rounded-xl">
          <TabsTrigger value="appearance" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <Sun className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <Bell className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-0 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <Sliders className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-300">
          <Card className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-6 sm:pb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sun className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold">Appearance</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">Customize how Coinet AI looks and feels</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8">
              <SettingRow
                title="Theme"
                description="Choose your preferred color scheme"
                recommended={themeMode === 'system'}
                control={
                  <Select value={themeMode} onValueChange={setThemeMode}>
                    <SelectTrigger className="w-full sm:w-[160px] border-border/50 hover:border-primary/50 transition-colors">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          {themeMode === 'system' && <><Monitor className="w-4 h-4" /> System</>}
                          {themeMode === 'light' && <><Sun className="w-4 h-4" /> Light</>}
                          {themeMode === 'dark' && <><Moon className="w-4 h-4" /> Dark</>}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-xl rounded-xl z-[100]">
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" /> System
                        </div>
                      </SelectItem>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4" /> Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4" /> Dark
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                }
              />

              <SettingRow
                title="Display Density"
                description="Control the spacing and information density"
                recommended={displayDensity === 'comfortable'}
                control={
                  <Select value={displayDensity} onValueChange={handleSelectChange(setDisplayDensity)}>
                    <SelectTrigger className="w-full sm:w-[160px] border-border/50 hover:border-primary/50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-xl rounded-xl z-[100]">
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-8 animate-in fade-in-50 duration-300">
          <Card className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Notifications</CardTitle>
                  <CardDescription className="text-sm mt-1">Manage what notifications you receive</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <SettingRow
                title="Market Alerts"
                description="Get notified about important market movements"
                recommended={notifications.marketAlerts}
                control={
                  <Switch 
                    checked={notifications.marketAlerts}
                    onCheckedChange={(checked) => handleNotificationChange('marketAlerts', checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                }
              />

              <SettingRow
                title="Price Alerts"
                description="Notifications for significant price changes"
                recommended={notifications.priceAlerts}
                control={
                  <Switch 
                    checked={notifications.priceAlerts}
                    onCheckedChange={(checked) => handleNotificationChange('priceAlerts', checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                }
              />

              <SettingRow
                title="Brief Completion"
                description="Know when AI analysis is ready"
                control={
                  <Switch 
                    checked={notifications.briefComplete}
                    onCheckedChange={(checked) => handleNotificationChange('briefComplete', checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                }
              />

              <SettingRow
                title="Weekly Digest"
                description="Summary of your research activity"
                control={
                  <Switch 
                    checked={notifications.weeklyDigest}
                    onCheckedChange={(checked) => handleNotificationChange('weeklyDigest', checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                }
              />

              <SettingRow
                title="Alert Sounds"
                description="Play notification sounds for alerts"
                recommended={soundEnabled}
                control={
                  <Switch 
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                    className="data-[state=checked]:bg-primary"
                  />
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-8 animate-in fade-in-50 duration-300">
          {/* AI Settings */}
          <Card className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">AI Preferences</CardTitle>
                  <CardDescription className="text-sm mt-1">Configure AI analysis behavior</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <SettingRow
                title="Analysis Depth"
                description="How thorough AI analysis should be"
                recommended={analysisDepth === 'balanced'}
                control={
                  <Select value={analysisDepth} onValueChange={handleSelectChange(setAnalysisDepth)}>
                    <SelectTrigger className="w-[160px] border-border/50 hover:border-primary/50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-xl rounded-xl z-[100]">
                      <SelectItem value="quick">Quick</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="deep">Deep</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />

              <SettingRow
                title="Risk Sensitivity"
                description="Emphasis on risk analysis in reports"
                recommended={riskSensitivity === 'moderate'}
                control={
                  <Select value={riskSensitivity} onValueChange={handleSelectChange(setRiskSensitivity)}>
                    <SelectTrigger className="w-[160px] border-border/50 hover:border-primary/50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-xl rounded-xl z-[100]">
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />

              <SettingRow
                title="Source Diversity"
                description="Prioritize diverse information sources"
                recommended={aiPreferences.sourceDiversity}
                control={
                  <Switch 
                    checked={aiPreferences.sourceDiversity}
                    onCheckedChange={(checked) => handleAiPreferenceChange('sourceDiversity', checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                }
              />
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Data Sources</CardTitle>
                  <CardDescription className="text-sm mt-1">Configure which data sources to use</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <SettingRow
                title="Social Media Weight"
                description="How much to consider social sentiment"
                recommended={socialMediaWeight === 'medium'}
                control={
                  <Select value={socialMediaWeight} onValueChange={handleSelectChange(setSocialMediaWeight)}>
                    <SelectTrigger className="w-[160px] border-border/50 hover:border-primary/50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-xl rounded-xl z-[100]">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />

              <SettingRow
                title="On-Chain Analytics"
                description="Include blockchain data in analysis"
                recommended={aiPreferences.onChainAnalytics}
                control={
                  <Switch 
                    checked={aiPreferences.onChainAnalytics}
                    onCheckedChange={(checked) => handleAiPreferenceChange('onChainAnalytics', checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                }
              />

              <SettingRow
                title="Technical Analysis"
                description="Incorporate price action patterns"
                recommended={aiPreferences.technicalAnalysis}
                control={
                  <Switch 
                    checked={aiPreferences.technicalAnalysis}
                    onCheckedChange={(checked) => handleAiPreferenceChange('technicalAnalysis', checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                }
              />
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Account & Data</CardTitle>
                  <CardDescription className="text-sm mt-1">Manage your account settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <SettingRow
                title="API Access"
                description="Manage your API keys"
                control={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 min-w-[160px] hover:border-primary/50 transition-colors"
                    onClick={() => setShowApiModal(true)}
                  >
                    <Key className="w-4 h-4" />
                    Manage Keys
                  </Button>
                }
              />

              <SettingRow
                title="Keyboard Shortcuts"
                description="View available shortcuts"
                control={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowShortcuts(true)}
                    className="gap-2 min-w-[160px] hover:border-primary/50 transition-colors"
                  >
                    <Keyboard className="w-4 h-4" />
                    View Shortcuts
                  </Button>
                }
              />

              <SettingRow
                title="Export Data"
                description="Download your settings and history"
                control={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="gap-2 min-w-[160px] hover:border-primary/50 transition-colors"
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                }
              />

              <SettingRow
                title="Delete Account"
                description="Permanently remove your account"
                control={
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="gap-2 min-w-[160px] hover:scale-105 transition-transform"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                }
              />
            </CardContent>
          </Card>

          {/* Help & Support Section - Merged into Advanced Tab */}
          <Card className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <LifeBuoy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Help & Support</CardTitle>
                  <CardDescription className="text-sm mt-1">Get help and share feedback</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <SettingRow
                title="Contact Support"
                description="Get help from our team at team@coinet.ai"
                control={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 min-w-[160px] hover:border-primary/50 transition-colors"
                    onClick={() => setShowSupport(true)}
                  >
                    <Mail className="w-4 h-4" />
                    Contact
                  </Button>
                }
              />

              <SettingRow
                title="Send Feedback"
                description="Share your thoughts and help us improve"
                control={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 min-w-[160px] hover:border-primary/50 transition-colors"
                    onClick={() => setShowFeedback(true)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Feedback
                  </Button>
                }
              />

              <SettingRow
                title="Documentation"
                description="Guides, tutorials, and API reference"
                control={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 min-w-[160px] hover:border-primary/50 transition-colors"
                    onClick={() => window.open('#', '_blank')}
                  >
                    <BookOpen className="w-4 h-4" />
                    View Docs
                  </Button>
                }
              />

              <SettingRow
                title="Help Center"
                description="FAQs and troubleshooting resources"
                control={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 min-w-[160px] hover:border-primary/50 transition-colors"
                    onClick={() => window.open('#', '_blank')}
                  >
                    <HelpCircle className="w-4 h-4" />
                    Open
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <KeyboardShortcutsModal 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />

      <Dialog open={showApiModal} onOpenChange={setShowApiModal}>
        <DialogContent className="bg-background border border-border z-50">
          <DialogHeader>
            <DialogTitle>API Management</DialogTitle>
            <DialogDescription>
              Manage your API keys for programmatic access
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              API key management coming soon in production version.
            </p>
          </div>
          <Button onClick={handleApiManagement}>Got it</Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-background border border-border z-50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback & Support Dialogs */}
      <FeedbackDialog 
        open={showFeedback} 
        onOpenChange={setShowFeedback} 
      />

      <SupportDialog 
        open={showSupport} 
        onOpenChange={setShowSupport} 
      />
    </div>
  );
}
