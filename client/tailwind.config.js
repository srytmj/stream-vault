/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vault: {
          950: '#000000', // Deep black for seamless edges
          900: '#141414', // Netflix style dark gray
          850: '#1a1a1a',
          800: '#2b2b2b',
          700: '#404040',
          600: '#595959',
          accent: '#e50914', // Netflix red or keep crunchyroll orange '#f47521'
          accentHover: '#c11119',
          glow: 'rgba(229, 9, 20, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      screens: {
        '2xl': '1440px',
        '3xl': '1920px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      }
    },
  },
  plugins: [],
}
