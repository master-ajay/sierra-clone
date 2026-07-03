import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0a0a0c',
        surface: '#131317',
        'surface-2': '#1b1b21',
        border: '#26262e',
        accent: {
          DEFAULT: '#8b5cf6',
          hover: '#7c3aed',
        },
        muted: '#8b8b96',
        // Status colors: the platform-wide token set has no opinion on
        // pass/warn/block semantics, so Trust defines them here first —
        // later products showing guardrail/flag state should reuse these
        // rather than inventing their own.
        pass: '#22c55e',
        warn: '#f59e0b',
        block: '#ef4444',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};

export default config;
