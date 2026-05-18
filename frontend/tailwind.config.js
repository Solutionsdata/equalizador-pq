/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        epr: {
          verde:  '#1B7C3E',
          'verde-light': '#E8F5EE',
          'verde-dark':  '#145C2E',
          azul:   '#1A3A6B',
          'azul-light':  '#E8EDF6',
          amarelo: '#F5A623',
          'amarelo-light': '#FEF3DC',
          cinza:  '#F0F2F5',
          'cinza-dark':  '#D1D5DB',
        },
      },
    },
  },
  plugins: [],
}
