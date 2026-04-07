import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8f4ee',
          100: '#efe4d1',
          200: '#e5d1ad',
          300: '#d7b77d',
          400: '#c89d53',
          500: '#bb8440',
          600: '#a76b34',
          700: '#86522d',
          800: '#6d4228',
          900: '#5a3724'
        },
        ink: '#0f1115',
        parchment: '#f6f1e8',
        gold: '#c8a86b'
      },
      boxShadow: {
        luxe: '0 24px 80px rgba(15, 17, 21, 0.10)'
      }
    }
  },
  plugins: []
};

export default config;
