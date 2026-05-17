// Lumina Design System - Complete Theme Tokens
export const theme = {
  colors: {
    // Cursor-like editorial theme (docs/newdesign.md)
    canvas: '#f7f7f4',
    canvasSoft: '#fafaf7',
    surfaceCard: '#ffffff',
    surfaceStrong: '#e6e5e0',

    // Brand (primary is intentionally sparse)
    primary: '#007aff',
    primaryHover: '#0a84ff',
    primaryActive: '#0062cc',

    // Hairlines
    hairline: '#e6e5e0',
    hairlineSoft: '#efeee8',
    hairlineStrong: '#cfcdc4',

    // Text
    ink: '#26251e',
    body: '#000000',
    muted: '#3a3832',
    mutedSoft: '#5f5c54',
    onPrimary: '#ffffff',

    // Timeline (product-only signature)
    timelineThinking: '#dfa88f',
    timelineGrep: '#9fc9a2',
    timelineRead: '#9fbbe0',
    timelineEdit: '#c0a8dd',
    timelineDone: '#c08532',

    // Semantic
    success: '#1f8a65',
    error: '#cf2d56',
  },

  typography: {
    fontFamily: {
      display: '"Inter Variable", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif',
      body: '"Inter Variable", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },

    // Display Styles
    displayXl: {
      fontSize: '72px',
      fontWeight: 400,
      lineHeight: 1.1,
      letterSpacing: '-2.16px',
      fontFamily: '"Inter Variable", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif',
    },
    displayLg: {
      fontSize: '36px',
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: '-0.72px',
      fontFamily: '"Inter Variable", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif',
    },
    displayMd: {
      fontSize: '26px',
      fontWeight: 400,
      lineHeight: 1.25,
      letterSpacing: '-0.325px',
      fontFamily: '"Inter Variable", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif',
    },

    // Title Styles
    titleLg: {
      fontSize: '22px',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '0',
    },
    titleMd: {
      fontSize: '18px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    titleSm: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0',
    },

    // Body Text
    bodyMd: {
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0',
    },
    bodySm: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.55,
      letterSpacing: '0',
    },

    // Button & Utility
    button: {
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: 1.0,
      letterSpacing: '0',
    },
    buttonLarge: {
      fontSize: '18px',
      fontWeight: 300,
      lineHeight: 1.0,
      letterSpacing: '0',
    },

    // Caption
    caption: {
      fontSize: '13px',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    captionUppercase: {
      fontSize: '11px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0.88px',
    },
  },

  spacing: {
    xxs: '4px',
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    section: '96px',
  },

  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    pill: '9999px',
    full: '50%',
  },

  shadows: {
    product: 'none',
  },
};

export type Theme = typeof theme;
