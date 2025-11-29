import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';
import { Palette, Sun, Moon, Monitor, Grid3x3, Eye, EyeOff } from 'lucide-react';

export interface ChartTheme {
  id: string;
  name: string;
  colors: {
    background: string;
    grid: string;
    text: string;
    primary: string;
    bullish: string;
    bearish: string;
    volume: string;
    [key: string]: string;
  };
  gridStyle: 'solid' | 'dashed' | 'dotted';
  gridOpacity: number;
  lineWidth: number;
  showGrid: boolean;
  showCrosshair: boolean;
  showVolume: boolean;
  candleStyle: 'candle' | 'hollow' | 'line' | 'area';
}

const predefinedThemes: ChartTheme[] = [
  {
    id: 'light',
    name: 'Light',
    colors: {
      background: '#ffffff',
      grid: '#e5e7eb',
      text: '#1f2937',
      primary: '#3b82f6',
      bullish: '#10b981',
      bearish: '#ef4444',
      volume: '#9ca3af',
    },
    gridStyle: 'solid',
    gridOpacity: 0.3,
    lineWidth: 2,
    showGrid: true,
    showCrosshair: true,
    showVolume: true,
    candleStyle: 'candle',
  },
  {
    id: 'dark',
    name: 'Dark',
    colors: {
      background: '#0f172a',
      grid: '#1e293b',
      text: '#f1f5f9',
      primary: '#60a5fa',
      bullish: '#34d399',
      bearish: '#f87171',
      volume: '#64748b',
    },
    gridStyle: 'solid',
    gridOpacity: 0.4,
    lineWidth: 2,
    showGrid: true,
    showCrosshair: true,
    showVolume: true,
    candleStyle: 'candle',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      background: '#fafafa',
      grid: '#f5f5f5',
      text: '#525252',
      primary: '#737373',
      bullish: '#22c55e',
      bearish: '#dc2626',
      volume: '#a3a3a3',
    },
    gridStyle: 'dotted',
    gridOpacity: 0.2,
    lineWidth: 1,
    showGrid: false,
    showCrosshair: true,
    showVolume: false,
    candleStyle: 'line',
  },
  {
    id: 'tradingview',
    name: 'TradingView',
    colors: {
      background: '#131722',
      grid: '#2a2e39',
      text: '#d1d4dc',
      primary: '#2962ff',
      bullish: '#089981',
      bearish: '#f23645',
      volume: '#434651',
    },
    gridStyle: 'solid',
    gridOpacity: 0.5,
    lineWidth: 2,
    showGrid: true,
    showCrosshair: true,
    showVolume: true,
    candleStyle: 'candle',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    colors: {
      background: '#0a0118',
      grid: '#1a0b2e',
      text: '#00ffff',
      primary: '#ff00ff',
      bullish: '#00ff00',
      bearish: '#ff0080',
      volume: '#6a0dad',
    },
    gridStyle: 'dashed',
    gridOpacity: 0.6,
    lineWidth: 2,
    showGrid: true,
    showCrosshair: true,
    showVolume: true,
    candleStyle: 'hollow',
  },
];

interface ChartThemeSwitcherProps {
  currentTheme: ChartTheme;
  onThemeChange: (theme: ChartTheme) => void;
  className?: string;
}

export function ChartThemeSwitcher({
  currentTheme,
  onThemeChange,
  className,
}: ChartThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [customTheme, setCustomTheme] = useState<ChartTheme>(currentTheme);

  const handleThemeSelect = (theme: ChartTheme) => {
    triggerHaptic('light');
    onThemeChange(theme);
    setCustomTheme(theme);
  };

  const handleCustomThemeUpdate = (updates: Partial<ChartTheme>) => {
    const updatedTheme = { ...customTheme, ...updates };
    setCustomTheme(updatedTheme);
    onThemeChange(updatedTheme);
    triggerHaptic('light');
  };

  const handleColorChange = (colorKey: string, value: string) => {
    handleCustomThemeUpdate({
      colors: {
        ...customTheme.colors,
        [colorKey]: value,
      },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-2', className)}
        >
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          {/* Preset Themes */}
          <TabsContent value="presets" className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {predefinedThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all hover:scale-105',
                    currentTheme.id === theme.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div
                    className="h-20 rounded-md mb-2 relative overflow-hidden"
                    style={{ backgroundColor: theme.colors.background }}
                  >
                    {/* Mini chart preview */}
                    <div className="absolute inset-0 p-2 flex flex-col justify-end gap-1">
                      <div
                        className="h-1 rounded"
                        style={{
                          background: `linear-gradient(90deg, ${theme.colors.bullish} 0%, ${theme.colors.bearish} 100%)`,
                        }}
                      />
                      <div
                        className="h-2 rounded"
                        style={{
                          background: theme.colors.volume,
                          opacity: 0.5,
                        }}
                      />
                    </div>
                    
                    {/* Grid overlay */}
                    {theme.showGrid && (
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `
                            linear-gradient(${theme.colors.grid} 1px, transparent 1px),
                            linear-gradient(90deg, ${theme.colors.grid} 1px, transparent 1px)
                          `,
                          backgroundSize: '10px 10px',
                          opacity: theme.gridOpacity,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{theme.name}</span>
                    {currentTheme.id === theme.id && (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Custom Theme Settings */}
          <TabsContent value="custom" className="space-y-4">
            {/* Chart Style */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Chart Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['candle', 'hollow', 'line', 'area'] as const).map((style) => (
                  <Button
                    key={style}
                    variant={customTheme.candleStyle === style ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      handleCustomThemeUpdate({ candleStyle: style })
                    }
                    className="capitalize"
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Colors</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(customTheme.colors).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs capitalize">{key}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="w-8 h-8 rounded border border-border cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground font-mono">
                        {value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Grid</Label>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Grid</Label>
                <Switch
                  checked={customTheme.showGrid}
                  onCheckedChange={(checked) =>
                    handleCustomThemeUpdate({ showGrid: checked })
                  }
                />
              </div>

              {customTheme.showGrid && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Grid Opacity</Label>
                    <Slider
                      value={[customTheme.gridOpacity * 100]}
                      onValueChange={([value]) =>
                        handleCustomThemeUpdate({ gridOpacity: value / 100 })
                      }
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Grid Style</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                        <Button
                          key={style}
                          variant={customTheme.gridStyle === style ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            handleCustomThemeUpdate({ gridStyle: style })
                          }
                          className="capitalize"
                        >
                          {style}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Display Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Display</Label>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Crosshair</Label>
                <Switch
                  checked={customTheme.showCrosshair}
                  onCheckedChange={(checked) =>
                    handleCustomThemeUpdate({ showCrosshair: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Volume</Label>
                <Switch
                  checked={customTheme.showVolume}
                  onCheckedChange={(checked) =>
                    handleCustomThemeUpdate({ showVolume: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Line Width</Label>
                <Slider
                  value={[customTheme.lineWidth]}
                  onValueChange={([value]) =>
                    handleCustomThemeUpdate({ lineWidth: value })
                  }
                  min={1}
                  max={5}
                  step={0.5}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

// Hook for managing chart theme
export function useChartTheme(initialTheme?: ChartTheme) {
  const [theme, setTheme] = useState<ChartTheme>(
    initialTheme || predefinedThemes[0]
  );

  return {
    theme,
    setTheme,
    presets: predefinedThemes,
  };
}
