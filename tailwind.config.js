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
        brand: {
          DEFAULT: '#6D5EF6',
          50: '#F4F3FF',
          100: '#E9E7FF',
          200: '#CEC9FF',
          300: '#B3AAFF',
          400: '#978CFF',
          500: '#7B6DFF',
          600: '#6D5EF6',
          700: '#5649C4',
          800: '#403593',
          900: '#2A2363',
        },
        accent: {
          DEFAULT: '#00C2A8',
          50: '#E6FFFA',
          100: '#C0FFF4',
          200: '#8AFAEC',
          300: '#4FEFE1',
          400: '#1FD7CB',
          500: '#00C2A8',
          600: '#00A48D',
          700: '#008672',
          800: '#006858',
          900: '#004B3E',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(17, 24, 39, 0.08)',
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}
