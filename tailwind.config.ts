import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0B0F',
        surface: '#15151C',
        gold: '#C8A96A',
        crimson: '#8E1F2F',
        paper: '#F5F1E8',
        muted: '#A7A29A',
      },
      fontFamily: {
        display: ['"Noto Serif SC"', '"Songti SC"', 'serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(200, 169, 106, 0.15)',
      },
    },
  },
  plugins: [],
} satisfies Config;