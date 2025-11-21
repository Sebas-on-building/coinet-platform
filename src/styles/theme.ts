export const theme = {
  colors: {
    // Primary brand colors
    primary: {
      50: "#E6F0FF",
      100: "#CCE0FF",
      200: "#99C2FF",
      300: "#66A3FF",
      400: "#3385FF",
      500: "#0066FF", // Primary brand color
      600: "#0052CC",
      700: "#003D99",
      800: "#002966",
      900: "#001433",
    },
    // Secondary accent color
    secondary: {
      50: "#F0E6FF",
      100: "#E0CCFF",
      200: "#C299FF",
      300: "#A366FF",
      400: "#8533FF",
      500: "#6600FF", // Secondary accent color
      600: "#5200CC",
      700: "#3D0099",
      800: "#260066",
      900: "#130033",
    },
    // Success colors
    success: {
      50: "#E6FFF0",
      100: "#CCFFE0",
      200: "#99FFC2",
      300: "#66FFA3",
      400: "#33FF85",
      500: "#00FF66",
      600: "#00CC52",
      700: "#00993D",
      800: "#006626",
      900: "#003313",
    },
    // Warning colors
    warning: {
      50: "#FFF9E6",
      100: "#FFF3CC",
      200: "#FFE799",
      300: "#FFDB66",
      400: "#FFCF33",
      500: "#FFC300",
      600: "#CC9C00",
      700: "#997500",
      800: "#664E00",
      900: "#332700",
    },
    // Error colors
    error: {
      50: "#FFE6E6",
      100: "#FFCCCC",
      200: "#FF9999",
      300: "#FF6666",
      400: "#FF3333",
      500: "#FF0000",
      600: "#CC0000",
      700: "#990000",
      800: "#660000",
      900: "#330000",
    },
    // Neutral colors
    neutral: {
      50: "#F9FAFB",
      100: "#F3F4F6",
      200: "#E5E7EB",
      300: "#D1D5DB",
      400: "#9CA3AF",
      500: "#6B7280",
      600: "#4B5563",
      700: "#374151",
      800: "#1F2937",
      900: "#111827",
    },
  },
  // Typography
  typography: {
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"],
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
      "6xl": "3.75rem",
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  // Spacing
  spacing: {
    0: "0",
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
    16: "4rem",
    20: "5rem",
    24: "6rem",
    32: "8rem",
    40: "10rem",
    48: "12rem",
    56: "14rem",
    64: "16rem",
  },
  // Border radius
  borderRadius: {
    none: "0",
    sm: "0.125rem",
    DEFAULT: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    full: "9999px",
  },
  // Shadows
  boxShadow: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
    none: "none",
  },
  // Transitions
  transition: {
    DEFAULT: "all 0.2s ease-in-out",
    fast: "all 0.1s ease-in-out",
    slow: "all 0.3s ease-in-out",
  },
  // Z-index
  zIndex: {
    0: "0",
    10: "10",
    20: "20",
    30: "30",
    40: "40",
    50: "50",
    auto: "auto",
  },
} as const;

// Type for the theme object
export type Theme = typeof theme;

// Helper function to get color values
export const getColor = (
  color: keyof Theme["colors"],
  shade: keyof Theme["colors"]["primary"],
) => {
  return theme.colors[color][shade];
};
