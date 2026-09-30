import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        ink: '#111111',
        body: '#374151',
        hairline: '#e5e7eb',
        canvas: '#ffffff',
        'surface-soft': 'hsl(var(--surface-soft))',
        'surface-card': 'hsl(var(--surface-card))',
        'surface-dark': 'hsl(var(--surface-dark))',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
        xl: '16px',
      },
      spacing: {
        section: '96px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
