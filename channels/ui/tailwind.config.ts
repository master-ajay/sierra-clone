import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [require('design-system/tailwind-preset')],
  content: ['./app/**/*.{ts,tsx}'],
};

export default config;
