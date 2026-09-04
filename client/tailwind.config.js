/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          50: '#f4f9f4',
          100: '#e5f3e5',
          200: '#cce6cc',
          300: '#a3d3a3',
          400: '#70b770',
          500: '#4a994a',
          600: '#387c38',
          700: '#2f632f',
          800: '#274f27',
          900: '#214221',
          950: '#0e240e',
        },
      },
    },
  },
  plugins: [],
}
