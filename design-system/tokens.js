// Plain CommonJS so this can be `require()`d directly from tailwind-preset.js
// (Tailwind loads presets via require, before any TS transpilation step)
// without needing a build step. TypeScript consumers get types from
// tokens.d.ts alongside this file.

const colors = {
  brand: {
    primary: '#1B4332',
    primaryHover: '#163A2A',
    primaryLight: '#2D6A4F',
  },
  bg: {
    base: '#F5F1E8',
    surface: '#FFFFFF',
  },
  text: {
    primary: '#1F2422',
    muted: '#5B6560',
  },
  border: {
    default: '#DEDACD',
  },
  status: {
    success: '#3F7A5C',
    warning: '#B08900',
    error: '#B3452F',
    info: '#3B6E91',
  },
}

const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
}

const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
}

const radius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
}

const tokens = { colors, spacing, typography, radius }

module.exports = { tokens, colors, spacing, typography, radius }
