import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

/**
 * Tokens extraídos do Figma "Marketplace de NFTs — Kurio"
 * (file l3EbAgk05VGAbWhIOTTgBW). Ver docs/design-tokens.md.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1200px',
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        ink: '#140D0A',
        'surface-dark': '#38220F',
        'surface-card': '#241612',
        'surface-raised': '#2F1D15',
        'surface-elevated': '#FBFBFB',
        border: {
          DEFAULT: '#3F2319',
          soft: '#55321F',
        },
        primary: {
          DEFAULT: '#D28A4C',
          foreground: '#140D0A',
        },
        secondary: {
          DEFAULT: '#B39463',
          foreground: '#140D0A',
        },
        accent: {
          DEFAULT: '#E89B55',
          foreground: '#140D0A',
        },
        foreground: '#F5F1EB',
        text: {
          primary: '#F7F3EC',
          secondary: '#CFB28C',
          accent: '#E89B55',
        },
        success: '#7FB88A',
        warning: '#E8B155',
        danger: '#E0654F',
        ring: '#D28A4C',
      },
      fontFamily: {
        mono: ['"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        display: ['2.6875rem', { lineHeight: '1.15', letterSpacing: '0em', fontWeight: '700' }], // 43px
        heading: ['1.5rem', { lineHeight: '1.3', letterSpacing: '0em', fontWeight: '700' }], // 24px
        'body-lg': ['1.125rem', { lineHeight: '1.4', letterSpacing: '0em' }], // 18px
        body: ['0.875rem', { lineHeight: '1.6', letterSpacing: '0em' }], // 14px
        caption: ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0em' }], // 13px
        tiny: ['0.625rem', { lineHeight: '1.2', letterSpacing: '0.02em' }], // 10px
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1.25rem',
      },
      boxShadow: {
        card: '0 12px 32px -12px rgba(0, 0, 0, 0.55)',
        popover: '0 16px 48px -12px rgba(0, 0, 0, 0.7)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-468px 0' },
          '100%': { backgroundPosition: '468px 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config
