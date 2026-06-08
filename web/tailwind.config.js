/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blood: {
          50: '#fff0f0',
          100: '#ffd6d6',
          400: '#f87171',
          500: '#ef4444',
          600: '#cc0000',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
        },
        gothic: {
          50: '#f5f0ff',
          100: '#ede9fe',
          900: '#1a0a2e',
          950: '#0d0618',
        },
        night: {
          800: '#1a1a2e',
          900: '#0f0f1a',
          950: '#07070f',
        },
      },
      fontFamily: {
        gothic: ['Georgia', 'serif'],
      },
      animation: {
        'pulse-blood': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
