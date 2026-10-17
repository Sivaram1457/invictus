/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        invictus: {
          bg: '#0b0c10',
          card: '#12141c',
          border: '#181a24',
          gold: '#d4af37',
          'gold-hover': '#b59228',
          'gold-light': '#f3e5ab',
          'gold-dark': '#aa7c11',
        },
      },
    },
  },
  plugins: [],
};