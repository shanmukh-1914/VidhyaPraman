/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          container: '#3b82f6',
          fixed: '#dbeafe',
          'fixed-dim': '#93c5fd',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#eff6ff',
          fixed: '#1e3a8a',
          'fixed-variant': '#1d4ed8',
        },
        secondary: {
          DEFAULT: '#f97316',
          container: '#ffedd5',
          fixed: '#fff7ed',
          'fixed-dim': '#fdba74',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#9a3412',
          fixed: '#431407',
          'fixed-variant': '#c2410c',
        },
        tertiary: {
          DEFAULT: '#16a34a',
          container: '#22c55e',
          fixed: '#dcfce7',
          'fixed-dim': '#86efac',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#f0fdf4',
          fixed: '#14532d',
          'fixed-variant': '#15803d',
        },
        error: {
          DEFAULT: '#dc2626',
          container: '#fee2e2',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#991b1b',
        },
        background: '#fafbff',
        surface: {
          DEFAULT: '#fafbff',
          bright: '#fafbff',
          dim: '#e2e5ef',
          variant: '#e2e8f0',
          tint: '#2563eb',
          'container-lowest': '#ffffff',
          'container-low': '#f4f6fb',
          container: '#eef1f8',
          'container-high': '#e8ecf5',
          'container-highest': '#e2e6f0',
        },
        'on-background': '#1e293b',
        'on-surface': {
          DEFAULT: '#1e293b',
          variant: '#475569',
        },
        outline: {
          DEFAULT: '#94a3b8',
          variant: '#cbd5e1',
        },
        'inverse-surface': '#1e293b',
        'inverse-on-surface': '#f1f5f9',
        'inverse-primary': '#93c5fd',
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.15', fontWeight: '800' }],
        'headline-lg': ['2rem', { lineHeight: '1.25', fontWeight: '700' }],
        'headline-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }],
        'body-md': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.45', fontWeight: '400' }],
        'label-md': ['0.75rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
