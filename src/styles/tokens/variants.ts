/**
 * Coinet Design System - Advanced Visual Variants
 * 
 * Inspired by Apple, Canva, TradingView, and Solana
 * 
 * This system provides meticulously crafted design tokens for creating
 * visually striking and functionally superior UI components with
 * pixel-perfect precision and exceptional user experience.
 */

// Common values used across variants
const common = {
  // Animation timings (in ms)
  animations: {
    ultraFast: 75,
    fast: 150,
    medium: 300,
    slow: 450,
    ultraSlow: 600,
  },

  // Animation curves
  curves: {
    // Apple-inspired spring physics
    responsive: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    // TradingView-inspired precise motion
    precise: 'cubic-bezier(0.2, 0, 0, 1)',
    // Subtle deceleration
    gentle: 'cubic-bezier(0, 0, 0.2, 1)',
    // Emphasized motion
    emphasized: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Border radius values (in px)
  radius: {
    none: '0px',
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',
  },

  // Shadows designed for various depths and contexts
  shadowValues: {
    xsBlur: '4px',
    smBlur: '8px',
    mdBlur: '16px',
    lgBlur: '24px',
    xlBlur: '32px',
    xxlBlur: '48px',

    xsSpread: '0px',
    smSpread: '1px',
    mdSpread: '2px',
    lgSpread: '4px',

    defaultOpacity: '0.12',
    mediumOpacity: '0.16',
    highOpacity: '0.24',
  }
};

/**
 * Frosted Variant
 * 
 * Features refined glassmorphism effects with sophisticated blur,
 * subtle highlights, and depth markers for a premium feel.
 * Inspired by Apple's frosted glass aesthetics.
 */
export const frosted = {
  name: 'frosted',
  background: {
    // Base backgrounds for different surfaces
    primary: 'rgba(255, 255, 255, 0.7)',
    secondary: 'rgba(255, 255, 255, 0.5)',
    tertiary: 'rgba(255, 255, 255, 0.3)',

    // Dark mode variants
    primaryDark: 'rgba(25, 25, 35, 0.7)',
    secondaryDark: 'rgba(30, 30, 42, 0.5)',
    tertiaryDark: 'rgba(35, 35, 50, 0.3)',

    // Blurs
    blur: {
      xs: '8px',
      sm: '12px',
      md: '20px',
      lg: '30px',
      xl: '40px',
    },

    // Subtle patterns for texture
    noise: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
    noiseOpacity: '0.02',
  },

  border: {
    width: {
      hairline: '0.5px',
      thin: '1px',
      medium: '1.5px',
      thick: '2px',
    },

    // Light mode
    color: {
      primary: 'rgba(255, 255, 255, 0.5)',
      secondary: 'rgba(255, 255, 255, 0.3)',
      accent: 'rgba(187, 222, 251, 0.5)',
    },

    // Dark mode
    colorDark: {
      primary: 'rgba(255, 255, 255, 0.12)',
      secondary: 'rgba(255, 255, 255, 0.07)',
      accent: 'rgba(66, 133, 244, 0.3)',
    },
  },

  shadow: {
    // Elevation levels
    xs: `0 2px ${common.shadowValues.xsBlur} ${common.shadowValues.xsSpread} rgba(0, 10, 20, 0.06), 
         0 1px 3px 0 rgba(0, 10, 20, 0.04)`,

    sm: `0 4px ${common.shadowValues.smBlur} ${common.shadowValues.xsSpread} rgba(0, 10, 20, 0.08), 
         0 2px 4px 0 rgba(0, 10, 20, 0.04)`,

    md: `0 8px ${common.shadowValues.mdBlur} ${common.shadowValues.smSpread} rgba(0, 10, 20, 0.1), 
         0 3px 8px 0 rgba(0, 10, 20, 0.06)`,

    lg: `0 12px ${common.shadowValues.lgBlur} ${common.shadowValues.mdSpread} rgba(0, 10, 20, 0.12), 
         0 6px 12px 0 rgba(0, 10, 20, 0.06)`,

    xl: `0 20px ${common.shadowValues.xlBlur} ${common.shadowValues.lgSpread} rgba(0, 10, 20, 0.14), 
         0 8px 16px 0 rgba(0, 10, 20, 0.06)`,

    // Inner shadows for pressed states
    insetSm: 'inset 0 1px 2px 0 rgba(0, 10, 20, 0.08)',
    insetMd: 'inset 0 2px 4px 0 rgba(0, 10, 20, 0.12)',

    // Special glow effects
    glow: '0 0 16px 0 rgba(255, 255, 255, 0.3)',
    glowDark: '0 0 16px 0 rgba(100, 150, 255, 0.15)',
  },

  // Highlight effects
  highlight: {
    // Top highlight (simulates light from above)
    top: 'linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 100%)',
    topDark: 'linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0) 100%)',

    // Left highlight (simulates light from left)
    left: 'linear-gradient(90deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 100%)',
    leftDark: 'linear-gradient(90deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0) 100%)',

    // Reflect (subtle shimmer on interaction)
    reflect: 'linear-gradient(145deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 80%)',
    reflectDark: 'linear-gradient(145deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 80%)',
  },

  animation: {
    transition: `all ${common.animations.medium}ms ${common.curves.responsive}`,
    hover: `all ${common.animations.fast}ms ${common.curves.precise}`,
    press: `all ${common.animations.ultraFast}ms ${common.curves.emphasized}`,
    expand: `all ${common.animations.medium}ms ${common.curves.bounce}`,
  },
};

/**
 * Neon Variant
 * 
 * Features vibrant gradients, electrifying glow effects,
 * and futuristic animated shadows. Perfect for highlighting
 * important elements or creating high-energy interfaces.
 */
export const neon = {
  name: 'neon',
  gradient: {
    // Vibrant gradients with excellent color science
    primary: 'linear-gradient(135deg, #0066FF 0%, #5E00FF 100%)',
    secondary: 'linear-gradient(135deg, #FF0099 0%, #FF5E00 100%)',
    tertiary: 'linear-gradient(135deg, #00FFCC 0%, #00BBFF 100%)',
    quaternary: 'linear-gradient(135deg, #FFD600 0%, #FF6D00 100%)',

    // Accent gradients
    accent1: 'linear-gradient(135deg, #FF00CC 0%, #FF0066 100%)',
    accent2: 'linear-gradient(135deg, #6600FF 0%, #0099FF 100%)',
    accent3: 'linear-gradient(135deg, #00FF66 0%, #00FFCC 100%)',

    // Shimmer effect for animations
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
  },

  glow: {
    // Colored glows
    primary: '0 0 20px 0 rgba(0, 102, 255, 0.6), 0 0 40px 0 rgba(0, 102, 255, 0.3)',
    secondary: '0 0 20px 0 rgba(255, 0, 153, 0.6), 0 0 40px 0 rgba(255, 0, 153, 0.3)',
    tertiary: '0 0 20px 0 rgba(0, 255, 204, 0.6), 0 0 40px 0 rgba(0, 255, 204, 0.3)',

    // Intensity levels
    sm: '0 0 10px 0 rgba(var(--glow-color, 66, 133, 244), 0.5)',
    md: '0 0 20px 0 rgba(var(--glow-color, 66, 133, 244), 0.6)',
    lg: '0 0 30px 0 rgba(var(--glow-color, 66, 133, 244), 0.7)',
    xl: '0 0 40px 0 rgba(var(--glow-color, 66, 133, 244), 0.8)',

    // Pulsating glow animation parameters
    pulseOpacityFrom: '0.5',
    pulseOpacityTo: '0.8',
    pulseDuration: '2s',
  },

  border: {
    // Glowing borders
    width: {
      thin: '1px',
      medium: '2px',
      thick: '3px',
    },

    // Gradient borders
    primary: 'linear-gradient(to right, #0066FF, #5E00FF)',
    secondary: 'linear-gradient(to right, #FF0099, #FF5E00)',

    // Glowing outline effect
    glow: {
      sm: '0 0 3px 1px rgba(var(--border-color, 66, 133, 244), 0.5)',
      md: '0 0 5px 2px rgba(var(--border-color, 66, 133, 244), 0.6)',
      lg: '0 0 8px 3px rgba(var(--border-color, 66, 133, 244), 0.7)',
    },
  },

  shadow: {
    // Dynamic shadows for depth
    level1: '0 4px 10px 0 rgba(0, 0, 0, 0.2), 0 0 20px 0 rgba(var(--shadow-color, 0, 102, 255), 0.3)',
    level2: '0 8px 20px 0 rgba(0, 0, 0, 0.25), 0 0 30px 0 rgba(var(--shadow-color, 0, 102, 255), 0.4)',
    level3: '0 12px 30px 0 rgba(0, 0, 0, 0.3), 0 0 40px 0 rgba(var(--shadow-color, 0, 102, 255), 0.5)',

    // Colored shadows
    primary: '0 8px 20px 0 rgba(0, 102, 255, 0.3)',
    secondary: '0 8px 20px 0 rgba(255, 0, 153, 0.3)',
    tertiary: '0 8px 20px 0 rgba(0, 255, 204, 0.3)',
  },

  animation: {
    // Time functions for animations
    transition: `all ${common.animations.medium}ms ${common.curves.emphasized}`,
    glowPulse: `glow-pulse ${common.animations.slow * 4}ms ${common.curves.gentle} infinite alternate`,
    colorShift: `color-shift ${common.animations.slow * 8}ms ${common.curves.responsive} infinite`,
    borderFlow: `border-flow ${common.animations.slow * 3}ms linear infinite`,

    // Keyframes are defined in the CSS file
  },

  background: {
    // Dark backgrounds to make neon effects pop
    dark: 'rgba(10, 10, 20, 0.95)',
    darker: 'rgba(5, 5, 15, 0.97)',
    darkest: 'rgba(2, 2, 10, 0.99)',

    // Subtle grid pattern
    grid: 'linear-gradient(rgba(66, 133, 244, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(66, 133, 244, 0.05) 1px, transparent 1px)',
    gridSize: '20px 20px',
  },
};

/**
 * Minimal Variant
 * 
 * Features ultra-clean, low-contrast design with subtle borders 
 * and shadows for a sophisticated, distraction-free interface.
 * Inspired by modern minimalist design principles.
 */
export const minimal = {
  name: 'minimal',
  color: {
    // Subtle color palette
    background: {
      lightest: '#FAFAFA',
      light: '#F5F5F7',
      main: '#F0F0F2',
      dark: '#E8E8EB',
    },
    backgroundDark: {
      lightest: '#222226',
      light: '#1E1E22',
      main: '#18181C',
      dark: '#121215',
    },

    // Text colors with perfect contrast ratios
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      tertiary: 'rgba(0, 0, 0, 0.38)',
      hint: 'rgba(0, 0, 0, 0.24)',
    },
    textDark: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      tertiary: 'rgba(255, 255, 255, 0.38)',
      hint: 'rgba(255, 255, 255, 0.24)',
    },

    // Accent colors (very subtle)
    accent: {
      primary: '#0066FF',
      secondary: '#6c63ff',
      // Desaturated versions
      primarySubtle: 'rgba(0, 102, 255, 0.08)',
      secondarySubtle: 'rgba(108, 99, 255, 0.08)',
    },
  },

  border: {
    // Extremely subtle borders
    width: {
      hairline: '0.5px',
      thin: '1px',
      medium: '1.5px',
    },

    // Border colors
    color: {
      light: 'rgba(0, 0, 0, 0.08)',
      medium: 'rgba(0, 0, 0, 0.12)',
      accent: 'rgba(0, 102, 255, 0.24)',
    },
    colorDark: {
      light: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.12)',
      accent: 'rgba(0, 102, 255, 0.24)',
    },

    // Border radius - slightly more rounded in minimal design
    radius: {
      sm: common.radius.sm,
      md: common.radius.md,
      lg: common.radius.lg,
      pill: common.radius.full,
    },
  },

  shadow: {
    // Very subtle shadows
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    sm: '0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    md: '0 3px 8px 0 rgba(0, 0, 0, 0.08)',
    lg: '0 4px 12px 0 rgba(0, 0, 0, 0.1)',

    // Inner shadows
    inner: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.04)',

    // Dark mode shadows (even more subtle)
    xsDark: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    smDark: '0 2px 4px 0 rgba(0, 0, 0, 0.24)',
    mdDark: '0 3px 8px 0 rgba(0, 0, 0, 0.28)',
    lgDark: '0 4px 12px 0 rgba(0, 0, 0, 0.32)',
  },

  spacing: {
    // Consistent spacing scale
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  typography: {
    // Clean typography
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
    },

    // Reduced number of sizes
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
    },

    // Tighter line heights for minimal look
    lineHeight: {
      tight: 1.2,
      base: 1.5,
      relaxed: 1.75,
    },

    // Letter spacing
    letterSpacing: {
      tighter: '-0.02em',
      tight: '-0.01em',
      normal: '0',
      wide: '0.01em',
    },
  },

  animation: {
    // Subtle animations
    transition: `all ${common.animations.medium}ms ${common.curves.precise}`,
    hover: `all ${common.animations.fast}ms ${common.curves.gentle}`,
    expand: `all ${common.animations.medium}ms ${common.curves.emphasized}`,
  },
};

// Export all variants
export const variants = {
  frosted,
  neon,
  minimal
};

export default variants; 