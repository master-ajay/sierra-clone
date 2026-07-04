import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [require('design-system/tailwind-preset')],
  content: ['./src/**/*.{ts,tsx}'],
};

export default config;
