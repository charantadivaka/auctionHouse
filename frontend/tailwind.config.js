/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
        },
        gold: {
          400: '#ffd43b',
          500: '#fcc419',
          600: '#fab005',
        },
        surface: {
          0:   '#0d0f1a',
          50:  '#13162a',
          100: '#181c33',
          200: '#1e2340',
          300: '#252c50',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.4s ease-out',
        'pulse-slow':  'pulse 3s infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow':   'spin 3s linear infinite',
        'shimmer':     'shimmer 2s infinite',
        'glow':        'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                        to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' },       '100%': { backgroundPosition: '200% 0' } },
        glow:    { '0%, 100%': { boxShadow: '0 0 20px rgba(92, 124, 250, 0.3)' }, '50%': { boxShadow: '0 0 40px rgba(92, 124, 250, 0.6)' } },
      },
      boxShadow: {
        'glow-sm':  '0 0 15px rgba(92, 124, 250, 0.25)',
        'glow-md':  '0 0 30px rgba(92, 124, 250, 0.35)',
        'glow-lg':  '0 0 50px rgba(92, 124, 250, 0.45)',
        'gold-sm':  '0 0 15px rgba(250, 176, 5, 0.3)',
      },
    },
  },
  plugins: [],
}
