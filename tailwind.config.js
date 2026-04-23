/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          secondary: 'var(--color-secondary)',
          accent: 'var(--color-accent)',
        },
        surface: 'var(--color-surface)',
        'theme-border': 'var(--color-border)',
      },
      transitionDuration: {
        DEFAULT: '300ms',
      },
    },
  },
  plugins: [],
};
