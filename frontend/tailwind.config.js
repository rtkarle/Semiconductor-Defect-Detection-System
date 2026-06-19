/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        severity: {
          low:      '#16a34a',
          medium:   '#d97706',
          high:     '#ea580c',
          critical: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow-blue':  '0 0 24px rgba(59,130,246,0.30)',
        'glow-green': '0 0 24px rgba(34,197,94,0.25)',
        'glow-red':   '0 0 24px rgba(239,68,68,0.30)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'grid-slate': "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
        'radial-brand': 'radial-gradient(circle at center, rgba(30,64,175,0.15), transparent 70%)',
      },
      backgroundSize: {
        'grid': '48px 48px',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        fadeIn:        { from: { opacity: '0' },                                    to: { opacity: '1' } },
        slideUp:       { from: { opacity: '0', transform: 'translateY(18px)' },     to: { opacity: '1', transform: 'translateY(0)' } },
        slideUpFade:   { from: { opacity: '0', transform: 'translateY(12px)' },     to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft:   { from: { opacity: '0', transform: 'translateX(-16px)' },    to: { opacity: '1', transform: 'translateX(0)' } },
        slideInRight:  { from: { opacity: '0', transform: 'translateX(16px)' },     to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:       { from: { opacity: '0', transform: 'scale(0.92)' },          to: { opacity: '1', transform: 'scale(1)' } },
        floatY:        { '0%,100%': { transform: 'translateY(0)' },                 '50%': { transform: 'translateY(-8px)' } },
        shimmer:       { '0%': { backgroundPosition: '-200% 0' },                   '100%': { backgroundPosition: '200% 0' } },
        spinSlow:      { to: { transform: 'rotate(360deg)' } },
        blobMove: {
          '0%,100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%':      { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
      },
      animation: {
        'fade-in':     'fadeIn 0.35s ease both',
        'slide-up':    'slideUp 0.40s ease both',
        'slide-left':  'slideInLeft 0.35s ease both',
        'slide-right': 'slideInRight 0.35s ease both',
        'scale-in':    'scaleIn 0.30s ease both',
        'float':       'floatY 4s ease-in-out infinite',
        'shimmer':     'shimmer 1.6s linear infinite',
        'spin-slow':   'spinSlow 3s linear infinite',
        'blob':        'blobMove 8s ease-in-out infinite',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};
