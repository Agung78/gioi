/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        gioi: {
          cream: '#f7f2ea',
          sand: '#e9dcc4',
          olive: '#6e7a4a',
          moss: '#3f4a2a',
          clay: '#b7612f',
          ink: '#2a2620',
        },
      },
      fontFamily: {
        display: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}