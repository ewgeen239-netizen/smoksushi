/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B0B0D',
          800: '#121216',
          700: '#191920',
          600: '#22222B',
          500: '#2E2E39',
        },
        fire: {
          50: '#FFF1F0',
          400: '#FF4C39',
          500: '#E8291B',
          600: '#C41A10',
        },
        gold: '#E9B44C',
        cream: '#F7F5F2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        inter: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bebas Neue"', 'Inter', 'system-ui', 'sans-serif'],
        podium: [
          '"FSP DEMO - PODIUM Sharp 4.11"',
          '"Bebas Neue"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '8px',
        '2xl': '8px',
        '3xl': '8px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.06), 0 8px 24px -12px rgba(0,0,0,.18)',
        pop: '0 -8px 32px rgba(0,0,0,.28)',
      },
      maxWidth: {
        shell: '1240px',
      },
    },
  },
  plugins: [],
};
