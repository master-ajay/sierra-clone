import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
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
