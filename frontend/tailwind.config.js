/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F7F2',
        surface: '#FFFFFF',
        brand: {
          50: '#f2f8f4',
          100: '#DCEBDD', // Soft green from spec
          200: '#bedbc1',
          300: '#97c49c',
          400: '#68a670',
          500: '#3d8650',
          600: '#245C46', // Primary green from spec
          700: '#1d4a38',
          800: '#183c2e',
          900: '#133025',
          950: '#0a1a14',
        },
        forest: {
          DEFAULT: '#245C46',
          dark: '#1b4635',
          soft: '#DCEBDD',
          hover: '#1d4b39',
        },
        content: {
          main: '#26352D',
          muted: '#5F6F65',
          subtle: '#8C9A91',
        },
        border: {
          subtle: '#E9ECE7',
          medium: '#D8DDD5',
        },
        gold: {
          DEFAULT: '#E8B96B',
          soft: '#FDF6EB',
          hover: '#DDAA55',
        },
        ruby: {
          DEFAULT: '#C85D55',
          soft: '#FBF0EF',
        },
        stone: {
          50: '#F7F7F2',
          100: '#f1f1eb',
          200: '#E9ECE7',
          300: '#D8DDD5',
          400: '#A9B3A8',
          500: '#5F6F65',
          600: '#46564B',
          700: '#344339',
          800: '#26352D',
          900: '#1B2720',
          950: '#0E1612',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#E8B96B',
          600: '#d97706',
          700: '#b45309',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(38, 53, 45, 0.04)',
        'card': '0 1px 3px 0 rgba(38, 53, 45, 0.05), 0 1px 2px -1px rgba(38, 53, 45, 0.04)',
        'card-hover': '0 6px 12px -2px rgba(38, 53, 45, 0.08), 0 2px 4px -2px rgba(38, 53, 45, 0.04)',
        'elevation': '0 12px 24px -4px rgba(38, 53, 45, 0.1), 0 4px 8px -4px rgba(38, 53, 45, 0.04)',
      }
    },
  },
  plugins: [],
}
