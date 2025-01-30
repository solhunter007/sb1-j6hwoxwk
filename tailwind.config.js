/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'holy-blue': {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9e0fe',
          300: '#7cc5fe',
          400: '#36a7f9',
          500: '#0c8fee',
          600: '#0072cb',
          700: '#015ba4',
          800: '#064b87',
          900: '#0a3f70',
        },
        'divine-yellow': {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
      },
      fontFamily: {
        display: ['Quicksand', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
      keyframes: {
        glow: {
          '0%': { 
            boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(234, 179, 8, 0.7)',
            transform: 'scale(1.02)'
          },
          '100%': { 
            boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)',
            transform: 'scale(1)'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      animation: {
        glow: 'glow 1.5s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};