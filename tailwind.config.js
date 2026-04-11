import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        // ── Primary (Indigo) ───────────────────────────
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
          DEFAULT: '#6366F1',
        },
        // ── Accent (Purple) ────────────────────────────
        accent: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          DEFAULT: '#8B5CF6',
        },
        // ── Surface (dark-mode scale) ──────────────────
        surface: {
          0: '#0C0E14',
          1: '#141720',
          2: '#1C2030',
          3: '#222840',
          4: '#2A3250',
        },
        // ── Semantic ───────────────────────────────────
        success: {
          light: '#ECFDF5',
          muted: '#A7F3D0',
          base: '#10B981',
          dark: '#065F46',
          DEFAULT: '#10B981',
        },
        warning: {
          light: '#FFFBEB',
          muted: '#FDE68A',
          base: '#F59E0B',
          dark: '#92400E',
          DEFAULT: '#F59E0B',
        },
        danger: {
          light: '#FFF1F2',
          muted: '#FECDD3',
          base: '#F43F5E',
          dark: '#9F1239',
          DEFAULT: '#F43F5E',
        },
        info: {
          light: '#F0F9FF',
          muted: '#BAE6FD',
          base: '#0EA5E9',
          dark: '#075985',
          DEFAULT: '#0EA5E9',
        },
        // ── Legacy brand aliases (kept for compatibility) ──
        brand: {
          DEFAULT: '#6366F1',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
        display: [
          'Plus Jakarta Sans',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(17, 24, 39, 0.08)',
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
        'card-dark': '0 1px 2px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3)',
        'focus-ring': '0 0 0 3px rgba(99, 102, 241, 0.25)',
        'focus-ring-danger': '0 0 0 3px rgba(244, 63, 94, 0.25)',
      },
      borderRadius: {
        xs: '0.25rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 180ms ease-out',
        'fade-up': 'fadeUp 220ms ease-out',
        'slide-in-right': 'slideInRight 240ms ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
        'spin-slow': 'spin 1.2s linear infinite',
      },
    },
  },
  plugins: [forms, typography],
}
