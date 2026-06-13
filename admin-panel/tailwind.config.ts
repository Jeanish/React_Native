import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#D32F2F', hover: '#B71C1C', light: '#FFEBEE' },
        sidebar: { DEFAULT: '#0f172a', hover: '#1e293b' },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};
export default config;
