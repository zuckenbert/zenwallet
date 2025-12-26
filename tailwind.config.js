/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base
        'bg-primary': '#0A0A0B',
        'bg-secondary': '#141416',
        'bg-tertiary': '#1C1C1F',

        // Brand
        'solana-green': '#14F195',
        'accent-purple': '#9945FF',

        // Semantic
        'success': '#19FB9B',
        'error': '#FF6B6B',
        'warning': '#FFB547',

        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        'text-muted': '#666666',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-xp': 'linear-gradient(90deg, #14F195 0%, #9945FF 100%)',
        'gradient-card': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(20, 241, 149, 0.3)',
        'glow-purple': '0 0 20px rgba(153, 69, 255, 0.3)',
      },
    },
  },
  plugins: [],
}
