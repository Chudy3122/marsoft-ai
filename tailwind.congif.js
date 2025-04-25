// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#a3cd39', // Kolor logo MarsoftAI
          600: '#84a92d', // Ciemniejsza wersja
          700: '#658520',
          800: '#466214',
          900: '#265f08',
        },
      },
    },
  },
  plugins: [],
};