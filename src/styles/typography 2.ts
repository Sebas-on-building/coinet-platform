import { theme } from "./theme";

type TypographyStyle = {
  fontSize: string;
  lineHeight: number;
  fontWeight: number;
  letterSpacing?: string;
  fontFamily?: string | string[];
  textTransform?: string;
};

type TypographyVariant = {
  [key: string]: TypographyStyle;
};

type TypographySystem = {
  display: TypographyVariant;
  heading: TypographyVariant;
  body: TypographyVariant;
  data: TypographyVariant;
  utility: TypographyVariant;
};

export const typography: TypographySystem = {
  // Display styles for large, attention-grabbing text
  display: {
    large: {
      fontSize: "3.75rem", // 60px
      lineHeight: 1.1,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: "-0.02em",
    },
    medium: {
      fontSize: "3rem", // 48px
      lineHeight: 1.1,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: "-0.02em",
    },
    small: {
      fontSize: "2.25rem", // 36px
      lineHeight: 1.2,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: "-0.01em",
    },
  },

  // Heading styles for section titles and important text
  heading: {
    h1: {
      fontSize: "2.25rem", // 36px
      lineHeight: 1.2,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: "-0.01em",
    },
    h2: {
      fontSize: "1.875rem", // 30px
      lineHeight: 1.2,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontSize: "1.5rem", // 24px
      lineHeight: 1.3,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    h4: {
      fontSize: "1.25rem", // 20px
      lineHeight: 1.4,
      fontWeight: theme.typography.fontWeight.medium,
    },
    h5: {
      fontSize: "1.125rem", // 18px
      lineHeight: 1.4,
      fontWeight: theme.typography.fontWeight.medium,
    },
    h6: {
      fontSize: "1rem", // 16px
      lineHeight: 1.4,
      fontWeight: theme.typography.fontWeight.medium,
    },
  },

  // Body text styles for regular content
  body: {
    large: {
      fontSize: "1.125rem", // 18px
      lineHeight: 1.6,
      fontWeight: theme.typography.fontWeight.normal,
    },
    regular: {
      fontSize: "1rem", // 16px
      lineHeight: 1.6,
      fontWeight: theme.typography.fontWeight.normal,
    },
    small: {
      fontSize: "0.875rem", // 14px
      lineHeight: 1.5,
      fontWeight: theme.typography.fontWeight.normal,
    },
  },

  // Special styles for numbers and data
  data: {
    large: {
      fontSize: "2.5rem", // 40px
      lineHeight: 1.1,
      fontWeight: theme.typography.fontWeight.bold,
      fontFamily: theme.typography.fontFamily.mono[0], // Use first font in the stack
    },
    medium: {
      fontSize: "2rem", // 32px
      lineHeight: 1.2,
      fontWeight: theme.typography.fontWeight.bold,
      fontFamily: theme.typography.fontFamily.mono[0], // Use first font in the stack
    },
    small: {
      fontSize: "1.5rem", // 24px
      lineHeight: 1.3,
      fontWeight: theme.typography.fontWeight.semibold,
      fontFamily: theme.typography.fontFamily.mono[0], // Use first font in the stack
    },
  },

  // Utility styles for labels, captions, etc.
  utility: {
    label: {
      fontSize: "0.875rem", // 14px
      lineHeight: 1.4,
      fontWeight: theme.typography.fontWeight.medium,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
    caption: {
      fontSize: "0.75rem", // 12px
      lineHeight: 1.4,
      fontWeight: theme.typography.fontWeight.normal,
    },
    overline: {
      fontSize: "0.75rem", // 12px
      lineHeight: 1.4,
      fontWeight: theme.typography.fontWeight.medium,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    },
  },
};

// Helper function to generate Tailwind classes for typography styles
export const getTypographyClasses = (
  style: keyof TypographySystem,
  variant: string,
): string => {
  const typographyStyle = typography[style][variant];
  return `
    text-[${typographyStyle.fontSize}]
    leading-[${typographyStyle.lineHeight}]
    font-${typographyStyle.fontWeight}
    ${typographyStyle.letterSpacing ? `tracking-[${typographyStyle.letterSpacing}]` : ""}
    ${typographyStyle.fontFamily ? `font-${typographyStyle.fontFamily}` : ""}
    ${typographyStyle.textTransform ? `uppercase` : ""}
  `.trim();
};

// Helper function to generate CSS-in-JS styles for typography
export const getTypographyStyles = (
  style: keyof TypographySystem,
  variant: string,
): TypographyStyle => {
  return typography[style][variant];
};
