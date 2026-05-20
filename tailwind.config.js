/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff8ed',
          100: '#ffefd3',
          200: '#ffdba5',
          300: '#ffc06d',
          400: '#ff9a32',
          500: '#ff7c0a',
          600: '#f06000',
          700: '#c74700',
          800: '#9e3900',
          900: '#7f3000',
          950: '#451500',
        },
        oil: {
          dark: '#1a1208',
          mid: '#2d1f0e',
          light: '#3d2a12',
        }
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
