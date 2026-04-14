/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Aura palette
        aura: {
          bg:       '#0c0c14',
          surface:  '#13131f',
          card:     '#16162a',
          border:   '#2a2a45',
          purple:   '#8b5cf6',
          violet:   '#7c3aed',
          glow:     '#a78bfa',
          muted:    '#6b7280',
          text:     '#e2e8f0',
          sub:      '#94a3b8',
        },
        primary:       '#8b5cf6',
        'primary-dark':'#7c3aed',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      keyframes: {
        'pulse-ring': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(139,92,246,0.4)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(139,92,246,0)' },
        },
        'wave-in': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%,100%': { opacity: '0.6' },
          '50%':     { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'wave-in':    'wave-in 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'slide-up':   'slide-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
      },
      boxShadow: {
        'aura-sm': '0 2px 12px rgba(139,92,246,0.15)',
        'aura':    '0 4px 24px rgba(139,92,246,0.25)',
        'aura-lg': '0 8px 40px rgba(139,92,246,0.35)',
      },
    },
  },
  plugins: [],
}
