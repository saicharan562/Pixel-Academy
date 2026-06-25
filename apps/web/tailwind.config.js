/** @type {import('tailwindcss').Config} */
const withAlpha = (v) => `hsl(var(${v}) / <alpha-value>)`;

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      fontFamily: {
        sans: ['InterVar', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Tight, deliberate type scale.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.05rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.5rem' }],
        lg: ['1rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.7rem', letterSpacing: '-0.018em' }],
        '2xl': ['1.625rem', { lineHeight: '2rem', letterSpacing: '-0.022em' }],
        '3xl': ['2.125rem', { lineHeight: '2.4rem', letterSpacing: '-0.026em' }],
        '4xl': ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.03em' }],
        '5xl': ['3.5rem', { lineHeight: '3.6rem', letterSpacing: '-0.032em' }],
      },
      colors: {
        // Semantic tokens
        bg: withAlpha('--bg'),
        surface: { DEFAULT: withAlpha('--surface'), 2: withAlpha('--surface-2'), 3: withAlpha('--surface-3') },
        overlay: withAlpha('--overlay'),
        content: {
          DEFAULT: withAlpha('--text-1'),
          secondary: withAlpha('--text-2'),
          tertiary: withAlpha('--text-3'),
        },
        line: { DEFAULT: withAlpha('--border'), strong: withAlpha('--border-strong') },
        accent: {
          50: withAlpha('--accent-50'),
          200: withAlpha('--accent-200'),
          300: withAlpha('--accent-300'),
          400: withAlpha('--accent-400'),
          DEFAULT: withAlpha('--accent'),
          600: withAlpha('--accent-600'),
          700: withAlpha('--accent-700'),
          foreground: withAlpha('--accent-foreground'),
        },
        success: withAlpha('--success'),
        warning: withAlpha('--warning'),
        danger: withAlpha('--danger'),
        info: withAlpha('--info'),

        // shadcn bridge (installed ui/* primitives)
        border: withAlpha('--border'),
        input: withAlpha('--input'),
        ring: withAlpha('--ring'),
        background: withAlpha('--bg'),
        foreground: withAlpha('--text-1'),
        primary: { DEFAULT: withAlpha('--primary'), foreground: withAlpha('--primary-foreground') },
        secondary: { DEFAULT: withAlpha('--secondary'), foreground: withAlpha('--secondary-foreground') },
        destructive: { DEFAULT: withAlpha('--destructive'), foreground: withAlpha('--destructive-foreground') },
        muted: { DEFAULT: withAlpha('--muted'), foreground: withAlpha('--muted-foreground') },
        popover: { DEFAULT: withAlpha('--popover'), foreground: withAlpha('--popover-foreground') },
        card: { DEFAULT: withAlpha('--card'), foreground: withAlpha('--card-foreground') },
        // retained brand alias (calm indigo) for any leftover references
        brand: { 50: '#eef1ff', 100: '#e0e6ff', 300: '#a6b1ff', 500: '#6366f1', 600: '#5457e8', 700: '#4145cf' },
      },
      borderRadius: {
        xs: 'var(--radius-xs)', sm: 'var(--radius-sm)', md: 'var(--radius-md)',
        lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)', md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)', glow: 'var(--shadow-glow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)', 'in-out': 'var(--ease-in-out)', spring: 'var(--ease-spring)',
      },
      transitionDuration: { 1: '120ms', 2: '200ms', 3: '320ms' },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(calc(-100% - var(--gap)))' } },
        'marquee-vertical': { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(calc(-100% - var(--gap)))' } },
        'shimmer-slide': { to: { transform: 'translate(calc(100cqw - 100%), 0)' } },
        'spin-around': {
          '0%': { transform: 'translateZ(0) rotate(0)' },
          '15%, 35%': { transform: 'translateZ(0) rotate(90deg)' },
          '65%, 85%': { transform: 'translateZ(0) rotate(270deg)' },
          '100%': { transform: 'translateZ(0) rotate(360deg)' },
        },
        'shiny-text': {
          '0%, 90%, 100%': { 'background-position': 'calc(-100% - var(--shiny-width)) 0' },
          '30%, 60%': { 'background-position': 'calc(100% + var(--shiny-width)) 0' },
        },
        spotlight: {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%,-40%) scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        marquee: 'marquee var(--duration) infinite linear',
        'marquee-vertical': 'marquee-vertical var(--duration) linear infinite',
        'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
        'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear',
        'shiny-text': 'shiny-text 8s infinite',
        spotlight: 'spotlight 2s ease 0.75s 1 forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
