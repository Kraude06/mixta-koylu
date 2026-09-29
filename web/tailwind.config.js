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
        // ToS tarzı paneller — koyu ahşap, pirinç kenar, parşömen
        wood: {
          950: '#0c0705',
          900: '#170e09',
          800: '#22150d',
          700: '#332012',
          600: '#4d321b',
          500: '#6b4726',
        },
        brass: {
          200: '#f7e3a8',
          300: '#f0d080',
          400: '#dcb45c',
          500: '#b88d3e',
          600: '#8a672c',
          700: '#5c4420',
        },
        parchment: {
          50: '#faf1da',
          100: '#f2e2b8',
          200: '#e6cf98',
          300: '#d4b777',
          800: '#5a4222',
          900: '#3a2a15',
        },
      },
      fontFamily: {
        gothic: ['Georgia', 'serif'],
        display: ['"Pirata One"', 'Georgia', 'serif'],
        hand: ['"Kalam"', '"Segoe Print"', 'cursive'],
      },
      animation: {
        'pulse-blood': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
