/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f6f1e8',
        surface: '#fffdf9',
        navy: {
          50: '#eef2f7',
          100: '#dbe3ee',
          700: '#223654',
          800: '#192b47',
          900: '#12233f',
          DEFAULT: '#12233f',
        },
        teal: {
          50: '#edf8f6',
          100: '#d2eee9',
          500: '#228f87',
          600: '#167d78',
          700: '#116660',
          DEFAULT: '#167d78',
        },
        gold: {
          50: '#fbf6eb',
          100: '#f3e8ca',
          500: '#b28a43',
          600: '#9c7432',
          DEFAULT: '#b28a43',
        },
        risk: {
          50: '#fff1ef',
          100: '#ffded9',
          600: '#c4473a',
          700: '#a8382f',
          DEFAULT: '#c4473a',
        },
        ink: '#1b2940',
        muted: '#667085',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 35, 63, 0.04), 0 10px 32px rgba(18, 35, 63, 0.06)',
        lift: '0 12px 38px rgba(18, 35, 63, 0.12)',
      },
      borderRadius: {
        card: '1rem',
      },
    },
  },
  plugins: [],
}
