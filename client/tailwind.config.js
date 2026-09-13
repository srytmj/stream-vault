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
          950: '#090a0f',
          900: '#0f111a',
          850: '#151824',
          800: '#1b1f2f',
          700: '#282e44',
          600: '#3a4260',
          accent: '#f47521', // Crunchyroll flame orange
          accentHover: '#ff8c3a',
          glow: 'rgba(244, 117, 33, 0.25)',
          youtube: '#ff0000',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
