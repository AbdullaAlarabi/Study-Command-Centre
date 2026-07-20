/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f3eb',
        navy: '#12233f',
        teal: '#167d78',
        gold: '#b28a43',
      },
    },
  },
  plugins: [],
}
